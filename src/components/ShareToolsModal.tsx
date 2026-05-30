// ============================================================
// COMPONENTE: ShareToolsModal
// Modal para compartilhar ferramentas com outro usuario
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Send, Loader2, Check, User,
} from 'lucide-react';
import { useToolTransfers } from '@/hooks/useToolTransfers';

interface ShareToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  currentUser: { id: string; email: string; name: string } | null;
  tools: any[];
}

export function ShareToolsModal({ isOpen, onClose, theme, currentUser, tools }: ShareToolsModalProps) {
  const isDark = theme === 'dark';
  const { validateEmail, createTransfer } = useToolTransfers();

  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailValidation, setEmailValidation] = useState<{ valid: boolean; checking: boolean; blocked?: boolean }>({ valid: false, checking: false });
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (isOpen) {
      setRecipientEmail('');
      setEmailValidation({ valid: false, checking: false });
      setSelectedToolIds([]);
      setMessage('');
      setSendResult(null);
    }
  }, [isOpen]);

  // ============================================================
  // VALIDACAO SILENCIOSA DE EMAIL (debounce 600ms)
  // ============================================================
  const checkEmail = useCallback(async (email: string) => {
  if (!email.trim() || !email.includes('@')) {
    setEmailValidation({ valid: false, checking: false });
    return;
  }
  setEmailValidation((prev) => ({ ...prev, checking: true }));
  try {
    const result = await validateEmail(email.trim());
    setEmailValidation({ valid: result.valid, checking: false, blocked: result.blocked });
  } catch (e: any) {
    // ESTA É A CORREÇÃO: Se der erro, ele para o spinner
    console.error('[ShareToolsModal] Erro:', e.message);
    setEmailValidation({ valid: false, checking: false });
  }
}, [validateEmail]);

  useEffect(() => {
    const timer = setTimeout(() => checkEmail(recipientEmail), 600);
    return () => clearTimeout(timer);
  }, [recipientEmail, checkEmail]);

  const toggleTool = (toolId: string) => {
    setSelectedToolIds((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
  };

  const selectAll = () => {
    if (selectedToolIds.length === tools.length) {
      setSelectedToolIds([]);
    } else {
      setSelectedToolIds(tools.map((t) => t.id));
    }
  };

  const handleSend = async () => {
    if (!currentUser || !emailValidation.valid || selectedToolIds.length === 0) return;

    setIsSending(true);
    setSendResult(null);

    const result = await validateEmail(recipientEmail.trim());
    if (!result.valid || !result.userId) {
      setEmailValidation({ valid: false, checking: false });
      setIsSending(false);
      return;
    }

    const createResult = await createTransfer(
      currentUser.id,
      currentUser.email,
      result.userId,
      result.email || recipientEmail.trim(),
      selectedToolIds,
      message.trim() || undefined
    );

    setIsSending(false);
    if (createResult.success) {
      setSendResult({ success: true, msg: `Ferramentas enviadas para ${recipientEmail.trim()}!` });
      setTimeout(() => onClose(), 2000);
    } else {
      setSendResult({ success: false, msg: createResult.error || 'Erro ao enviar' });
    }
  };

  const canSend = emailValidation.valid && !emailValidation.checking && selectedToolIds.length > 0 && !isSending;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={`max-w-lg max-h-[85vh] overflow-y-auto ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Send className="w-5 h-5 text-violet-500" />
            Compartilhar Ferramentas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email do Destinatario */}
          <div>
            <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              E-mail do Destinatário
            </label>
            <div className="relative">
              <User className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
              <Input
                value={recipientEmail}
                onChange={(e) => { setRecipientEmail(e.target.value); setSendResult(null); }}
                placeholder="exemplo@email.com"
                className={`pl-9 text-sm ${isDark ? 'bg-slate-900 border-slate-700 text-white' : ''}`}
              />
              {emailValidation.checking && (
                <Loader2 className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
              )}
              {!emailValidation.checking && emailValidation.valid && (
                <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
              )}
            </div>
            {!emailValidation.checking && recipientEmail.includes('@') && !emailValidation.valid && (
              <p className="text-xs text-red-400 mt-1">
                {emailValidation.blocked ? 'Usuario bloqueado.' : 'E-mail nao encontrado.'}
              </p>
            )}
            {!emailValidation.checking && emailValidation.valid && (
              <p className="text-xs text-emerald-400 mt-1">✅ Usuario encontrado</p>
            )}
          </div>

          {/* Mensagem Opcional */}
          <div>
            <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Mensagem (opcional)
            </label>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Oi! Estou te enviando algumas ferramentas..."
              className={`text-sm ${isDark ? 'bg-slate-900 border-slate-700 text-white' : ''}`}
            />
          </div>

          {/* Selecao de Ferramentas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Selecione as Ferramentas ({selectedToolIds.length}/{tools.length})
              </label>
              <Button size="sm" variant="ghost" onClick={selectAll} className={`text-xs h-6 px-2 ${isDark ? 'text-violet-400 hover:text-violet-300' : 'text-violet-600'}`}>
                {selectedToolIds.length === tools.length ? 'Desmarcar tudo' : 'Selecionar tudo'}
              </Button>
            </div>
            <div className={`max-h-48 overflow-y-auto rounded-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  className={`flex items-center gap-3 p-2 cursor-pointer transition-colors ${
                    selectedToolIds.includes(tool.id)
                      ? isDark ? 'bg-violet-900/20' : 'bg-violet-50'
                      : isDark ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'
                  }`}
                >
                  <Checkbox
                    checked={selectedToolIds.includes(tool.id)}
                    onCheckedChange={() => toggleTool(tool.id)}
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {tool.name}
                    </p>
                    <p className={`text-[10px] truncate ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {tool.category || 'Geral'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resultado */}
          {sendResult && (
            <div className={`p-2.5 rounded-lg text-xs ${sendResult.success ? (isDark ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'bg-emerald-50 text-emerald-600 border border-emerald-200') : (isDark ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-50 text-red-600 border border-red-200')}`}>
              {sendResult.msg}
            </div>
          )}

          {/* Botao Enviar */}
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={onClose} className={isDark ? 'border-slate-700 text-slate-300' : ''}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!canSend}
              className={canSend ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-400 text-white cursor-not-allowed'}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1" />
                  Enviar ({selectedToolIds.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
