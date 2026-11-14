import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  X,
  ShieldCheck,
  FileText,
  Cookie,
  Scale,
  ExternalLink,
} from "lucide-react";
import {
  LegalDocumentsContent,
  LegalTab,
  PublicLegalDocumentId,
  LEGAL_DOCUMENT_META,
  LEGAL_DOCUMENT_VERSION,
} from "./LegalDocumentsContent";

export type { LegalTab };
export { LEGAL_DOCUMENT_VERSION };

interface LegalDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
}

function normalizeLegalTab(tab?: LegalTab): PublicLegalDocumentId {
  if (!tab || tab === "consentimento") return "privacidade";
  return tab;
}

export const LegalDocumentsModal: React.FC<LegalDocumentsModalProps> = ({
  isOpen,
  onClose,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<PublicLegalDocumentId>(() =>
    normalizeLegalTab(initialTab)
  );

  useEffect(() => {
    setActiveTab(normalizeLegalTab(initialTab));
  }, [initialTab, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeMeta = LEGAL_DOCUMENT_META[activeTab];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-10 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col my-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Central de Transparência & Conformidade Legal
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Vita4Me • Em conformidade com a LGPD (Lei nº 13.709/2018) e CDC
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-950/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("privacidade")}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === "privacidade"
              ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Política de Privacidade (LGPD)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("termos")}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === "termos"
              ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            <FileText className="w-4 h-4" />
            <span>Termos de Uso</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cookies")}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === "cookies"
              ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            <Cookie className="w-4 h-4" />
            <span>Política de Cookies</span>
          </button>
        </div>

        {/* Shared Document Content Box */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <LegalDocumentsContent activeTab={activeTab} />
        </div>

        {/* Bottom Footer Action */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-6 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <Link
            to={activeMeta.path}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir em página dedicada ({activeMeta.path})</span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
          >
            Entendido e Ciente
          </button>
        </div>
      </div>
    </div>
  );
};
