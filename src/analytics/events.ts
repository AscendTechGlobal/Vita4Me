export type EventDestination = 'INTERNAL_ONLY' | 'ANALYTICS_ALLOWED' | 'MARKETING_ALLOWED';

export type AnalyticsEvent =
  // Funil de Aquisição & Cadastro
  | 'landing_view'
  | 'cta_clicked'
  | 'signup_started'
  | 'signup_completed'
  | 'login_completed'
  | 'oauth_initiated'
  // Onboarding
  | 'onboarding_started'
  | 'onboarding_completed'
  // Monetização & Funil Pago
  | 'pricing_viewed'
  | 'plan_selected'
  | 'paywall_viewed'
  | 'checkout_started'
  | 'trial_started'
  | 'subscription_started'
  | 'subscription_activated'
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  | 'subscription_cancelled'
  | 'subscription_canceled'
  | 'payment_failed'
  // Produto Interno & Eventos de Saúde (INTERNAL_ONLY)
  | 'family_member_created'
  | 'family_profile_switched'
  | 'exam_upload_started'
  | 'exam_upload_completed'
  | 'exam_created'
  | 'document_uploaded'
  | 'ai_analysis_started'
  | 'ai_analysis_completed'
  | 'ai_first_use'
  | 'ai_used'
  | 'drawer_opened'
  | 'exam_viewed'
  | 'health_indicator_created'
  | 'medication_created'
  | 'dashboard_viewed';

export interface EventProperties {
  plan?: 'individual' | 'family' | 'free';
  plan_tier?: 'individual' | 'family' | 'free';
  billing_period?: 'monthly' | 'yearly';
  billing_interval?: 'monthly' | 'yearly';
  source_surface?: 'landing' | 'pricing' | 'app' | 'auth' | 'legal' | 'settings';
  source?: string;
  cta_id?: string;
  device_type?: 'mobile' | 'tablet' | 'desktop';
  value?: number;
  currency?: string;
  event_id?: string;
  transaction_id?: string;
  provider?: 'stripe' | 'asaas' | 'google' | 'email_password';
  has_file?: boolean;
  file_type?: 'pdf' | 'image';
  step?: string;
  [key: string]: unknown;
}

/**
 * Classificação explícita por destino de privacidade:
 * - INTERNAL_ONLY: nunca enviado a Google (GTM/GA4/Ads), Meta Pixel ou Microsoft Clarity.
 * - ANALYTICS_ALLOWED: elegível apenas para analytics agregado (GA4 via GTM / GA4 / Clarity público) com consentimento ANALYTICS.
 * - MARKETING_ALLOWED: elegível para Analytics (se consentido ANALYTICS) e Marketing/Ads/Meta (se consentido MARKETING).
 */
export const EVENT_DESTINATION_MAP: Record<AnalyticsEvent, EventDestination> = {
  landing_view: 'ANALYTICS_ALLOWED',
  cta_clicked: 'ANALYTICS_ALLOWED',
  signup_started: 'ANALYTICS_ALLOWED',
  signup_completed: 'MARKETING_ALLOWED',
  login_completed: 'ANALYTICS_ALLOWED',
  oauth_initiated: 'ANALYTICS_ALLOWED',
  onboarding_started: 'INTERNAL_ONLY',
  onboarding_completed: 'INTERNAL_ONLY',

  pricing_viewed: 'MARKETING_ALLOWED',
  plan_selected: 'MARKETING_ALLOWED',
  paywall_viewed: 'ANALYTICS_ALLOWED',
  checkout_started: 'MARKETING_ALLOWED',
  trial_started: 'MARKETING_ALLOWED',
  subscription_started: 'MARKETING_ALLOWED',
  subscription_activated: 'MARKETING_ALLOWED',
  subscription_upgraded: 'ANALYTICS_ALLOWED',
  subscription_downgraded: 'ANALYTICS_ALLOWED',
  subscription_cancelled: 'ANALYTICS_ALLOWED',
  subscription_canceled: 'ANALYTICS_ALLOWED',
  payment_failed: 'ANALYTICS_ALLOWED',

  family_member_created: 'INTERNAL_ONLY',
  family_profile_switched: 'INTERNAL_ONLY',
  exam_upload_started: 'INTERNAL_ONLY',
  exam_upload_completed: 'INTERNAL_ONLY',
  exam_created: 'INTERNAL_ONLY',
  document_uploaded: 'INTERNAL_ONLY',
  ai_analysis_started: 'INTERNAL_ONLY',
  ai_analysis_completed: 'INTERNAL_ONLY',
  ai_first_use: 'INTERNAL_ONLY',
  ai_used: 'INTERNAL_ONLY',
  drawer_opened: 'INTERNAL_ONLY',
  exam_viewed: 'INTERNAL_ONLY',
  health_indicator_created: 'INTERNAL_ONLY',
  medication_created: 'INTERNAL_ONLY',
  dashboard_viewed: 'INTERNAL_ONLY',
};

