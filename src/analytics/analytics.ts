async function getAuthHeadersSafe(): Promise<Record<string, string>> {
  const { getAuthHeaders } = await import('../lib/apiClient');
  return getAuthHeaders();
}
import {
  applyConsentToAttribution,
  captureAttributionFromLocation,
  getActiveUtmContext,
  getAttributionSnapshot,
  syncAttributionToBackend,
} from './attribution';
import {
  applyGoogleConsentDefault,
  getTrackingConsent,
  subscribeTrackingConsent,
  TrackingConsentState,
  updateGoogleConsentMode,
} from './consent';
import {
  AnalyticsEvent,
  EVENT_DESTINATION_MAP,
  EventDestination,
  EventProperties,
  isSensitiveAuthenticatedPath,
  sanitizeTrackingPath,
  sanitizeTrackingPayload,
  sanitizeTrackingUrl,
} from './events';
import { syncClarityForRoute } from './providers/clarity';
import { dispatchGoogleAdsConversion, initGoogleAdsProvider } from './providers/googleAds';
import { getGtmId, initGtmProvider, pushToDataLayer } from './providers/gtm';

const AI_FIRST_USE_KEY = 'vita4me_ai_first_use_v1';

let analyticsInitialized = false;
let consentUnsubscribe: (() => void) | null = null;
let lastTrackedPage: {
  path: string;
  title: string;
  analyticsDispatched: boolean;
  marketingDispatched: boolean;
} | null = null;

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getCurrentPathname(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
}

function revokeGtmManagedMetaConsentIfPresent(): void {
  if (typeof window === 'undefined') return;
  const win = window as unknown as { fbq?: (...args: unknown[]) => void };
  if (typeof win.fbq === 'function') {
    try {
      win.fbq('consent', 'revoke');
    } catch {
      // Silencioso
    }
  }
}

function emitConsentedPageViewForCurrentState(
  cleanPath: string,
  pageTitle: string,
  consent: TrackingConsentState
): void {
  if (!lastTrackedPage || lastTrackedPage.path !== cleanPath) {
    lastTrackedPage = {
      path: cleanPath,
      title: pageTitle,
      analyticsDispatched: false,
      marketingDispatched: false,
    };
  }

  if (!consent.choiceMade || (!consent.analytics && !consent.marketing)) return;
  if (!getGtmId()) return;

  const cleanUrl = sanitizeTrackingUrl(cleanPath);
  const utm = getActiveUtmContext(consent);
  const safeTitle = isSensitiveAuthenticatedPath(cleanPath)
    ? 'Vita4Me — Área Privada'
    : (pageTitle || (typeof document !== 'undefined' ? document.title : 'Vita4Me')).slice(0, 120);

  const shouldSendAnalytics = consent.analytics && !lastTrackedPage.analyticsDispatched;
  const shouldSendMarketing = consent.marketing && !lastTrackedPage.marketingDispatched && !isSensitiveAuthenticatedPath(cleanPath);

  if (shouldSendAnalytics || shouldSendMarketing) {
    pushToDataLayer({
      event: 'page_view',
      page_path: cleanPath,
      page_location: cleanUrl,
      page_title: safeTitle,
      ...utm,
    });
    if (consent.analytics) lastTrackedPage.analyticsDispatched = true;
    if (consent.marketing) lastTrackedPage.marketingDispatched = true;
  }
}

function activateConsentedProviders(consent: TrackingConsentState): void {
  updateGoogleConsentMode(consent);
  applyConsentToAttribution(consent);

  const currentPath = sanitizeTrackingPath(getCurrentPathname());

  if (!consent.choiceMade || (!consent.analytics && !consent.marketing)) {
    revokeGtmManagedMetaConsentIfPresent();
    syncClarityForRoute('/app'); // pausa gravação imediatamente ao revogar analytics
    return;
  }

  // GTM (GTM-N9WNJPJ5) é a camada única de governança para GA4 e Meta Pixel (zero scripts diretos duplicados)
  initGtmProvider();
  if (consent.analytics) {
    syncClarityForRoute(currentPath);
  } else {
    syncClarityForRoute('/app');
  }

  if (consent.marketing) {
    initGoogleAdsProvider();
  } else {
    revokeGtmManagedMetaConsentIfPresent();
  }

  emitConsentedPageViewForCurrentState(
    currentPath,
    typeof document !== 'undefined' ? document.title : 'Vita4Me',
    consent
  );
}

async function sendInternalProductEvent(
  eventName: AnalyticsEvent,
  properties: Record<string, string | number | boolean>
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const headers = await getAuthHeadersSafe();
    if (!headers.Authorization) return;

    const attribution = getAttributionSnapshot();
    await fetch('/api/analytics/events', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        eventName,
        classification: EVENT_DESTINATION_MAP[eventName],
        properties,
        attributionSnapshot: attribution.first_touch || attribution.last_touch ? attribution : undefined,
        eventId: typeof properties.event_id === 'string' ? properties.event_id : undefined,
      }),
    });
  } catch {
    // Erros de telemetria nunca interrompem a aplicação
  }
}

