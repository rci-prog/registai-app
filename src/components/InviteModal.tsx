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
import { supabase } from '@/lib/supabase';

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
      setError('Digite um e-mail válido.');
      return;
    }
    if (!validateEmail(email)) {
      setError('E-mail inválido.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const inviteToken = crypto.randomUUID();
      const finalInviteUrl = `https://www.registai.com.br?ref=${inviteToken}`;

      // Ajustado para os nomes das colunas reais da sua tabela: 
      // id, sender_id, sender_email, recipient_email, token, invite_url, status, created_at
      const { error: insertError } = await supabase.from('invites').insert([
        {
          sender_id: currentUser?.id,
          sender_email: currentUser?.email,
          recipient_email: email.trim(),
          token: inviteToken,
          invite_url: finalInviteUrl,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ]);

      if (insertError) {
        console.error('[Invite] INSERT ERROR:', insertError);
        throw new Error(insertError.message);
      }

      setSent(true);
    } catch (err: any) {
      console.error('[Invite] Erro:', err);
      if (err.message?.includes('42501')) {
        setError('Sem permissão para enviar convites.');
      } else {
        setError('Erro ao enviar convite. Tente novamente mais tarde.');
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
            Indique o RegistAI para um amigo.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle2 className="w-16 h-16 text-emerald-400" />
            <p className="text-center text-emerald-400 font-medium text-lg">
              Convite enviado com sucesso!
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
                className="bg-slate-800 border-slate-600 text-white focus:border-violet-500"
                onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                disabled={sending}
                autoComplete="off"
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
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
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
