import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Cookie,
  FileText,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { openCookiePreferencesModal } from "../analytics/consent";
import {
  LEGAL_DOCUMENT_META,
  LegalDocumentsContent,
  PublicLegalDocumentId,
} from "./LegalDocumentsContent";

interface LegalPageViewProps {
  documentId: PublicLegalDocumentId;
}

function updateMetaTag(
  selector: string,
  attrName: "content" | "href",
  nextValue: string
): () => void {
  const element = document.head.querySelector(selector);
  if (!element) {
    return () => {};
  }
  const previousValue = element.getAttribute(attrName);
  element.setAttribute(attrName, nextValue);
  return () => {
    if (previousValue !== null) {
      element.setAttribute(attrName, previousValue);
    }
  };
}

export const LegalPageView: React.FC<LegalPageViewProps> = ({ documentId }) => {
  const { user } = useAuth();
  const meta = LEGAL_DOCUMENT_META[documentId];

  useEffect(() => {
    const previousTitle = document.title;
    document.title = meta.title;

    const cleanups = [
      updateMetaTag('meta[name="description"]', "content", meta.description),
      updateMetaTag('link[rel="canonical"]', "href", meta.canonicalUrl),
      updateMetaTag('meta[property="og:url"]', "content", meta.canonicalUrl),
      updateMetaTag('meta[property="og:title"]', "content", meta.title),
      updateMetaTag('meta[property="og:description"]', "content", meta.description),
      updateMetaTag('meta[name="twitter:url"]', "content", meta.canonicalUrl),
      updateMetaTag('meta[name="twitter:title"]', "content", meta.title),
      updateMetaTag('meta[name="twitter:description"]', "content", meta.description),
    ];

    window.scrollTo({ top: 0, behavior: "auto" });

    return () => {
      document.title = previousTitle;
      cleanups.forEach((restore) => restore());
    };
  }, [meta]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              to="/"
              className="flex items-center gap-2 shrink-0 hover:opacity-90 transition"
              aria-label="Página inicial do Vita4Me"
            >
              <img
                src="/logo-full-transparent.png"
                alt="Vita4Me"
                className="h-9 sm:h-10 w-auto object-contain"
              />
            </Link>
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Vita4Me</span>
            </Link>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/"
              className="sm:hidden inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Início</span>
            </Link>
            <Link
              to={user ? "/app" : "/login"}
              className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs shadow-emerald-600/20"
            >
              <span>{user ? "Meu Prontuário" : "Entrar no Vita4Me"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Legal Document Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden p-6 sm:p-10 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Central de Transparência & Conformidade Legal
                </p>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {meta.heading}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Vita4Me • Em conformidade com a LGPD (Lei nº 13.709/2018) e CDC
                </p>
              </div>
            </div>
          </div>

          {/* Public Route Navigation Switcher */}
          <nav
            aria-label="Documentos legais do Vita4Me"
            className="flex bg-slate-100 dark:bg-slate-950/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto gap-1"
          >
            <Link
              to="/privacidade"
              className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap ${
                documentId === "privacidade"
                  ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Política de Privacidade (LGPD)</span>
            </Link>

            <Link
              to="/termos"
              className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap ${
                documentId === "termos"
                  ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Termos de Uso</span>
            </Link>

            <Link
              to="/cookies"
              className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap ${
                documentId === "cookies"
                  ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Cookie className="w-4 h-4 shrink-0" />
              <span>Política de Cookies</span>
            </Link>
          </nav>

          {/* Shared Single Source of Truth Legal Content */}
          <div className="pt-1">
            <LegalDocumentsContent activeTab={documentId} />
          </div>

          {/* Bottom Card Navigation */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para a página inicial</span>
            </Link>

            <Link
              to={user ? "/app" : "/login"}
              className="inline-flex items-center gap-1.5 py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs"
            >
              <span>{user ? "Voltar ao Prontuário" : "Acessar Vita4Me"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>&copy; 2026 Vita4Me. Todos os direitos reservados.</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/privacidade" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
              Privacidade (LGPD)
            </Link>
            <Link to="/termos" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
              Termos de Uso
            </Link>
            <Link to="/cookies" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
              Cookies
            </Link>
            <button
              type="button"
              onClick={() => openCookiePreferencesModal()}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
            >
              Preferências de Cookies
            </button>
            <Link to="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
              Início
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
