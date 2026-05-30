import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Mail, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const SUPABASE_URL = 'https://cmfgirvgnexkcomhcosm.supabase.co';
const AUTH_KEY = 'sb-cmfgirvgnexkcomhcosm-auth-token';

function getUserToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token || null;
  } catch { return null; }
}

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
}

export function InviteModal({ open, onClose }: InviteModalProps) {
  const { currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const handleSendInvite = async () => {
    if (!email.trim()) {
      setError('Digite um e-mail valido.');
      return;
    }
    if (!validateEmail(email)) {
      setError('E-mail invalido.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      // Chamada direta a Edge Function (mais confiavel que supabase.functions.invoke)
      const userToken = getUserToken();
      if (!userToken) {
        setError('Voce precisa estar logado para enviar convites.');
        setSending(false);
        return;
      }

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          'apikey': 'sb_publishable_Dm-ozWvAve1nkgjEDg_QsA_-gldlMxk',
        },
        body: JSON.stringify({
          sender_id: currentUser?.id,
          sender_email: currentUser?.email,
          recipient_email: email.trim(),
        }),
      });

      const data = await resp.json();
      console.log('[Invite] Response status:', resp.status, 'data:', data);

      if (!resp.ok) {
        throw new Error(data.error || `Erro ${resp.status}`);
      }

      console.log('[Invite] Convite enviado:', data);
      setSent(true);
    } catch (err: any) {
      console.error('[Invite] Erro:', err);
      const msg = err.message || '';
      if (msg.includes('Rate limit') || msg.includes('429')) {
        setError('Limite de convites atingido. Tente novamente em 1 hora.');
      } else if (msg.includes('already has') || msg.includes('409')) {
        setError('Este e-mail ja possui uma conta no RegistAI.');
      } else if (msg.includes('Invalid recipient') || msg.includes('400')) {
        setError('E-mail do destinatario invalido.');
      } else if (msg.includes('Unauthorized') || msg.includes('401') || msg.includes('403')) {
        setError('Sessao expirada. Faca login novamente.');
      } else {
        setError('Erro ao enviar convite. Tente novamente.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setSent(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Mail className="w-5 h-5 text-violet-400" />
            Convidar Amigo
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Indique o RegistAI para um amigo. Ele recebera um convite por e-mail.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle2 className="w-16 h-16 text-emerald-400" />
            <p className="text-center text-emerald-400 font-medium text-lg">
              Convite enviado com sucesso!
            </p>
            <p className="text-center text-sm text-slate-400">
              Assim que seu amigo se cadastrar, voces poderao compartilhar ferramentas.
            </p>
            <Button
              onClick={handleClose}
              className="mt-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
            >
              Fechar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                E-mail do convidado
              </label>
              <Input
                type="email"
                placeholder="amigo@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                disabled={sending}
              />
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
            </div>

            <Button
              onClick={handleSendInvite}
              disabled={sending || !email.trim()}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Convite
                </>
              )
              }
            </Button>

            <p className="text-xs text-slate-600 text-center">
              Limite de 5 convites por hora.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
