-- ==============================================================================
-- MIGRATION: 20260825_fix_auth_user_profile_creation.sql
-- VITA4ME — ROBUST & IDEMPOTENT AUTH PROFILE CREATION TRIGGER
-- ==============================================================================

-- 1. Garantir defaults seguros e constraints válidas na tabela public.profiles
alter table public.profiles
  alter column plan_tier set default 'individual',
  alter column subscription_status set default 'inactive',
  alter column ai_credits set default 0,
  alter column onboarding_completed set default false,
  alter column created_at set default now(),
  alter column updated_at set default now();

-- 2. Atualizar ou recriar constraints de integridade de planos e status
alter table public.profiles 
  drop constraint if exists profiles_plan_tier_check;

alter table public.profiles
  add constraint profiles_plan_tier_check check (plan_tier in ('free', 'individual', 'family'));

alter table public.profiles 
  drop constraint if exists profiles_subscription_status_check;

alter table public.profiles
  add constraint profiles_subscription_status_check check (subscription_status in ('active', 'inactive', 'past_due', 'canceled', 'trialing'));

-- 3. Função de criação de perfil automática para novos cadastros (Robusta, Idempotente e com search_path seguro)
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
  -- Obter e sanitizar o e-mail
  v_email := coalesce(new.email, '');

  -- Extrair nome com fallback seguro e resiliente
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(split_part(v_email, '@', 1)), ''),
    'Usuário Vita4Me'
  );

  -- Inserção idempotente com tratamento de conflito
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
    -- Registrar aviso no log do Postgres sem abortar a transação de criação do usuário auth
    raise warning 'handle_new_user warning for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- 4. Re-vincular a trigger na tabela auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Conceder permissões necessárias
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role, postgres;
