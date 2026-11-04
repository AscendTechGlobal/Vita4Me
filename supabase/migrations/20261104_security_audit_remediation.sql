-- ============================================================================
-- MIGRATION: 20261104_security_audit_remediation.sql
-- VITA4ME — REMEDIAÇÃO DE AUDITORIA DE SEGURANÇA (A01–A10 + RLS + STORAGE + RPC)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ALINHAMENTO DE SCHEMA: lab_exams & health_records (A07)
-- Garante compatibilidade entre colunas históricas (status_alert / status e
-- doctor_name / facility_name / doctor_or_institution) sem perda de dados.
-- ----------------------------------------------------------------------------
ALTER TABLE public.lab_exams
  ADD COLUMN IF NOT EXISTS status_alert TEXT DEFAULT 'Normal',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'normal' CHECK (status IN ('normal', 'warning', 'error'));

UPDATE public.lab_exams
SET status = CASE
  WHEN status_alert ILIKE '%alerta%' OR status_alert ILIKE '%crític%' OR status_alert ILIKE '%error%' THEN 'error'
  WHEN status_alert ILIKE '%aten%' OR status_alert ILIKE '%warn%' THEN 'warning'
  ELSE 'normal'
END
WHERE status IS NULL;

ALTER TABLE public.health_records
  ADD COLUMN IF NOT EXISTS doctor_name TEXT,
  ADD COLUMN IF NOT EXISTS facility_name TEXT,
  ADD COLUMN IF NOT EXISTS doctor_or_institution TEXT;

UPDATE public.health_records
SET doctor_or_institution = COALESCE(doctor_or_institution, doctor_name, facility_name)
WHERE doctor_or_institution IS NULL AND (doctor_name IS NOT NULL OR facility_name IS NOT NULL);

-- Relaxar CHECK restritivo de status em health_indicators se existir versão legada
ALTER TABLE public.health_indicators
  DROP CONSTRAINT IF EXISTS health_indicators_status_check;

ALTER TABLE public.health_indicators
  ADD CONSTRAINT health_indicators_status_check
  CHECK (status IN ('low', 'normal', 'borderline', 'high', 'critical', 'alerta'));

-- ----------------------------------------------------------------------------
-- 2. TABELA AUDITÁVEL DE CONSENTIMENTOS (A03 — LGPD Art. 8º e Art. 11)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('terms_of_use', 'privacy_policy', 'health_data_processing')),
  document_version TEXT NOT NULL DEFAULT '2.0',
  accepted BOOLEAN NOT NULL DEFAULT TRUE CHECK (accepted = TRUE),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'web_signup',
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON public.user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type_version ON public.user_consents(user_id, consent_type, document_version);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own consents" ON public.user_consents;
CREATE POLICY "Users can view own consents"
  ON public.user_consents
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own consents" ON public.user_consents;
CREATE POLICY "Users can insert own consents"
  ON public.user_consents
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id AND accepted = TRUE);

-- Nota: Não há políticas UPDATE/DELETE para usuários autenticados em user_consents
-- para preservar a trilha de auditoria imutável (append-only).

-- ----------------------------------------------------------------------------
-- 3. TABELA DE AUDITORIA DE EVENTOS SENSÍVEIS DE SEGURANÇA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON public.security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type ON public.security_audit_logs(event_type);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own security logs" ON public.security_audit_logs;
CREATE POLICY "Users can view own security logs"
  ON public.security_audit_logs
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own security logs" ON public.security_audit_logs;
CREATE POLICY "Users can insert own security logs"
  ON public.security_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- 4. BLINDAGEM RLS CROSS-TENANT E VALIDAÇÃO DE family_member_id
-- Impede que um usuário associe um family_member_id pertencente a outro tenant
-- em lab_exams, health_indicators, medications, health_records ou daily_habits.
-- ----------------------------------------------------------------------------

-- 4.1. lab_exams
ALTER TABLE public.lab_exams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own exams" ON public.lab_exams;
CREATE POLICY "Users can manage own exams"
  ON public.lab_exams
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND (
      family_member_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.id = family_member_id
          AND fm.user_id = (select auth.uid())
      )
    )
  );

-- 4.2. health_indicators
ALTER TABLE public.health_indicators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own indicators" ON public.health_indicators;
CREATE POLICY "Users can manage own indicators"
  ON public.health_indicators
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND (
      family_member_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.id = family_member_id
          AND fm.user_id = (select auth.uid())
      )
    )
  );

-- 4.3. medications
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own medications" ON public.medications;
CREATE POLICY "Users can manage own medications"
  ON public.medications
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND (
      family_member_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.id = family_member_id
          AND fm.user_id = (select auth.uid())
      )
    )
  );

-- 4.4. health_records
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own health records" ON public.health_records;
CREATE POLICY "Users can manage own health records"
  ON public.health_records
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND (
      family_member_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.id = family_member_id
          AND fm.user_id = (select auth.uid())
      )
    )
  );

-- 4.5. daily_habits
ALTER TABLE public.daily_habits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own daily habits" ON public.daily_habits;
CREATE POLICY "Users can manage own daily habits"
  ON public.daily_habits
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND (
      family_member_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.id = family_member_id
          AND fm.user_id = (select auth.uid())
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 5. RPC delete_user_account() BLINDADA (A02 — LGPD Art. 18, VI)
-- Exclusão atômica vinculada exclusivamente a auth.uid(), sem parâmetros
-- externos que permitam excluir terceiros.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado: impossível excluir conta sem sessão válida.';
  END IF;

  -- 1. Remover arquivos do bucket privado medical-documents do próprio usuário
  DELETE FROM storage.objects
  WHERE bucket_id = 'medical-documents'
    AND (storage.foldername(name))[1] = v_user_id::text;

  -- 2. Remover registros clínicos em cascata explícita
  DELETE FROM public.daily_habits WHERE user_id = v_user_id;
  DELETE FROM public.health_records WHERE user_id = v_user_id;
  DELETE FROM public.medications WHERE user_id = v_user_id;
  DELETE FROM public.health_indicators WHERE user_id = v_user_id;
  DELETE FROM public.lab_exams WHERE user_id = v_user_id;
  DELETE FROM public.family_members WHERE user_id = v_user_id;
  DELETE FROM public.user_consents WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- 3. Remover usuário da tabela auth.users
  DELETE FROM auth.users WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'deleted', true,
    'user_id', v_user_id,
    'deleted_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. STORAGE BUCKET PRIVADO E RLS (medical-documents)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-documents',
  'medical-documents',
  false,
  15728640,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Users can upload own medical documents" ON storage.objects;
CREATE POLICY "Users can upload own medical documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'medical-documents'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can view own medical documents" ON storage.objects;
CREATE POLICY "Users can view own medical documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'medical-documents'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can update own medical documents" ON storage.objects;
CREATE POLICY "Users can update own medical documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'medical-documents'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'medical-documents'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can delete own medical documents" ON storage.objects;
CREATE POLICY "Users can delete own medical documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'medical-documents'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

