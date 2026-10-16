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

