-- ==============================================================================
-- MIGRATION: 20261031_asaas_trial_and_reminders.sql
-- FLUXO DE ASSINATURA ASAAS: TRIAL 7 DIAS COM CARTÃO E LEMBRETES TRANSPARENTES
-- ==============================================================================

-- 1. ADICIONAR COLUNAS DE CONTROLE DE TRIAL E LEMBRETES NO PROFILE
alter table public.profiles
  add column if not exists asaas_customer_id text,
  add column if not exists asaas_subscription_id text,
  add column if not exists card_last_digits text,
  add column if not exists card_brand text,
  add column if not exists reminder_5_sent boolean not null default false,
  add column if not exists reminder_6_sent boolean not null default false;

-- Sincronizar com billing_customer_id e billing_subscription_id existentes
update public.profiles
set 
  asaas_customer_id = coalesce(asaas_customer_id, billing_customer_id),
  asaas_subscription_id = coalesce(asaas_subscription_id, billing_subscription_id)
where billing_provider = 'asaas';

-- 2. ÍNDICES DE PERFORMANCE PARA WEBHOOKS E CRON WORKER
create index if not exists idx_profiles_asaas_customer on public.profiles (asaas_customer_id);
create index if not exists idx_profiles_asaas_sub on public.profiles (asaas_subscription_id);

-- Índice parcial extremamente rápido para o worker de lembretes diários
create index if not exists idx_profiles_trial_reminders 
  on public.profiles (trial_ends_at, reminder_5_sent, reminder_6_sent)
  where subscription_status = 'trialing';

-- 3. ATUALIZAR TRIGGER DE PROTEÇÃO FINANCEIRA
-- Garante que o cliente frontend não possa manipular datas de trial ou status de lembretes
create or replace function public.protect_profile_financial_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if current_user in ('authenticated', 'anon') or (auth.jwt() ->> 'role') = 'authenticated' then
    if (new.plan_tier is distinct from old.plan_tier) or
       (new.subscription_status is distinct from old.subscription_status) or
       (new.billing_provider is distinct from old.billing_provider) or
       (new.billing_customer_id is distinct from old.billing_customer_id) or
       (new.billing_subscription_id is distinct from old.billing_subscription_id) or
       (new.asaas_customer_id is distinct from old.asaas_customer_id) or
       (new.asaas_subscription_id is distinct from old.asaas_subscription_id) or
       (new.trial_started_at is distinct from old.trial_started_at) or
       (new.trial_ends_at is distinct from old.trial_ends_at) or
       (new.reminder_5_sent is distinct from old.reminder_5_sent) or
       (new.reminder_6_sent is distinct from old.reminder_6_sent) then
      raise exception 'Acesso Negado: Alterações de faturamento e período de teste são restritas ao backend autorizado (service_role).';
    end if;
  end if;
  return new;
end;
$$;

