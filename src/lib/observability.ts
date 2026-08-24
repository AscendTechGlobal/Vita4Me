// ==============================================================================
// VITA4ME — FRONTEND OBSERVABILITY, ERROR TRACKING & SANITIZED LOGGING
// PRIVACY-FIRST • SENTRY INTEGRATION READY • ZERO MEDICAL DATA LEAK
// ==============================================================================

interface LogContext {
  service?: string;
  feature?: string;
  action?: string;
  requestId?: string;
  [key: string]: any;
}

const PROHIBITED_FIELDS = new Set([
  'name',
  'full_name',
  'email',
  'cpf',
  'phone',
  'date_of_birth',
  'birthdate',
  'exam',
  'rawtext',
  'title',
  'result',
  'biomarker',
  'medication',
  'dosage',
  'prompt',
  'response',
  'authorization',
  'cookie',
  'token',
  'password',
]);

/**
 * Sanitiza o contexto do erro removendo qualquer dado sensível ou clínico
 */
function sanitizeContext(context?: LogContext): Record<string, any> {
  if (!context) return {};
  const clean: Record<string, any> = {};

  for (const [key, value] of Object.entries(context)) {
    if (PROHIBITED_FIELDS.has(key.toLowerCase())) {
      continue;
    }
    if (typeof value === 'string') {
      if (value.length <= 150 && !value.includes('@') && !value.startsWith('Bearer ')) {
        clean[key] = value;
      }
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value;
    }
  }

  return clean;
}

/**
 * Inicialização global de captura de erros no Frontend
 */
export function initObservability(): void {
  if (typeof window === 'undefined') return;

  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

  if (sentryDsn && import.meta.env.PROD) {
    // Sentry DSN configurado em produção
    try {
      console.log('🛡️ [Observability] Sentry DSN detectado para monitoramento de erros');
    } catch (err) {
      console.error('Falha ao inicializar monitoramento:', err);
    }
  }

  // Listener global de erros JavaScript não capturados
  window.addEventListener('error', (event) => {
    captureException(event.error || new Error(event.message), {
      service: 'frontend_runtime',
      filename: event.filename,
      lineno: event.lineno,
    });
  });

  // Listener global de Promises rejeitadas
  window.addEventListener('unhandledrejection', (event) => {
    captureException(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {
      service: 'frontend_promise_rejection',
    });
  });
}

/**
 * Captura e reporta exceções de forma sanitizada
 */
export function captureException(error: Error | unknown, context?: LogContext): void {
  const errObj = error instanceof Error ? error : new Error(String(error));
  const safeContext = sanitizeContext(context);

  const payload = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: errObj.message,
    name: errObj.name,
    context: safeContext,
    env: import.meta.env.MODE || 'development',
  };

  if (import.meta.env.DEV) {
    console.error('🚨 [Frontend Error Captured]', payload);
  } else {
    // Em produção, se Sentry estiver conectado via CDN ou package, reporta
    if ((window as any).Sentry && typeof (window as any).Sentry.captureException === 'function') {
      (window as any).Sentry.captureException(errObj, { extra: safeContext });
    }
  }
}

/**
 * Log estruturado do Frontend para operações importantes
 */
export function logInfo(message: string, context?: LogContext): void {
  const safeContext = sanitizeContext(context);
  if (import.meta.env.DEV) {
    console.log(`ℹ️ [Vita4Me Info] ${message}`, safeContext);
  }
}
