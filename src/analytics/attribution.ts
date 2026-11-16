import { getTrackingConsent, TrackingConsentState } from './consent';
import { sanitizeTrackingPath } from './events';

export const ATTRIBUTION_STORAGE_KEY = 'vita4me_attribution_v1';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const CLICK_ID_KEYS = ['gclid', 'fbclid', 'msclkid'] as const;

export interface AttributionTouch {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  msclkid?: string;
  landing_path?: string;
  referrer_host?: string;
  captured_at: string;
}

export interface AttributionState {
  first_touch: AttributionTouch | null;
  last_touch: AttributionTouch | null;
}

let volatileIncomingTouch: AttributionTouch | null = null;
let lastSyncedSignature: string | null = null;

function cleanParam(val: string | null, maxLen = 100): string | undefined {
  if (!val) return undefined;
  const trimmed = val.trim().slice(0, maxLen);
  if (!trimmed || trimmed.includes('@')) return undefined;
  return trimmed;
}

function extractReferrerHost(referrer?: string): string | undefined {
  if (!referrer) return undefined;
  try {
    const parsed = new URL(referrer);
    const host = parsed.hostname.toLowerCase();
    if (!host || host === 'vita4me.com' || host.endsWith('.vita4me.com')) {
      return undefined;
    }
    return host.slice(0, 120);
  } catch {
    return undefined;
  }
}

export function buildTouchFromUrl(params: {
  search: string;
  pathname: string;
  referrer?: string;
  nowIso?: string;
}): { touch: AttributionTouch; hasCampaignOrClickSignal: boolean } {
  const urlParams = new URLSearchParams(params.search.startsWith('?') ? params.search.slice(1) : params.search);
  const touch: AttributionTouch = {
    landing_path: sanitizeTrackingPath(params.pathname).split('?')[0],
    captured_at: params.nowIso || new Date().toISOString(),
  };

  let hasSignal = false;
  for (const key of UTM_KEYS) {
    const cleaned = cleanParam(urlParams.get(key));
    if (cleaned) {
      touch[key] = cleaned;
      hasSignal = true;
    }
  }

  for (const key of CLICK_ID_KEYS) {
    const cleaned = cleanParam(urlParams.get(key), 150);
    if (cleaned) {
      touch[key] = cleaned;
      hasSignal = true;
    }
  }

  const refHost = extractReferrerHost(params.referrer);
  if (refHost) {
    touch.referrer_host = refHost;
  }

  return { touch, hasCampaignOrClickSignal: hasSignal };
}

function filterTouchByConsent(touch: AttributionTouch | null, consent: TrackingConsentState): AttributionTouch | null {
  if (!touch || !consent.choiceMade || (!consent.analytics && !consent.marketing)) {
    return null;
  }

  const filtered: AttributionTouch = {
    landing_path: touch.landing_path,
    captured_at: touch.captured_at,
  };
  for (const k of UTM_KEYS) {
    if (touch[k]) filtered[k] = touch[k];
  }
  if (touch.referrer_host) {
    filtered.referrer_host = touch.referrer_host;
  }
  if (consent.marketing) {
    for (const k of CLICK_ID_KEYS) {
      if (touch[k]) filtered[k] = touch[k];
    }
  }
  return filtered;
}

function readStoredAttributionRaw(): AttributionState {
  if (typeof window === 'undefined') return { first_touch: null, last_touch: null };
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return { first_touch: null, last_touch: null };
    const parsed = JSON.parse(raw) as Partial<AttributionState>;
    return {
      first_touch: parsed.first_touch || null,
      last_touch: parsed.last_touch || null,
    };
  } catch {
    return { first_touch: null, last_touch: null };
  }
}

