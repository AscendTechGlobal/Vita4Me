import { getTrackingConsent } from '../consent';
import { getGtmId, pushToDataLayer } from './gtm';

export const GOOGLE_ADS_SCRIPT_ID = 'vita4me-gads-script';

export interface GoogleAdsConfig {
  adsId: string | null;
  labels: Partial<Record<'signup_completed' | 'trial_started' | 'subscription_started', string>>;
}

export function getGoogleAdsConfig(): GoogleAdsConfig {
  const env =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env
      : typeof process !== 'undefined'
        ? process.env
        : undefined;
  const rawId = typeof env?.VITE_GOOGLE_ADS_ID === 'string' ? env.VITE_GOOGLE_ADS_ID.trim() : '';
  const adsId = /^AW-[A-Z0-9]+$/i.test(rawId) ? rawId : null;

  const labels: GoogleAdsConfig['labels'] = {};
  if (typeof env?.VITE_GOOGLE_ADS_SIGNUP_LABEL === 'string' && env.VITE_GOOGLE_ADS_SIGNUP_LABEL.trim()) {
    labels.signup_completed = env.VITE_GOOGLE_ADS_SIGNUP_LABEL.trim();
  }
  if (typeof env?.VITE_GOOGLE_ADS_TRIAL_LABEL === 'string' && env.VITE_GOOGLE_ADS_TRIAL_LABEL.trim()) {
    labels.trial_started = env.VITE_GOOGLE_ADS_TRIAL_LABEL.trim();
  }
  if (typeof env?.VITE_GOOGLE_ADS_PURCHASE_LABEL === 'string' && env.VITE_GOOGLE_ADS_PURCHASE_LABEL.trim()) {
    labels.subscription_started = env.VITE_GOOGLE_ADS_PURCHASE_LABEL.trim();
  }

  return { adsId, labels };
}

export function initGoogleAdsProvider(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const consent = getTrackingConsent();
  if (!consent.choiceMade || !consent.marketing) return false;

  const { adsId } = getGoogleAdsConfig();
  if (!adsId) return false;

  if (!getGtmId() && !document.getElementById(GOOGLE_ADS_SCRIPT_ID) && !document.getElementById('vita4me-ga4-script')) {
    const script = document.createElement('script');
    script.id = GOOGLE_ADS_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(adsId)}`;
    document.head.appendChild(script);
  }

  const win = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof win.gtag === 'function') {
    win.gtag('config', adsId);
  }
  return true;
}

export function dispatchGoogleAdsConversion(
  eventName: 'signup_completed' | 'trial_started' | 'subscription_started',
  payload: Record<string, string | number | boolean>
): void {
  if (typeof window === 'undefined') return;
  const consent = getTrackingConsent();
  if (!consent.choiceMade || !consent.marketing) return;

  const { adsId, labels } = getGoogleAdsConfig();
  if (!adsId) return;

  const label = labels[eventName];
  const conversionPayload: Record<string, string | number | boolean> = {
    ...(label ? { send_to: `${adsId}/${label}` } : {}),
    ...(typeof payload.value === 'number' ? { value: payload.value } : {}),
    ...(typeof payload.currency === 'string' ? { currency: payload.currency } : {}),
    ...(typeof payload.transaction_id === 'string' ? { transaction_id: payload.transaction_id } : {}),
  };

  if (getGtmId()) {
    pushToDataLayer({
      event: `ads_conversion_${eventName}`,
      ...conversionPayload,
    });
    return;
  }

  const win = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (label && typeof win.gtag === 'function') {
    win.gtag('event', 'conversion', conversionPayload);
  }
}
