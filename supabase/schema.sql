-- ==============================================================================
-- HEALTH.AI — PLATAFORMA DE GESTÃO INTELIGENTE DE SAÚDE PESSOAL
-- SUPABASE POSTGRESQL MULTI-TENANT SCHEMA & ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- ==============================================================================
-- 2. TABELA: PROFILES (Perfis de Usuário & Assinaturas Stripe)
-- ==============================================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  date_of_birth date,
  blood_type text,
  gender text,
  height_cm numeric,
  weight_kg numeric,
  smoking_status text,
  alcohol_status text,
  activity_level text,
  chronic_conditions text[] default '{}',
  allergies text[] default '{}',
  emergency_contact_name text,
  emergency_contact_phone text,
  plan_tier text not null default 'individual' check (plan_tier in ('free', 'individual', 'family')),
  subscription_status text not null default 'inactive' check (subscription_status in ('active', 'inactive', 'past_due', 'canceled', 'trialing')),
  stripe_customer_id text,
  stripe_subscription_id text,
  ai_credits integer not null default 0,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: Profiles
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Column Level Security & Trigger: Bloquear Auto-Elevação de Plano e Fraude de Faturamento
-- Garante que plan_tier, subscription_status, stripe_customer_id, stripe_subscription_id e ai_credits
-- sejam imutáveis por requisições originadas do cliente authenticated / anon
create or replace function public.protect_profile_financial_fields()
returns trigger as $$
begin
  -- Se a mutação vier do contexto de usuário autenticado comum (cliente)
  if pg_catalog.current_user in ('authenticated', 'anon') or (auth.jwt() ->> 'role') = 'authenticated' then
    if (new.plan_tier is distinct from old.plan_tier) or
       (new.subscription_status is distinct from old.subscription_status) or
       (new.stripe_customer_id is distinct from old.stripe_customer_id) or
       (new.stripe_subscription_id is distinct from old.stripe_subscription_id) or
       (new.ai_credits is distinct from old.ai_credits) then
      raise exception 'Acesso Negado: Alterações de plano, faturamento e créditos são restritas ao backend autorizado (service_role).';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists tr_protect_profile_financial on public.profiles;
create trigger tr_protect_profile_financial
  before update on public.profiles
  for each row execute procedure public.protect_profile_financial_fields();

-- Permissões explícitas de coluna para proteção em profundidade
revoke update on public.profiles from authenticated, anon, public;
grant select on public.profiles to authenticated, anon;
grant update (
  full_name,
  date_of_birth,
  blood_type,
  gender,
  height_cm,
  weight_kg,
  smoking_status,
  alcohol_status,
  activity_level,
  chronic_conditions,
  allergies,
  emergency_contact_name,
  emergency_contact_phone,
  onboarding_completed,
  updated_at
) on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- Trigger: Create Profile automatically on SignUp (Inicialmente Inativo até confirmação do Stripe)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_full_name text;
  v_email text;
begin
  v_email := coalesce(new.email, '');

  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(split_part(v_email, '@', 1)), ''),
    'Usuário Vita4Me'
  );

  insert into public.profiles (
    id,
    email,
    full_name,
    plan_tier,
    subscription_status,
    ai_credits,
    onboarding_completed,
    created_at,
    updated_at
  )
  values (
    new.id,
    v_email,
    v_full_name,
    'individual',
    'inactive',
    0,
    false,
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    updated_at = now();

  return new;
exception
  when others then
    raise warning 'handle_new_user warning for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

grant execute on function public.handle_new_user() to supabase_auth_admin, service_role, postgres;

-- ==============================================================================
-- 2.1 ATOMIC AI CREDIT CONSUMPTION & QUOTA LOCKING (PREVINE RACE CONDITIONS)
-- ==============================================================================
create or replace function public.consume_ai_credit(
  p_user_id uuid,
  p_amount integer default 1
)
returns jsonb as $$
declare
  v_plan_tier text;
  v_status text;
  v_credits integer;
begin
  -- Bloqueio transacional atômico da linha do usuário (SELECT FOR UPDATE)
  select plan_tier, subscription_status, ai_credits
  into v_plan_tier, v_status, v_credits
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  end if;

  -- Assinantes ativos/trial possuem uso ilimitado
  if v_status in ('active', 'trialing') and v_plan_tier in ('individual', 'family') then
    return pg_catalog.jsonb_build_object(
      'success', true,
      'plan_tier', v_plan_tier,
      'subscription_status', v_status,
      'ai_credits', v_credits,
      'deducted', 0
    );
  end if;

  -- Usuários no plano gratuito precisam de créditos suficientes
  if v_credits >= p_amount then
    update public.profiles
    set ai_credits = ai_credits - p_amount,
        updated_at = pg_catalog.now()
    where id = p_user_id;

    return pg_catalog.jsonb_build_object(
      'success', true,
      'plan_tier', v_plan_tier,
      'subscription_status', v_status,
      'ai_credits', v_credits - p_amount,
      'deducted', p_amount
    );
  else
    return pg_catalog.jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_CREDITS',
      'plan_tier', v_plan_tier,
      'subscription_status', v_status,
      'ai_credits', v_credits
    );
  end if;