function writeStoredAttribution(state: AttributionState): void {
  if (typeof window === 'undefined') return;
  try {
    if (!state.first_touch && !state.last_touch) {
      window.localStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
    } else {
      window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Silencioso em sandbox/iframe
  }
}

export function resetVolatileAttributionForTests(): void {
  volatileIncomingTouch = null;
  lastSyncedSignature = null;
}

export function mergeAttributionTouch(
  existing: AttributionState,
  incoming: AttributionTouch,
  hasSignal: boolean,
  consent: TrackingConsentState
): AttributionState {
  const sanitizedIncoming = filterTouchByConsent(incoming, consent);
  if (!sanitizedIncoming) {
    return { first_touch: null, last_touch: null };
  }

  const nextFirst = filterTouchByConsent(existing.first_touch, consent) || sanitizedIncoming;
  const shouldUpdateLast =
    !existing.last_touch ||
    hasSignal ||
    Boolean(sanitizedIncoming.referrer_host);

  const nextLast = shouldUpdateLast
    ? sanitizedIncoming
    : filterTouchByConsent(existing.last_touch, consent) || nextFirst;

  return {
    first_touch: nextFirst,
    last_touch: nextLast,
  };
}

/**
 * Captura parâmetros de atribuição da navegação atual.
 * Antes do consentimento, mantém apenas em memória volátil da aba; só persiste após escolha consentida.
 */
export function captureAttributionFromLocation(override?: {
  search?: string;
  pathname?: string;
  referrer?: string;
  consent?: TrackingConsentState;
}): AttributionState {
  const consent = override?.consent || getTrackingConsent();
  const search = override?.search ?? (typeof window !== 'undefined' ? window.location.search : '');
  const pathname = override?.pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const referrer = override?.referrer ?? (typeof document !== 'undefined' ? document.referrer : '');

  const { touch, hasCampaignOrClickSignal } = buildTouchFromUrl({ search, pathname, referrer });

  if (!volatileIncomingTouch || hasCampaignOrClickSignal) {
    volatileIncomingTouch = touch;
  }

  if (!consent.choiceMade || (!consent.analytics && !consent.marketing)) {
    return { first_touch: null, last_touch: null };
  }

  const currentStored = readStoredAttributionRaw();
  const merged = mergeAttributionTouch(currentStored, touch, hasCampaignOrClickSignal, consent);
  writeStoredAttribution(merged);
  return merged;
}

/**
 * Reaplica regras de retenção quando o usuário concede ou revoga consentimento no CMP.
 */
export function applyConsentToAttribution(consent: TrackingConsentState): AttributionState {
  if (!consent.choiceMade || (!consent.analytics && !consent.marketing)) {
    writeStoredAttribution({ first_touch: null, last_touch: null });
    return { first_touch: null, last_touch: null };
  }

  const stored = readStoredAttributionRaw();
  if (volatileIncomingTouch) {
    const hasSignal = Boolean(
      UTM_KEYS.some((k) => volatileIncomingTouch?.[k]) ||
      (consent.marketing && CLICK_ID_KEYS.some((k) => volatileIncomingTouch?.[k]))
    );
    const merged = mergeAttributionTouch(stored, volatileIncomingTouch, hasSignal, consent);
    writeStoredAttribution(merged);
    return merged;
  }

  const filtered: AttributionState = {
    first_touch: filterTouchByConsent(stored.first_touch, consent),
    last_touch: filterTouchByConsent(stored.last_touch, consent),
  };
  writeStoredAttribution(filtered);
  return filtered;
}

export function getAttributionSnapshot(consentOverride?: TrackingConsentState): AttributionState {
  const consent = consentOverride || getTrackingConsent();
  if (!consent.choiceMade || (!consent.analytics && !consent.marketing)) {
    return { first_touch: null, last_touch: null };
  }
  const stored = readStoredAttributionRaw();
  return {
    first_touch: filterTouchByConsent(stored.first_touch, consent),
    last_touch: filterTouchByConsent(stored.last_touch, consent),
  };
}

/**
 * Retorna UTMs seguros para enriquecer eventos internos/analytics (sem click IDs quando marketing=false).
 */
export function getActiveUtmContext(consentOverride?: TrackingConsentState): Record<string, string> {
  const snapshot = getAttributionSnapshot(consentOverride);
  const touch = snapshot.last_touch || snapshot.first_touch;
  if (!touch) return {};
  const result: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    if (touch[key]) result[key] = touch[key]!;
  }
  return result;
}

/**
 * Sincroniza atribuição consentida com o backend (Supabase user_attribution com RLS).
 */
export async function syncAttributionToBackend(headers: Record<string, string>): Promise<void> {
  if (typeof window === 'undefined') return;
  const consent = getTrackingConsent();
  const snapshot = getAttributionSnapshot(consent);
  if (!snapshot.first_touch && !snapshot.last_touch) return;

  const signature = JSON.stringify(snapshot);
  if (signature === lastSyncedSignature) return;

  try {
    const res = await fetch('/api/analytics/attribution', {
      method: 'POST',
      headers,
      body: JSON.stringify(snapshot),
    });
    if (res.ok) {
      lastSyncedSignature = signature;
    }
  } catch {
    // Telemetria nunca bloqueia o fluxo do usuário
  }
}
