import { getTrackingConsent, applyGoogleConsentDefault, updateGoogleConsentMode } from '../consent';

export const GTM_SCRIPT_ID = 'vita4me-gtm-script';

export function getGtmId(): string | null {
  const raw =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_GTM_ID
      : typeof process !== 'undefined'
        ? process.env?.VITE_GTM_ID
        : undefined;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return /^GTM-[A-Z0-9_-]+$/i.test(trimmed) ? trimmed : null;
}

export function initGtmProvider(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  const consent = getTrackingConsent();
  applyGoogleConsentDefault(consent);

  const gtmId = getGtmId();
  if (!gtmId) return false;
  if (!consent.choiceMade || (!consent.analytics && !consent.marketing)) return false;

  updateGoogleConsentMode(consent);

  if (document.getElementById(GTM_SCRIPT_ID)) {
    return true;
  }

  const win = window as unknown as { dataLayer?: Array<Record<string, unknown> | unknown[]> };
  win.dataLayer = win.dataLayer || [];
  win.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.id = GTM_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  document.head.appendChild(script);
  return true;
}

export function pushToDataLayer(payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const gtmId = getGtmId();
  const consent = getTrackingConsent();
  if (!gtmId || !consent.choiceMade || (!consent.analytics && !consent.marketing)) return;

  const win = window as unknown as { dataLayer?: Array<Record<string, unknown> | unknown[]> };
  win.dataLayer = win.dataLayer || [];
  win.dataLayer.push(payload);
}
