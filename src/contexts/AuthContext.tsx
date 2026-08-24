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
  loginAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER: any = {
  id: 'demo-user-healthai',
  email: 'usuario@healthai.app',
  user_metadata: { full_name: 'Eduardo Weber (Demo)' },
};

const DEMO_PROFILE: UserProfile = {
  id: 'demo-user-vita4me',
  email: 'usuario@vita4me.app',
  full_name: 'Eduardo Weber (Demo)',
  blood_type: 'O+',
  date_of_birth: '1988-06-14',
  gender: 'Masculino',
  emergency_contact_name: 'Camila Weber',
  emergency_contact_phone: '+55 11 98888-7777',
  plan_tier: 'individual',
  subscription_status: 'inactive',
  ai_credits: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const fetchProfile = async (userId: string, userEmail?: string, fullNameMeta?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile not created yet, create it with inactive subscription until Stripe confirms
        const newProfile: Partial<UserProfile> = {
          id: userId,
          email: userEmail || '',
          full_name: fullNameMeta || userEmail?.split('@')[0] || 'Usuário Vita4Me',
          plan_tier: 'individual',
          subscription_status: 'inactive',
          ai_credits: 0,
        };
        const { data: created } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
        if (created) setProfile(created as UserProfile);
      } else if (data) {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    // Check URL for recovery tokens
    if (window.location.hash.includes('type=recovery')) {
      setIsPasswordRecovery(true);
    }

    if (!isSupabaseConfigured) {
      const isDemoLoggedIn = localStorage.getItem('healthai_demo_auth') === 'true';
      if (isDemoLoggedIn) {
        setUser(DEMO_USER);
        setProfile(DEMO_PROFILE);
      }
      setIsLoading(false);
      return;
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name);
      }
      setIsLoading(false);
    });

    // Listen to Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }

      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name);
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
      loginAsDemo();
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    if (!isSupabaseConfigured) {
      loginAsDemo();
      return { error: null };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    return { error: error ? error.message : null };
  };

  const resetPasswordForEmail = async (email: string) => {
    if (!isSupabaseConfigured) {
      alert("No modo de demonstração local, a recuperação de senha é simulada com sucesso.");
      return { error: null };
    }
    const redirectUrl = `${window.location.origin}/#reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error: error ? error.message : null };
  };

  const updateUserPassword = async (password: string) => {
    if (!isSupabaseConfigured) {
      return { error: null };
    }
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    localStorage.removeItem('healthai_demo_auth');
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  };

  const loginAsDemo = () => {
    localStorage.setItem('healthai_demo_auth', 'true');
    setUser(DEMO_USER);
    setProfile(DEMO_PROFILE);
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
        loginAsDemo,
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
