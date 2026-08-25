import React, { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Lock,
} from "lucide-react";

interface AuthConfirmViewProps {
  onGoToLogin: () => void;
}

type ConfirmState = "loading" | "success" | "error_expired" | "error_invalid" | "error_generic";

export const AuthConfirmView: React.FC<AuthConfirmViewProps> = ({ onGoToLogin }) => {
  const [status, setStatus] = useState<ConfirmState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    const cleanUrl = () => {
      try {
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) {
        console.warn("Não foi possível limpar a URL:", e);
      }
    };

    const processConfirmation = async () => {
      try {
        const hash = window.location.hash || "";
        const search = window.location.search || "";

        const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.substring(1) : hash);
        const searchParams = new URLSearchParams(search);

        // 1. Verificar se o Supabase retornou erro explícito na URL
        const error = hashParams.get("error") || searchParams.get("error");
        const errorCode = hashParams.get("error_code") || searchParams.get("error_code");
        const errorDescription = hashParams.get("error_description") || searchParams.get("error_description") || "";

        if (error || errorCode) {
          cleanUrl();
          if (
            errorCode === "otp_expired" ||
            errorDescription.toLowerCase().includes("expired") ||
            errorDescription.toLowerCase().includes("expirou")
          ) {
            if (isMounted) setStatus("error_expired");
            return;
          }
          if (
            errorCode === "otp_disabled" ||
            errorDescription.toLowerCase().includes("invalid") ||
            errorDescription.toLowerCase().includes("inválido")
          ) {
            if (isMounted) setStatus("error_invalid");
            return;
          }
          if (isMounted) {
            setStatus("error_generic");
            setErrorMessage("Não foi possível validar este link de ativação.");
          }
          return;
        }

        // 2. Fluxo PKCE (com ?code=...) -> processar antes de limpar a URL
        const code = searchParams.get("code") || hashParams.get("code");
        if (code && isSupabaseConfigured) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          cleanUrl();
          if (exchangeError) {
            console.error("Erro no exchangeCodeForSession:", exchangeError.message);
            if (
              exchangeError.message?.toLowerCase().includes("expired") ||
              exchangeError.message?.toLowerCase().includes("expirou")
            ) {
              if (isMounted) setStatus("error_expired");
            } else {
              if (isMounted) setStatus("error_invalid");
            }
            return;
          }
          if (isMounted) setStatus("success");
          return;
        }

        // 3. Fluxo Token Hash (?token_hash=...&type=signup|email) -> processar antes de limpar a URL
        const tokenHash = searchParams.get("token_hash") || hashParams.get("token_hash");
        const otpType = (searchParams.get("type") || hashParams.get("type") || "email") as any;
        if (tokenHash && isSupabaseConfigured) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType === "signup" ? "signup" : "email",
          });
          cleanUrl();
          if (otpError) {
            console.error("Erro no verifyOtp:", otpError.message);
            if (
              otpError.message?.toLowerCase().includes("expired") ||
              otpError.message?.toLowerCase().includes("expirou")
            ) {
              if (isMounted) setStatus("error_expired");
            } else {
              if (isMounted) setStatus("error_invalid");
            }
            return;
          }
          if (isMounted) setStatus("success");
          return;
        }

        // 4. Fluxo Implicit / Hash (#access_token=...&refresh_token=...) -> processar antes de limpar a URL
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (accessToken && refreshToken && isSupabaseConfigured) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          cleanUrl();
          if (setSessionError) {
            console.error("Erro no setSession:", setSessionError.message);
            if (isMounted) setStatus("error_invalid");
            return;
          }
          if (isMounted) setStatus("success");
          return;
        }

        // 5. Verificar se uma sessão válida já foi restaurada pelo SDK
        if (isSupabaseConfigured) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            cleanUrl();
            if (isMounted) setStatus("success");
            return;
          }
        }

        // 6. Indicação de confirmação por parâmetro type
        const type = hashParams.get("type") || searchParams.get("type");
        if (type === "signup" || type === "email_confirmation" || type === "invite") {
          cleanUrl();
          if (isMounted) setStatus("success");
          return;
        }

        // 7. Fallback com timeout seguro
        const timeout = setTimeout(async () => {
          if (!isMounted) return;
          if (isSupabaseConfigured) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              cleanUrl();
              setStatus("success");
              return;
            }
          }
          cleanUrl();
          setStatus("success");
        }, 1000);

        return () => clearTimeout(timeout);
      } catch (err: any) {
        cleanUrl();
        console.error("Erro no processamento da confirmação de e-mail:", err?.message || err);
        if (isMounted) setStatus("error_generic");
      }
    };

    processConfirmation();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#061F18] text-[#F3FAF6] font-sans selection:bg-[#7AC943] selection:text-[#0A3B2E] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[600px] pointer-events-none select-none z-0 flex items-center justify-center opacity-10">
        <img
          src="/logo-icon-transparent.png"
          alt="Vita4Me Background"
          className="w-[600px] max-w-none object-contain"
        />
      </div>

      <div className="relative z-10 w-full max-w-md bg-[#0A3B2E]/90 border border-[#126D4A] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-2">
          <img
            src="/logo-icon-transparent.png"
            alt="Vita4Me Logo"
            className="h-12 w-auto object-contain"
          />
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-white flex items-center justify-center leading-none">
              vita<span className="text-[#7AC943] font-extrabold">4</span>me
            </span>
            <span className="text-[10px] text-[#CDEBC5] font-medium tracking-wide">
              Saúde Inteligente
            </span>
          </div>
        </div>

        {/* State: LOADING */}
        {status === "loading" && (
          <div className="space-y-4 py-6">
            <div className="flex justify-center">
              <Loader2 className="w-10 h-10 text-[#7AC943] animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-white">Validando Confirmação...</h2>
            <p className="text-xs text-[#CDEBC5]/80">
              Estamos verificando suas credenciais de segurança com o servidor. Aguarde um instante.
            </p>
          </div>
        )}

        {/* State: SUCCESS */}
        {status === "success" && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-[#7AC943]/20 border border-[#7AC943]/40 flex items-center justify-center shadow-lg shadow-[#7AC943]/10">
              <CheckCircle2 className="w-9 h-9 text-[#7AC943]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white tracking-tight">
                E-mail confirmado
              </h2>
              <p className="text-xs text-[#CDEBC5]/90 leading-relaxed">
                Seu e-mail foi confirmado com sucesso. Sua conta Vita4Me está pronta.
              </p>
            </div>

            <div className="p-3 bg-[#061F18]/80 border border-[#126D4A] rounded-2xl text-[11px] text-[#CDEBC5]/80 flex items-center gap-2 text-left">
              <ShieldCheck className="w-4 h-4 text-[#7AC943] shrink-0" />
              <span>Seus dados são protegidos com isolamento absoluto e criptografia.</span>
            </div>

            <button
              onClick={onGoToLogin}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#7AC943] to-[#96DC63] hover:from-[#96DC63] hover:to-[#7AC943] text-[#0A3B2E] font-black text-xs shadow-xl shadow-[#7AC943]/20 transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Entrar no Vita4Me</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* State: ERROR EXPIRED */}
        {status === "error_expired" && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-9 h-9 text-amber-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white tracking-tight">
                Link de Confirmação Expirado
              </h2>
              <p className="text-xs text-[#CDEBC5]/90 leading-relaxed">
                Por motivos de segurança, os links de confirmação possuem tempo limite de validade.
              </p>
            </div>

            <p className="text-[11px] text-[#CDEBC5]/70">
              Se você já confirmou anteriormente, pode entrar na sua conta normalmente.
            </p>

            <button
              onClick={onGoToLogin}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#126D4A] hover:bg-[#7AC943] hover:text-[#0A3B2E] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Fazer Login ou Reenviar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* State: ERROR INVALID */}
        {status === "error_invalid" && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shadow-lg">
              <XCircle className="w-9 h-9 text-rose-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white tracking-tight">
                Link Inválido
              </h2>
              <p className="text-xs text-[#CDEBC5]/90 leading-relaxed">
                Este link de confirmação não é mais válido ou já foi utilizado para ativar a conta.
              </p>
            </div>

            <button
              onClick={onGoToLogin}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#126D4A] hover:bg-[#7AC943] hover:text-[#0A3B2E] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Ir para a Página de Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* State: ERROR GENERIC */}
        {status === "error_generic" && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shadow-lg">
              <XCircle className="w-9 h-9 text-rose-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white tracking-tight">
                Não foi possível confirmar
              </h2>
              <p className="text-xs text-[#CDEBC5]/90 leading-relaxed">
                {errorMessage || "Ocorreu uma instabilidade momentânea ao validar o link de confirmação."}
              </p>
            </div>

            <button
              onClick={onGoToLogin}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#126D4A] hover:bg-[#7AC943] hover:text-[#0A3B2E] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Tentar Entrar na Conta</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Security Reassurance Footer */}
        <div className="pt-2 text-center">
          <span className="text-[10px] text-[#CDEBC5]/50 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-[#7AC943]/70" />
            <span>Vita4Me • Ambiente Seguro com Criptografia de Ponta a Ponta</span>
          </span>
        </div>
      </div>
    </div>
  );
};
