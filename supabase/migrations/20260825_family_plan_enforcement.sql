-- ==============================================================================
-- MIGRATION: 20260825_family_plan_enforcement.sql
-- VITA4ME — DATABASE-LEVEL RESTRICTION FOR FAMILY PROFILES
-- ==============================================================================

-- 1. Função e Trigger para bloquear criação de dependentes fora do Plano Família
create or replace function public.check_family_member_plan_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_plan_tier text;
  v_count integer;
begin
  -- Buscar o plano real do titular no banco de dados
  select plan_tier into v_plan_tier
  from public.profiles
  where id = new.user_id;

  -- Bloquear se o plano não for 'family'
  if v_plan_tier is null or v_plan_tier != 'family' then
    raise exception 'Acesso negado: O cadastro de perfis familiares é exclusivo para o Plano Família.';
  end if;

  -- Bloquear se exceder o limite de 5 dependentes
  select count(*) into v_count
  from public.family_members
  where user_id = new.user_id;

  if v_count >= 5 then
    raise exception 'Limite de 5 dependentes atingido para esta conta familiar.';
  end if;

  return new;
end;
$$;

drop trigger if exists tr_check_family_member_plan on public.family_members;
create trigger tr_check_family_member_plan
  before insert on public.family_members
  for each row execute function public.check_family_member_plan_entitlement();

-- 2. Garantir permissões
grant execute on function public.check_family_member_plan_entitlement() to authenticated, service_role, postgres;
