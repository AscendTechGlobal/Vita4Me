-- ==============================================================================
-- MIGRATION: 20260820_security_hardening.sql
-- VITA4ME — ADVANCED SECURITY HARDENING, ATOMIC TRANSACTIONS, IDEMPOTENCY & LGPD
-- ==============================================================================

-- 1. Atualizar constraint de planos
alter table public.profiles 
  drop constraint if exists profiles_plan_tier_check;

alter table public.profiles
  add constraint profiles_plan_tier_check check (plan_tier in ('free', 'individual', 'family'));

-- 2. Trigger de Proteção Financeira & Imutabilidade de Planos pelo Cliente
create or replace function public.protect_profile_financial_fields()
returns trigger as $$
begin
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

-- 3. Revogar e conceder permissões explícitas de coluna
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

-- 4. Função segura de criação de perfil (search_path = '')
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, plan_tier, ai_credits, onboarding_completed)
  values (
    new.id,
    new.email,
    pg_catalog.coalesce(new.raw_user_meta_data->>'full_name', pg_catalog.split_part(new.email, '@', 1)),
    'free',
    25,
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

-- 5. Função Atômica Transacional para Consumo de Créditos de IA (Zero Race Condition)
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
  -- Bloqueio transacional da linha do usuário (SELECT FOR UPDATE)
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

-- 6. Tabela de Idempotência de Webhooks Stripe (Controle de Estados e Tentativas)
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

-- 7. Função RPC para Exclusão Total de Conta, Dados e Storage pelo Titular (LGPD Art. 18)
create or replace function public.delete_user_account()
returns void as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Não autenticado.';
  end if;

  -- Exclui todos os arquivos no bucket do Supabase Storage
  delete from storage.objects
  where bucket_id = 'medical-documents'
    and (storage.foldername(name))[1] = v_user_id::text;

  -- Exclui o registro na tabela auth.users (disparando cascade em todas as tabelas públicas)
  delete from auth.users where id = v_user_id;
end;
$$ language plpgsql security definer set search_path = '';

revoke all on function public.delete_user_account() from public, anon;
grant execute on function public.delete_user_account() to authenticated;

-- 8. Supabase Storage: Bucket de Documentos Médicos com RLS e Validação de MIME/Tamanho
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medical-documents',
  'medical-documents',
  false,
  15728640, -- 15 MB
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