end;
$$ language plpgsql security definer set search_path = '';

revoke all on function public.consume_ai_credit(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_credit(uuid, integer) to service_role;

-- ==============================================================================
-- 2.2 STRIPE WEBHOOKS IDEMPOTENCY TABLE (ESTADOS REVERSÍVEIS & RETRY CONTROL)
-- ==============================================================================
create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  created_at_stripe bigint not null,
  status text not null default 'received' check (status in ('received', 'processing', 'processed', 'failed')),
  attempts integer not null default 0,
  last_error text,
  received_at timestamptz not null default pg_catalog.now(),
  processed_at timestamptz,
  payload jsonb
);

alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from public, anon, authenticated;
grant all on public.stripe_webhook_events to service_role;

-- ==============================================================================
-- 2.3 LGPD COMPLIANCE: EXCLUSÃO TOTAL DE CONTA, DADOS & STORAGE (Art. 18 LGPD)
-- ==============================================================================
create or replace function public.delete_user_account()
returns void as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Não autenticado.';
  end if;

  -- 1. Exclui os arquivos físicos no bucket de documentos do Supabase Storage
  delete from storage.objects
  where bucket_id = 'medical-documents'
    and (storage.foldername(name))[1] = v_user_id::text;

  -- 2. Exclui o registro na tabela auth.users, disparando cascade em todas as tabelas clínicas públicas
  delete from auth.users where id = v_user_id;
end;
$$ language plpgsql security definer set search_path = '';

revoke all on function public.delete_user_account() from public, anon;
grant execute on function public.delete_user_account() to authenticated;

-- ==============================================================================
-- 3. TABELA: FAMILY_MEMBERS (Gestão de Dependentes / Família)
-- ==============================================================================
create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  relationship text not null, -- 'Titular', 'Cônjuge', 'Filho(a)', 'Pai/Mãe', 'Outro'
  date_of_birth date,
  gender text,
  blood_type text,
  height_cm numeric,
  weight_kg numeric,
  smoking_status text,
  alcohol_status text,
  activity_level text,
  chronic_conditions text[] default '{}',
  allergies text[] default '{}',
  is_active boolean not null default true,
  onboarding_completed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.family_members enable row level security;

create policy "Family members isolation"
  on public.family_members for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ==============================================================================
