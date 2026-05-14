// ============================================================
// HOOK: useToolTransfers — VERSÃO RLS-COMPLIANT
// Usa token JWT do usuário (não service role key)
// ============================================================
import { useState, useCallback, useEffect, useRef } from 'react';
import { getAuth } from '@/lib/supabase-simple';

// CORRECAO 1: URL sem espaço no final
const SUPABASE_URL = 'https://cmfgirvgnexkcomhcosm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Dm-ozWvAve1nkgjEDg_QsA_-gldlMxk';
const AUTH_KEY = 'sb-cmfgirvgnexkcomhcosm-auth-token';

export interface ToolTransfer {
  id: string;
  created_at: string;
  sender_id: string;
  sender_email: string;
  recipient_id: string;
  recipient_email: string;
  tool_ids: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message?: string;
  responded_at?: string;
}

function getUserToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token || parsed?.session?.access_token || null;
  } catch { return null; }
}

function authHeaders(): Record<string, string> {
  const token = getUserToken();
  const bearer = token ? `Bearer ${token}` : `Bearer ${SUPABASE_KEY}`;
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': bearer,
    'Content-Type': 'application/json',
  };
}

export function useToolTransfers() {
  const [transfers, setTransfers] = useState<ToolTransfer[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ============================================================
  // CORRECAO 2: supabaseFetch generica — recebe endpoint e constroi URL
  // ============================================================
  const supabaseFetch = useCallback(async (
    endpoint: string,
    options: { method?: string; body?: any; prefer?: string } = {}
  ): Promise<any> => {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers: Record<string, string> = { ...authHeaders() };
    if (options.prefer) headers['Prefer'] = options.prefer;

    const resp = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`[useToolTransfers] HTTP ${resp.status}: ${text} | URL: ${url}`);
      throw new Error(`HTTP ${resp.status}: ${text}`);
    }
    // CORRECAO 3: Body vazio em qualquer status (return=minimal = body vazio)
    const text = await resp.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
  }, []);

  // ============================================================
  // CORRECAO 4: Buscar APENAS transferencias onde usuario e DESTINATARIO
  // Quem enviou (sender_id) NAO deve ver o proprio pacote
  // ============================================================
  const fetchPendingTransfers = useCallback(async (recipientId: string) => {
    if (!recipientId) return;
    try {
      const data = await supabaseFetch(
        `tool_transfers?select=*&recipient_id=eq.${recipientId}&status=eq.pending&order=created_at.desc`
      );
      const mapped = (data || []).map((t: any) => ({
        ...t,
        tool_ids: Array.isArray(t.tool_ids) ? t.tool_ids
          : (typeof t.tool_ids === 'string' ? JSON.parse(t.tool_ids || '[]') : []),
      }));
      setTransfers(mapped);
      setPendingCount(mapped.length);
    } catch (e: any) {
      console.error('[useToolTransfers] fetchPendingTransfers erro:', e.message);
    }
  }, [supabaseFetch]);

  // Validar email — busca profile por email
  const validateEmail = useCallback(async (email: string): Promise<{
    valid: boolean; userId?: string; email?: string; blocked?: boolean;
  }> => {
    if (!email.trim() || !email.includes('@')) return { valid: false };
    try {
      const data = await supabaseFetch(
        `profiles?select=id,email,is_blocked&email=eq.${encodeURIComponent(email.trim())}`
      );
      const profile = data?.[0];
      if (!profile) return { valid: false };
      if (profile.is_blocked) return { valid: false, blocked: true };
      return { valid: true, userId: profile.id, email: profile.email };
    } catch {
      return { valid: false };
    }
  }, [supabaseFetch]);

  // Criar transferencia
  const createTransfer = useCallback(async (
    senderId: string, senderEmail: string,
    recipientId: string, recipientEmail: string,
    toolIds: string[], message?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await supabaseFetch('tool_transfers', {
        method: 'POST',
        prefer: 'return=minimal',
        body: {
          sender_id: senderId,
          sender_email: senderEmail,
          recipient_id: recipientId,
          recipient_email: recipientEmail,
          tool_ids: toolIds,
          status: 'pending',
          message: message || null,
        },
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, [supabaseFetch]);

  // Responder transferencia
  const respondToTransfer = useCallback(async (
    transferId: string, response: 'accepted' | 'rejected'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await supabaseFetch(`tool_transfers?id=eq.${transferId}`, {
        method: 'PATCH',
        body: { status: response, responded_at: new Date().toISOString() },
      });
      setTransfers((prev) => prev.filter((t) => t.id !== transferId));
      setPendingCount((prev) => Math.max(0, prev - 1));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, [supabaseFetch]);

  // Aceitar e importar
  const acceptAndImportTools = useCallback(async (
    transferId: string, recipientId: string, toolIds: string[]
  ): Promise<{ success: boolean; inserted?: number; existing?: number; error?: string }> => {
    console.log('[acceptAndImportTools] transferId:', transferId, 'toolIds:', toolIds);
    const r = await respondToTransfer(transferId, 'accepted');
    if (!r.success) return r;

    try {
      const existing = await supabaseFetch(`user_tools?select=tool_id&user_id=eq.${recipientId}`);
      const existingIds = new Set((existing || []).map((e: any) => e.tool_id));
      const newIds = toolIds.filter((id) => !existingIds.has(id));
      const alreadyHave = toolIds.length - newIds.length;

      if (newIds.length === 0) {
        window.dispatchEvent(new CustomEvent('tools-changed'));
        return { success: true, inserted: 0, existing: alreadyHave };
      }

      const inserts = newIds.map((toolId) => ({
        user_id: recipientId,
        tool_id: toolId,
        is_favorite: false,
        personal_notes: null,
        rating: null,
      }));

      await supabaseFetch('user_tools', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates',
        body: inserts,
      });

      window.dispatchEvent(new CustomEvent('tools-changed'));
      return { success: true, inserted: newIds.length, existing: alreadyHave };
    } catch (e: any) {
      console.error('[acceptAndImportTools] Erro:', e.message);
      return { success: false, error: e.message };
    }
  }, [supabaseFetch, respondToTransfer]);

  // Polling a cada 30 segundos
  useEffect(() => {
    const currentUser = getAuth();
    if (!currentUser?.id) return;

    fetchPendingTransfers(currentUser.id);

    intervalRef.current = setInterval(() => {
      fetchPendingTransfers(currentUser.id);
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchPendingTransfers]);

  return {
    transfers,
    pendingCount,
    fetchPendingTransfers,
    validateEmail,
    createTransfer,
    respondToTransfer,
    acceptAndImportTools,
  };
}
