import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, Copy, CheckCircle2, ExternalLink } from 'lucide-react';

const SUPPORT_EMAIL = 'suporte@registai.com.br';

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
}

export function SupportModal({ open, onClose }: SupportModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = SUPPORT_EMAIL;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Mail className="w-5 h-5 text-violet-400" />
            Suporte registAI
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          <div className="space-y-2">
            <label className="text-xs text-slate-500 uppercase tracking-wide">
              E-mail de suporte
            </label>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800 border border-slate-700">
              <code className="text-sm text-violet-400">{SUPPORT_EMAIL}</code>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyEmail}
                className="h-8 px-3 text-slate-400 hover:text-white hover:bg-slate-700"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1.5" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          </div>

          <a
            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition-colors text-sm font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir no Gmail
          </a>

          <p className="text-xs text-slate-500 text-center">
            Horario de atendimento: Segunda a Sexta, 9h as 18h (GMT-3)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
