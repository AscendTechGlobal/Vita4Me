import assert from "assert";
import { spawn } from "child_process";
import path from "path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const TEST_PORT = process.env.TEST_PORT || "3099";
const API_BASE = `http://127.0.0.1:${TEST_PORT}`;

assert(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY, "Supabase creds missing");
assert(STRIPE_SECRET_KEY && STRIPE_WEBHOOK_SECRET, "Stripe creds missing");

const stripe = new Stripe(STRIPE_SECRET_KEY);
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function logStep(step, msg) {
  console.log(`\n▶ [PASSO ${step}] ${msg}`);
}

function logCheck(name, passed, details = "") {
  const icon = passed ? "  ✅" : "  ❌";
  console.log(`${icon} ${name}${details ? ` — ${details}` : ""}`);
  if (!passed) {
    throw new Error(`Falha na checagem: ${name} (${details})`);
  }
}

async function startServer() {
  const serverProc = spawn(process.execPath, [path.resolve("dist/server.cjs")], {
    env: { ...process.env, PORT: TEST_PORT, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProc.stderr.on("data", (d) => {
    const s = d.toString().trim();
    if (s) console.error("[server err]", s);
  });

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) return serverProc;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  serverProc.kill();
  throw new Error("Servidor não iniciou na porta " + TEST_PORT);
}

// Helper para assinar payload e disparar para o endpoint de webhook local do Vita4Me
async function postStripeWebhook(event) {
  const payloadString = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: payloadString,
    secret: STRIPE_WEBHOOK_SECRET,
  });

  const res = await fetch(`${API_BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": signature,
    },
    body: payloadString,
  });

  return { status: res.status, body: await res.text() };
}

async function runSubscriptionE2ETest() {
  const runId = Date.now();
  const testEmail = `stripe.e2e.${runId}@vita4me.test`;
  const strongPassword = `Vita4Me#${runId}Aa!`;
  let userId = null;
  let userToken = null;
  let serverProc = null;
  let stripeCustomerId = null;
  let stripeSubscriptionId = null;

  try {
    serverProc = await startServer();
    console.log(`Servidor local ativo em ${API_BASE}`);

    // =========================================================================
    // PASSO 1: CRIAR USUÁRIO NO SUPABASE VIA CADASTRO AUTÊNTICO COM CONSENTIMENTOS
    // =========================================================================
    logStep(1, "Criando usuário de teste com perfil inicial no Supabase");
    const regRes = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: strongPassword,
        fullName: "Usuário Teste E2E Stripe",
        consents: {
          termsAccepted: true,
          privacyAccepted: true,
          healthDataAccepted: true,
          documentVersion: "2.0",
        },
      }),
    });
    const regData = await regRes.json();
    logCheck("Registro do usuário com consentimentos", regRes.status === 200 && regData.userId);
    userId = regData.userId;

    // Autenticar com o cliente Supabase para obter o JWT de sessão
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: strongPassword,
    });
    assert(!signInErr && signInData.session, "Falha no signIn do usuário de teste");
    userToken = signInData.session.access_token;

    // Verificar perfil inicial (plano gratuito / sem assinatura ativa)
    const { data: initialProfile } = await adminClient
      .from("profiles")
      .select("plan_tier, subscription_status, stripe_customer_id, stripe_subscription_id, ai_credits")
      .eq("id", userId)
      .single();

    logCheck(
      "Perfil inicial antes da assinatura",
      initialProfile.subscription_status === "inactive" || initialProfile.subscription_status === "trialing",
      `plan_tier=${initialProfile.plan_tier}, status=${initialProfile.subscription_status}`
    );

    // =========================================================================
    // PASSO 2: CRIAR SESSÃO DE CHECKOUT STRIPE (PLANO FAMÍLIA COM 7 DIAS DE TRIAL)
    // =========================================================================
    logStep(2, "Gerando sessão de Checkout Stripe (Plano 'family', mensal, com 7 dias de trial)");
    const checkoutRes = await fetch(`${API_BASE}/api/stripe/create-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        planId: "family",
        interval: "monthly",
      }),
    });
    const checkoutData = await checkoutRes.json();
    logCheck("Sessão de Checkout gerada com sucesso", checkoutRes.status === 200 && checkoutData.url?.includes("checkout.stripe.com"), checkoutData.url);

    // =========================================================================
    // PASSO 3: SIMULAR FLUXO COMPLETO DO STRIPE CHECKOUT COM CARTÃO DE TESTE (VIA STRIPE API)
    // =========================================================================
    logStep(3, "Criando Customer e Assinatura real com Cartão de Teste (pm_card_visa) no Stripe");
    
    // 3.1 Criar Customer no Stripe
    const customer = await stripe.customers.create({
      email: testEmail,
      name: "Usuário Teste E2E Stripe",
      metadata: { userId },
    });
    stripeCustomerId = customer.id;

    // 3.2 Anexar método de pagamento de teste (Cartão Visa de Teste)
    const paymentMethod = await stripe.paymentMethods.attach("pm_card_visa", {
      customer: stripeCustomerId,
    });
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethod.id },
    });

    // 3.3 Criar Assinatura no Stripe com 7 dias de trial
    // No Stripe Subscriptions API direta, price_data requer 'product' (ID do produto)
    const product = await stripe.products.create({
      name: "Vita4Me Família (Até 5 Membros)",
    });

    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price_data: {
            currency: "usd",
            product: product.id,
            unit_amount: 1990,
            recurring: { interval: "month" },
          },
        },
      ],
      trial_period_days: 7,
      metadata: {
        userId,
        planId: "family",
      },
    });
    stripeSubscriptionId = subscription.id;

    logCheck(
      "Assinatura criada no Stripe com Trial de 7 dias",
      subscription.status === "trialing" && subscription.trial_end > Math.floor(Date.now() / 1000),
      `SubID=${subscription.id}, Status=${subscription.status}, TrialEnd=${new Date(subscription.trial_end * 1000).toISOString()}`
    );

    // =========================================================================
    // PASSO 4: DISPARO E PROCESSAMENTO DO WEBHOOK: checkout.session.completed
    // =========================================================================
    logStep(4, "Disparando Webhook Stripe 'checkout.session.completed' para o Vita4Me");
    
    const checkoutSessionEvent = {
      id: `evt_test_checkout_${Date.now()}`,
      object: "event",
      api_version: "2023-10-16",
      created: Math.floor(Date.now() / 1000),
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_test_${Date.now()}`,
          object: "checkout.session",
          client_reference_id: userId,
          customer: stripeCustomerId,
          subscription: stripeSubscriptionId,
          customer_email: testEmail,
          metadata: {
            userId,
            planId: "family",
          },
        },
      },
    };

    const whRes1 = await postStripeWebhook(checkoutSessionEvent);
    logCheck("Webhook checkout.session.completed respondeu HTTP 200", whRes1.status === 200, `body=${whRes1.body}`);

    // =========================================================================
    // PASSO 5: VERIFICAR ATUALIZAÇÃO NO SUPABASE (PLANO FAMÍLIA + CRÉDITOS + ATIVO)
    // =========================================================================
    logStep(5, "Verificando se o perfil no Supabase foi atualizado pelo Webhook");
    
    const { data: updatedProfile1 } = await adminClient
      .from("profiles")
      .select("plan_tier, subscription_status, stripe_customer_id, stripe_subscription_id, ai_credits")
      .eq("id", userId)
      .single();

    logCheck(
      "Usuário reconhecido como Plano Família",
      updatedProfile1.plan_tier === "family",
      `plan_tier=${updatedProfile1.plan_tier}`
    );
    logCheck(
      "Status da assinatura ativo no Supabase",
      updatedProfile1.subscription_status === "active",
      `status=${updatedProfile1.subscription_status}`
    );
    logCheck(
      "Customer ID e Subscription ID vinculados",
      updatedProfile1.stripe_customer_id === stripeCustomerId && updatedProfile1.stripe_subscription_id === stripeSubscriptionId,
      `cust=${updatedProfile1.stripe_customer_id}, sub=${updatedProfile1.stripe_subscription_id}`
    );
    logCheck(
      "Créditos de IA para plano Família creditados (9999 créditos)",
      updatedProfile1.ai_credits >= 9999,
      `ai_credits=${updatedProfile1.ai_credits}`
    );

    // =========================================================================
    // PASSO 6: TESTAR O CUSTOMER PORTAL DO STRIPE
    // =========================================================================
    logStep(6, "Solicitando sessão do Stripe Customer Portal autenticado como o usuário");
    const portalRes = await fetch(`${API_BASE}/api/stripe/create-portal-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
    });
    const portalData = await portalRes.json();
    logCheck(
      "Customer Portal Session gerada com sucesso",
      portalRes.status === 200 && portalData.url?.includes("billing.stripe.com/p/session"),
      portalData.url
    );

    // =========================================================================
    // PASSO 7: SIMULAR CANCELAMENTO DA ASSINATURA E SINCRONIZAÇÃO VIA WEBHOOK
    // =========================================================================
    logStep(7, "Cancelando assinatura no Stripe e disparando webhook 'customer.subscription.deleted'");
    
    // 7.1 Cancelar no Stripe
    const canceledSub = await stripe.subscriptions.cancel(stripeSubscriptionId);
    logCheck("Assinatura cancelada no Stripe", canceledSub.status === "canceled");

    // 7.2 Disparar Webhook customer.subscription.deleted
    const subDeletedEvent = {
      id: `evt_test_deleted_${Date.now()}`,
      object: "event",
      api_version: "2023-10-16",
      created: Math.floor(Date.now() / 1000),
      type: "customer.subscription.deleted",
      data: {
        object: canceledSub,
      },
    };

    const whRes2 = await postStripeWebhook(subDeletedEvent);
    logCheck("Webhook customer.subscription.deleted respondeu HTTP 200", whRes2.status === 200, `body=${whRes2.body}`);

    // =========================================================================
    // PASSO 8: VERIFICAR REFLEXO DO CANCELAMENTO NO SUPABASE
    // =========================================================================
    logStep(8, "Verificando se o cancelamento foi refletido no banco Supabase");
    const { data: finalProfile } = await adminClient
      .from("profiles")
      .select("plan_tier, subscription_status, stripe_customer_id, stripe_subscription_id")
      .eq("id", userId)
      .single();

    logCheck(
      "Status da assinatura atualizado para 'canceled' no Supabase",
      finalProfile.subscription_status === "canceled",
      `subscription_status=${finalProfile.subscription_status}`
    );

    console.log("\n==================================================================");
    console.log("🎉 FLUXO COMPLETO STRIPE TESTADO E CONFIRMADO DE PONTA A PONTA!");
    console.log("==================================================================\n");

  } finally {
    if (serverProc && !serverProc.killed) {
      serverProc.kill();
    }
    // Limpeza de recursos de teste
    if (stripeCustomerId) {
      await stripe.customers.del(stripeCustomerId).catch(() => {});
    }
    if (userId) {
      await adminClient.auth.admin.deleteUser(userId).catch(() => {});
    }
  }
}

runSubscriptionE2ETest().catch((err) => {
  console.error("\n❌ TESTE DE ASSINATURA STRIPE FALHOU:", err);
  process.exit(1);
});
