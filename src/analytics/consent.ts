export const TRACKING_CONSENT_VERSION = '1.0';
export const TRACKING_CONSENT_STORAGE_KEY = 'vita4me_tracking_consent_v1';

export interface TrackingConsentState {
  version: string;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  choiceMade: boolean;
  updatedAt: string | null;
}

export interface GoogleConsentModeV2 {
  analytics_storage: 'granted' | 'denied';
  ad_storage: 'granted' | 'denied';
  ad_user_data: 'granted' | 'denied';
  ad_personalization: 'granted' | 'denied';
  functionality_storage: 'granted';
  security_storage: 'granted';
}

export const DEFAULT_TRACKING_CONSENT: TrackingConsentState = {
  version: TRACKING_CONSENT_VERSION,
  necessary: true,
  analytics: false,
  marketing: false,
  choiceMade: false,
  updatedAt: null,
};

type ConsentListener = (state: TrackingConsentState) => void;
type PreferencesUiListener = (open: boolean) => void;

const consentListeners = new Set<ConsentListener>();
const preferencesListeners = new Set<PreferencesUiListener>();
let inMemoryConsent: TrackingConsentState | null = null;
let googleConsentDefaultApplied = false;

export function toGoogleConsentModeV2(state: TrackingConsentState): GoogleConsentModeV2 {
  return {
    analytics_storage: state.choiceMade && state.analytics ? 'granted' : 'denied',
    ad_storage: state.choiceMade && state.marketing ? 'granted' : 'denied',
    ad_user_data: state.choiceMade && state.marketing ? 'granted' : 'denied',
    ad_personalization: state.choiceMade && state.marketing ? 'granted' : 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
  };
}

function readStoredConsent(): TrackingConsentState {
  if (inMemoryConsent) return inMemoryConsent;
  if (typeof window === 'undefined') return { ...DEFAULT_TRACKING_CONSENT };

  try {
    const raw = window.localStorage.getItem(TRACKING_CONSENT_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TRACKING_CONSENT };
    const parsed = JSON.parse(raw) as Partial<TrackingConsentState>;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      parsed.version !== TRACKING_CONSENT_VERSION ||
      parsed.choiceMade !== true
    ) {
      return { ...DEFAULT_TRACKING_CONSENT };
    }

    const hydrated: TrackingConsentState = {
      version: TRACKING_CONSENT_VERSION,
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      choiceMade: true,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    };
    inMemoryConsent = hydrated;
    return hydrated;
  } catch {
    return { ...DEFAULT_TRACKING_CONSENT };
  }
}

export function getTrackingConsent(): TrackingConsentState {
  return readStoredConsent();
}

export function resetInMemoryConsentForTests(): void {
  inMemoryConsent = null;
  googleConsentDefaultApplied = false;
}

function ensureGtagQueue(): (...args: unknown[]) => void {
  const win = window as unknown as {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
  win.dataLayer = win.dataLayer || [];
  if (typeof win.gtag !== 'function') {
    win.gtag = function gtagPush(...args: unknown[]) {
      win.dataLayer!.push(args);
    };
  }
  return win.gtag;
}

/**
 * Inicializa Consent Mode v2 com defaults estritamente restritivos antes de qualquer script.
 */
export function applyGoogleConsentDefault(state?: TrackingConsentState): GoogleConsentModeV2 {
  const current = state || getTrackingConsent();
  const mode = toGoogleConsentModeV2(current);

  if (typeof window !== 'undefined' && !googleConsentDefaultApplied) {
    const gtag = ensureGtagQueue();
    gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
      wait_for_update: 500,
    });
    googleConsentDefaultApplied = true;

    if (current.choiceMade) {
      gtag('consent', 'update', mode);
    }
  }

  return mode;
}

export function updateGoogleConsentMode(state: TrackingConsentState): GoogleConsentModeV2 {
  const mode = toGoogleConsentModeV2(state);
  if (typeof window !== 'undefined') {
    applyGoogleConsentDefault(state);
    const gtag = ensureGtagQueue();
    gtag('consent', 'update', mode);
  }
  return mode;
}

function persistAndNotifyConsent(next: TrackingConsentState): TrackingConsentState {
  inMemoryConsent = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(TRACKING_CONSENT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Silencioso em ambientes restritivos
    }
    updateGoogleConsentMode(next);
  }

  for (const listener of consentListeners) {
    try {
      listener(next);
    } catch {
      // Não interromper outros listeners
    }
  }

  return next;
}

export function acceptAllTrackingConsent(): TrackingConsentState {
  return persistAndNotifyConsent({
    version: TRACKING_CONSENT_VERSION,
    necessary: true,
    analytics: true,
    marketing: true,
    choiceMade: true,
    updatedAt: new Date().toISOString(),
  });
}

export function rejectNonEssentialTrackingConsent(): TrackingConsentState {
  return persistAndNotifyConsent({
    version: TRACKING_CONSENT_VERSION,
    necessary: true,
    analytics: false,
    marketing: false,
    choiceMade: true,
    updatedAt: new Date().toISOString(),
  });
}

export function saveCustomTrackingConsent(prefs: {
  analytics: boolean;
  marketing: boolean;
}): TrackingConsentState {
  return persistAndNotifyConsent({
    version: TRACKING_CONSENT_VERSION,
    necessary: true,
    analytics: Boolean(prefs.analytics),
    marketing: Boolean(prefs.marketing),
    choiceMade: true,
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeTrackingConsent(listener: ConsentListener): () => void {
  consentListeners.add(listener);
  return () => {
    consentListeners.delete(listener);
  };
}

export function openCookiePreferencesModal(): void {
  for (const listener of preferencesListeners) {
    listener(true);
  }
}

export function subscribeCookiePreferencesOpen(listener: PreferencesUiListener): () => void {
  preferencesListeners.add(listener);
  return () => {
    preferencesListeners.delete(listener);
  };
}
