import dotenv from "dotenv";
dotenv.config();
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { asaasClient } from "./asaasClient.js";
import {
  BillingProvider,
  CreateCheckoutParams,
  CheckoutResult,
  AsaasWebhookEvent,
  BILLING_PLANS,
} from "./types.js";
import {
  sendWelcomeTrialEmail,
  sendSubscriptionConfirmedEmail,
} from "../../lib/emailService.js";

export class BillingService {
  private supabase: SupabaseClient | null = null;
  private stripe: Stripe | null = null;
  private appUrl: string;

  constructor() {
    this.appUrl = process.env.APP_URL || "http://localhost:3000";
    this.initSupabase();
    this.initStripe();
  }

  private initSupabase() {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      "";

    if (supabaseUrl && supabaseServiceKey) {
      this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
  }

  private initStripe() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (apiKey) {
      this.stripe = new Stripe(apiKey, {
        apiVersion: "2025-02-24.acacia" as any,
      });
    }
  }

  /**
   * Ponto de entrada unificado para criação de checkout (Asaas ou Stripe)
   */
  public async createCheckout(
    params: CreateCheckoutParams
  ): Promise<CheckoutResult> {
    const planConfig = BILLING_PLANS[params.planId] || BILLING_PLANS.individual;

    // ROTEAMENTO 1: BRASIL -> ASAAS (PIX OU CARTÃO NACIONAL)
    if (params.provider === "asaas") {
      return await this.createAsaasCheckout(params, planConfig);
    }

    // ROTEAMENTO 2: EXTERIOR / GLOBAL -> STRIPE (CARTÃO / MÉTODOS INTERNACIONAIS)
    return await this.createStripeCheckout(params, planConfig);
  }

