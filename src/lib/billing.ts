import { apiFetch, getAuthHeaders } from "./apiClient";
import { PricingPlan } from "../types";

export const HEALTH_PRICING_PLANS: PricingPlan[] = [
  {
    id: "individual",
    name: "Individual",
    description:
      "Organize seus exames, compreenda laudos médicos e acompanhe sua saúde com inteligência.",
    priceMonthly: 29,
    priceYearlyMonthlyEquivalent: 23,
    priceMonthlyUsd: 9.9,
    priceYearlyMonthlyEquivalentUsd: 7.9,
    highlight: false,
    badge: "7 DIAS GRÁTIS",
    ctaText: "Iniciar Teste Grátis de 7 Dias",
    aiQuotaDescription: "Assistente de IA incluído",
    storageDescription: "Armazenamento Seguro de Exames",
    features: [
      "7 dias de teste grátis (cancele quando quiser)",
      "Assistente de IA incluído (sujeito à Política de Uso Justo)",
      "Extração inteligente de biomarcadores",
      "Dossiê Médico para Consultas em PDF",
      "Assistente de Saúde 24/7 com histórico conectado",
      "Lembretes inteligentes de medicamentos e posologia",
      "Gráficos de evolução de indicadores vitais",
      "1 perfil individual completo",
    ],
  },
  {
    id: "family",
    name: "Família",
    description:
      "Centralize e cuide da saúde de toda a sua família em um único ambiente seguro.",
    priceMonthly: 59,
    priceYearlyMonthlyEquivalent: 47,
    priceMonthlyUsd: 19.9,
    priceYearlyMonthlyEquivalentUsd: 14.9,
    highlight: true,
    badge: "MAIS POPULAR • 7 DIAS GRÁTIS",
    subBadge: "Até 5 Membros",
    ctaText: "Iniciar Teste Grátis de 7 Dias",
    aiQuotaDescription: "Assistente de IA incluído para toda a família",
    storageDescription: "Armazenamento Compartilhado Seguro",
    features: [
      "7 dias de teste grátis (cancele quando quiser)",
      "Tudo do plano Individual",
      "Até 5 perfis familiares independentes",
      "Assistente de IA incluído para até 5 perfis (Uso Justo)",
      "Histórico médico e vacinal de filhos e pais",
      "Dossiês individuais em PDF para cada dependente",
      "Lembretes de medicação para toda a família",
      "Suporte prioritário via WhatsApp e E-mail",
    ],
  },
];

export interface UnifiedCheckoutRequest {
  planId: "individual" | "family";
  interval: "monthly" | "yearly";
  provider: "asaas" | "stripe";
  method?: "pix" | "credit_card";
  cpfCnpj?: string;
  phone?: string;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode?: string;
    addressNumber?: string;
    phone?: string;
  };
}

export interface UnifiedCheckoutResponse {
  success: boolean;
  provider: "asaas" | "stripe";
  paymentId?: string;
  subscriptionId?: string;
  checkoutUrl?: string;
  pix?: {
    encodedImage: string;
    payload: string;
    expirationDate?: string;
    paymentId: string;
  };
  status?: string;
  message?: string;
}

/**
 * Inicia sessão de checkout unificada (Asaas Pix/Cartão no Brasil ou Stripe no Exterior)
 */
export async function createUnifiedCheckout(
  params: UnifiedCheckoutRequest
): Promise<UnifiedCheckoutResponse> {
  const { data, error } = await apiFetch<UnifiedCheckoutResponse>(
    "/api/billing/create-checkout",
    {
      method: "POST",
      body: JSON.stringify(params),
    }
  );

  if (error || !data) {
    throw new Error(error || "Erro ao processar checkout.");
  }

  return data;
}

/**
 * Consulta status de pagamento Pix em tempo real para confirmação imediata
 */
export async function checkPixStatus(paymentId: string): Promise<{
  status: string;
  isPaid: boolean;
}> {
  const { data, error } = await apiFetch<{ status: string; isPaid: boolean }>(
    `/api/billing/pix-status/${paymentId}`
  );

  if (error || !data) {
    return { status: "PENDING", isPaid: false };
  }

  return data;
}

/**
 * Abre o Portal do Cliente Stripe (para cancelamento ou alteração de cartão Stripe)
 */
export async function openStripeCustomerPortal(): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/stripe/create-portal-session", {
      method: "POST",
      headers,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.error) {
        alert(errData.error);
        return;
      }
    }
  } catch (err) {
    console.error("Stripe Portal Error:", err);
  }
  alert("O portal de gerenciamento de assinatura abrirá quando o serviço estiver ativo.");
}

/**
 * Cancela a assinatura ativa (Asaas ou Stripe)
 */
export async function cancelUnifiedSubscription(): Promise<boolean> {
  const { data, error } = await apiFetch<{ success: boolean; message: string }>(
    "/api/billing/cancel-subscription",
    {
      method: "POST",
    }
  );

  if (error) {
    throw new Error(error);
  }

  return Boolean(data?.success);
}
