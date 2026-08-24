// ==============================================================================
// VITA4ME — CENTRALIZED ANALYTICS & PRODUCT FUNNEL TRACKING
// PRIVACY-FIRST • NO PII • NO MEDICAL CONTENT • GA4 INTEGRATION
// ==============================================================================

export type AnalyticsEvent =
  // Aquisição e Cadastro
  | 'landing_view'
  | 'signup_started'
  | 'signup_completed'
  | 'login_completed'
  | 'onboarding_started'
  | 'onboarding_completed'
  // Ativação
  | 'exam_created'
  | 'document_uploaded'
  | 'health_indicator_created'
  | 'medication_created'
  | 'family_member_created'
  | 'ai_first_use'
  // Engajamento
  | 'ai_used'
  | 'exam_viewed'
  | 'dashboard_viewed'
  | 'family_profile_switched'
  // Monetização
  | 'paywall_viewed'
  | 'pricing_viewed'
  | 'plan_selected'
  | 'checkout_started'
  | 'trial_started'
  | 'subscription_activated'
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  | 'subscription_canceled'
  | 'payment_failed';

export interface EventProperties {
  plan_tier?: 'individual' | 'family' | 'free';
  billing_interval?: 'monthly' | 'yearly';
  ai_included?: boolean;
  source?: string;
  feature?: 'exam_explanation' | 'chat_assistant' | 'doc_analysis' | 'consultation_prep';
  category?: string;
  device_type?: 'mobile' | 'tablet' | 'desktop';
  is_family_context?: boolean;
  value?: number;
  currency?: string;
  [key: string]: any;
}

// Chaves estritamente proibidas para prevenir vazamento de dados de saúde ou PII
const PROHIBITED_KEYS = new Set([
  'name',
  'full_name',
  'email',
  'cpf',
  'phone',
  'date_of_birth',
  'birthDate',
  'exam',
  'title',
  'rawText',
  'result',
  'biomarker',
  'value_clinical',
  'medication',
  'dosage',
  'condition',
  'allergy',
  'diagnosis',
  'symptom',
  'prompt',
  'message',
  'response',
  'notes',
  'summary',
  'doctorName',
  'laboratory',
]);

const UTM_STORAGE_KEY = 'vita4me_utm_attribution_v1';
const AI_FIRST_USE_KEY = 'vita4me_ai_first_use_v1';

/**
 * Captura e persiste parâmetros UTM da URL na sessão
 */
export function captureUtmParameters(): void {
  if (typeof window === 'undefined') return;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    const utmData: Record<string, string> = {};

    let hasUtm = false;
    for (const key of utmKeys) {
      const val = urlParams.get(key);
      if (val) {
        utmData[key] = val.slice(0, 100); // Limite de caracteres de segurança
        hasUtm = true;
      }
    }

    if (hasUtm) {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmData));
    }
  } catch (err) {
    // Falha silenciosa para não quebrar a aplicação
  }
}

/**
 * Retorna os parâmetros UTM armazenados
 */
export function getStoredUtm(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Detecta o tipo de dispositivo de forma agregada
 */
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Sanitiza propriedades removendo qualquer dado sensível ou campo livre
 */
function sanitizeProperties(props?: EventProperties): Record<string, any> {
  if (!props) return {};

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(props)) {
    if (PROHIBITED_KEYS.has(key.toLowerCase())) {
      continue;
    }
    // Permite apenas primitivos simples (string curta, number, boolean)
    if (typeof value === 'string') {
      // Ignora strings longas que possam conter texto livre/laudos
      if (value.length <= 120 && !value.includes('@')) {
        clean[key] = value;
      }
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value;
    }
  }

  return clean;
}

/**
 * Inicialização condicional do Google Analytics 4
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;

  captureUtmParameters();

  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  // Se não configurado ou em modo dev sem chave, apenas loga e encerra
  if (!measurementId) {
    if (import.meta.env.DEV) {
      console.log('📊 [Analytics] GA4 desativado (VITE_GA_MEASUREMENT_ID ausente)');
    }
    return;
  }

  // Previne carregamento duplicado do script
  if (document.getElementById('ga4-script')) return;

  try {
    const script = document.createElement('script');
    script.id = 'ga4-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }
    (window as any).gtag = gtag;

    gtag('js', new Date());
    gtag('config', measurementId, {
      send_page_view: false, // Pageviews controlados manualmente para SPAs
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure',
    });

    if (import.meta.env.DEV) {
      console.log(`📊 [Analytics] GA4 inicializado com sucesso (${measurementId})`);
    }
  } catch (err) {
    console.error('Falha ao inicializar GA4:', err);
  }
}

/**
 * Registro de Visualização de Página (Page View)
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  const utm = getStoredUtm();

  if (import.meta.env.DEV) {
    console.log(`📊 [Analytics PageView] ${pagePath} (${pageTitle || ''})`, utm);
  }

  if (measurementId && typeof (window as any).gtag === 'function') {
    (window as any).gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle || document.title,
      ...utm,
    });
  }
}

/**
 * Função Central de Disparo de Eventos
 */
export function trackEvent(eventName: AnalyticsEvent, properties?: EventProperties): void {
  try {
    const cleanProps = sanitizeProperties(properties);
    const deviceType = getDeviceType();
    const utm = getStoredUtm();

    const payload = {
      ...cleanProps,
      device_type: deviceType,
      ...utm,
      timestamp: new Date().toISOString(),
    };

    // Modo Desenvolvimento: Console Debug
    if (import.meta.env.DEV) {
      console.log(`📊 [Analytics Event: ${eventName}]`, payload);
    }

    // Produção / GA4
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (measurementId && typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', eventName, payload);
    }
  } catch (err) {
    // Erros de telemetria nunca devem quebrar a experiência do usuário
    if (import.meta.env.DEV) {
      console.warn('Erro silencioso no trackEvent:', err);
    }
  }
}

/**
 * Helper para registrar o primeiro uso da IA com dedup
 */
export function trackAiUsage(feature: 'exam_explanation' | 'chat_assistant' | 'doc_analysis' | 'consultation_prep'): void {
  // Evento geral de engajamento com IA
  trackEvent('ai_used', { feature });

  // Detecção de primeiro uso na história do dispositivo/conta
  if (typeof window !== 'undefined') {
    const alreadyTracked = localStorage.getItem(AI_FIRST_USE_KEY);
    if (!alreadyTracked) {
      localStorage.setItem(AI_FIRST_USE_KEY, 'true');
      trackEvent('ai_first_use', { feature });
    }
  }
}