  /**
   * Criação de Checkout no Asaas (Brasil)
   */
  private async createAsaasCheckout(
    params: CreateCheckoutParams,
    planConfig: typeof BILLING_PLANS.individual
  ): Promise<CheckoutResult> {
    if (!asaasClient.isConfigured()) {
      console.warn("⚠️ [Asaas] ASAAS_API_KEY não configurada. Entrando em Modo de Simulação de Checkout para testes...");
      const isYearly = params.interval === "yearly";
      const amount = isYearly
        ? planConfig.yearlyMonthlyEquivalentBrl * 12
        : planConfig.monthlyBrl;
      const simPaymentId = `sim_pay_${Date.now()}`;
      const simSubId = `sim_sub_${Date.now()}`;

      const simCopyPaste = `00020101021226580014br.gov.bcb.pix0136vita4me-pix-teste-${params.userId.slice(0, 8)}5204000053039865405${amount.toFixed(2)}5802BR5913VITA4ME SAAS6009SAO PAULO62070503***6304`;
      const simSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="#ffffff"/><rect x="20" y="20" width="40" height="40" fill="#0A3B2E"/><rect x="30" y="30" width="20" height="20" fill="#ffffff"/><rect x="140" y="20" width="40" height="40" fill="#0A3B2E"/><rect x="150" y="30" width="20" height="20" fill="#ffffff"/><rect x="20" y="140" width="40" height="40" fill="#0A3B2E"/><rect x="30" y="150" width="20" height="20" fill="#ffffff"/><rect x="80" y="20" width="40" height="20" fill="#7AC943"/><rect x="70" y="50" width="20" height="30" fill="#0A3B2E"/><rect x="100" y="70" width="30" height="30" fill="#7AC943"/><rect x="30" y="80" width="30" height="20" fill="#0A3B2E"/><rect x="140" y="80" width="40" height="20" fill="#0A3B2E"/><rect x="80" y="110" width="40" height="30" fill="#0A3B2E"/><rect x="130" y="120" width="40" height="20" fill="#7AC943"/><rect x="70" y="150" width="30" height="30" fill="#0A3B2E"/><rect x="120" y="150" width="30" height="30" fill="#0A3B2E"/><rect x="160" y="160" width="20" height="20" fill="#7AC943"/><text x="100" y="105" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0A3B2E" text-anchor="middle">PIX TESTE</text></svg>`;
      const simEncodedImage = Buffer.from(simSvg).toString("base64");

      if (this.supabase) {
        try {
          await this.supabase.from("billing_transactions").insert({
            user_id: params.userId,
            provider: "asaas",
            provider_transaction_id: simPaymentId,
            provider_subscription_id: simSubId,
            amount,
            currency: "BRL",
            status: "pending",
            payment_method: "pix",
            plan_tier: params.planId,
            pix_qr_code: simEncodedImage,
            pix_copy_paste: simCopyPaste,
            pix_expiration: new Date(Date.now() + 86400000).toISOString(),
            invoice_url: "http://localhost:3000",
          });
        } catch (e) {
          console.warn("Aviso ao salvar transação simulada:", e);
        }
      }

      return {
        success: true,
        provider: "asaas",
        paymentId: simPaymentId,
        subscriptionId: simSubId,
        checkoutUrl: "http://localhost:3000",
        pix: {
          encodedImage: simEncodedImage,
          payload: simCopyPaste,
          expirationDate: new Date(Date.now() + 86400000).toISOString(),
          paymentId: simPaymentId,
        },
        status: "PENDING_PIX",
      };
    }

    // 1. Obter ou registrar cliente no Asaas
    const customer = await asaasClient.getOrCreateCustomer({
      name: params.userName || params.userEmail.split("@")[0],
      email: params.userEmail,
      cpfCnpj: params.userCpfCnpj,
      phone: params.userPhone,
      externalReference: params.userId,
    });

    const isYearly = params.interval === "yearly";
    const amount = isYearly
      ? planConfig.yearlyMonthlyEquivalentBrl * 12
      : planConfig.monthlyBrl;
    const cycle = isYearly ? "YEARLY" : "MONTHLY";
    const externalRef = `${params.userId}:${params.planId}:${params.interval}`;

    // 2. Método PIX
    if (params.method === "pix" || !params.method) {
      const pixSub = await asaasClient.createPixSubscription({
        customerId: customer.id,
        value: amount,
        cycle,
        description: `Vita4Me - Plano ${planConfig.name} (${isYearly ? "Anual" : "Mensal"})`,
        externalReference: externalRef,
      });

      // Salvar transação pendente no Supabase para reconciliação
      if (this.supabase) {
        await this.supabase.from("billing_transactions").insert({
          user_id: params.userId,
          provider: "asaas",
          provider_transaction_id: pixSub.paymentId,
          provider_subscription_id: pixSub.subscriptionId,
          amount,
          currency: "BRL",
          status: "pending",
          payment_method: "pix",
          plan_tier: params.planId,
          pix_qr_code: pixSub.pix.encodedImage,
          pix_copy_paste: pixSub.pix.payload,
          pix_expiration: pixSub.pix.expirationDate,
          invoice_url: pixSub.invoiceUrl,
        });

        // Atualizar perfil com o ID do cliente Asaas
        await this.supabase
          .from("profiles")
          .update({
            billing_provider: "asaas",
            billing_customer_id: customer.id,
            billing_subscription_id: pixSub.subscriptionId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", params.userId);
      }

      return {
        success: true,
        provider: "asaas",
        paymentId: pixSub.paymentId,
        subscriptionId: pixSub.subscriptionId,
        checkoutUrl: pixSub.invoiceUrl,
        pix: {
          encodedImage: pixSub.pix.encodedImage,
          payload: pixSub.pix.payload,
          expirationDate: pixSub.pix.expirationDate,
          paymentId: pixSub.paymentId,
        },
        status: "PENDING_PIX",
      };
    }

    // 3. Método Cartão de Crédito Nacional
    if (params.method === "credit_card") {
      if (!params.creditCard || !params.creditCardHolderInfo) {
        throw new Error("Dados de cartão e titular são obrigatórios para pagamento via cartão.");
      }

      const cardSub = await asaasClient.createCreditCardSubscription({
        customerId: customer.id,
        value: amount,
        cycle,
        description: `Vita4Me - Plano ${planConfig.name}`,
        externalReference: externalRef,
        creditCard: params.creditCard,
        creditCardHolderInfo: params.creditCardHolderInfo,
      });

      if (this.supabase) {
        await this.supabase
          .from("profiles")
          .update({
            plan_tier: params.planId,
            subscription_status: "active",
            billing_provider: "asaas",
            billing_customer_id: customer.id,
            billing_subscription_id: cardSub.subscriptionId,
            ai_credits: params.planId === "family" ? 9999 : 500,
            updated_at: new Date().toISOString(),
          })
          .eq("id", params.userId);
      }

      return {
        success: true,
        provider: "asaas",
        subscriptionId: cardSub.subscriptionId,
        status: "ACTIVE",
        message: "Assinatura ativada com sucesso via cartão de crédito.",
      };
    }

    throw new Error(`Método de pagamento não suportado: ${params.method}`);
  }

  /**
   * Criação de Checkout no Stripe (Exterior / Global)
   */
  private async createStripeCheckout(
    params: CreateCheckoutParams,
    planConfig: typeof BILLING_PLANS.individual
  ): Promise<CheckoutResult> {
    if (!this.stripe) {
      throw new Error("Stripe não configurada no servidor.");
    }

    const isYearly = params.interval === "yearly";
    // Preço internacional fixo em USD (Dólar americano) para o Stripe
    const amountUsd = isYearly
      ? planConfig.yearlyMonthlyEquivalentUsd * 12
      : planConfig.monthlyUsd;

    // Buscar se usuário já possui stripe_customer_id ou billing_customer_id
    let customerId: string | undefined = undefined;
    if (this.supabase && params.userId) {
      const { data: profile } = await this.supabase
        .from("profiles")
        .select("stripe_customer_id, billing_customer_id, billing_provider")
        .eq("id", params.userId)
        .single();

      if (profile?.billing_provider === "stripe" && profile?.billing_customer_id) {
        customerId = profile.billing_customer_id;
      } else if (profile?.stripe_customer_id) {
        customerId = profile.stripe_customer_id;
      }
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: planConfig.name,
              description: `Acesso completo com Inteligência Artificial e Prontuário Vita4Me (${isYearly ? "Cobrança Anual em Dólar" : "Cobrança Mensal em Dólar"})`,
            },
            unit_amount: Math.round(amountUsd * 100),
            recurring: {
              interval: isYearly ? "year" : "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          userId: params.userId,
          planId: params.planId,
          interval: params.interval,
        },
      },
      client_reference_id: params.userId,
      customer_email: customerId ? undefined : params.userEmail,
      customer: customerId,
      metadata: {
        userId: params.userId,
        planId: params.planId,
        interval: params.interval,
      },
      success_url: `${this.appUrl}/?checkout_success=true&plan=${params.planId}`,
      cancel_url: `${this.appUrl}/?checkout_canceled=true`,
    };

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    return {
      success: true,
      provider: "stripe",
      checkoutUrl: session.url || undefined,
      status: "CHECKOUT_REDIRECT",
    };
  }

