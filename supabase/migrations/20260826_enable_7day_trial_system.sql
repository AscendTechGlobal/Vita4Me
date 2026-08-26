-- ==============================================================================
-- MIGRATION: 20260826_enable_7day_trial_system.sql
-- IMPLEMENTAÇÃO DO SISTEMA DE TRIAL REAL DE 7 DIAS COM PROTEÇÃO SERVER-SIDE
-- ==============================================================================

-- 1. Adicionar colunas de controle temporal de período de teste na tabela profiles
alter table public.profiles 
  add column if not exists trial_started_at timestamptz default now(),
  add column if not exists trial_ends_at timestamptz default (now() + interval '7 days');

-- 2. Migrar usuários existentes: conceder trial para contas criadas nos últimos 7 dias
update public.profiles
set 
  trial_started_at = coalesce(trial_started_at, created_at, now()),
  trial_ends_at = coalesce(trial_ends_at, created_at + interval '7 days', now() + interval '7 days'),
  subscription_status = case 
    when stripe_subscription_id is not null and subscription_status = 'active' then 'active'
    when (coalesce(trial_ends_at, created_at + interval '7 days', now() + interval '7 days')) > now() then 'trialing'
    else subscription_status 
  end,
  ai_credits = case when ai_credits = 0 then 500 else ai_credits end
where stripe_subscription_id is null;

-- 3. Atualizar Trigger de Proteção de Campos Financeiros / Faturamento
-- Impede que qualquer cliente altere plan_tier, subscription_status, stripe_*, ai_credits ou trial_*
create or replace function public.protect_profile_financial_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  -- Se a mutação vier do contexto de usuário autenticado comum (cliente via Supabase Auth)
  if current_user in ('authenticated', 'anon') or (auth.jwt() ->> 'role') = 'authenticated' then
    if (new.plan_tier is distinct from old.plan_tier) or
       (new.subscription_status is distinct from old.subscription_status) or
       (new.stripe_customer_id is distinct from old.stripe_customer_id) or
       (new.stripe_subscription_id is distinct from old.stripe_subscription_id) or
       (new.ai_credits is distinct from old.ai_credits) or
       (new.trial_started_at is distinct from old.trial_started_at) or
       (new.trial_ends_at is distinct from old.trial_ends_at) then
      raise exception 'Acesso Negado: Alterações de plano, faturamento e período de teste são restritas ao backend autorizado (service_role).';
    end if;
  end if;
  return new;
end;
$$;

-- 4. Atualizar Trigger de Criação Automática de Usuário no SignUp
-- Novos usuários recebem automaticamente plano individual em período de teste de 7 dias ('trialing')
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
    trial_started_at,
    trial_ends_at,
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
    'trialing',
    now(),
    now() + interval '7 days',
    500,
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

-- 5. Re-vincular a trigger em auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

grant execute on function public.handle_new_user() to supabase_auth_admin, service_role, postgres;
