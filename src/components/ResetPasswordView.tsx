import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { validatePasswordPolicy } from "../lib/passwordPolicy";
import {
  clearPasswordRecoveryState,
  hasActivePasswordRecoveryFlag,
  isSupabaseConfigured,
  supabase,
} from "../lib/supabase";

type RecoveryViewState =
  | "validating"
  | "ready"
  | "success"
  | "error_expired"
  | "error_invalid"
  | "error_generic";

interface RecoveryErrorClassification {
  state: Extract<RecoveryViewState, "error_expired" | "error_invalid" | "error_generic">;
  message: string;
}

function classifyRecoveryError(
  errorCode?: string | null,
  error?: string | null,
  description?: string | null
): RecoveryErrorClassification {
  const code = (errorCode || "").toLowerCase();
  const err = (error || "").toLowerCase();
  const desc = (description || "").toLowerCase();

  if (code === "otp_expired" || desc.includes("expired")) {
    return {
      state: "error_expired",
      message:
        "Este link de redefinição expirou ou já foi utilizado. Por segurança, solicite um novo link abaixo.",
    };
  }

  if (
    err === "access_denied" ||
    code === "otp_disabled" ||
    code === "validation_failed" ||
    desc.includes("invalid") ||
    desc.includes("otp")
  ) {
    return {
      state: "error_invalid",
      message:
        "O link de recuperação é inválido, incompleto ou já foi utilizado. Solicite uma nova redefinição de senha.",
    };
  }

  return {
    state: "error_generic",
    message:
      "Não foi possível validar sua solicitação de recuperação de senha. Solicite um novo link para continuar.",
  };
}

interface RecoveryValidationOutcome {
  state: Exclude<RecoveryViewState, "validating" | "success">;
  message?: string;
}

// Deduplica validações de token de uso único (StrictMode / remount rápido) sem vazar tokens
const inFlightTokenValidations = new Map<string, Promise<RecoveryValidationOutcome>>();
let recentCleanValidation: {
  startedAt: number;
  promise: Promise<RecoveryValidationOutcome>;
} | null = null;

function runDeduplicatedRecoveryValidation(
  dedupeKey: string | null,
  hasEmptyUrlAfterClean: boolean,
  runner: () => Promise<RecoveryValidationOutcome>
): Promise<RecoveryValidationOutcome> {
  if (!dedupeKey && hasEmptyUrlAfterClean && recentCleanValidation && Date.now() - recentCleanValidation.startedAt < 1500) {
    return recentCleanValidation.promise;
  }
  if (!dedupeKey) {
    return runner();
  }
  const existing = inFlightTokenValidations.get(dedupeKey);
  if (existing) {
    return existing;
  }
  const promise = runner().finally(() => {
    window.setTimeout(() => {
      inFlightTokenValidations.delete(dedupeKey);
      if (recentCleanValidation?.promise === promise) {
        recentCleanValidation = null;
      }
    }, 5000);
  });
  inFlightTokenValidations.set(dedupeKey, promise);
  recentCleanValidation = { startedAt: Date.now(), promise };
  return promise;
}