-- 4. TABELA: LAB_EXAMS (Central de Exames & Laudos com IA)
-- ==============================================================================
create table if not exists public.lab_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  family_member_id uuid references public.family_members(id) on delete set null,
  title text not null,
  category text not null default 'Laboratorial', -- 'Laboratorial', 'Imagem', 'Cardiológico', 'Genético', 'Outro'
  exam_date date not null default current_date,
  laboratory text,
  doctor_name text,
  file_url text,
  raw_text text,
  ai_summary text,
  ai_simple_translation text,
  ai_key_findings jsonb default '[]'::jsonb,
  status text not null default 'processed' check (status in ('pending', 'processed', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lab_exams enable row level security;

create policy "Lab exams isolation"
  on public.lab_exams for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ==============================================================================
-- 5. TABELA: HEALTH_INDICATORS (Marcadores & Tendências Clínicas)
-- ==============================================================================
create table if not exists public.health_indicators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  family_member_id uuid references public.family_members(id) on delete set null,
  name text not null, -- 'Glicemia', 'Colesterol Total', 'HDL', 'LDL', 'Triglicerídeos', 'Vitamina D', 'Ferritina', 'TSH', 'Pressão Sistólica', 'Pressão Diastólica', 'Peso'
  category text not null default 'Metabólico', -- 'Metabólico', 'Lipídico', 'Vitaminas', 'Hormonal', 'Vital'
  value numeric not null,
  unit text not null, -- 'mg/dL', 'ng/mL', 'mcg/dL', 'mIU/L', 'mmHg', 'kg'
  reference_min numeric,
  reference_max numeric,
  measured_at timestamptz not null default now(),
  status text not null default 'normal' check (status in ('normal', 'alerta', 'critico')),
  created_at timestamptz not null default now()
);

alter table public.health_indicators enable row level security;

create policy "Health indicators isolation"
  on public.health_indicators for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ==============================================================================
-- 6. TABELA: MEDICATIONS (Medicamentos & Lembretes de Posologia)
-- ==============================================================================
create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  family_member_id uuid references public.family_members(id) on delete set null,
  name text not null,
  dosage text not null,
  frequency text not null, -- '1x ao dia', '2x ao dia (12/12h)', '3x ao dia (8/8h)', 'Conforme necessidade'
  schedule_times text[] default '{}', -- ['08:00', '20:00']
  instructions text,
  prescribed_by text,
  start_date date default current_date,
  end_date date,
  is_continuous boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.medications enable row level security;

create policy "Medications isolation"
  on public.medications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ==============================================================================
-- 7. TABELA: HEALTH_RECORDS (Timeline: Consultas, Vacinas, Cirurgias, Alergias)
-- ==============================================================================
create table if not exists public.health_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  family_member_id uuid references public.family_members(id) on delete set null,
  record_type text not null check (record_type in ('consulta', 'vacina', 'cirurgia', 'internacao', 'alergia', 'procedimento')),
  title text not null,
  description text,
  doctor_or_institution text,
  event_date date not null default current_date,
  tags text[] default '{}',
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.health_records enable row level security;

create policy "Health records isolation"
  on public.health_records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ==============================================================================
-- 8. TABELA: DAILY_HABITS (Rotina de Bem-Estar: Água, Sono, Exercício, Humor)
-- ==============================================================================
create table if not exists public.daily_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  log_date date not null default current_date,
  water_ml integer not null default 0,
  sleep_hours numeric not null default 0,
  exercise_minutes integer not null default 0,
  mood text, -- 'Excelente', 'Bom', 'Neutro', 'Cansado', 'Estressado'
  notes text,
  created_at timestamptz not null default now(),
  unique(user_id, log_date)
);

alter table public.daily_habits enable row level security;

create policy "Daily habits isolation"
  on public.daily_habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ==============================================================================
-- ÍNDICES DE ALTA PERFORMANCE
-- ==============================================================================
create index if not exists idx_lab_exams_user on public.lab_exams(user_id, exam_date desc);
create index if not exists idx_health_indicators_user on public.health_indicators(user_id, name, measured_at desc);
create index if not exists idx_medications_user on public.medications(user_id, is_active);
create index if not exists idx_health_records_user on public.health_records(user_id, record_type, event_date desc);
create index if not exists idx_daily_habits_user on public.daily_habits(user_id, log_date desc);

-- ==============================================================================
-- 9. SUPABASE STORAGE: BUCKET DE DOCUMENTOS MÉDICOS COM RLS ISOLADO POR USUÁRIO
-- ==============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medical-documents',
  'medical-documents',
  false,
  15728640, -- Limite estrito de 15 MB por arquivo
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  file_size_limit = 15728640,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

create policy "Users can view own medical files"
  on storage.objects for select
  using (bucket_id = 'medical-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload own medical files"
  on storage.objects for insert
  with check (bucket_id = 'medical-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own medical files"
  on storage.objects for update
  using (bucket_id = 'medical-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own medical files"
  on storage.objects for delete
  using (bucket_id = 'medical-documents' and (storage.foldername(name))[1] = auth.uid()::text);
