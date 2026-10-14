-- ==============================================================================
-- MIGRATION: 20261014_google_auth_and_avatar.sql
-- VITA4ME — SUPORTE ROBUSTO A LOGIN SOCIAL GOOGLE & AVATAR PROFILE
-- ==============================================================================

-- 1. Garantir que a coluna avatar_url exista na tabela public.profiles
alter table public.profiles
  add column if not exists avatar_url text;

-- 2. Conceder permissão de update para avatar_url ao usuário autenticado
grant update (
  avatar_url
) on public.profiles to authenticated;

-- 3. Atualizar a função handle_new_user() para extrair nome e avatar do Google OAuth com resiliência
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_full_name text;
  v_email text;
  v_avatar_url text;
begin
  -- Obter e sanitizar o e-mail
  v_email := coalesce(new.email, '');

  -- Extrair nome com suporte a 'full_name' e 'name' (padrão OpenID do Google)
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(split_part(v_email, '@', 1)), ''),
    'Usuário Vita4Me'
  );

  -- Extrair foto de perfil enviada pelo Google ('avatar_url' ou 'picture')
  v_avatar_url := coalesce(
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
    nullif(trim(new.raw_user_meta_data->>'picture'), '')
  );

  -- Inserção idempotente com tratamento de conflito
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
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
    v_avatar_url,
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
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at = now();

  return new;
exception
  when others then
    -- Registrar aviso no log do Postgres sem abortar a autenticação
    raise warning 'handle_new_user warning for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- 4. Re-vincular trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Garantir permissões de execução
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role, postgres;
