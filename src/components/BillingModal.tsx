import React, { useState, useEffect } from "react";
import { HEALTH_PRICING_PLANS, createStripeCheckout, openStripeCustomerPortal } from "../lib/stripe";
import { PricingPlan } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { trackEvent } from "../lib/analytics";
import {
  X,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  Crown,
  Loader2,
  Users,
  Heart,
  Activity
} from "lucide-react";

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BillingModal: React.FC<BillingModalProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuth();
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  // Close on Escape key & track open
  useEffect(() => {
    if (isOpen) {
      trackEvent('paywall_viewed', { source: 'billing_modal' });
      trackEvent('pricing_viewed');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentTier = profile?.plan_tier || "individual";

  const handleSelectPlan = async (plan: PricingPlan) => {
    trackEvent('plan_selected', {
      plan_tier: plan.id as any,
      billing_interval: interval,
    });

    if (plan.id === currentTier) {
      openStripeCustomerPortal();
      return;
    }

    setLoadingPlanId(plan.id);
    try {
      const price = interval === 'yearly' ? (plan.priceYearlyMonthlyEquivalent * 12) : plan.priceMonthly;
      trackEvent('checkout_started', {
        plan_tier: plan.id as any,
        billing_interval: interval,
        value: price,
        currency: 'BRL',
      });

      const checkoutUrl = await createStripeCheckout(plan.id, interval);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-10 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col my-auto">
        {/* Top Sticky Navigation Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6 shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 transition text-xs font-bold cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Voltar ao Prontuário</span>
          </button>

          <button
            onClick={onClose}
            title="Fechar (ESC)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 transition text-xs font-semibold cursor-pointer shadow-xs"
          >
            <span>Fechar</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto custom-scrollbar flex-1 pr-1">
          {/* Modal Header */}
          <div className="text-center space-y-3 max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <img src="/logo-icon-transparent.png" alt="Vita4Me" className="h-3.5 w-auto object-contain" />
              <span>Planos Vita4Me com 7 Dias Grátis</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Escolha seu plano e comece seu teste de 7 dias grátis
            </h2>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
              Acesso completo a todas as ferramentas de tradução de exames e prontuário digital. Cancele quando quiser.
            </p>

            {/* Monthly / Yearly Switcher */}
            <div className="inline-flex items-center bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 mt-3">
              <button
                onClick={() => setInterval("monthly")}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  interval === "monthly"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Faturamento Mensal
              </button>
              <button
                onClick={() => setInterval("yearly")}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  interval === "yearly"
                    ? "bg-emerald-600 text-white shadow-xs font-black"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>Anual</span>
                <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black text-[9px] rounded-md">
                  20% OFF
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {HEALTH_PRICING_PLANS.map((plan) => {
              const price = interval === "yearly" ? plan.priceYearlyMonthlyEquivalent : plan.priceMonthly;
              const isCurrent = currentTier === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 border ${
                    plan.highlight
                      ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 shadow-md scale-[1.02]"
                      : isCurrent
                      ? "bg-slate-50 dark:bg-slate-900 border-emerald-500 shadow-xs"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{plan.name}</h3>
                        {plan.subBadge && (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                            {plan.subBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 min-h-[32px]">{plan.description}</p>
                    </div>

                    {/* Price display */}
                    <div className="py-2 border-y border-slate-200 dark:border-slate-800">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">R$</span>
                        <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                          {price}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">/mês</span>
                      </div>
                      {interval === "yearly" && price > 0 && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                          Cobrado anualmente com 20% de desconto
                        </p>
                      )}
                    </div>

                    {/* Quota Highlights */}
                    <div className="space-y-1.5 py-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Assistente de IA:</span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">{plan.aiQuotaDescription}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Armazenamento:</span>
                        <span className="font-semibold text-teal-600 dark:text-teal-300">{plan.storageDescription}</span>
                      </div>
                    </div>

                    {/* Features list */}
                    <ul className="space-y-2.5 pt-2 text-xs text-slate-700 dark:text-slate-300">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-6 mt-4">
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isCurrent || loadingPlanId === plan.id}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 shadow-xs ${
                        isCurrent
                          ? "bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 cursor-default"
                          : plan.highlight
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                          : "bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white"
                      }`}
                    >
                      {loadingPlanId === plan.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isCurrent ? (
                        <span>Plano Atual</span>
                      ) : (
                        <>
                          <span>{plan.ctaText}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Security & Return Bar */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Privacidade Absoluta e Criptografia LGPD
            </span>
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Pagamentos Seguros via Stripe
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Prontuário</span>
          </button>
        </div>
      </div>
    </div>
  );
};
