import React, { useState, useEffect, useMemo } from "react";
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
  AlertCircle,
  CheckCircle2,
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
  } = useAuth();

  const [tab, setTab] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [healthConsentAccepted, setHealthConsentAccepted] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab | null>(null);
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

  // Real-time password criteria validation
  const passwordCriteria = useMemo(() => {
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);
    const isStrong = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
    const passwordsMatch = password.length > 0 && password === confirmPassword;

    return {
      hasMinLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar,
      isStrong,
      passwordsMatch,
    };
  }, [password, confirmPassword]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (tab === "login") {
        if (!email.trim() || !password) {
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
        if (!email.trim() || !password || !confirmPassword || !fullName.trim()) {
          setErrorMsg("Por favor, preencha todos os campos do formulário.");
          return;
        }
        if (!passwordCriteria.isStrong) {
          setErrorMsg("A senha deve cumprir todos os requisitos de segurança (8+ dígitos, maiúscula, minúscula, número e caractere especial).");
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg("A confirmação de senha não coincide com a senha digitada.");
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
          setSuccessMsg("Conta criada com sucesso! Verifique seu e-mail ou faça login para acessar seu prontuário.");
          setTimeout(() => setTab("login"), 2500);
        }
      } else if (tab === "reset") {
        if (!email.trim()) {
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

  const isSignupDisabled =
    isLoading ||
    (tab === "signup" &&
      (!passwordCriteria.isStrong ||
        !passwordCriteria.passwordsMatch ||
        !termsAccepted ||
        !healthConsentAccepted ||
        !fullName.trim() ||
        !email.trim()));

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
          aria-label="Fechar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="text-center space-y-2 mb-6">
          <div className="flex justify-center mb-2">
            <img
              src="/logo-full-transparent.png"
              alt="Vita4Me"
              className="h-14 w-auto object-contain drop-shadow-xs"
            />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {tab === "login" && "Acessar Vita4Me"}
            {tab === "signup" && "Criar Prontuário Inteligente"}
            {tab === "reset" && "Recuperar Senha"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {tab === "login" && "Centralize sua jornada médica e exames em um só lugar seguro."}
            {tab === "signup" && "Comece a organizar exames e biomarcadores de saúde com IA."}
            {tab === "reset" && "Digite seu e-mail para receber as instruções de recuperação."}
          </p>
        </div>

        {/* Tabs Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-950/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 mb-5">
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
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
            <>
              <div>
                <div className="flex items-center justify-between mb-1">
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
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                    aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {tab === "signup" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                      aria-label={showConfirmPassword ? "Ocultar confirmação de senha" : "Ver confirmação de senha"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Real-time Password Security Checklist (Sign-up only) */}
          {tab === "signup" && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 text-[11px]">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                Requisitos de Segurança da Senha:
              </span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                <div className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                  {passwordCriteria.hasMinLength ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                  )}
                  <span>8+ caracteres</span>
                </div>

                <div className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.hasUpperCase ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                  {passwordCriteria.hasUpperCase ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                  )}
                  <span>Letra maiúscula</span>
                </div>

                <div className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.hasLowerCase ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                  {passwordCriteria.hasLowerCase ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                  )}
                  <span>Letra minúscula</span>
                </div>

                <div className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                  {passwordCriteria.hasNumber ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                  )}
                  <span>Número</span>
                </div>

                <div className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.hasSpecialChar ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                  {passwordCriteria.hasSpecialChar ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                  )}
                  <span>Caractere especial</span>
                </div>

                <div className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.passwordsMatch ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                  {passwordCriteria.passwordsMatch ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                  )}
                  <span>Senhas conferem</span>
                </div>
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
            disabled={isSignupDisabled}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
