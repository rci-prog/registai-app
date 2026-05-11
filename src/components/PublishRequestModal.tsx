import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Mail, Send } from 'lucide-react';
import { SupportModal } from '@/components/SupportModal';

/**
 * PublishRequestModal — Modal para solicitar publicacao no Trending News
 * Aberto pelos botoes "Publique seu Projeto" (retangular) e "PUB" (circular)
 * Abre o modal de suporte ao administrador.
 */

interface PublishRequestModalProps {
  open: boolean;
  onClose: () => void;
}

export function PublishRequestModal({ open, onClose }: PublishRequestModalProps) {
  const [supportOpen, setSupportOpen] = useState(false);

  const handleClose = () => {
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Mail className="w-5 h-5 text-violet-400" />
              Publicar no Trending News
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Envie uma solicitacao ao administrador para receber um email com um formulario para publicacao no Trending News, disponibilidade e regras.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <Button
              onClick={() => setSupportOpen(true)}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar Solicitacao ao Administrador
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Suporte */}
      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}
