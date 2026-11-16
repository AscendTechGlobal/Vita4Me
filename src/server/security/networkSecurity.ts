import crypto from "crypto";
import net from "net";
import type { Request } from "express";

/**
 * Official Cloudflare IPv4 & IPv6 CIDR ranges (https://www.cloudflare.com/ips/).
 * Used to validate whether the immediate peer connecting to Cloud Run GFE is
 * genuinely Cloudflare Edge before considering CF-Connecting-IP / 2nd proxy hop.
 */
const CLOUDFLARE_IPV4_CIDRS: ReadonlyArray<readonly [string, number]> = [
  ["173.245.48.0", 20],
  ["103.21.244.0", 22],
  ["103.22.200.0", 22],
  ["103.31.4.0", 22],
  ["141.101.64.0", 18],
  ["108.162.192.0", 18],
  ["190.93.240.0", 20],
  ["188.114.96.0", 20],
  ["197.234.240.0", 22],
  ["198.41.128.0", 17],
  ["162.158.0.0", 15],
  ["104.16.0.0", 13],
  ["104.24.0.0", 14],
  ["172.64.0.0", 13],
  ["131.0.72.0", 22],
];

const CLOUDFLARE_IPV6_CIDRS: ReadonlyArray<readonly [string, number]> = [
  ["2400:cb00::", 32],
  ["2606:4700::", 32],
  ["2803:f800::", 32],
  ["2405:b500::", 32],
  ["2405:8100::", 32],
  ["2a06:98c0::", 29],
  ["2c0f:f248::", 32],
];

const cloudflareBlockList = new net.BlockList();
for (const [addr, prefix] of CLOUDFLARE_IPV4_CIDRS) {
  cloudflareBlockList.addSubnet(addr, prefix, "ipv4");
}
for (const [addr, prefix] of CLOUDFLARE_IPV6_CIDRS) {
  cloudflareBlockList.addSubnet(addr, prefix, "ipv6");
}

export function normalizeIpAddress(rawIp: string | undefined | null): string {
  if (!rawIp || typeof rawIp !== "string") return "";
  const trimmed = rawIp.trim();
  if (!trimmed) return "";
  // Strip IPv4-mapped IPv6 prefix ::ffff:x.x.x.x
  if (trimmed.toLowerCase().startsWith("::ffff:")) {
    const candidate = trimmed.slice(7);
    if (net.isIPv4(candidate)) return candidate;
  }
  return trimmed;
}

export function isCloudflareIp(rawIp: string | undefined | null): boolean {
  const ip = normalizeIpAddress(rawIp);
  const family = net.isIP(ip);
  if (family === 4) {
    return cloudflareBlockList.check(ip, "ipv4");
  }
  if (family === 6) {
    return cloudflareBlockList.check(ip, "ipv6");
  }
  return false;
}

/**
 * Validates optional shared Worker-to-Cloud-Run edge secret header using
 * fixed-length SHA-256 + timingSafeEqual comparison so direct callers cannot
 * spoof CF-Connecting-IP or bypass Cloudflare edge controls.
 */
export function hasValidEdgeProxySecret(req: Pick<Request, "headers">, configuredSecret?: string): boolean {
  if (!configuredSecret) return false;
  const headerRaw = req.headers["x-vita4me-edge-secret"];
  const candidate = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;
  if (!candidate || typeof candidate !== "string") return false;

  const expectedDigest = crypto.createHash("sha256").update(configuredSecret, "utf8").digest();
  const candidateDigest = crypto.createHash("sha256").update(candidate, "utf8").digest();
  return crypto.timingSafeEqual(expectedDigest, candidateDigest);
}

export function isEdgeOriginProtectedRouteExempt(req: Pick<Request, "method" | "path">): boolean {
  const method = (req.method || "GET").toUpperCase();
  const reqPath = req.path || "";

  if ((method === "GET" || method === "HEAD") && (reqPath === "/health" || reqPath === "/ready" || reqPath === "/api/health" || reqPath === "/api/ready")) {
    return true;
  }

  if (method === "POST" && (reqPath === "/api/stripe/webhook" || reqPath === "/api/webhooks/asaas")) {
    return true;
  }

  return false;
}

