import { PricingPlan } from "../types";

export const HEALTH_PRICING_PLANS: PricingPlan[] = [
  {
    id: "individual",
    name: "Individual",
    description: "Organize seus exames, compreenda laudos médicos e acompanhe sua saúde com inteligência.",
    priceMonthly: 29,
    priceYearlyMonthlyEquivalent: 23,
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
      "1 perfil individual completo"
    ]
  },
  {
    id: "family",
    name: "Família",
    description: "Centralize e cuide da saúde de toda a sua família em um único ambiente seguro.",
    priceMonthly: 59,
    priceYearlyMonthlyEquivalent: 47,
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
      "Suporte prioritário via WhatsApp e E-mail"
    ]
  }
];

import { getAuthHeaders } from "./apiClient";

export async function createStripeCheckout(
  planId: string,
  interval: "monthly" | "yearly" = "monthly"
): Promise<string | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/stripe/create-checkout", {
      method: "POST",
      headers,
      body: JSON.stringify({ planId, interval }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Erro ao criar sessão de checkout Stripe");
    }

    const data = await res.json();
    return data.url;
  } catch (err: any) {
    console.error("Stripe Checkout Error:", err);
    alert(err.message || "Não foi possível abrir o checkout da Stripe. Tente novamente.");
    return null;
  }
}

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
  alert("O portal do cliente Stripe abrirá quando o projeto estiver conectado em produção.");
}