const PROHIBITED_KEYS = new Set([
  'name',
  'full_name',
  'fullname',
  'patient',
  'patient_name',
  'member_name',
  'email',
  'user_email',
  'cpf',
  'cnpj',
  'phone',
  'telefone',
  'date_of_birth',
  'birthdate',
  'dob',
  'exam',
  'exam_name',
  'title',
  'rawtext',
  'raw_text',
  'result',
  'biomarker',
  'value_clinical',
  'medication',
  'dosage',
  'condition',
  'allergy',
  'diagnosis',
  'symptom',
  'symptoms',
  'prompt',
  'message',
  'response',
  'notes',
  'summary',
  'ai_summary',
  'ai_simple_translation',
  'doctorname',
  'doctor_name',
  'laboratory',
  'file_url',
  'signed_url',
  'token',
  'token_hash',
  'access_token',
  'refresh_token',
  'password',
  'user_id',
  'userid',
  'family_member_id',
  'patient_id',
  'health_record',
  'glucose',
  'cholesterol',
  'hemoglobin',
  'tsh',
  'cid',
  'diagnosis_code',
  'allergies',
  'medications',
  'appointments',
  'consulta',
  'birth_date',
  'address',
  'endereco',
  'ip',
  'ip_address',
]);

const SAFE_EXTERNAL_KEYS = new Set([
  'plan',
  'plan_tier',
  'billing_period',
  'billing_interval',
  'source_surface',
  'source',
  'cta_id',
  'device_type',
  'value',
  'currency',
  'event_id',
  'transaction_id',
  'provider',
  'step',
]);

const SENSITIVE_ROUTE_PREFIXES = ['/reset-password', '/auth/confirm'];

const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'token_hash',
  'code',
  'type',
  'access_token',
  'refresh_token',
  'provider_token',
  'recovery',
  'email',
  'error',
  'error_code',
  'error_description',
  'name',
  'cpf',
  'phone',
  'password',
  'diagnosis',
  'medication',
  'exam',
]);

const ALLOWED_UTM_AND_CLICK_QUERY_KEYS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid',
  'msclkid',
  'plan',
]);

function looksLikeSensitiveValue(val: string): boolean {
  if (!val) return false;
  if (val.includes('@')) return true;
  if (/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(val)) return true;
  if (/Bearer\s+/i.test(val) || /^eyJ[A-Za-z0-9_-]+\./.test(val)) return true;
  return false;
}

export function sanitizeTrackingPath(rawPath: string): string {
  if (!rawPath || typeof rawPath !== 'string') return '/';

  let pathname = rawPath.trim();
  let search = '';

  try {
    const parsed = new URL(pathname, 'https://vita4me.com');
    pathname = parsed.pathname || '/';
    search = parsed.search || '';
  } catch {
    const qIdx = pathname.indexOf('?');
    const hIdx = pathname.indexOf('#');
    const cut = [qIdx, hIdx].filter((i) => i >= 0).sort((a, b) => a - b)[0];
    if (cut !== undefined) {
      if (qIdx >= 0 && (hIdx < 0 || qIdx < hIdx)) {
        search = pathname.slice(qIdx, hIdx >= 0 ? hIdx : undefined);
      }
      pathname = pathname.slice(0, cut) || '/';
    }
  }

  // Nunca anexar query strings ou fragmentos em rotas de autenticação / recovery
  if (SENSITIVE_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return pathname;
  }

  // Rotas autenticadas da área clínica nunca propagam query strings para fora
  if (pathname.startsWith('/app')) {
    return pathname;
  }

  if (!search) return pathname;

  const params = new URLSearchParams(search);
  const safeParams = new URLSearchParams();
  for (const [k, v] of params.entries()) {
    const lower = k.toLowerCase();
    if (SENSITIVE_QUERY_KEYS.has(lower)) continue;
    if (!ALLOWED_UTM_AND_CLICK_QUERY_KEYS.has(lower)) continue;
    if (!v || v.length > 100 || looksLikeSensitiveValue(v)) continue;
    safeParams.set(lower, v);
  }

  const serialized = safeParams.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

export function sanitizeTrackingUrl(rawUrl: string): string {
  const pathWithSafeQuery = sanitizeTrackingPath(rawUrl);
  return `https://vita4me.com${pathWithSafeQuery.startsWith('/') ? '' : '/'}${pathWithSafeQuery}`;
}

export function sanitizeTrackingPayload(
  eventName: AnalyticsEvent,
  properties?: EventProperties,
  options?: { externalDestination?: boolean }
): Record<string, string | number | boolean> {
  if (!properties || typeof properties !== 'object') return {};

  const destination = EVENT_DESTINATION_MAP[eventName] || 'INTERNAL_ONLY';
  const strictExternal = options?.externalDestination ?? destination !== 'INTERNAL_ONLY';
  const clean: Record<string, string | number | boolean> = {};

  for (const [rawKey, rawVal] of Object.entries(properties)) {
    const key = rawKey.trim();
    const lower = key.toLowerCase();
    if (PROHIBITED_KEYS.has(lower)) continue;
    if (strictExternal && !SAFE_EXTERNAL_KEYS.has(lower)) continue;

    if (typeof rawVal === 'string') {
      const trimmed = rawVal.trim();
      if (!trimmed || trimmed.length > 80 || looksLikeSensitiveValue(trimmed)) continue;
      clean[key] = trimmed;
    } else if (typeof rawVal === 'number' && Number.isFinite(rawVal)) {
      clean[key] = rawVal;
    } else if (typeof rawVal === 'boolean') {
      clean[key] = rawVal;
    }
  }

  return clean;
}

export function isSensitiveAuthenticatedPath(pathname: string): boolean {
  const cleanPath = sanitizeTrackingPath(pathname).split('?')[0];
  return (
    cleanPath.startsWith('/app') ||
    cleanPath.startsWith('/reset-password') ||
    cleanPath.startsWith('/auth/confirm')
  );
}
