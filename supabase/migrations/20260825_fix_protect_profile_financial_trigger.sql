-- ==============================================================================
-- MIGRATION: 20260825_fix_protect_profile_financial_trigger.sql
-- VITA4ME — CORREÇÃO DO ERRO 42P01 NO UPDATE DE public.profiles
-- Causa: "pg_catalog.current_user" tratava pg_catalog como tabela em vez de keyword SQL
-- ==============================================================================

create or replace function public.protect_profile_financial_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  -- Se a mutação vier do contexto de usuário autenticado comum (cliente)
  if current_user in ('authenticated', 'anon') or (auth.jwt() ->> 'role') = 'authenticated' then
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
$$;

-- Garantir que a trigger continue vinculada
drop trigger if exists tr_protect_profile_financial on public.profiles;
create trigger tr_protect_profile_financial
  before update on public.profiles
  for each row execute function public.protect_profile_financial_fields();

-- Garantir permissões de execução
grant execute on function public.protect_profile_financial_fields() to authenticated, anon, service_role, postgres;