export const ResetPasswordView: React.FC = () => {
  const {
    isPasswordRecovery,
    setIsPasswordRecovery,
    updateUserPassword,
    signOut,
  } = useAuth();
  const navigate = useNavigate();

  const [viewState, setViewState] = useState<RecoveryViewState>("validating");
  const [statusMessage, setStatusMessage] = useState<string>(
    "Validando seu link seguro de recuperação de senha..."
  );

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTimerRef = useRef<number | null>(null);
  const isPasswordRecoveryRef = useRef(isPasswordRecovery);
  isPasswordRecoveryRef.current = isPasswordRecovery;

  const passwordCriteria = useMemo(() => {
    const policy = validatePasswordPolicy(newPassword);
    return {
      hasMinLength: policy.checks.minLength,
      hasUpperCase: policy.checks.hasUpperCase,
      hasLowerCase: policy.checks.hasLowerCase,
      hasNumber: policy.checks.hasNumber,
      hasSpecialChar: policy.checks.hasSpecialChar,
      passwordsMatch: newPassword.length > 0 && newPassword === confirmPassword,
      isStrong: policy.isValid,
    };
  }, [newPassword, confirmPassword]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Vita4Me — Redefinir Senha";
    }
  }, []);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const cleanBrowserUrl = () => {
      try {
        if (window.location.search || window.location.hash) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch {
        // Silencioso em navegadores restritivos
      }
    };

    const searchParams = new URLSearchParams(window.location.search);
    const hashRaw = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hashRaw);

    const urlError = searchParams.get("error") || hashParams.get("error");
    const urlErrorCode = searchParams.get("error_code") || hashParams.get("error_code");
    const urlErrorDescription =
      searchParams.get("error_description") || hashParams.get("error_description");

    const tokenHash = searchParams.get("token_hash") || hashParams.get("token_hash");
    const urlType = (searchParams.get("type") || hashParams.get("type") || "").toLowerCase();
    const code = searchParams.get("code") || hashParams.get("code");
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    const hasEmptyUrlAfterClean = !window.location.search && !window.location.hash;

    // Limpar parâmetros/tokens sensíveis da barra de endereço imediatamente após leitura
    cleanBrowserUrl();

    const dedupeKey = tokenHash
      ? `otp:${urlType}:${tokenHash}`
      : code
        ? `code:${urlType}:${code}`
        : null;

    const executeValidation = async (): Promise<RecoveryValidationOutcome> => {
      if (!isSupabaseConfigured) {
        return {
          state: "error_generic",
          message:
            "Serviço de autenticação indisponível no momento. Tente novamente em instantes.",
        };
      }

      // 1. Erros explícitos retornados pelo Supabase no fragment/query (ex.: otp_expired)
      if (urlError || urlErrorCode) {
        return classifyRecoveryError(urlErrorCode, urlError, urlErrorDescription);
      }

      try {
        // 2. Fluxo Token Hash (?token_hash=...&type=recovery) — exige type=recovery explicitamente
        if (tokenHash) {
          if (urlType !== "recovery") {
            return {
              state: "error_invalid",
              message: "Este link não corresponde a uma redefinição de senha válida.",
            };
          }

          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });

          if (otpError) {
            return classifyRecoveryError(
              (otpError as { code?: string }).code,
              otpError.name,
              otpError.message
            );
          }

          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData?.user) {
            return {
              state: "error_expired",
              message:
                "Não foi possível estabelecer uma sessão de recuperação válida. Solicite um novo link.",
            };
          }

          return { state: "ready" };
        }

        // 3. Fluxo PKCE (?code=...) — aguarda inicialização do SDK antes de trocar código se necessário
        if (code) {
          if (urlType && urlType !== "recovery") {
            return {
              state: "error_invalid",
              message: "Este link não corresponde a uma redefinição de senha válida.",
            };
          }

          const {
            data: { session: initialSession },
          } = await supabase.auth.getSession();

          if (!initialSession) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              return classifyRecoveryError(
                (exchangeError as { code?: string }).code,
                exchangeError.name,
                exchangeError.message
              );
            }
          }

          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData?.user) {
            return {
              state: "error_expired",
              message:
                "Sua sessão de recuperação expirou ou é inválida. Solicite um novo link.",
            };
          }

          return { state: "ready" };
        }

        // 4. Fluxo implícito (#access_token=...&type=recovery) ou sessão de recovery já processada pelo GoTrueClient
        if (accessToken) {
          if (urlType !== "recovery") {
            return {
              state: "error_invalid",
              message: "Este link não corresponde a uma redefinição de senha válida.",
            };
          }

          const {
            data: { session: existingSession },
          } = await supabase.auth.getSession();

          if (!existingSession && refreshToken) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (setSessionError) {
              return classifyRecoveryError(
                (setSessionError as { code?: string }).code,
                setSessionError.name,
                setSessionError.message
              );
            }
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const hasRecoveryContext =
          isPasswordRecoveryRef.current ||
          hasActivePasswordRecoveryFlag() ||
          urlType === "recovery";

        if (!session || !hasRecoveryContext) {
          return {
            state: "error_invalid",
            message:
              "Nenhuma solicitação válida de redefinição de senha foi encontrada. Acesse 'Esqueceu a senha?' no login para receber um novo link.",
          };
        }

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          return {
            state: "error_expired",
            message:
              "Sua sessão de recuperação expirou ou foi invalidada. Solicite um novo link de recuperação.",
          };
        }

        return { state: "ready" };
      } catch {
        return {
          state: "error_generic",
          message:
            "Não foi possível validar o link de recuperação. Solicite um novo e-mail para continuar.",
        };
      }
    };

    runDeduplicatedRecoveryValidation(dedupeKey, hasEmptyUrlAfterClean, executeValidation).then((outcome) => {
      if (outcome.state === "ready") {
        setIsPasswordRecovery(true);
      } else {
        clearPasswordRecoveryState();
        setIsPasswordRecovery(false);
      }

      if (!isMounted) return;
      if (outcome.message) {
        setStatusMessage(outcome.message);
      }
      setViewState(outcome.state);
    });

    return () => {
      isMounted = false;
    };
  }, [setIsPasswordRecovery]);

  const handleGoToLogin = async () => {
    if (viewState === "ready") {
      clearPasswordRecoveryState();
      setIsPasswordRecovery(false);
      await signOut().catch(() => {});
    }
    navigate("/login", { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const policyCheck = validatePasswordPolicy(newPassword);
    if (!policyCheck.isValid) {
      setFormError(
        policyCheck.error ||
          "A senha não atende aos requisitos mínimos de segurança."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError("As senhas informadas não coincidem. Verifique e tente novamente.");
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        clearPasswordRecoveryState();
        setIsPasswordRecovery(false);
        setStatusMessage(
          "Sua sessão de recuperação expirou antes da conclusão. Solicite um novo link."
        );
        setViewState("error_expired");
        return;
      }

      const { error } = await updateUserPassword(newPassword);
      if (error) {
        setFormError(error);
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      await signOut();
      setViewState("success");

      redirectTimerRef.current = window.setTimeout(() => {
        navigate("/login?passwordReset=success", { replace: true });
      }, 2800);
    } catch {
      setFormError(
        "Não foi possível concluir a alteração da senha. Tente novamente ou solicite um novo link."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled =
    isSubmitting || !passwordCriteria.isStrong || !passwordCriteria.passwordsMatch;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={handleGoToLogin}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ir para o Login</span>
          </button>
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
            {viewState === "validating" && "Validando Recuperação"}
            {viewState === "ready" && "Definir Nova Senha"}
            {viewState === "success" && "Senha Atualizada"}
            {viewState === "error_expired" && "Link Expirado"}
            {viewState === "error_invalid" && "Link Inválido"}
            {viewState === "error_generic" && "Erro na Recuperação"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {viewState === "validating" &&
              "Verificando a autenticidade da sua sessão de recuperação."}
            {viewState === "ready" &&
              "Crie uma nova senha forte para proteger seu prontuário médico."}
            {viewState === "success" &&
              "Sua senha foi redefinida com sucesso. Redirecionando para o login..."}
            {(viewState === "error_expired" ||
              viewState === "error_invalid" ||
              viewState === "error_generic") &&
              "Por proteção da sua conta, links de redefinição têm uso único e validade limitada."}
          </p>
        </div>

        {/* Estado: Validando */}
        {viewState === "validating" && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-spin" />
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs">
              {statusMessage}
            </p>
          </div>
        )}

        {/* Estado: Pronto para nova senha */}
        {viewState === "ready" && (
          <>
            {formError && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span className="leading-snug">{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nova senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={showNewPassword ? "Ocultar nova senha" : "Mostrar nova senha"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword
                        ? "Ocultar confirmação de senha"
                        : "Mostrar confirmação de senha"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Checklist em tempo real alinhado à política de senha do Vita4Me / Supabase */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 text-[11px]">
                <span className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Requisitos de Senha Forte:
                </span>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <span
                    className={
                      passwordCriteria.hasMinLength
                        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                        : "text-slate-400"
                    }
                  >
                    &bull; 8+ caracteres
                  </span>
                  <span
                    className={
                      passwordCriteria.hasUpperCase
                        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                        : "text-slate-400"
                    }
                  >
                    &bull; Letra maiúscula
                  </span>
                  <span
                    className={
                      passwordCriteria.hasLowerCase
                        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                        : "text-slate-400"
                    }
                  >
                    &bull; Letra minúscula
                  </span>
                  <span
                    className={
                      passwordCriteria.hasNumber
                        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                        : "text-slate-400"
                    }
                  >
                    &bull; Número (0-9)
                  </span>
                  <span
                    className={
                      passwordCriteria.hasSpecialChar
                        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                        : "text-slate-400"
                    }
                  >
                    &bull; Símbolo especial (!@#$)
                  </span>
                  <span
                    className={
                      passwordCriteria.passwordsMatch
                        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                        : "text-slate-400"
                    }
                  >
                    &bull; Senhas coincidem
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitDisabled}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${
                  isSubmitDisabled
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Alterar Senha</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Estado: Sucesso */}
        {viewState === "success" && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Senha redefinida com sucesso!</p>
                <p className="leading-relaxed">
                  Você já pode acessar o Vita4Me utilizando sua nova senha. Estamos
                  redirecionando para a tela de login.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/login?passwordReset=success", { replace: true })}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <span>Ir para o Login agora</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Estado: Erro (Expirado / Inválido / Genérico) */}
        {(viewState === "error_expired" ||
          viewState === "error_invalid" ||
          viewState === "error_generic") && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-2xl text-xs flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <p className="leading-relaxed">{statusMessage}</p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => navigate("/login?tab=reset", { replace: true })}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <span>Solicitar Novo Link de Recuperação</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/login", { replace: true })}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Voltar ao Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
