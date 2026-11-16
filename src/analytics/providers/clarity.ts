import { getTrackingConsent } from '../consent';
import { isSensitiveAuthenticatedPath } from '../events';

export const CLARITY_SCRIPT_ID = 'vita4me-clarity-script';

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };

export function getClarityProjectId(): string | null {
  const raw =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_CLARITY_PROJECT_ID
      : typeof process !== 'undefined'
        ? process.env?.VITE_CLARITY_PROJECT_ID
        : undefined;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return /^[a-z0-9]{6,20}$/i.test(trimmed) ? trimmed : null;
}

function ensureClarityStub(): ClarityFn | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as { clarity?: ClarityFn };
  if (typeof win.clarity === 'function') return win.clarity;
  const clarityFn: ClarityFn = function (...args: unknown[]) {
    clarityFn.q = clarityFn.q || [];
    clarityFn.q.push(args);
  };
  win.clarity = clarityFn;
  return clarityFn;
}

export const CLARITY_ALLOWED_PUBLIC_PATHS = new Set([
  '/',
  '/privacidade',
  '/termos',
  '/cookies',
]);

export function isClarityAllowedPath(rawPathname: string): boolean {
  if (!rawPathname || typeof rawPathname !== 'string') return false;
  let pathname = rawPathname.trim();
  const qIdx = pathname.indexOf('?');
  if (qIdx >= 0) pathname = pathname.slice(0, qIdx);
  const hIdx = pathname.indexOf('#');
  if (hIdx >= 0) pathname = pathname.slice(0, hIdx);
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  if (!pathname) pathname = '/';
  return !isSensitiveAuthenticatedPath(pathname) && CLARITY_ALLOWED_PUBLIC_PATHS.has(pathname);
}

/**
 * Política restritiva Clarity para plataforma de saúde (fail-closed):
 * - Carrega e grava SOMENTE com consentimento ANALYTICS explícito;
 * - Restrito estritamente às páginas públicas de marketing/legais (/, /privacidade, /termos, /cookies);
 * - Bloqueado e interrompido em /app/*, /reset-password, /auth/confirm, /login, /cadastro e demais rotas.
 */
export function syncClarityForRoute(currentPathname: string): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  const projectId = getClarityProjectId();
  const consent = getTrackingConsent();
  const win = window as unknown as { clarity?: ClarityFn };

  if (!consent.choiceMade || !consent.analytics || !isClarityAllowedPath(currentPathname)) {
    if (typeof win.clarity === 'function') {
      win.clarity('consent', false);
      win.clarity('stop');
    }
    return false;
  }

  if (!projectId) return false;

  const clarity = ensureClarityStub();
  if (!clarity) return false;

  if (!document.getElementById(CLARITY_SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = CLARITY_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
    document.head.appendChild(script);
  }

  clarity('consent');
  return true;
}
