import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import {
  supabase,
  isSupabaseConfigured,
  markPasswordRecoveryActive,
  clearPasswordRecoveryState,
  hasActivePasswordRecoveryFlag,
} from '../lib/supabase';
import { clearAllHealthStorage, ensureStorageUserScope } from '../lib/healthStorage';
import { validatePasswordPolicy } from '../lib/passwordPolicy';
import { LEGAL_DOCUMENT_VERSION } from '../components/LegalDocumentsContent';
import { UserProfile } from '../types';

const OFFICIAL_RECOVERY_REDIRECT_URL = 'https://vita4me.com/reset-password';

export const getPasswordRecoveryRedirectUrl = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${window.location.origin}/reset-password`;
    }
  }
  return OFFICIAL_RECOVERY_REDIRECT_URL;
};

export interface SignupConsentPayload {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  healthDataAccepted: boolean;
  documentVersion?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isConfigured: boolean;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (value: boolean) => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, fullName?: string, consents?: SignupConsentPayload) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>;
  updateUserPassword: (password: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecoveryState] = useState<boolean>(() => hasActivePasswordRecoveryFlag());

  const setIsPasswordRecovery = (value: boolean) => {
    if (value) {
      markPasswordRecoveryActive();
    } else {
      clearPasswordRecoveryState();
    }
    setIsPasswordRecoveryState(value);
  };

  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar perfil do Supabase:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        return null;
      }

      if (data) {
        setProfile(data as UserProfile);
        return data as UserProfile;
      } else {
        console.warn('Aviso de integridade: Registro em public.profiles não encontrado para o usuário.');
        setProfile(null);
        return null;
      }
    } catch (err: any) {
      console.error('Exceção ao buscar perfil:', err?.message || err);
      return null;
    }
  };

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (user) {
      return await fetchProfile(user.id);
    }
    return null;
  };

  useEffect(() => {
    // Verificar tokens de recuperação na URL ou flag persistida na sessão antes da limpeza do hash pelo SDK
    const searchParams = new URLSearchParams(window.location.search);
    const hashRaw = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const hashParams = new URLSearchParams(hashRaw);
    const hasUrlError = Boolean(
      searchParams.get('error') ||
      searchParams.get('error_code') ||
      hashParams.get('error') ||
      hashParams.get('error_code')
    );
    const urlType = searchParams.get('type') || hashParams.get('type');

    if (hasUrlError) {
      setIsPasswordRecovery(false);
    } else if (urlType === 'recovery' || hasActivePasswordRecoveryFlag()) {
      setIsPasswordRecovery(true);
    }

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    // Obter sessão atual e aguardar hidratação de sessão E perfil antes de finalizar loading
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          ensureStorageUserScope(session.user.id);
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          clearAllHealthStorage();
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Erro na inicialização de autenticação:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
      }

      if (session?.user) {
        ensureStorageUserScope(session.user.id);
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        clearAllHealthStorage();
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: "Serviço de autenticação não configurado no ambiente." };
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      let message = "E-mail ou senha incorretos.";
      if (error.message?.includes("Invalid login credentials")) {
        message = "E-mail ou senha incorretos. Verifique suas credenciais.";
      } else if (error.message?.includes("Email not confirmed")) {
        message = "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
      }
      return { error: message };
    }
    return { error: null };
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    fullName?: string,
    consents?: SignupConsentPayload
  ) => {
    if (!isSupabaseConfigured) {
      return { error: "Serviço de autenticação não configurado no ambiente." };
    }

    const cleanEmail = email.trim();
    const cleanName = fullName?.trim() || "";

    const pwdCheck = validatePasswordPolicy(password);
    if (!pwdCheck.isValid) {
      return { error: pwdCheck.error };
    }

    if (
      !consents ||
      consents.termsAccepted !== true ||
      consents.privacyAccepted !== true ||
      consents.healthDataAccepted !== true
    ) {
      return {
        error: "É obrigatório aceitar os Termos de Uso, a Política de Privacidade e o Consentimento para Tratamento de Dados de Saúde.",
      };
    }

    // Cadastro validado server-side (valida senha, consentimentos obrigatórios e cria registro de auditoria)
    try {
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          fullName: cleanName,
          consents: {
            termsAccepted: consents.termsAccepted,
            privacyAccepted: consents.privacyAccepted,
            healthDataAccepted: consents.healthDataAccepted,
            documentVersion: consents.documentVersion || LEGAL_DOCUMENT_VERSION,
          },
        }),
      });
      const regData = await regRes.json().catch(() => ({}));

      if (regRes.ok && regData.success) {
        // Autenticar imediatamente a sessão recém-criada
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        return { error: null };
      }

      if (regRes.status === 409 || regData.code === "USER_ALREADY_EXISTS") {
        return {
          error: regData.error || "Este e-mail já está cadastrado. Faça login ou solicite recuperação de senha.",
        };
      }

      if ((regRes.status === 400 || regRes.status === 422) && regData.error) {
        return { error: regData.error };
      }
    } catch (e) {
      console.warn("Fallback para signUp direto do cliente:", e);
    }

    // Fallback caso o endpoint administrativo não esteja acessível
    const confirmUrl = `${window.location.origin}/auth/confirm`;
    const acceptedAt = new Date().toISOString();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          consents_accepted_v2: true,
          consents: {
            termsAccepted: true,
            privacyAccepted: true,
            healthDataAccepted: true,
            documentVersion: consents.documentVersion || LEGAL_DOCUMENT_VERSION,
            acceptedAt,
            source: "web_signup_fallback",
          },
        },
        emailRedirectTo: confirmUrl,
      },
    });

    if (!error && data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return {
        error: "Este e-mail já está cadastrado. Faça login com sua senha ou solicite recuperação de senha.",
      };
    }

    if (error) {
      let message = "Não foi possível criar sua conta. Tente novamente em alguns instantes.";
      if (error.message?.includes("User already registered") || error.message?.includes("already exists")) {
        message = "Este e-mail já está cadastrado. Faça login ou solicite recuperação de senha.";
      } else if (error.message?.includes("Password should be")) {
        message = "A senha informada não atende aos critérios mínimos de segurança.";
      } else if (error.message?.includes("valid email") || error.message?.includes("invalid email")) {
        message = "Por favor, insira um endereço de e-mail válido.";
      } else if (error.message?.includes("Database error")) {
        message = "Não foi possível inicializar seu prontuário no momento. Tente novamente em alguns instantes.";
      }
      return { error: message };
    }
    return { error: null };
  };

  const resetPasswordForEmail = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: "Serviço de autenticação não configurado." };
    }
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { error: "Por favor, informe um endereço de e-mail válido." };
    }
    const redirectUrl = getPasswordRecoveryRedirectUrl();
    // Não revelar se o e-mail existe ou não (prevenção de enumeração de contas)
    await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    }).catch(() => {});
    return { error: null };
  };

  const updateUserPassword = async (password: string) => {
    if (!isSupabaseConfigured) {
      return { error: "Serviço de autenticação não configurado." };
    }
    const pwdCheck = validatePasswordPolicy(password);
    if (!pwdCheck.isValid) {
      return { error: pwdCheck.error };
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      const code = (error as { code?: string }).code?.toLowerCase() || '';
      const msg = error.message?.toLowerCase() || '';
      if (code === 'same_password' || msg.includes('different from the old password')) {
        return { error: "A nova senha deve ser diferente da senha atual." };
      }
      if (code === 'weak_password' || msg.includes('weak password') || msg.includes('password should be')) {
        return { error: "A nova senha não atende aos requisitos mínimos de segurança." };
      }
      if (
        code === 'session_not_found' ||
        msg.includes('session missing') ||
        msg.includes('expired') ||
        msg.includes('invalid token') ||
        msg.includes('jwt')
      ) {
        return { error: "Sua sessão de recuperação expirou ou é inválida. Solicite um novo link de redefinição." };
      }
      if (code === 'over_request_rate_limit' || msg.includes('rate limit')) {
        return { error: "Muitas tentativas em sequência. Aguarde alguns instantes e tente novamente." };
      }
      return { error: "Não foi possível atualizar a senha. Solicite um novo link se o problema persistir." };
    }
    setIsPasswordRecovery(false);
    return { error: null };
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      return { error: "Serviço de autenticação não configurado no ambiente." };
    }
    const redirectUrl = `${window.location.origin}/auth/confirm`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) {
      return { error: error.message || "Não foi possível conectar com o Google." };
    }
    return { error: null };
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Erro no signOut:", err);
      }
    }
    if (typeof window !== "undefined") {
      try {
        clearPasswordRecoveryState();
        clearAllHealthStorage();
        sessionStorage.clear();
      } catch (e) {
        // Silencioso
      }
    }
    setIsPasswordRecoveryState(false);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isConfigured: isSupabaseConfigured,
        isPasswordRecovery,
        setIsPasswordRecovery,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        resetPasswordForEmail,
        updateUserPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