/**
 * Custom Express `trust proxy` predicate for Google Cloud Run behind Cloudflare:
 * - hop 0 (socket/Cloud Run GFE): always trusted to read the rightmost peer IP appended by GFE.
 * - hop 1 (immediate upstream to GFE): trusted ONLY when the GFE-verified peer IP is Cloudflare.
 * - hop >= 2: NEVER trusted, blocking left-side X-Forwarded-For spoofing.
 */
export function trustProxyValidator(addr: string, hopIndex: number): boolean {
  if (hopIndex === 0) return true;
  if (hopIndex === 1) return isCloudflareIp(addr);
  return false;
}

/**
 * Resolves the real client IP for rate limiting & audit hashing without blindly trusting
 * attacker-supplied X-Forwarded-For or CF-Connecting-IP headers.
 */
export function resolveTrustedClientIp(req: Pick<Request, "ip" | "ips" | "headers" | "socket">): string {
  const ips = Array.isArray(req.ips) ? req.ips : [];
  const expressIp = normalizeIpAddress(req.ip) || normalizeIpAddress(req.socket?.remoteAddress) || "127.0.0.1";

  // Verify whether the immediate upstream peer validated at hop 0/1 belongs to Cloudflare
  const gfeVerifiedPeer = normalizeIpAddress(ips[ips.length - 1] || expressIp);
  const edgeVerified =
    (ips.length >= 1 && isCloudflareIp(gfeVerifiedPeer)) ||
    isCloudflareIp(expressIp) ||
    hasValidEdgeProxySecret(req, process.env.EDGE_SHARED_SECRET);

  if (edgeVerified) {
    const cfHeaderRaw = req.headers["cf-connecting-ip"];
    const cfHeader = Array.isArray(cfHeaderRaw) ? cfHeaderRaw[0] : cfHeaderRaw;
    const cfIp = normalizeIpAddress(cfHeader);
    if (cfIp && net.isIP(cfIp) !== 0) {
      return cfIp;
    }
  }

  return net.isIP(expressIp) !== 0 ? expressIp : "127.0.0.1";
}

const OFFICIAL_PROD_HOSTS = new Set(["vita4me.com", "www.vita4me.com"]);

export function isAllowedOrigin(
  origin: string | undefined,
  options: {
    isProd: boolean;
    appUrl?: string;
    extraAllowedOrigins?: string;
  }
): boolean {
  if (!origin || typeof origin !== "string") return false;

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  const protocol = parsed.protocol.toLowerCase();

  // Development-only localhost/loopback origins (never allowed in production)
  if (!options.isProd && (protocol === "http:" || protocol === "https:")) {
    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
      return true;
    }
  }

  // Production CORS requires strict HTTPS scheme
  if (protocol !== "https:") {
    return false;
  }

  // Only explicit official Vita4Me hostnames (no vita4me.app, no *.run.app wildcard)
  if (OFFICIAL_PROD_HOSTS.has(host)) {
    return true;
  }

  // Exact APP_URL host when explicitly configured with HTTPS
  if (options.appUrl) {
    try {
      const appParsed = new URL(options.appUrl);
      if (appParsed.protocol === "https:" && appParsed.origin === parsed.origin) {
        return true;
      }
    } catch {
      // Ignore malformed APP_URL
    }
  }

  // Optional explicit allowlist of exact HTTPS origins via CORS_ALLOWED_ORIGINS env
  if (options.extraAllowedOrigins) {
    const entries = options.extraAllowedOrigins
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    for (const entry of entries) {
      try {
        const allowed = new URL(entry);
        if (allowed.protocol === "https:" && allowed.origin === parsed.origin) {
          return true;
        }
      } catch {
        // Ignore malformed entry
      }
    }
  }

  return false;
}
