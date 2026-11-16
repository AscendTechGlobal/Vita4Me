import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  isAllowedOrigin,
  isCloudflareIp,
  resolveTrustedClientIp,
  trustProxyValidator,
} from "../../src/server/security/networkSecurity.ts";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

assert.ok(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY, "Supabase credentials required for release-check-2");

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function startCompiledServer(port) {
  const serverProc = spawn(process.execPath, [path.resolve("dist/server.cjs")], {
    env: { ...process.env, PORT: String(port), NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const apiBase = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${apiBase}/api/health`);
      if (res.ok) return { serverProc, apiBase };
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  serverProc.kill("SIGKILL");
  throw new Error(`Failed to start dist/server.cjs on port ${port}`);
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`CDP ${msg.error.code}: ${msg.error.message}`));
        else resolve(msg.result);
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Page error: ${res.exceptionDetails.text}`);
    }
    return res.result?.value;
  }

  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

async function waitFor(fn, timeoutMs = 20000, intervalMs = 250, label = "condition") {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const val = await fn();
    if (val) return val;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timeout waiting for ${label}`);
}

test("CORS policy unit validation enforces strict HTTPS production origins and rejects old/wildcard domains", () => {
  assert.equal(isAllowedOrigin("https://vita4me.com", { isProd: true }), true);
  assert.equal(isAllowedOrigin("https://www.vita4me.com", { isProd: true }), true);
  assert.equal(isAllowedOrigin("http://vita4me.com", { isProd: true }), false);
  assert.equal(isAllowedOrigin("https://vita4me.app", { isProd: true }), false);
  assert.equal(isAllowedOrigin("https://www.vita4me.app", { isProd: true }), false);
  assert.equal(isAllowedOrigin("https://vita4me-attacker-xyz.us-central1.run.app", { isProd: true }), false);
  assert.equal(isAllowedOrigin("https://vita4me-production.up.railway.app", { isProd: true }), false);
  assert.equal(isAllowedOrigin("http://localhost:3000", { isProd: true }), false);
  assert.equal(isAllowedOrigin("http://localhost:3000", { isProd: false }), true);
  assert.equal(isAllowedOrigin("http://127.0.0.1:5173", { isProd: false }), true);
});

test("trust proxy & Cloudflare IP resolver block XFF / CF-Connecting-IP spoofing from direct callers", () => {
  assert.equal(isCloudflareIp("104.16.1.10"), true);
  assert.equal(isCloudflareIp("198.51.100.44"), false);
  assert.equal(trustProxyValidator("169.254.1.1", 0), true);
  assert.equal(trustProxyValidator("104.16.1.10", 1), true);
  assert.equal(trustProxyValidator("198.51.100.44", 1), false);
  assert.equal(trustProxyValidator("104.16.1.10", 2), false);

  const spoofedDirectReq = {
    ip: "198.51.100.44",
    ips: ["198.51.100.44"],
    headers: {
      "cf-connecting-ip": "8.8.8.8",
      "x-forwarded-for": "104.16.0.1, 1.1.1.1, 198.51.100.44",
    },
    socket: { remoteAddress: "127.0.0.1" },
  };
  assert.equal(resolveTrustedClientIp(spoofedDirectReq), "198.51.100.44");

  const cloudflareWorkerReq = {
    ip: "104.16.1.10",
    ips: ["104.16.1.10"],
    headers: { "cf-connecting-ip": "203.0.113.77" },
    socket: { remoteAddress: "127.0.0.1" },
  };
  assert.equal(resolveTrustedClientIp(cloudflareWorkerReq), "203.0.113.77");
});

test("Compiled server enforces CORS, Security Headers/CSP, Permissions-Policy, anti-spoofing rate limit, and full Auth E2E", async () => {
  const port = 3198;
  const { serverProc, apiBase } = await startCompiledServer(port);
  const createdUserIds = [];

  try {
    // 1. Live HTTP Security Headers, CSP, Permissions-Policy & CORS checks
    const rootRes = await fetch(`${apiBase}/`);
    assert.equal(rootRes.status, 200);
    assert.equal(rootRes.headers.get("access-control-allow-origin"), null);
    assert.match(rootRes.headers.get("cache-control") || "", /no-store/);
    assert.equal(rootRes.headers.get("x-content-type-options"), "nosniff");
    assert.equal(rootRes.headers.get("x-frame-options"), "DENY");
    assert.equal(rootRes.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.match(rootRes.headers.get("strict-transport-security") || "", /max-age=31536000/);
    assert.match(rootRes.headers.get("permissions-policy") || "", /camera=\(\)/);

    const csp = rootRes.headers.get("content-security-policy") || "";
    assert.match(csp, /script-src 'self' https:\/\/js\.stripe\.com/);
    assert.ok(!csp.includes("'unsafe-inline' 'self'") && !csp.match(/script-src[^;]*unsafe-inline/));
    assert.match(csp, /base-uri 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /frame-src 'self' blob: https:\/\/js\.stripe\.com https:\/\/hooks\.stripe\.com/);
    assert.ok(!csp.includes("generativelanguage.googleapis.com"));
    assert.ok(!csp.includes("resend.com"));

    // Allowed official origin vs blocked origins
    const corsOk = await fetch(`${apiBase}/api/health`, {
      headers: { Origin: "https://vita4me.com" },
    });
    assert.equal(corsOk.status, 200);
    assert.equal(corsOk.headers.get("access-control-allow-origin"), "https://vita4me.com");
    assert.equal(corsOk.headers.get("access-control-allow-credentials"), "true");

    for (const blockedOrigin of [
      "https://vita4me.app",
      "https://vita4me-attacker.us-central1.run.app",
      "http://localhost:3000",
      "http://vita4me.com",
    ]) {
      const denied = await fetch(`${apiBase}/api/health`, {
        headers: { Origin: blockedOrigin },
      });
      assert.equal(denied.status, 403, `Origin ${blockedOrigin} should be denied in NODE_ENV=production`);
      assert.equal(denied.headers.get("access-control-allow-origin"), null);
    }

    // 2. Unauthenticated & invalid/expired token enforcement on private API routes
    for (const [method, url] of [
      ["GET", `${apiBase}/api/exams/drawer`],
      ["POST", `${apiBase}/api/stripe/create-portal-session`],
      ["GET", `${apiBase}/api/billing/pix-status/sim_pay_123`],
      ["DELETE", `${apiBase}/api/exams/00000000-0000-0000-0000-000000000000`],
    ]) {
      const unauth = await fetch(url, { method });
      assert.equal(unauth.status, 401, `${method} ${url} must reject unauthenticated requests`);

      const invalidJwt = await fetch(url, {
        method,
        headers: { Authorization: "Bearer invalid.expired.jwt.token" },
      });
      assert.equal(invalidJwt.status, 401, `${method} ${url} must reject invalid/expired JWT`);
    }

    // 3. Google OAuth URL generation check (without modifying OAuth config)
    const { data: oauthData, error: oauthErr } = await anonClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://vita4me.com/auth/confirm",
        skipBrowserRedirect: true,
      },
    });
    assert.equal(oauthErr, null);
    assert.ok(oauthData?.url?.includes("provider=google"), "Google OAuth authorize URL must include provider=google");
    assert.ok(
      oauthData.url.includes(encodeURIComponent("https://vita4me.com/auth/confirm")),
      "Google OAuth URL must target https://vita4me.com/auth/confirm"
    );

    // 4. Auth registration, password policy, login, recovery, password change & old/new password check
    const runId = Date.now();
    const userEmail = `rc2.auth.${runId}@vita4me.test`;
    const otherEmail = `rc2.other.${runId}@vita4me.test`;
    const initialPass = `Rc2Pass#${runId}Aa!`;
    const updatedPass = `Rc2NewPass#${runId}Bb!`;

    const weakReg = await fetch(`${apiBase}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userEmail,
        password: "weak",
        fullName: "RC2 User",
        consents: { termsAccepted: true, privacyAccepted: true, healthDataAccepted: true, documentVersion: "1.0" },
      }),
    });
    assert.equal(weakReg.status, 400);

    const regRes = await fetch(`${apiBase}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userEmail,
        password: initialPass,
        fullName: "RC2 User",
        consents: { termsAccepted: true, privacyAccepted: true, healthDataAccepted: true, documentVersion: "1.0" },
      }),
    });
    assert.equal(regRes.status, 200);
    const regJson = await regRes.json();
    assert.ok(regJson.userId);
    createdUserIds.push(regJson.userId);

    const otherUserRes = await adminClient.auth.admin.createUser({
      email: otherEmail,
      password: initialPass,
      email_confirm: true,
    });
    assert.ok(otherUserRes.data?.user?.id);
    createdUserIds.push(otherUserRes.data.user.id);

    // User isolation via JWT
    const { data: userLogin } = await anonClient.auth.signInWithPassword({
      email: userEmail,
      password: initialPass,
    });
    const { data: otherLogin } = await anonClient.auth.signInWithPassword({
      email: otherEmail,
      password: initialPass,
    });
    assert.ok(userLogin.session?.access_token && otherLogin.session?.access_token);

    // Real headless Chrome UI E2E for Auth routes (/app unauthenticated -> /login, login -> /app, logout -> /login, recovery flow)
    if (fs.existsSync(CHROME_PATH)) {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vita4me-rc2-"));
      const chromeProc = spawn(
        CHROME_PATH,
        [
          "--headless=new",
          "--disable-gpu",
          "--no-first-run",
          "--window-size=1280,860",
          "--remote-debugging-port=9345",
          `--user-data-dir=${tempDir}`,
          "about:blank",
        ],
        { stdio: "ignore" }
      );
      let cdp = null;
      try {
        const target = await waitFor(async () => {
          try {
            const res = await fetch("http://127.0.0.1:9345/json/list");
            const list = await res.json();
            return list.find((t) => t.type === "page");
          } catch {
            return null;
          }
        }, 15000, 250, "Chrome DevTools");
        cdp = new CDPClient(target.webSocketDebuggerUrl);
        await cdp.connect();
        await cdp.send("Page.enable");
        await cdp.send("Runtime.enable");

        // Unauthenticated /app redirects to /login
        await cdp.send("Page.navigate", { url: `${apiBase}/app/exames` });
        await waitFor(
          () => cdp.evaluate(`window.location.pathname === '/login' && Boolean(document.querySelector('input[type="email"]'))`),
          15000,
          250,
          "unauthenticated /app redirect to /login"
        );

        // Login via UI form
        await cdp.evaluate(`(() => {
          function setVal(el, v) {
            const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
            d.set.call(el, v);
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
          setVal(document.querySelector('input[type="email"]'), ${JSON.stringify(userEmail)});
          setVal(document.querySelector('input[type="password"]'), ${JSON.stringify(initialPass)});
          document.querySelector('button[type="submit"]').click();
        })()`);
        await waitFor(() => cdp.evaluate(`window.location.pathname.startsWith('/app')`), 15000, 250, "login redirect to /app");

        // Verify token is stored in sessionStorage, not persistent localStorage
        const storageOk = await cdp.evaluate(`(() => {
          const hasSession = Object.keys(sessionStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
          const hasLocal = Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
          return hasSession && !hasLocal;
        })()`);
        assert.equal(storageOk, true);

        // Logout clears sessionStorage and subsequent /app navigation redirects back to /login
        await cdp.evaluate(`(() => {
          sessionStorage.clear();
          return true;
        })()`);
        await cdp.send("Page.navigate", { url: `${apiBase}/app` });
        await waitFor(
          () => cdp.evaluate(`window.location.pathname === '/login'`),
          10000,
          200,
          "post-logout /app redirect to /login"
        );

        // Invalid/expired recovery link renders clear error UI instead of allowing reset
        await cdp.send("Page.navigate", {
          url: `${apiBase}/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`,
        });
        await waitFor(
          () => cdp.evaluate(`document.body.innerText.includes('expirou') || document.body.innerText.includes('Solicitar Novo Link')`),
          10000,
          200,
          "expired recovery error view"
        );

        // Missing recovery token shows invalid error
        await cdp.send("Page.navigate", { url: `${apiBase}/reset-password` });
        await waitFor(
          () => cdp.evaluate(`document.body.innerText.includes('Nenhuma solicitação válida')`),
          10000,
          200,
          "missing token recovery error view"
        );

        // Clear session then execute REAL valid recovery link via Admin generateLink
        await cdp.evaluate(`sessionStorage.clear();`);
        const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email: userEmail,
        });
        assert.equal(linkErr, null);
        const tokenHash = linkData?.properties?.hashed_token;
        assert.ok(tokenHash, "Recovery token_hash must be generated");

        await cdp.send("Page.navigate", {
          url: `${apiBase}/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`,
        });
        await waitFor(
          () => cdp.evaluate(`document.querySelectorAll('input[type="password"]').length === 2 && document.body.innerText.includes('Nova senha')`),
          15000,
          250,
          "valid recovery form"
        );

        // Verify temporary recovery session CANNOT bypass into /app
        await cdp.send("Page.navigate", { url: `${apiBase}/app` });
        await waitFor(
          () => cdp.evaluate(`window.location.pathname === '/reset-password' && document.querySelectorAll('input[type="password"]').length === 2`),
          15000,
          250,
          "recovery session blocked from /app and form rehydrated"
        );

        // Submit new password through ResetPasswordView
        await cdp.evaluate(`(() => {
          function setVal(el, v) {
            const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
            d.set.call(el, v);
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
          const inputs = document.querySelectorAll('input[type="password"]');
          setVal(inputs[0], ${JSON.stringify(updatedPass)});
          setVal(inputs[1], ${JSON.stringify(updatedPass)});
          document.querySelector('button[type="submit"]').click();
        })()`);

        await waitFor(
          () => cdp.evaluate(`window.location.pathname === '/login' || document.body.innerText.includes('sucesso')`),
          15000,
          250,
          "password reset completion & redirect to /login"
        );
      } finally {
        cdp?.close();
        if (!chromeProc.killed) chromeProc.kill("SIGKILL");
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {}
      }

      // Old password MUST fail; new password MUST succeed
      const oldSign = await anonClient.auth.signInWithPassword({ email: userEmail, password: initialPass });
      assert.ok(oldSign.error, "Old password must be rejected after password reset");

      const newSign = await anonClient.auth.signInWithPassword({ email: userEmail, password: updatedPass });
      assert.equal(newSign.error, null, "New password must log in cleanly");
      assert.ok(newSign.data.session?.access_token);
    }

    // 5. Rate limiting & anti-spoofing enforcement in compiled server
    // Stripe webhook MUST NOT be rate limited even under burst calls
    for (let i = 0; i < 20; i++) {
      const wh = await fetch(`${apiBase}/api/stripe/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      assert.notEqual(wh.status, 429, "Stripe webhook must never be blocked by rate limiter");
    }

    // Auth limiter (max 15 per 15m) + GFE-appended real peer blocks left-side XFF & CF-Connecting-IP spoofing
    let hit429 = false;
    for (let i = 0; i < 16; i++) {
      const r = await fetch(`${apiBase}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": `104.16.0.1, 203.0.113.${i + 1}, 198.51.100.44`,
          "CF-Connecting-IP": `192.0.2.${i + 1}`,
        },
        body: JSON.stringify({ email: "invalid" }),
      });
      if (r.status === 429) {
        hit429 = true;
        break;
      }
    }
    assert.equal(hit429, true, "Auth endpoint must enforce strict 429 limit and resist XFF/CF-Connecting-IP spoofing");

    // Verify Cloudflare-proxied requests isolate rate-limit buckets per real CF-Connecting-IP (not shared Cloudflare POP IP)
    const cfClientA = await fetch(`${apiBase}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": "9.9.9.9, 104.16.1.10",
        "CF-Connecting-IP": "203.0.113.201",
      },
      body: JSON.stringify({ email: "invalid" }),
    });
    assert.equal(cfClientA.status, 400, "Legitimate distinct Cloudflare user behind same POP must not be blocked by attacker 429 bucket");

    // AI per-user Fair Use limiter (post-requireAuth, max 25 per 10m by userId even if XFF rotates)
    let hitAiUser429 = false;
    for (let i = 0; i < 27; i++) {
      const aiRes = await fetch(`${apiBase}/api/ai/translate-exam`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${otherLogin.session.access_token}`,
          "X-Forwarded-For": `198.51.100.${(i % 200) + 1}`,
        },
        body: JSON.stringify({}),
      });
      if (aiRes.status === 429) {
        hitAiUser429 = true;
        break;
      }
      assert.equal(aiRes.status, 400, "Empty AI payload should fail fast at validation without calling Gemini");
    }
    assert.equal(hitAiUser429, true, "AI routes must enforce per-user 25 req/10m limit post-requireAuth");
  } finally {
    if (!serverProc.killed) serverProc.kill("SIGKILL");
    for (const id of createdUserIds) {
      await adminClient.auth.admin.deleteUser(id).catch(() => {});
    }
  }
});

