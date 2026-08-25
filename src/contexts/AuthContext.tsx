import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isConfigured: boolean;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (value: boolean) => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const fetchProfile = async (userId: string, userEmail?: string, fullNameMeta?: string): Promise<UserProfile | null> => {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar perfil do Supabase:', error);
        return null;
      }

      if (!data) {
        // Inicialização de segurança caso a trigger de auth ainda não tenha executado
        const newProfile: Partial<UserProfile> = {
          id: userId,
          email: userEmail || '',
          full_name: fullNameMeta || userEmail?.split('@')[0] || 'Usuário Vita4Me',
          plan_tier: 'individual',
          subscription_status: 'inactive',
          ai_credits: 0,
          onboarding_completed: false,
        };
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) {
          console.error('Erro ao criar fallback de perfil:', createError);
          return null;
        }
        if (created) {
          setProfile(created as UserProfile);
          return created as UserProfile;
        }
      } else {
        setProfile(data as UserProfile);
        return data as UserProfile;
      }
    } catch (err) {
      console.error('Exceção ao buscar perfil:', err);
      return null;
    }
    return null;
  };

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (user) {
      return await fetchProfile(user.id, user.email, user.user_metadata?.full_name);
    }
    return null;
  };

  useEffect(() => {
    // Verificar tokens de recuperação na URL
    if (window.location.hash.includes('type=recovery')) {
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
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name);
        } else {
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
      }

      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name);
      } else {
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

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    if (!isSupabaseConfigured) {
      return { error: "Serviço de autenticação não configurado no ambiente." };
    }
    const confirmUrl = `${window.location.origin}/auth/confirm`;
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName?.trim() || '' },
        emailRedirectTo: confirmUrl,
      },
    });
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
    const redirectUrl = `${window.location.origin}/#reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl,
    });
    if (error) {
      return { error: "Não foi possível enviar o link de recuperação. Verifique o e-mail informado." };
    }
    return { error: null };
  };

  const updateUserPassword = async (password: string) => {
    if (!isSupabaseConfigured) {
      return { error: "Serviço de autenticação não configurado." };
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return { error: "Não foi possível atualizar a senha. Tente novamente." };
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
