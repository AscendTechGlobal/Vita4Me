import { supabase } from './supabase';

/**
 * Retorna os headers de autenticação com o Bearer token JWT do Supabase
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  } catch {
    return {
      'Content-Type': 'application/json',
    };
  }
}

/**
 * Wrapper de fetch autenticado para APIs do backend Vita4Me
 */
export async function apiFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders,
        ...(options.headers || {}),
      },
    });

    const status = response.status;
    const json = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: json?.error || `Erro na requisição (HTTP ${status})`,
        status,
      };
    }

    return {
      data: json as T,
      error: null,
      status,
    };
  } catch (err: any) {
    return {
      data: null,
      error: err.message || 'Falha de conexão com o servidor.',
      status: 0,
    };
  }
}
