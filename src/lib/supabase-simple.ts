// ============================================================
// CLIENTE SUPABASE SIMPLIFICADO - USANDO FETCH DIRETO
// ============================================================
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cmfgirvgnexkcomhcosm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Dm-ozWvAve1nkgjEDg_QsA_-gldlMxk';

export { SUPABASE_URL, SUPABASE_KEY };

// ============================================================
// CLIENTE SUPABASE PADRAO (para autenticacao)
// ============================================================
export const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ============================================================
// HEADERS PADRAO
// ============================================================
function getHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

// ============================================================
// FUNCOES DE FETCH DIRETO COM RETRY
// ============================================================

async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  retries = 3
): Promise<Response> {
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      if (response.status === 404) {
        throw new Error(`HTTP 404: Recurso nao encontrado`);
      }
      
      if (response.status === 403) {
        const text = await response.text();
        throw new Error(`HTTP 403: ${text || 'Permissao negada (RLS)'}`);
      }
      
      lastError = new Error(`HTTP ${response.status}: ${await response.text()}`);
      
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
}

export async function fetchFromSupabase(
  table: string,
  options: {
    select?: string;
    eq?: { column: string; value: any };
    order?: { column: string; ascending?: boolean };
    limit?: number;
  } = {}
) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  
  const params = new URLSearchParams();
  params.append('select', options.select || '*');
  
  if (options.eq) {
    params.append(options.eq.column, `eq.${options.eq.value}`);
  }
  
  if (options.order) {
    params.append('order', `${options.order.column}.${options.order.ascending !== false ? 'asc' : 'desc'}`);
  }
  
  if (options.limit) {
    params.append('limit', String(options.limit));
  }
  
  url += '?' + params.toString();
  
  const response = await fetchWithRetry(url, { 
    method: 'GET',
    headers: getHeaders()
  });
  
  return await response.json();
}

export async function insertToSupabase(table: string, data: any) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  
  return await response.json();
}

export async function updateSupabase(table: string, id: string, data: any) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  
  const response = await fetchWithRetry(url, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  
  return await response.json();
}

export async function deleteFromSupabase(table: string, id: string) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  
  await fetchWithRetry(url, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  
  return true;
}

// ============================================================
// AUTH SIMPLIFICADO (localStorage) COM FALLBACK
// ============================================================

const AUTH_KEY = 'ai_tools_auth';
const SESSION_KEY = 'sb-session';

export function saveAuth(user: any) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  
  const sessionData = {
    user: {
      id: user.id,
      email: user.email,
      user_metadata: {
        full_name: user.name,
        avatar_url: user.avatar,
      },
    },
    session: {
      access_token: 'local',
      refresh_token: 'local',
      expires_at: Date.now() + 86400000,
    },
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
}

export function getAuth() {
  try {
    // 1. Primeiro tentar nosso formato custom
    const data = localStorage.getItem(AUTH_KEY);
    if (data) {
      const user = JSON.parse(data);
      console.log('[getAuth] Usuário encontrado:', user?.email);
      return user;
    }
    
    // 2. Fallback para formato sb-session
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      if (session?.user) {
        const user = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          avatar: session.user.user_metadata?.avatar_url || '',
          role: 'user',
        };
        console.log('[getAuth] Usuário encontrado (session):', user?.email);
        return user;
      }
    }

    // 3. NOVO: Fallback para sessão OAuth do Supabase
    const sbSessionData = localStorage.getItem('sb-cmfgirvgnexkcomhcosm-auth-token');
    if (sbSessionData) {
      const session = JSON.parse(sbSessionData);
      if (session?.user) {
        const user = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          avatar: session.user.user_metadata?.avatar_url || '',
          role: 'user',
        };
        console.log('[getAuth] Usuário encontrado (Supabase OAuth):', user?.email);
        return user;
      }
    }
  } catch (e) {
    console.error('[getAuth] Erro ao ler auth:', e);
  }
  
  console.log('[getAuth] Nenhum usuário encontrado');
  return null;
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(SESSION_KEY);
}

// ============================================================
// TIPOS
// ============================================================

export interface Tool {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  url: string;
  image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'user';
  theme: 'light' | 'dark';
  created_at: string;
  updated_at: string;
}

export interface UserTool {
  id: string;
  user_id: string;
  tool_id: string;
  is_favorite: boolean;
  personal_notes: string | null;
  rating: number | null;
  access_count: number;
  created_at: string;
  updated_at: string;
}
