-- ==============================================================================
-- MIGRATION: 20261007_unified_billing_asaas_stripe.sql
-- ARQUITETURA UNIFICADA DE FATURAMENTO: ASAAS (BRASIL) & STRIPE (EXTERIOR)
-- ==============================================================================

-- 1. ADICIONAR CAMPOS DE PROVEDOR DE FATURAMENTO NA TABELA PROFILES
alter table public.profiles
  add column if not exists billing_provider text check (billing_provider in ('asaas', 'stripe', 'free')) default 'stripe',
  add column if not exists billing_customer_id text,
  add column if not exists billing_subscription_id text;

-- Sincronizar dados prévios da Stripe caso existam
update public.profiles
set 
  billing_provider = 'stripe',
  billing_customer_id = coalesce(billing_customer_id, stripe_customer_id),
  billing_subscription_id = coalesce(billing_subscription_id, stripe_subscription_id)
where stripe_customer_id is not null and billing_customer_id is null;

-- Índices para buscas rápidas em webhooks
create index if not exists idx_profiles_billing_customer on public.profiles (billing_customer_id);
create index if not exists idx_profiles_billing_subscription on public.profiles (billing_subscription_id);

-- 2. TABELA DE EVENTOS DE WEBHOOK UNIFICADA (IDEMPOTÊNCIA & AUDITORIA)
create table if not exists public.billing_webhook_events (
  id text primary key, -- ex: asaas_{event}_{id} ou evt_... (Stripe)
  provider text not null check (provider in ('asaas', 'stripe')),
  event_type text not null,
  status text not null default 'received' check (status in ('received', 'processing', 'processed', 'failed')),
  attempts integer not null default 0,
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload jsonb
);

alter table public.billing_webhook_events enable row level security;
revoke all on public.billing_webhook_events from public, anon, authenticated;
grant all on public.billing_webhook_events to service_role;

-- 3. TABELA DE TRANSAÇÕES / HISTÓRICO DE COBRANÇAS
create table if not exists public.billing_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  provider text not null check (provider in ('asaas', 'stripe')),
  provider_transaction_id text not null,
  provider_subscription_id text,
  amount numeric(10,2) not null,
  currency text not null default 'BRL',
  status text not null check (status in ('pending', 'confirmed', 'received', 'refunded', 'overdue', 'failed')),
  payment_method text not null check (payment_method in ('pix', 'credit_card', 'boleto', 'stripe_card', 'stripe_other')),
  plan_tier text not null check (plan_tier in ('individual', 'family')),
  pix_qr_code text,
  pix_copy_paste text,
  pix_expiration timestamptz,
  invoice_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_transactions enable row level security;

drop policy if exists "Users can view their own transactions" on public.billing_transactions;
create policy "Users can view their own transactions"
  on public.billing_transactions for select
  using (auth.uid() = user_id);

revoke insert, update, delete on public.billing_transactions from public, anon, authenticated;
grant all on public.billing_transactions to service_role;

create index if not exists idx_billing_transactions_user on public.billing_transactions (user_id);
create index if not exists idx_billing_transactions_provider_id on public.billing_transactions (provider_transaction_id);

-- 4. ATUALIZAR TRIGGER DE PROTEÇÃO FINANCEIRA DO PROFILE
-- Impede que clientes alterem billing_provider, billing_customer_id, billing_subscription_id
create or replace function public.protect_profile_financial_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  -- Se a mutação vier de usuário autenticado comum ou anon
  if current_user in ('authenticated', 'anon') or (auth.jwt() ->> 'role') = 'authenticated' then
    if (new.plan_tier is distinct from old.plan_tier) or
       (new.subscription_status is distinct from old.subscription_status) or
       (new.stripe_customer_id is distinct from old.stripe_customer_id) or
       (new.stripe_subscription_id is distinct from old.stripe_subscription_id) or
       (new.billing_provider is distinct from old.billing_provider) or
       (new.billing_customer_id is distinct from old.billing_customer_id) or
       (new.billing_subscription_id is distinct from old.billing_subscription_id) or
       (new.ai_credits is distinct from old.ai_credits) or
       (new.trial_started_at is distinct from old.trial_started_at) or
       (new.trial_ends_at is distinct from old.trial_ends_at) then
      raise exception 'Acesso Negado: Alterações de plano, faturamento e período de teste são restritas ao backend autorizado (service_role).';
    end if;
  end if;
  return new;
end;
$$;
