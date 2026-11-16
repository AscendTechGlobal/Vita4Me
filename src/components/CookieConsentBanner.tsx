import React, { useEffect, useState } from "react";
import { Cookie, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import {
  acceptAllTrackingConsent,
  getTrackingConsent,
  rejectNonEssentialTrackingConsent,
  saveCustomTrackingConsent,
  subscribeCookiePreferencesOpen,
  subscribeTrackingConsent,
  TrackingConsentState,
} from "../analytics/consent";

export const CookieConsentBanner: React.FC = () => {
  const [consent, setConsent] = useState<TrackingConsentState>(() => getTrackingConsent());
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(() => !getTrackingConsent().choiceMade);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() => getTrackingConsent().analytics);
  const [marketingEnabled, setMarketingEnabled] = useState(() => getTrackingConsent().marketing);

  useEffect(() => {
    const unsubConsent = subscribeTrackingConsent((next) => {
      setConsent(next);
      setAnalyticsEnabled(next.analytics);
      setMarketingEnabled(next.marketing);
      if (next.choiceMade) {
        setIsVisible(false);
        setIsCustomizerOpen(false);
      }
    });

    const unsubOpen = subscribeCookiePreferencesOpen((shouldOpen) => {
      if (shouldOpen) {
        const latest = getTrackingConsent();
        setAnalyticsEnabled(latest.analytics);
        setMarketingEnabled(latest.marketing);
        setIsCustomizerOpen(true);
        setIsVisible(true);
      }
    });

    return () => {
      unsubConsent();
      unsubOpen();
    };
  }, []);

  if (!isVisible) return null;

  const handleAcceptAll = () => {
    acceptAllTrackingConsent();
  };

  const handleRejectNonEssential = () => {
    rejectNonEssentialTrackingConsent();
  };

  const handleSaveCustom = () => {
    saveCustomTrackingConsent({
      analytics: analyticsEnabled,
      marketing: marketingEnabled,
    });
  };

  return (
    <aside
      role="dialog"
      aria-label="Preferências de Cookies e Privacidade"
      data-clarity-mask="true"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-lg z-50 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-5 text-xs text-slate-700 dark:text-slate-300 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Cookie className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              Privacidade e Cookies
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Versão {consent.version} • Nenhum dado de saúde é compartilhado
            </p>
          </div>
        </div>

        {consent.choiceMade && (
          <button
            type="button"
            onClick={() => {
              setIsVisible(false);
              setIsCustomizerOpen(false);
            }}
            aria-label="Fechar preferências de cookies"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
        Utilizamos armazenamento estritamente necessário para autenticação e segurança do prontuário. Com seu consentimento opcional, podemos usar métricas agregadas de navegação (<strong>Analytics</strong>) e atribuição de campanhas (<strong>Marketing</strong>), sempre sem acesso a exames, diagnósticos ou dados pessoais sensíveis. Consulte a{" "}
        <a
          href="/cookies"
          className="text-emerald-700 dark:text-emerald-400 font-semibold underline underline-offset-2"
        >
          Política de Cookies
        </a>{" "}
        e a{" "}
        <a
          href="/privacidade"
          className="text-emerald-700 dark:text-emerald-400 font-semibold underline underline-offset-2"
        >
          Política de Privacidade
        </a>
        .
      </p>

      {isCustomizerOpen && (
        <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          {/* Necessários */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
            <div>
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Necessários
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Sessão autenticada, segurança da conta, preferências de tema/idioma e consentimento.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold shrink-0">
              Sempre ativo
            </span>
          </div>

          {/* Analytics */}
          <label className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 cursor-pointer">
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">Analytics</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Métricas agregadas de navegação e desempenho (GA4 via GTM) e mapas de usabilidade apenas em páginas públicas (Microsoft Clarity), sem área clínica.
              </p>
            </div>
            <input
              type="checkbox"
              checked={analyticsEnabled}
              onChange={(e) => setAnalyticsEnabled(e.target.checked)}
              aria-label="Autorizar cookies de Analytics"
              className="mt-1 h-4 w-4 accent-emerald-600 rounded cursor-pointer shrink-0"
            />
          </label>

          {/* Marketing */}
          <label className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 cursor-pointer">
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">Marketing</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Medição de conversões comerciais e atribuição de anúncios (Google Ads e Meta Pixel), sem dados clínicos ou identificadores médicos.
              </p>
            </div>
            <input
              type="checkbox"
              checked={marketingEnabled}
              onChange={(e) => setMarketingEnabled(e.target.checked)}
              aria-label="Autorizar cookies de Marketing"
              className="mt-1 h-4 w-4 accent-emerald-600 rounded cursor-pointer shrink-0"
            />
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={handleRejectNonEssential}
          className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs cursor-pointer transition"
        >
          Rejeitar não essenciais
        </button>

        {!isCustomizerOpen ? (
          <button
            type="button"
            onClick={() => setIsCustomizerOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Personalizar</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSaveCustom}
            className="px-3.5 py-2 rounded-xl border border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold text-xs cursor-pointer transition"
          >
            Salvar preferências
          </button>
        )}

        <button
          type="button"
          onClick={handleAcceptAll}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer transition shadow-xs"
        >
          Aceitar todos
        </button>
      </div>
    </aside>
  );
};