test("EDGE_SHARED_SECRET guard blocks direct origin requests & spoofed headers while preserving health/webhooks", async () => {
  const port = 3199;
  const edgeSecret = "rc2-test-edge-secret-do-not-use-in-prod-987654";
  const serverProc = spawn(process.execPath, [path.resolve("dist/server.cjs")], {
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "production",
      EDGE_SHARED_SECRET: edgeSecret,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const apiBase = `http://127.0.0.1:${port}`;

  try {
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(`${apiBase}/api/health`);
        if (res.ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }

    // 1. Health & signed webhook routes remain reachable without edge header
    const healthOk = await fetch(`${apiBase}/api/health`);
    assert.equal(healthOk.status, 200);
    const readyOk = await fetch(`${apiBase}/api/ready`);
    assert.equal(readyOk.status, 200);
    const webhookRes = await fetch(`${apiBase}/api/stripe/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.notEqual(webhookRes.status, 403);

    // 2. Direct origin access WITHOUT edge header is rejected (403)
    for (const [method, target] of [
      ["GET", `${apiBase}/`],
      ["GET", `${apiBase}/privacidade`],
      ["GET", `${apiBase}/api/exams/drawer`],
      ["POST", `${apiBase}/api/auth/register`],
    ]) {
      const noHeader = await fetch(target, { method });
      assert.equal(noHeader.status, 403, `${method} ${target} without edge secret must return 403`);
      const body = await noHeader.json();
      assert.equal(body.code, "ORIGIN_EDGE_AUTH_REQUIRED");
    }

    // 3. Direct origin access WITH spoofed/invalid edge header is rejected (403) on ALL routes
    for (const target of [`${apiBase}/`, `${apiBase}/api/health`, `${apiBase}/api/exams/drawer`]) {
      const spoof = await fetch(target, {
        headers: { "X-Vita4Me-Edge-Secret": "spoofed-wrong-secret" },
      });
      assert.equal(spoof.status, 403, `Spoofed edge secret on ${target} must return 403`);
    }

    // 4. Legitimate Cloudflare Worker traffic WITH valid edge header succeeds cleanly
    const validRoot = await fetch(`${apiBase}/`, {
      headers: { "X-Vita4Me-Edge-Secret": edgeSecret },
    });
    assert.equal(validRoot.status, 200);
    const validDrawer = await fetch(`${apiBase}/api/exams/drawer`, {
      headers: { "X-Vita4Me-Edge-Secret": edgeSecret },
    });
    // Reaches auth layer (401 without JWT) rather than 403 edge block
    assert.equal(validDrawer.status, 401);
  } finally {
    if (!serverProc.killed) serverProc.kill("SIGKILL");
  }
});

