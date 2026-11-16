-- ==============================================================================
-- VITA4ME — ANALYTICS, ATTRIBUTION (FIRST/LAST TOUCH) & TRACKING CONSENT
-- Privacy-First: ZERO PII, ZERO clinical content, idempotent conversion tracking
-- ==============================================================================

-- 1. Tabela de Atribuição de Aquisição por Usuário (First-Touch & Last-Touch)
CREATE TABLE IF NOT EXISTS public.user_attribution (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_touch JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_touch JSONB NOT NULL DEFAULT '{}'::jsonb,
  first_touch_at TIMESTAMPTZ,
  last_touch_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_attribution ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own attribution" ON public.user_attribution;
CREATE POLICY "Users can view own attribution"
  ON public.user_attribution
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.user_attribution FROM public, anon, authenticated;
GRANT ALL ON public.user_attribution TO service_role;

-- 2. Tabela de Eventos de Produto & Conversões Verificadas Server-Side
CREATE TABLE IF NOT EXISTS public.product_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('INTERNAL_ONLY', 'ANALYTICS_ALLOWED', 'MARKETING_ALLOWED')),
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  attribution_snapshot JSONB,
  event_id TEXT,
  source TEXT NOT NULL DEFAULT 'client',
  client_dispatched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_analytics_user_created
  ON public.product_analytics_events (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_analytics_event_id
  ON public.product_analytics_events (event_id)
  WHERE event_id IS NOT NULL;

ALTER TABLE public.product_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own analytics events" ON public.product_analytics_events;
CREATE POLICY "Users can view own analytics events"
  ON public.product_analytics_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.product_analytics_events FROM public, anon, authenticated;
GRANT ALL ON public.product_analytics_events TO service_role;

-- 3. Registro de Consentimento de Cookies/Tracking (Analytics & Marketing)
CREATE TABLE IF NOT EXISTS public.tracking_consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_version TEXT NOT NULL,
  necessary_granted BOOLEAN NOT NULL DEFAULT TRUE,
  analytics_granted BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_granted BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'cmp_banner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_consent_logs_user
  ON public.tracking_consent_logs (user_id, created_at DESC);

ALTER TABLE public.tracking_consent_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tracking consent logs" ON public.tracking_consent_logs;
CREATE POLICY "Users can view own tracking consent logs"
  ON public.tracking_consent_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.tracking_consent_logs FROM public, anon, authenticated;
GRANT ALL ON public.tracking_consent_logs TO service_role;
