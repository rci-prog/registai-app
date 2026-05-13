// ============================================================
// HOOK: useToolTransfers
// Transferencias de ferramentas entre usuarios (sem Realtime)
// Notificacao via polling a cada 30s
// ============================================================
import { useState, useCallback, useEffect, useRef } from 'react';
import { getAuth } from '@/lib/supabase-simple';

const SUPABASE_URL = 'https://cmfgirvgnexkcomhcosm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Dm-ozWvAve1nkgjEDg_QsA_-gldlMxk';
const AUTH_KEY = 'sb-cmfgirvgnexkcomhcosm-auth-token';

function getUserToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token || null;
  } catch { return null; }
}

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

async function supabaseFetch(url: string, options: RequestInit = {}) {
  const userToken = getUserToken();
  const authHeader = userToken ? `Bearer ${userToken}` : `Bearer ${SUPABASE_KEY}`;
  const resp = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  // HTTP 204 (return=minimal) ou body vazio — retorna null sem fazer parse JSON
  if (resp.status === 204 || resp.headers.get('content-length') === '0') return null;
  return resp.json();
}

export function useToolTransfers() {
  const [transfers, setTransfers] = useState<ToolTransfer[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Buscar transferencias pendentes
  const fetchPendingTransfers = useCallback(async (recipientId: string) => {
    if (!recipientId) return;
    try {
      const url = `${SUPABASE_URL}/rest/v1/tool_transfers?select=*&recipient_id=eq.${recipientId}&status=eq.pending&order=created_at.desc`;
      const data = await supabaseFetch(url);
      const mapped = (data || []).map((t: any) => ({
        ...t,
        tool_ids: Array.isArray(t.tool_ids) ? t.tool_ids : (typeof t.tool_ids === 'string' ? JSON.parse(t.tool_ids || '[]') : []),
      }));
      setTransfers(mapped);
      setPendingCount(mapped.length);
    } catch (e: any) {
      console.error('[useToolTransfers] Erro:', e.message);
    }
  }, []);

  // Polling: verifica a cada 30 segundos
  useEffect(() => {
    const currentUser = getAuth();
    if (!currentUser?.id) return;

    // Busca imediata
    fetchPendingTransfers(currentUser.id);

    // Polling
    intervalRef.current = setInterval(() => {
      fetchPendingTransfers(currentUser.id);
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchPendingTransfers]);

  // Validar email
  const validateEmail = useCallback(async (email: string): Promise<{ valid: boolean; userId?: string; email?: string; blocked?: boolean }> => {
    if (!email.trim() || !email.includes('@')) return { valid: false };
    try {
      const data = await supabaseFetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,email,is_blocked&email=eq.${encodeURIComponent(email.trim())}`);
      const profile = data?.[0];
      if (!profile) return { valid: false };
      if (profile.is_blocked) return { valid: false, blocked: true };
      return { valid: true, userId: profile.id, email: profile.email };
    } catch {
      return { valid: false };
    }
  }, []);

  // Criar transferencia
  const createTransfer = useCallback(async (
    senderId: string, senderEmail: string,
    recipientId: string, recipientEmail: string,
    toolIds: string[], message?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await supabaseFetch(`${SUPABASE_URL}/rest/v1/tool_transfers`, {
        method: 'POST',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          sender_id: senderId, sender_email: senderEmail,
          recipient_id: recipientId, recipient_email: recipientEmail,
          tool_ids: toolIds, status: 'pending', message: message || null,
        }),
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, []);

  // Responder transferencia
  const respondToTransfer = useCallback(async (
    transferId: string, response: 'accepted' | 'rejected'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await supabaseFetch(`${SUPABASE_URL}/rest/v1/tool_transfers?id=eq.${transferId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: response, responded_at: new Date().toISOString() }),
      });
      setTransfers((prev) => prev.filter((t) => t.id !== transferId));
      setPendingCount((prev) => Math.max(0, prev - 1));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, []);

  // Aceitar e importar
  const acceptAndImportTools = useCallback(async (
    transferId: string, recipientId: string, toolIds: string[]
  ): Promise<{ success: boolean; inserted?: number; existing?: number; error?: string }> => {
    console.log('[acceptAndImportTools] Iniciando. transferId:', transferId, 'toolIds:', toolIds);
    const r = await respondToTransfer(transferId, 'accepted');
    console.log('[acceptAndImportTools] respondToTransfer resultado:', r);
    if (!r.success) return r;
    try {
      const existing = await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_tools?select=tool_id&user_id=eq.${recipientId}`);
      console.log('[acceptAndImportTools] existing tools:', existing);
      const existingIds = new Set((existing || []).map((e: any) => e.tool_id));
      const newIds = toolIds.filter((id) => !existingIds.has(id));
      const alreadyHave = toolIds.length - newIds.length;
      console.log('[acceptAndImportTools] newIds para inserir:', newIds, 'ja existentes:', alreadyHave);
      if (newIds.length === 0) {
        console.log('[acceptAndImportTools] Nenhuma ferramenta nova para inserir.');
        window.dispatchEvent(new CustomEvent('tools-changed'));
        return { success: true, inserted: 0, existing: alreadyHave };
      }
      const inserts = newIds.map((toolId) => ({
        user_id: recipientId, tool_id: toolId, is_favorite: false, personal_notes: null, rating: null,
      }));
      console.log('[acceptAndImportTools] Inserindo', inserts.length, 'registros em user_tools...');
      await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_tools`, {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(inserts),
      });
      console.log('[acceptAndImportTools] Insercao concluida com sucesso!');
      window.dispatchEvent(new CustomEvent('tools-changed'));
      return { success: true, inserted: newIds.length, existing: alreadyHave };
    } catch (e: any) {
      console.error('[acceptAndImportTools] Erro:', e.message);
      return { success: false, error: e.message };
    }
  }, [respondToTransfer]);

  return {
    transfers, pendingCount, fetchPendingTransfers,
    validateEmail, createTransfer, respondToTransfer, acceptAndImportTools,
  };
}
