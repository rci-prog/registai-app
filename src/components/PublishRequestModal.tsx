import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Megaphone, Send, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * PublishRequestModal — Modal para solicitar publicação no Trending News
 * Aberto pelos botões "Publique seu Projeto" (retangular) e "PUB" (circular)
 * Fluxo em 3 passos: Confirmação → Formulário → Sucesso
 *
 * A solicitação é salva no próprio profile do usuário logado (via RLS),
 * e o administrador busca de todos os profiles no Painel ADM.
 */

interface PublishRequestModalProps {
  open: boolean;
  onClose: () => void;
  userEmail?: string;
}

const VIGENCIA_OPTIONS = [
  { label: '10 dias — R$ 8,00', value: '10dias_8' },
  { label: '20 dias — R$ 14,00', value: '20dias_14' },
  { label: '40 dias — R$ 23,00', value: '40dias_23' },
];

interface PublishRequestNotif {
  id: string;
  type: 'alert';
  title: string;
  message: string;
  data: {
    type: 'publish_request';
    requesterEmail: string;
    projectUrl: string;
    projectDescription: string;
    vigencia: string;
    requestedAt: string;
  };
  status: 'unread';
  created_at: string;
}

export function PublishRequestModal({ open, onClose, userEmail = '' }: PublishRequestModalProps) {
  const [step, setStep] = useState<'confirm' | 'form' | 'success'>('confirm');
  const [projectUrl, setProjectUrl] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [vigencia, setVigencia] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setStep('confirm');
    setProjectUrl('');
    setProjectDescription('');
    setVigencia('');
    setError('');
    setIsSubmitting(false);
  };

  const handleConfirm = () => {
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!projectUrl.trim()) {
      setError('Informe a URL do projeto.');
      return;
    }
    if (!projectDescription.trim()) {
      setError('Informe a descrição do projeto.');
      return;
    }
    if (!vigencia) {
      setError('Selecione a vigência da publicação.');
      return;
    }

    setIsSubmitting(true);

    const vigenciaLabel = VIGENCIA_OPTIONS.find(v => v.value === vigencia)?.label || vigencia;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      setError('Você precisa estar logado para enviar uma solicitação.');
      setIsSubmitting(false);
      return;
    }

    const userId = session.user.id;
    const email = userEmail || session.user.email || '';

    const { data: profileData, error: fetchError } = await supabase
      .from('profiles')
      .select('notifications')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('[PublishRequest] Erro ao buscar notificações:', fetchError);
      setError('Erro ao enviar solicitação. Tente novamente.');
      setIsSubmitting(false);
      return;
    }

    const existingNotifs: PublishRequestNotif[] = (profileData?.notifications as any[]) || [];

    const newNotif: PublishRequestNotif = {
      id: `pubreq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'alert',
      title: `Nova solicitação de publicação — ${email}`,
      message: `Solicitação de publicação no Trending News.\n\nE-mail: ${email}\nURL: ${projectUrl}\nVigência: ${vigenciaLabel}`,
      data: {
        type: 'publish_request',
        requesterEmail: email,
        projectUrl,
        projectDescription,
        vigencia: vigenciaLabel,
        requestedAt: new Date().toISOString(),
      },
      status: 'unread',
      created_at: new Date().toISOString(),
    };

    const updatedNotifs = [newNotif, ...existingNotifs].slice(0, 50);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ notifications: updatedNotifs, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error('[PublishRequest] Erro ao salvar notificação:', updateError);
      setError('Erro ao enviar solicitação. Tente novamente.');
      setIsSubmitting(false);
      return;
    }

    console.log('[PublishRequest] Solicitação salva com sucesso no profile do usuário:', email);
    setStep('success');
    setIsSubmitting(false);
  };

  const vigenciaDisplay = VIGENCIA_OPTIONS.find(v => v.value === vigencia)?.label || '';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">

        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Megaphone className="w-5 h-5 text-violet-400" />
                Publicar no Trending News
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Confirme caso deseje publicar o seu projeto no Trending News e responda o formulário a seguir.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <AlertCircle className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-violet-300">
                  Ao confirmar, você preencherá um formulário com os dados do seu projeto. A solicitação será analisada pelo administrador em até 48h.
                </p>
              </div>

              <Button
                onClick={handleConfirm}
                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white py-3 rounded-xl font-semibold"
              >
                Confirmar
              </Button>

              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>
            </div>
          </>
        )}

        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Send className="w-5 h-5 text-violet-400" />
                Solicitação de Publicação
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Preencha os dados do seu projeto para publicação no Trending News.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="email"
                    value={userEmail}
                    readOnly
                    disabled
                    className="pl-10 bg-slate-800/60 border-slate-700 text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">URL do projeto *</Label>
                <Input
                  type="url"
                  placeholder="https://meuprojeto.com"
                  value={projectUrl}
                  onChange={(e) => setProjectUrl(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Descrição do projeto *</Label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Descreva seu projeto em poucas palavras..."
                  rows={3}
                  maxLength={300}
                  required
                  className="w-full rounded-md border px-3 py-2 text-sm resize-none bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <p className="text-[10px] text-slate-500 text-right">{projectDescription.length}/300</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Vigência da publicação *</Label>
                <select
                  value={vigencia}
                  onChange={(e) => setVigencia(e.target.value)}
                  required
                  className="w-full rounded-md border px-3 py-2.5 text-sm bg-slate-800 border-slate-700 text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="" disabled>Selecione uma opção</option>
                  {VIGENCIA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400">
                  Envie ao administrador e aguarde até 48h para receber a confirmação e demais informações por e-mail.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg text-sm bg-red-900/30 text-red-400 border border-red-800">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white py-3 rounded-xl font-semibold"
                >
                  {isSubmitting ? 'Enviando...' : (
                    <><Send className="w-4 h-4 mr-2" />Enviar ao Administrador</>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('confirm')}
                  className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Voltar
                </Button>
              </div>
            </form>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Solicitação Enviada!
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-emerald-500/20">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>

              <p className="text-sm text-slate-300">
                A confirmação chegará no seu e-mail em até 48h, não esqueça de conferir na caixa de spam.
              </p>

              <div className="w-full text-left p-3 rounded-lg bg-slate-800 border border-slate-700 space-y-2">
                <p className="text-xs text-slate-400"><strong className="text-slate-300">E-mail:</strong> {userEmail || 'Não informado'}</p>
                <p className="text-xs text-slate-400"><strong className="text-slate-300">URL:</strong> {projectUrl}</p>
                <p className="text-xs text-slate-400"><strong className="text-slate-300">Vigência:</strong> {vigenciaDisplay}</p>
              </div>

              <Button
                onClick={handleClose}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-semibold"
              >
                Entendido
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