  /**
   * Consulta status de pagamento Pix diretamente no Asaas
   */
  public async getPixStatus(paymentId: string): Promise<{
    status: string;
    isPaid: boolean;
    payment?: any;
  }> {
    if (paymentId.startsWith("sim_pay_")) {
      const timestamp = parseInt(paymentId.replace("sim_pay_", ""), 10) || Date.now();
      const elapsed = Date.now() - timestamp;
      const isPaid = elapsed >= 5000;

      if (isPaid && this.supabase) {
        try {
          const { data: tx } = await this.supabase
            .from("billing_transactions")
            .select("user_id, plan_tier")
            .eq("provider_transaction_id", paymentId)
            .single();

          if (tx?.user_id) {
            await this.supabase
              .from("profiles")
              .update({
                plan_tier: tx.plan_tier || "individual",
                subscription_status: "active",
                billing_provider: "asaas",
                ai_credits: tx.plan_tier === "family" ? 9999 : 500,
                updated_at: new Date().toISOString(),
              })
              .eq("id", tx.user_id);
          }

          await this.supabase
            .from("billing_transactions")
            .update({
              status: "confirmed",
              updated_at: new Date().toISOString(),
            })
            .eq("provider_transaction_id", paymentId);
        } catch (e) {
          console.warn("Erro ao conciliar transação simulada:", e);
        }
      }

      return {
        status: isPaid ? "RECEIVED" : "PENDING",
        isPaid,
        payment: { id: paymentId, status: isPaid ? "RECEIVED" : "PENDING" },
      };
    }

    const payment = await asaasClient.getPayment(paymentId);
    const isPaid = payment.status === "CONFIRMED" || payment.status === "RECEIVED";

    // Se confirmou e Supabase estiver conectado, atualizar status da transação
    if (isPaid && this.supabase) {
      await this.supabase
        .from("billing_transactions")
        .update({
          status: "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("provider_transaction_id", paymentId);
    }

    return {
      status: payment.status,
      isPaid,
      payment,
    };
  }

  /**
   * Processamento central de Webhooks do Asaas
   */
  public async handleAsaasWebhook(
    event: AsaasWebhookEvent,
    authTokenHeader?: string
  ): Promise<{ processed: boolean; message: string }> {
    // 1. Validação de autenticidade se secret estiver configurado
    const webhookSecret = process.env.ASAAS_WEBHOOK_SECRET;
    if (webhookSecret && authTokenHeader !== webhookSecret) {
      console.warn("⚠️ [Asaas Webhook] Token de autenticação inválido.");
      throw new Error("Não autorizado: token do webhook Asaas inválido.");
    }

    const eventId = `asaas_${event.event}_${event.payment?.id || event.subscription?.id || Date.now()}`;

    // 2. Idempotência no Supabase
    if (this.supabase) {
      const { data: existing } = await this.supabase
        .from("billing_webhook_events")
        .select("id, status")
        .eq("id", eventId)
        .single();

      if (existing && existing.status === "processed") {
        return { processed: true, message: "Evento Asaas já processado previamente." };
      }

      await this.supabase.from("billing_webhook_events").upsert({
        id: eventId,
        provider: "asaas",
        event_type: event.event,
        status: "processing",
        payload: event as any,
      });
    }

    console.log(`🔔 [Asaas Webhook] Processando evento: ${event.event} para payment/sub: ${event.payment?.id || event.subscription?.id}`);

    try {
      const payment = event.payment;
      const externalRef = payment?.externalReference || event.subscription?.externalReference;
      const [userId, planId] = (externalRef || "").split(":");

      switch (event.event) {
        case "PAYMENT_CONFIRMED":
        case "PAYMENT_RECEIVED": {
          if (userId && this.supabase) {
            const resolvedPlan = planId === "family" ? "family" : "individual";
            console.log(`✅ [Asaas] Pagamento confirmado para usuário ${userId}. Ativando plano: ${resolvedPlan}`);

            await this.supabase
              .from("profiles")
              .update({
                plan_tier: resolvedPlan,
                subscription_status: "active",
                billing_provider: "asaas",
                billing_customer_id: payment?.customer,
                billing_subscription_id: payment?.subscription || null,
                ai_credits: resolvedPlan === "family" ? 9999 : 500,
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId);

            // Atualizar transação
            if (payment?.id) {
              await this.supabase
                .from("billing_transactions")
                .update({
                  status: "confirmed",
                  updated_at: new Date().toISOString(),
                })
                .eq("provider_transaction_id", payment.id);
            }

            // Disparar e-mail de confirmação
            const { data: userProfile } = await this.supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", userId)
              .single();

            if (userProfile?.email) {
              sendSubscriptionConfirmedEmail({
                to: userProfile.email,
                name: userProfile.full_name || "Paciente",
                planName: resolvedPlan === "family" ? "Família" : "Individual",
                amount: `R$ ${payment?.value?.toFixed(2) || "29,00"}`,
              }).catch((e) => console.error("Erro ao enviar email confirmação:", e));
            }
          }
          break;
        }

        case "PAYMENT_OVERDUE": {
          if (userId && this.supabase) {
            console.log(`⚠️ [Asaas] Pagamento atrasado para usuário ${userId}`);
            await this.supabase
              .from("profiles")
              .update({
                subscription_status: "past_due",
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId);
          }
          break;
        }

        case "PAYMENT_REFUNDED":
        case "SUBSCRIPTION_DELETED": {
          if (userId && this.supabase) {
            console.log(`❌ [Asaas] Assinatura cancelada/reembolsada para usuário ${userId}`);
            await this.supabase
              .from("profiles")
              .update({
                subscription_status: "canceled",
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId);
          }
          break;
        }

        default:
          console.log(`ℹ️ [Asaas] Evento ${event.event} recebido sem ação necessária.`);
      }

      if (this.supabase) {
        await this.supabase
          .from("billing_webhook_events")
          .update({
            status: "processed",
            processed_at: new Date().toISOString(),
          })
          .eq("id", eventId);
      }

      return { processed: true, message: "Evento Asaas processado com sucesso." };
    } catch (err: any) {
      if (this.supabase) {
        await this.supabase
          .from("billing_webhook_events")
          .update({
            status: "failed",
            last_error: err.message,
          })
          .eq("id", eventId);
      }
      throw err;
    }
  }

  /**
   * Processamento central de Webhooks da Stripe (Exterior)
   */
  public async handleStripeWebhook(event: Stripe.Event): Promise<{ processed: boolean }> {
    const eventId = `stripe_${event.id}`;

    if (this.supabase) {
      const { data: existing } = await this.supabase
        .from("billing_webhook_events")
        .select("id, status")
        .eq("id", eventId)
        .single();

      if (existing && existing.status === "processed") {
        return { processed: true };
      }

      await this.supabase.from("billing_webhook_events").upsert({
        id: eventId,
        provider: "stripe",
        event_type: event.type,
        status: "processing",
        payload: event.data.object as any,
      });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.client_reference_id || session.metadata?.userId;
          const planId = (session.metadata?.planId as "individual" | "family") || "individual";

          if (userId && this.supabase) {
            console.log(`✅ [Stripe] Checkout concluído para usuário ${userId}. Ativando plano: ${planId}`);
            await this.supabase
              .from("profiles")
              .update({
                plan_tier: planId,
                subscription_status: "active",
                billing_provider: "stripe",
                billing_customer_id: typeof session.customer === "string" ? session.customer : null,
                billing_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
                stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
                stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
                ai_credits: planId === "family" ? 9999 : 500,
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId);
          }

          const customerEmail = session.customer_details?.email || session.customer_email;
          const customerName = session.customer_details?.name || "Paciente";
          if (customerEmail) {
            sendWelcomeTrialEmail({
              to: customerEmail,
              name: customerName,
              planName: planId === "family" ? "Família" : "Individual",
            }).catch((e) => console.error("Erro Resend welcome trial:", e));
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
          const status = subscription.status;

          let subscriptionStatus: "active" | "inactive" | "past_due" | "canceled" | "trialing" = "active";
          if (status === "trialing") subscriptionStatus = "trialing";
          else if (status === "past_due" || status === "unpaid") subscriptionStatus = "past_due";
          else if (status === "canceled") subscriptionStatus = "canceled";
          else if (status === "active") subscriptionStatus = "active";
          else subscriptionStatus = "inactive";

          if (customerId && this.supabase) {
            const updatePayload: Record<string, any> = {
              subscription_status: subscriptionStatus,
              billing_subscription_id: subscription.id,
              stripe_subscription_id: subscription.id,
              updated_at: new Date().toISOString(),
            };
            if (subscription.metadata?.planId && ["individual", "family"].includes(subscription.metadata.planId)) {
              updatePayload.plan_tier = subscription.metadata.planId;
            }

            await this.supabase
              .from("profiles")
              .update(updatePayload)
              .or(`billing_customer_id.eq.${customerId},stripe_customer_id.eq.${customerId}`);
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

          if (customerId && this.supabase) {
            await this.supabase
              .from("profiles")
              .update({
                subscription_status: "canceled",
                updated_at: new Date().toISOString(),
              })
              .or(`billing_customer_id.eq.${customerId},stripe_customer_id.eq.${customerId}`);
          }
          break;
        }
      }

      if (this.supabase) {
        await this.supabase
          .from("billing_webhook_events")
          .update({
            status: "processed",
            processed_at: new Date().toISOString(),
          })
          .eq("id", eventId);
      }

      return { processed: true };
    } catch (err: any) {
      if (this.supabase) {
        await this.supabase
          .from("billing_webhook_events")
          .update({
            status: "failed",
            last_error: err.message,
          })
          .eq("id", eventId);
      }
      throw err;
    }
  }

  /**
   * Cancelar Assinatura no Provedor Ativo
   */
  public async cancelSubscription(userId: string): Promise<boolean> {
    if (!this.supabase) return false;

    const { data: profile } = await this.supabase
      .from("profiles")
      .select("billing_provider, billing_subscription_id, stripe_subscription_id")
      .eq("id", userId)
      .single();

    if (!profile) throw new Error("Usuário não encontrado.");

    if (profile.billing_provider === "asaas" && profile.billing_subscription_id) {
      await asaasClient.cancelSubscription(profile.billing_subscription_id);
    } else if (this.stripe && (profile.billing_subscription_id || profile.stripe_subscription_id)) {
      const subId = profile.billing_subscription_id || profile.stripe_subscription_id;
      await this.stripe.subscriptions.cancel(subId);
    }

    await this.supabase
      .from("profiles")
      .update({
        subscription_status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return true;
  }
}

export const billingService = new BillingService();