export async function syncAuthenticatedAnalyticsContext(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const headers = await getAuthHeadersSafe();
    if (!headers.Authorization) return;

    const consent = getTrackingConsent();
    if (consent.choiceMade) {
      await fetch('/api/analytics/consent', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          version: consent.version,
          analytics: consent.analytics,
          marketing: consent.marketing,
          source: 'cmp_sync',
        }),
      }).catch(() => {});
    }

    await syncAttributionToBackend(headers);
  } catch {
    // Silencioso
  }
}

export function initAnalytics(): void {
  if (typeof window === 'undefined') return;

  const currentConsent = getTrackingConsent();
  applyGoogleConsentDefault(currentConsent);
  captureAttributionFromLocation({ consent: currentConsent });

  if (!analyticsInitialized) {
    analyticsInitialized = true;
    consentUnsubscribe = subscribeTrackingConsent((nextConsent) => {
      activateConsentedProviders(nextConsent);
      void syncAuthenticatedAnalyticsContext();
    });
  }

  activateConsentedProviders(currentConsent);
}

export function resetAnalyticsForTests(): void {
  if (consentUnsubscribe) {
    consentUnsubscribe();
    consentUnsubscribe = null;
  }
  analyticsInitialized = false;
  lastTrackedPage = null;
}

export function trackPageView(rawPath: string, pageTitle?: string): void {
  try {
    const cleanPath = sanitizeTrackingPath(rawPath);
    const resolvedTitle = (pageTitle || (typeof document !== 'undefined' ? document.title : 'Vita4Me')).slice(0, 120);

    const consent = getTrackingConsent();
    syncClarityForRoute(cleanPath);

    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.log(`📊 [Analytics PageView] ${cleanPath} (${resolvedTitle})`);
    }

    emitConsentedPageViewForCurrentState(cleanPath, resolvedTitle, consent);
  } catch {
    // Nunca quebrar navegação
  }
}

export function trackEvent(eventName: AnalyticsEvent, properties?: EventProperties): void {
  try {
    const destination = EVENT_DESTINATION_MAP[eventName] || 'INTERNAL_ONLY';
    const consent = getTrackingConsent();
    const deviceType = getDeviceType();

    const cleanInternalProps = sanitizeTrackingPayload(eventName, properties, { externalDestination: false });
    const cleanExternalProps = sanitizeTrackingPayload(eventName, properties, { externalDestination: true });
    const utm = getActiveUtmContext(consent);

    const internalPayload: Record<string, string | number | boolean> = {
      ...cleanInternalProps,
      device_type: deviceType,
      ...(consent.choiceMade && consent.analytics ? utm : {}),
    };

    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.log(`📊 [Analytics:${destination}] ${eventName}`, internalPayload);
    }

    // Registra evento interno autenticado (evitando reenvio para eventos originados em webhooks server-side)
    if (cleanInternalProps.source !== 'server_confirmed') {
      void sendInternalProductEvent(eventName, internalPayload);
    }

    // Eventos de saúde ou privados (INTERNAL_ONLY) NUNCA saem para GTM/GA4/Ads/Meta/Clarity
    if (destination === 'INTERNAL_ONLY') {
      return;
    }

    if (!consent.choiceMade) {
      return;
    }

    const externalPayload: Record<string, string | number | boolean> = {
      ...cleanExternalProps,
      device_type: deviceType,
      ...utm,
    };

    if (destination === 'ANALYTICS_ALLOWED') {
      if (!consent.analytics) return;
      if (getGtmId()) {
        pushToDataLayer({ event: eventName, ...externalPayload });
      }
      return;
    }

    // MARKETING_ALLOWED: GTM governa GA4 e Meta Pixel via dataLayer + Consent Mode v2 (sem scripts duplicados)
    if ((consent.analytics || consent.marketing) && getGtmId()) {
      pushToDataLayer({ event: eventName, ...externalPayload });
    }

    if (consent.marketing) {
      if (eventName === 'signup_completed' || eventName === 'trial_started' || eventName === 'subscription_started') {
        dispatchGoogleAdsConversion(eventName, externalPayload);
      } else if (eventName === 'subscription_activated') {
        dispatchGoogleAdsConversion('subscription_started', externalPayload);
      }
    }
  } catch {
    // Nunca quebrar fluxo da aplicação
  }
}

export function trackAiUsage(
  feature: 'exam_explanation' | 'chat_assistant' | 'doc_analysis' | 'consultation_prep'
): void {
  trackEvent('ai_used', { feature });
  if (typeof window !== 'undefined') {
    try {
      const alreadyTracked = window.localStorage.getItem(AI_FIRST_USE_KEY);
      if (!alreadyTracked) {
        window.localStorage.setItem(AI_FIRST_USE_KEY, 'true');
        trackEvent('ai_first_use', { feature });
      }
    } catch {
      // Silencioso
    }
  }
}

export { getStoredUtmCompatibility as getStoredUtm };
function getStoredUtmCompatibility(): Record<string, string> {
  return getActiveUtmContext();
}

export type { AnalyticsEvent, EventProperties, EventDestination };
export { EVENT_DESTINATION_MAP, sanitizeTrackingPath, sanitizeTrackingPayload };
