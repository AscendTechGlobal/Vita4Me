import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key'
);

// Configurar armazenamento de sessão em sessionStorage para que fechar o navegador encerre a sessão do usuário por segurança médica
const sessionStore = typeof window !== 'undefined' ? window.sessionStorage : undefined;

export const PASSWORD_RECOVERY_STORAGE_KEY = 'vita4me_password_recovery';

export const markPasswordRecoveryActive = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PASSWORD_RECOVERY_STORAGE_KEY, '1');
  } catch {
    // Silencioso em caso de restrições de sandbox/iframe
  }
};

export const clearPasswordRecoveryState = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
  } catch {
    // Silencioso em caso de restrições de sandbox/iframe
  }
};

export const hasActivePasswordRecoveryFlag = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

// Capturar e preservar estado de recovery síncrono antes de o GoTrueClient limpar window.location.hash
if (typeof window !== 'undefined') {
  try {
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
      clearPasswordRecoveryState();
    } else if (urlType === 'recovery') {
      markPasswordRecoveryActive();
    }
  } catch {
    // Silencioso em caso de URL malformada
  }
}

// Higienização preventiva: purgar quaisquer tokens persistentes legados no localStorage
if (typeof window !== 'undefined') {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') && key.endsWith('-auth-token'))) {
        localStorage.removeItem(key);
      }
    }
  } catch (err) {
    // Silencioso em caso de restrições de sandbox/iframe
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: sessionStore,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (isSupabaseConfigured) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch {
      // Silencioso
    }
  }
  return headers;
}

