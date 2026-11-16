// Re-export central para manter compatibilidade com importações existentes em src/lib/analytics
export {
  initAnalytics,
  resetAnalyticsForTests,
  syncAuthenticatedAnalyticsContext,
  trackPageView,
  trackEvent,
  trackAiUsage,
  getStoredUtm,
  EVENT_DESTINATION_MAP,
  sanitizeTrackingPath,
  sanitizeTrackingPayload,
} from '../analytics/analytics';

export type { AnalyticsEvent, EventProperties, EventDestination } from '../analytics/events';
