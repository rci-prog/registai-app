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
import { sendNotificationToProfile } from '@/hooks/useNotifications';

/**
 * PublishRequestModal — Modal para solicitar publicacao no Trending News
 * Aberto pelos botoes "Publique seu Projeto" (retangular) e "PUB" (circular)
 * Fluxo em 3 passos: Confirmacao -> Formulario -> Sucesso
 */

interface PublishRequestModalProps {
  open: boolean;
  onClose: () => void;
  userEmail?: string;
}

const VIGENCIA_OPTIONS = [
  { label: '10 dias - R$ 8,00', value: '10dias_8' },
  { label: '20 dias - R$ 14,00', value: '20dias_14' },
  { label: '40 dias - R$ 23,00', value: '40dias_23' },
];

export function PublishRequestModal({ open, onClose, userEmail = '' }: PublishRequestModalProps) {
  // Step control: 'confirm' | 'form' | 'success'
  const [step, setStep] = useState<'confirm' | 'form' | 'success'>('confirm');

  // Form fields
  const [projectUrl, setProjectUrl] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [vigencia, setVigencia] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const ADMIN_EMAIL = 'suporte@registai.com.br';

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
      setError('Informe a descricao do projeto.');
      return;
    }
    if (!vigencia) {
      setError('Selecione a vigencia da publicacao.');
      return;
    }

    setIsSubmitting(true);

    const vigenciaLabel = VIGENCIA_OPTIONS.find(v => v.value === vigencia)?.label || vigencia;

    // Enviar notificacao ao administrador
    const notifTitle = `Nova solicitacao de publicacao - ${userEmail || 'Usuario'}`;
    const notifMessage = `Um usuario solicitou publicacao no Trending News.\n\nE-mail: ${userEmail || 'Nao informado'}\nURL do projeto: ${projectUrl}\nDescricao: ${projectDescription}\nVigencia: ${vigenciaLabel}`;

    const ok = await sendNotificationToProfile({
      ownerEmail: ADMIN_EMAIL,
      title: notifTitle,
      message: notifMessage,
      type: 'alert',
      data: {
        type: 'publish_request',
        requesterEmail: userEmail,
        projectUrl,
        projectDescription,
        vigencia: vigenciaLabel,
        requestedAt: new Date().toISOString(),
      },
    });

    if (ok) {
      setStep('success');
    } else {
      setError('Erro ao enviar solicitacao. Tente novamente.');
    }

    setIsSubmitting(false);
  };

  const vigenciaDisplay = VIGENCIA_OPTIONS.find(v => v.value === vigencia)?.label || '';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">

        {/* ============ PASSO 1: CONFIRMACAO ============ */}
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Megaphone className="w-5 h-5 text-violet-400" />
                Publicar no Trending News
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Confirme caso deseje publicar o seu projeto no Trending News e responda o formulario a seguir.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <AlertCircle className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-violet-300">
                  Ao confirmar, voce preenchera um formulario com os dados do seu projeto. A solicitacao sera analisada pelo administrador em ate 48h.
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

        {/* ============ PASSO 2: FORMULARIO ============ */}
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Send className="w-5 h-5 text-violet-400" />
                Solicitacao de Publicacao
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Preencha os dados do seu projeto para publicacao no Trending News.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              {/* Email (read-only) */}
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

              {/* URL do projeto */}
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

              {/* Descricao do projeto */}
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Descricao do projeto *</Label>
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

              {/* Vigencia */}
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Vigencia da publicacao *</Label>
                <select
                  value={vigencia}
                  onChange={(e) => setVigencia(e.target.value)}
                  required
                  className="w-full rounded-md border px-3 py-2.5 text-sm bg-slate-800 border-slate-700 text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="" disabled>Selecione uma opcao</option>
                  {VIGENCIA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400">
                  Envie ao administrador e aguarde ate 48h para receber a confirmacao e demais informacoes por e-mail.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg text-sm bg-red-900/30 text-red-400 border border-red-800">
                  {error}
                </div>
              )}

              {/* Buttons */}
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

        {/* ============ PASSO 3: SUCESSO ============ */}
        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Solicitacao Enviada!
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-emerald-500/20">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>

              <p className="text-sm text-slate-300">
                A confirmacao chegara no seu e-mail em ate 48h, nao esqueca de conferir na caixa de spam.
              </p>

              {/* Resumo */}
              <div className="w-full text-left p-3 rounded-lg bg-slate-800 border border-slate-700 space-y-2">
                <p className="text-xs text-slate-400"><strong className="text-slate-300">E-mail:</strong> {userEmail || 'Nao informado'}</p>
                <p className="text-xs text-slate-400"><strong className="text-slate-300">URL:</strong> {projectUrl}</p>
                <p className="text-xs text-slate-400"><strong className="text-slate-300">Vigencia:</strong> {vigenciaDisplay}</p>
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
