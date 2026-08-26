import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { trackEvent, trackPageView } from "../lib/analytics";
import { LegalDocumentsModal, LegalTab } from "./LegalDocumentsModal";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck
} from "lucide-react";

interface AuthPageViewProps {
  initialTab?: "login" | "signup" | "reset";
}

export const AuthPageView: React.FC<AuthPageViewProps> = ({ initialTab = "login" }) => {
  const { user, signInWithEmail, signUpWithEmail, resetPasswordForEmail, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [tab, setTab] = useState<"login" | "signup" | "reset">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [healthConsentAccepted, setHealthConsentAccepted] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync tab with initialTab prop or URL
  useEffect(() => {
    setTab(initialTab);
    setErrorMsg(null);
    setSuccessMsg(null);
    trackPageView(location.pathname, `Vita4Me — ${initialTab === 'signup' ? 'Cadastro' : 'Login'}`);
  }, [initialTab, location.pathname]);

  // Se o usuário já estiver autenticado, redireciona diretamente para /app
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/app", { replace: true });
    }
  }, [user, authLoading, navigate]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

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
          trackEvent("login_completed", { source: "email_password" });
          navigate("/app", { replace: true });
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
          trackEvent("signup_completed", { source: "email_password" });
          setSuccessMsg("Conta criada com sucesso! Verifique seu e-mail para confirmar seu cadastro antes de acessar.");
          setTimeout(() => {
            navigate("/login");
          }, 3000);
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
      setIsSubmitting(false);
    }
  };

  const isSignupDisabled =
    isSubmitting ||
    (tab === "signup" &&
      (!passwordCriteria.isStrong ||
        !passwordCriteria.passwordsMatch ||
        !termsAccepted ||
        !healthConsentAccepted ||
        !fullName.trim() ||
        !email.trim()));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Voltar ao site link */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao site</span>
          </Link>
          <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/80">
            <ShieldCheck className="w-3 h-3" />
            <span>256-Bit SSL</span>
          </div>
        </div>

        {/* Header Branding */}
        <div className="text-center space-y-2 mb-6">
          <div className="flex justify-center mb-2">
            <img
              src="/logo-full-transparent.png"
              alt="Vita4Me"
              className="h-14 w-auto object-contain drop-shadow-xs"
            />
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {tab === "login" && "Acessar Vita4Me"}
            {tab === "signup" && "Criar Prontuário Inteligente"}
            {tab === "reset" && "Recuperar Senha"}
          </h1>
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
            onClick={() => {
              navigate("/login");
            }}
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
            onClick={() => {
              navigate("/cadastro");
            }}
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
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {tab !== "reset" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Senha
                </label>
                {tab === "login" && (
                  <button
                    type="button"
                    onClick={() => { setTab("reset"); setErrorMsg(null); setSuccessMsg(null); }}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {tab === "signup" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirme a Senha
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password strength criteria checklist */}
              {password.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 text-[11px]">
                  <span className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Requisitos de Senha Forte:
                  </span>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <span className={passwordCriteria.hasMinLength ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"}>
                      &bull; 8+ caracteres
                    </span>
                    <span className={passwordCriteria.hasUpperCase ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"}>
                      &bull; Letra maiúscula
                    </span>
                    <span className={passwordCriteria.hasLowerCase ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"}>
                      &bull; Letra minúscula
                    </span>
                    <span className={passwordCriteria.hasNumber ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"}>
                      &bull; Número (0-9)
                    </span>
                    <span className={passwordCriteria.hasSpecialChar ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"}>
                      &bull; Símbolo especial (!@#$)
                    </span>
                    <span className={passwordCriteria.passwordsMatch ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"}>
                      &bull; Senhas coincidem
                    </span>
                  </div>
                </div>
              )}

              {/* Legal & Health Data Consent Checkboxes */}
              <div className="space-y-2 pt-1">
                <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    Li e concordo com os{" "}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setLegalModalTab("terms"); }}
                      className="text-emerald-600 dark:text-emerald-400 underline font-semibold hover:text-emerald-700"
                    >
                      Termos de Uso
                    </button>{" "}
                    e a{" "}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setLegalModalTab("privacy"); }}
                      className="text-emerald-600 dark:text-emerald-400 underline font-semibold hover:text-emerald-700"
                    >
                      Política de Privacidade
                    </button>
                    .
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                  <input
                    type="checkbox"
                    checked={healthConsentAccepted}
                    onChange={(e) => setHealthConsentAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    Autorizo o tratamento dos meus dados de saúde e exames para fins exclusivos de gestão do meu prontuário médico pessoal (Art. 11 LGPD).
                  </span>
                </label>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={tab === "signup" ? isSignupDisabled : isSubmitting}
            className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${
              tab === "signup" && isSignupDisabled
                ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>
                  {tab === "login" && "Entrar no Prontuário"}
                  {tab === "signup" && "Criar Minha Conta"}
                  {tab === "reset" && "Enviar Instruções"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer switch to reset or login */}
        {tab === "reset" && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setTab("login"); setErrorMsg(null); setSuccessMsg(null); }}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Voltar ao Login
            </button>
          </div>
        )}
      </div>

      {/* Modal de Documentos Legais */}
      {legalModalTab && (
        <LegalDocumentsModal
          isOpen={Boolean(legalModalTab)}
          onClose={() => setLegalModalTab(null)}
          defaultTab={legalModalTab}
        />
      )}
    </div>
  );
};
