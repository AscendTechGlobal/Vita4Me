import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import {
  HEALTH_PRICING_PLANS,
  createUnifiedCheckout,
  checkPixStatus,
  openStripeCustomerPortal,
} from "../lib/billing";
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
  Loader2,
  Copy,
  Check,
  QrCode,
  Globe,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BillingModal: React.FC<BillingModalProps> = ({ isOpen, onClose }) => {
  const { profile, reloadProfile } = useAuth();
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [region, setRegion] = useState<"brasil" | "exterior">("brasil");
  const [method, setMethod] = useState<"pix" | "credit_card">("pix");
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  // Estado do Checkout Pix Ativo
  const [pixModalData, setPixModalData] = useState<{
    paymentId: string;
    qrCodeBase64: string;
    copyPaste: string;
    expirationDate?: string;
    planName: string;
    amountFormatted: string;
    interval?: "monthly" | "yearly";
    fullYearPrice?: number;
  } | null>(null);

  const [copiedPix, setCopiedPix] = useState(false);
  const [isPixPaid, setIsPixPaid] = useState(false);
  const [isCheckingPix, setIsCheckingPix] = useState(false);
  const [cpf, setCpf] = useState("");
  const [cpfError, setCpfError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const formatCpf = (val: string) => {
    const nums = val.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
    if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
    return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9, 11)}`;
  };

  const validateCpf = (str: string): boolean => {
    const clean = str.replace(/\D/g, "");
    if (clean.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(clean)) return false;
    let sum = 0, rest;
    for (let i = 1; i <= 9; i++) sum += parseInt(clean.substring(i - 1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(clean.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(clean.substring(i - 1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    return rest === parseInt(clean.substring(10, 11));
  };

  // Close on Escape key & track open
  useEffect(() => {
    if (isOpen) {
      trackEvent("paywall_viewed", { source: "billing_modal" });
      trackEvent("pricing_viewed");
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !pixModalData) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, pixModalData]);

  // Polling automático de status Pix a cada 3 segundos
  useEffect(() => {
    if (!pixModalData || isPixPaid) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const verifyStatus = async () => {
      setIsCheckingPix(true);
      try {
        const res = await checkPixStatus(pixModalData.paymentId);
        if (res.isPaid) {
          setIsPixPaid(true);
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
          });
          if (reloadProfile) {
            await reloadProfile();
          }
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch (err) {
        console.warn("Falha no polling Pix:", err);
      } finally {
        setIsCheckingPix(false);
      }
    };

    pollingRef.current = setInterval(verifyStatus, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pixModalData, isPixPaid, reloadProfile]);

  if (!isOpen) return null;

  const currentTier = profile?.plan_tier || "individual";

  const handleSelectPlan = async (plan: PricingPlan) => {
    trackEvent("plan_selected", {
      plan_tier: plan.id as any,
      billing_interval: interval,
    });

    if (plan.id === currentTier && profile?.subscription_status === "active") {
      openStripeCustomerPortal();
      return;
    }

    setLoadingPlanId(plan.id);
    try {
      const price =
        interval === "yearly"
          ? plan.priceYearlyMonthlyEquivalent * 12
          : plan.priceMonthly;

      trackEvent("checkout_started", {
        plan_tier: plan.id as any,
        billing_interval: interval,
        value: price,
        currency: "BRL",
        provider: region === "brasil" ? "asaas" : "stripe",
      });

      // 1. Rota Brasil (Asaas - Pix ou Cartão)
      const targetPlanId = plan.id === "family" ? "family" : "individual";

      if (region === "brasil") {
        if (!validateCpf(cpf)) {
          setCpfError("Por favor, informe um CPF válido para emissão do Pix ou cobrança.");
          return;
        }
        setCpfError(null);

        const checkoutRes = await createUnifiedCheckout({
          planId: targetPlanId,
          interval,
          provider: "asaas",
          method,
          cpfCnpj: cpf.replace(/\D/g, ""),
        });

        if (checkoutRes.pix) {
          setPixModalData({
            paymentId: checkoutRes.pix.paymentId,
            qrCodeBase64: checkoutRes.pix.encodedImage,
            copyPaste: checkoutRes.pix.payload,
            expirationDate: checkoutRes.pix.expirationDate,
            planName: plan.name,
            amountFormatted: `R$ ${price.toFixed(2).replace(".", ",")}`,
            interval,
            fullYearPrice: plan.priceMonthly * 12,
          });
          return;
        }

        if (checkoutRes.checkoutUrl) {
          window.location.href = checkoutRes.checkoutUrl;
          return;
        }
      }

      // 2. Rota Exterior (Stripe)
      const stripeRes = await createUnifiedCheckout({
        planId: targetPlanId,
        interval,
        provider: "stripe",
      });

      if (stripeRes.checkoutUrl) {
        window.location.href = stripeRes.checkoutUrl;
      }
    } catch (err: any) {
      console.error("Erro no checkout:", err);
      alert(err.message || "Não foi possível iniciar o pagamento. Tente novamente.");
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handleCopyPix = () => {
    if (!pixModalData?.copyPaste) return;
    navigator.clipboard.writeText(pixModalData.copyPaste);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pixModalData) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-10 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col my-auto">
        {/* Top Sticky Navigation Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6 shrink-0">
          <button
            onClick={() => {
              if (pixModalData) {
                setPixModalData(null);
              } else {
                onClose();
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 transition text-xs font-bold cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{pixModalData ? "Voltar aos Planos" : "Voltar ao Prontuário"}</span>
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

        {/* TELA 1: MODAL DE PAGAMENTO PIX ATIVO */}
        {pixModalData ? (
          <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 flex flex-col items-center justify-center py-4 text-center max-w-lg mx-auto">
            {isPixPaid ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  Pagamento Confirmado!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Sua assinatura do plano{" "}
                  <strong className="text-emerald-600">{pixModalData.planName}</strong> foi
                  ativada com sucesso.
                </p>
                <button
                  onClick={() => {
                    setPixModalData(null);
                    onClose();
                  }}
                  className="mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition"
                >
                  Ir para Meu Prontuário
                </button>
              </div>
            ) : (
              <div className="w-full space-y-6">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20">
                    <QrCode className="w-3.5 h-3.5" /> Pagamento Instantâneo via Pix
                  </span>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                    Escaneie ou copie o código Pix
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2 flex-wrap">
                    <span>Plano {pixModalData.planName}</span>
                    <span>•</span>
                    {pixModalData.interval === "yearly" && pixModalData.fullYearPrice ? (
                      <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                        <span className="line-through text-slate-400 font-mono">
                          De R$ {pixModalData.fullYearPrice},00
                        </span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                          por {pixModalData.amountFormatted}
                        </strong>
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-black">
                          20% OFF
                        </span>
                      </div>
                    ) : (
                      <span>Total: {pixModalData.amountFormatted}</span>
                    )}
                  </div>
                </div>

                {/* QR Code */}
                <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 inline-block mx-auto">
                  {pixModalData.qrCodeBase64 ? (
                    <img
                      src={`data:image/png;base64,${pixModalData.qrCodeBase64}`}
                      alt="QR Code Pix"
                      className="w-48 h-48 object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                      <QrCode className="w-16 h-16" />
                    </div>
                  )}
                </div>

                {/* Chave Pix Copia e Cola */}
                <div className="space-y-2 text-left">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Código Pix Copia e Cola:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={pixModalData.copyPaste}
                      className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 select-all focus:outline-none"
                    />
                    <button
                      onClick={handleCopyPix}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                        copiedPix
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800"
                      }`}
                    >
                      {copiedPix ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Radar de Confirmação em Tempo Real */}
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center justify-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isCheckingPix ? "animate-spin" : ""}`}
                  />
                  <span>
                    Aguardando confirmação do banco... Aprovação automática instantânea.
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TELA 2: LISTAGEM DE PLANOS COM SELETOR DE PAÍS / GATEWAY */
          <div className="overflow-y-auto custom-scrollbar flex-1 pr-1">
            {/* Modal Header */}
            <div className="text-center space-y-3 max-w-2xl mx-auto mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Planos Vita4Me com 7 Dias Grátis</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Escolha seu plano e comece hoje mesmo
              </h2>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
                Acesso completo a todas as ferramentas de tradução de exames e prontuário digital.
              </p>

              {/* SELETORES: PAÍS (BRASIL VS EXTERIOR) & FREQUÊNCIA */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {/* Switcher Brasil / Exterior */}
                <div className="inline-flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setRegion("brasil");
                      setMethod("pix");
                    }}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      region === "brasil"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <span>🇧🇷 Brasil</span>
                  </button>
                  <button
                    onClick={() => setRegion("exterior")}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      region === "exterior"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>🌍 Exterior</span>
                  </button>
                </div>

                {/* Switcher Mensal / Anual */}
                <div className="inline-flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setInterval("monthly")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      interval === "monthly"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Mensal
                  </button>
                  <button
                    onClick={() => setInterval("yearly")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      interval === "yearly"
                        ? "bg-emerald-600 text-white shadow-xs font-black"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <span>Anual</span>
                    <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black text-[9px] rounded-md">
                      20% OFF
                    </span>
                  </button>
                </div>
              </div>

              {/* Sub-seletor de Método no Brasil: Pix vs Cartão */}
              {region === "brasil" && (
                <div className="inline-flex items-center gap-2 pt-1 text-xs">
                  <span className="text-slate-400">Método no Brasil:</span>
                  <button
                    onClick={() => setMethod("pix")}
                    className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer flex items-center gap-1 ${
                      method === "pix"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : "border-slate-200 dark:border-slate-800 text-slate-500"
                    }`}
                  >
                    <QrCode className="w-3 h-3" />
                    <span>Pix Instantâneo (Recomendado)</span>
                  </button>
                  <button
                    onClick={() => setMethod("credit_card")}
                    className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer flex items-center gap-1 ${
                      method === "credit_card"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : "border-slate-200 dark:border-slate-800 text-slate-500"
                    }`}
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>Cartão Nacional</span>
                  </button>
                </div>
              )}

              {/* Campo de CPF Obrigatório no Brasil (Exigência do Banco Central para Pix) */}
              {region === "brasil" && (
                <div className="max-w-xs mx-auto pt-1 space-y-1 text-left">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    <span>CPF do Titular:</span>
                    {cpf && validateCpf(cpf) && (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                        <Check className="w-3 h-3" /> Válido
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => {
                      const formatted = formatCpf(e.target.value);
                      setCpf(formatted);
                      if (cpfError && validateCpf(formatted)) setCpfError(null);
                    }}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl px-3 py-1.5 text-xs text-center font-mono tracking-wider transition text-slate-800 dark:text-slate-200 ${
                      cpfError
                        ? "border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:outline-none"
                    }`}
                  />
                  {cpfError && (
                    <p className="text-[11px] text-rose-500 font-semibold text-center animate-in fade-in">
                      {cpfError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {HEALTH_PRICING_PLANS.map((plan) => {
                const price =
                  interval === "yearly"
                    ? plan.priceYearlyMonthlyEquivalent
                    : plan.priceMonthly;
                const isCurrent =
                  currentTier === plan.id && profile?.subscription_status === "active";

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
                          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                            {plan.name}
                          </h3>
                          {plan.subBadge && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                              {plan.subBadge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 min-h-[32px]">
                          {plan.description}
                        </p>
                      </div>

                      {/* Price display */}
                      <div className="py-2.5 border-y border-slate-200 dark:border-slate-800">
                        {interval === "yearly" ? (
                          <div className="space-y-1">
                            {/* Valor cheio anual riscado + Economia */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-slate-400 dark:text-slate-500 line-through font-mono">
                                De R$ {plan.priceMonthly * 12}/ano
                              </span>
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                Economize R$ {(plan.priceMonthly * 12) - (plan.priceYearlyMonthlyEquivalent * 12)}/ano
                              </span>
                            </div>

                            {/* Valor anual com desconto em destaque */}
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <div className="flex items-baseline gap-0.5">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">R$</span>
                                <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                                  {plan.priceYearlyMonthlyEquivalent * 12}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">/ano</span>
                              </div>
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                (equivale a R$ {plan.priceYearlyMonthlyEquivalent}/mês)
                              </span>
                            </div>

                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              Cobrança anual única • 20% de desconto aplicado
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-baseline gap-1">
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                R$
                              </span>
                              <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                                {plan.priceMonthly}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                /mês
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                              Cobrança mensal recorrente
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Quota Highlights */}
                      <div className="space-y-1.5 py-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">
                            Assistente de IA:
                          </span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {plan.aiQuotaDescription}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">
                            Armazenamento:
                          </span>
                          <span className="font-semibold text-teal-600 dark:text-teal-300">
                            {plan.storageDescription}
                          </span>
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
                          <span>Plano Ativo</span>
                        ) : (
                          <>
                            <span>
                              {region === "brasil" && method === "pix"
                                ? "Pagar via Pix (Imediato)"
                                : plan.ctaText}
                            </span>
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
        )}

        {/* Footer Security & Return Bar */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Privacidade Absoluta e Criptografia LGPD
            </span>
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Pagamento 100% Seguro e Criptografado
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
