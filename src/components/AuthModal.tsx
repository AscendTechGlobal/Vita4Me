import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { trackEvent } from "../lib/analytics";
import { LegalDocumentsModal, LegalTab } from "./LegalDocumentsModal";
import {
  X,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ArrowRight,
  Loader2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Activity,
  Heart,
  KeyRound,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    signInWithEmail,
    signUpWithEmail,
    resetPasswordForEmail,
    loginAsDemo,
    isConfigured,
  } = useAuth();

  const [tab, setTab] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [healthConsentAccepted, setHealthConsentAccepted] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<"privacidade" | "termos" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !legalModalTab) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, legalModalTab, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (tab === "login") {
        if (!email || !password) {
          setErrorMsg("Preencha e-mail e senha.");
          return;
        }
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setErrorMsg(error);
        } else {
          trackEvent('login_completed', { source: 'email_password' });
          onClose();
        }
      } else if (tab === "signup") {
        if (!email || !password || !fullName) {
          setErrorMsg("Preencha todos os campos.");
          return;
        }
        if (password.length < 6) {
          setErrorMsg("A senha deve ter no mínimo 6 caracteres.");
          return;
        }
        if (!termsAccepted) {
          setErrorMsg("É obrigatório concordar com os Termos de Uso e Política de Privacidade.");
          return;
        }
        if (!healthConsentAccepted) {
          setErrorMsg("É obrigatório autorizar o tratamento de dados de saúde para criar o prontuário.");
          return;
        }
        const { error } = await signUpWithEmail(email, password, fullName);
        if (error) {
          setErrorMsg(error);
        } else {
          trackEvent('signup_completed', { source: 'email_password' });
          setSuccessMsg("Conta criada com sucesso! Verifique seu e-mail ou faça login.");
          setTimeout(() => setTab("login"), 2000);
        }
      } else if (tab === "reset") {
        if (!email) {
          setErrorMsg("Informe seu e-mail cadastrado.");
          return;
        }
        const { error } = await resetPasswordForEmail(email);
        if (error) {
          setErrorMsg(error);
        } else {
          setSuccessMsg("Link de redefinição de senha enviado para o seu e-mail!");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAccess = () => {
    loginAsDemo();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="text-center space-y-2 mb-6">
          <div className="flex justify-center mb-2">
            <img
              src="/logo-full-transparent.png"
              alt="Vita4Me"
              className="h-16 w-auto object-contain drop-shadow-xs"
            />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {tab === "login" && "Acessar Vita4Me"}
            {tab === "signup" && "Criar Prontuário Inteligente"}
            {tab === "reset" && "Recuperar Senha"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {tab === "login" && "Centralize sua jornada médica e exames em um só lugar."}
            {tab === "signup" && "Comece a organizar exames e indicadores de saúde com IA."}
            {tab === "reset" && "Digite seu e-mail para receber as instruções de recuperação."}
          </p>
        </div>

        {/* Supabase Status Indicator */}
        {!isConfigured && (
          <div className="mb-4 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 truncate">
              <Activity className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">Modo Demonstração Ativo</span>
            </div>
          </div>
        )}

        {/* Tabs Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-950/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => { setTab("login"); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              tab === "login"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setTab("signup"); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              tab === "signup"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Cadastrar
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nome Completo
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {tab !== "reset" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Senha
                </label>
                {tab === "login" && (
                  <button
                    type="button"
                    onClick={() => { setTab("reset"); setErrorMsg(null); setSuccessMsg(null); }}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium transition cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          )}

          {tab === "signup" && (
            <div className="space-y-2.5 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="leading-tight">
                  Li e concordo com os{" "}
                  <button
                    type="button"
                    onClick={() => setLegalModalTab("termos")}
                    className="text-emerald-600 dark:text-emerald-400 underline font-semibold hover:text-emerald-700 cursor-pointer"
                  >
                    Termos de Uso
                  </button>{" "}
                  e com a{" "}
                  <button
                    type="button"
                    onClick={() => setLegalModalTab("privacidade")}
                    className="text-emerald-600 dark:text-emerald-400 underline font-semibold hover:text-emerald-700 cursor-pointer"
                  >
                    Política de Privacidade
                  </button>
                  .
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={healthConsentAccepted}
                  onChange={(e) => setHealthConsentAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="leading-tight">
                  Autorizo expressamente o tratamento dos meus <strong>dados pessoais sensíveis de saúde</strong> (exames, biomarcadores e medicamentos) para organização do prontuário e tradução com inteligência artificial conforme a Política de Privacidade (Art. 11, I da LGPD).
                </span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <span>
                  {tab === "login" && "Entrar na Conta"}
                  {tab === "signup" && "Criar Prontuário"}
                  {tab === "reset" && "Enviar Link de Recuperação"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Mode Button */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-center space-y-2">
          <button
            type="button"
            onClick={handleDemoAccess}
            className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Entrar como Demonstração (Sem Login)</span>
          </button>
          <p className="text-[10px] text-slate-500">
            Acesso local instantâneo com prontuário e exames de exemplo.
          </p>
        </div>
      </div>

      {/* Embedded Legal Documents Modal */}
      {legalModalTab && (
        <LegalDocumentsModal
          isOpen={!!legalModalTab}
          onClose={() => setLegalModalTab(null)}
          initialTab={legalModalTab}
        />
      )}
    </div>
  );
};
