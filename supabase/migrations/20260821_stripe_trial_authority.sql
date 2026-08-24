-- ==============================================================================
-- MIGRATION: 20260821_stripe_trial_authority.sql
-- Garante que novos cadastros nasçam com subscription_status = 'inactive'
-- e que o Stripe Webhook seja a autoridade exclusiva para ativar 'trialing'/'active'.
-- ==============================================================================

-- 1. Atualizar o valor default da coluna subscription_status na tabela profiles
alter table public.profiles 
  alter column subscription_status set default 'inactive',
  alter column ai_credits set default 0;

-- 2. Atualizar a trigger de criação automática de perfil para novos usuários
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, 
    email, 
    full_name, 
    plan_tier, 
    subscription_status, 
    ai_credits, 
    onboarding_completed
  )
  values (
    new.id,
    new.email,
    pg_catalog.coalesce(new.raw_user_meta_data->>'full_name', pg_catalog.split_part(new.email, '@', 1)),
    'individual',
    'inactive',
    0,
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

-- 3. Re-vincular a trigger em auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
