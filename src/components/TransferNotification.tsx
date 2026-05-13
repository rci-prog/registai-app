// ============================================================
// COMPONENTE: TransferNotification
// Notificacao para o destinatario receber/aceitar ferramentas
// ============================================================
import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Package, CheckCircle, XCircle, ArrowRight, User, Clock, Loader2,
} from 'lucide-react';
import { useToolTransfers, type ToolTransfer } from '@/hooks/useToolTransfers';

const SUPABASE_URL = 'https://cmfgirvgnexkcomhcosm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Dm-ozWvAve1nkgjEDg_QsA_-gldlMxk';

interface TransferNotificationProps {
  theme: 'light' | 'dark';
  currentUser: { id: string; email: string; name: string } | null;
}

export function TransferNotification({ theme, currentUser }: TransferNotificationProps) {
  const isDark = theme === 'dark';
  const { transfers, pendingCount, fetchPendingTransfers, acceptAndImportTools, respondToTransfer } = useToolTransfers();
  const [selectedTransfer, setSelectedTransfer] = useState<ToolTransfer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [toolNames, setToolNames] = useState<Record<string, string>>({});

  // Carrega transferencias pendentes ao montar
  useEffect(() => {
    if (currentUser?.id) {
      fetchPendingTransfers(currentUser.id);
    }
  }, [currentUser?.id, fetchPendingTransfers]);

  // Buscar nomes das ferramentas quando o modal abrir
  useEffect(() => {
    if (!selectedTransfer?.tool_ids.length) return;

    async function fetchToolNames() {
      const names: Record<string, string> = {};
      await Promise.all(
        selectedTransfer!.tool_ids.map(async (id) => {
          try {
            const resp = await fetch(
              `${SUPABASE_URL}/rest/v1/tools?select=name&id=eq.${id}`,
              {
                headers: {
                  apikey: SUPABASE_KEY,
                  Authorization: `Bearer ${SUPABASE_KEY}`,
                },
              }
            );
            if (resp.ok) {
              const data = await resp.json();
              names[id] = data?.[0]?.name || '';
            }
          } catch { /* ignore */ }
        })
      );
      setToolNames(names);
    }

    fetchToolNames();
  }, [selectedTransfer]);

  const handleAccept = async () => {
    if (!selectedTransfer || !currentUser) return;
    setIsProcessing(true);
    setResult(null);

    const res = await acceptAndImportTools(selectedTransfer.id, currentUser.id, selectedTransfer.tool_ids);

    setIsProcessing(false);
    if (res.success) {
      const ins = res.inserted ?? 0;
      const ex = res.existing ?? 0;
      let msg: string;
      if (ins > 0 && ex > 0) {
        msg = `${ins} ferramenta(s) adicionada(s) ao seu perfil! (${ex} ja existia(m))`;
      } else if (ins > 0) {
        msg = `${ins} ferramenta(s) adicionada(s) ao seu perfil!`;
      } else {
        msg = `Você ja possui ${ex} ferramenta(s) deste pacote. Nenhuma alteracao necessaria.`;
      }
      setResult({ success: true, msg });
      setTimeout(() => {
        setSelectedTransfer(null);
        setResult(null);
      }, 3000);
    } else {
      setResult({ success: false, msg: res.error || 'Erro ao aceitar' });
    }
  };

  const handleReject = async () => {
    if (!selectedTransfer) return;
    setIsProcessing(true);
    const res = await respondToTransfer(selectedTransfer.id, 'rejected');
    setIsProcessing(false);
    if (res.success) {
      setSelectedTransfer(null);
      setResult(null);
    }
  };

  if (!currentUser || pendingCount === 0) return null;

  return (
    <>
      {/* BANNER SUPERIOR: mostra contagem de transferencias pendentes */}
      <div className={`mb-4 p-3 rounded-lg border flex items-center justify-between ${isDark ? 'bg-violet-900/20 border-violet-800/40' : 'bg-violet-50 border-violet-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-violet-800/50' : 'bg-violet-100'}`}>
            <Package className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {pendingCount} {pendingCount === 1 ? 'pacote de ferramentas' : 'pacotes de ferramentas'} recebido{pendingCount === 1 ? '' : 's'}
            </p>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Clique para visualizar e aceitar
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setSelectedTransfer(transfers[0])}
          className="bg-violet-600 hover:bg-violet-700 text-white"
        >
          Ver <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>

      {/* MODAL DE DETALHES */}
      <Dialog open={!!selectedTransfer} onOpenChange={() => { if (!isProcessing) { setSelectedTransfer(null); setResult(null); } }}>
        <DialogContent className={`max-w-md ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Package className="w-5 h-5 text-violet-500" />
              Pacote de Ferramentas
            </DialogTitle>
          </DialogHeader>

          {selectedTransfer && (
            <div className="space-y-4">
              {/* Info do Remetente */}
              <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/60' : 'bg-gray-50/60'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-violet-500" />
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    De: {selectedTransfer.sender_email}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {new Date(selectedTransfer.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                {selectedTransfer.message && (
                  <p className={`text-sm mt-2 italic ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                    "{selectedTransfer.message}"
                  </p>
                )}
              </div>

              {/* Ferramentas no pacote */}
              <div>
                <p className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {selectedTransfer.tool_ids.length} ferramenta{selectedTransfer.tool_ids.length === 1 ? '' : 's'}:
                </p>
                <div className={`max-h-40 overflow-y-auto rounded-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                  {selectedTransfer.tool_ids.map((toolId, idx) => {
                    const name = toolNames[toolId];
                    return (
                      <div key={idx} className={`flex items-center gap-2 p-2 ${isDark ? 'bg-slate-800/30' : 'bg-gray-50/30'}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${isDark ? 'bg-violet-900/50 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>
                          {idx + 1}
                        </span>
                        <span className={`text-sm truncate ${isDark ? 'text-slate-300' : 'text-gray-700'}`} title={name || toolId}>
                          {name || `Ferramenta ID: ${toolId.slice(0, 8)}...`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Aviso de privacidade */}
              <div className={`p-2 rounded-lg text-xs ${isDark ? 'bg-amber-900/10 text-amber-400 border border-amber-800/30' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                <p>⚠️ Ao aceitar, apenas os dados das ferramentas serao copiados. Notas pessoais e classificacoes do remetente nao serao transferidas.</p>
              </div>

              {/* Resultado */}
              {result && (
                <div className={`p-2 rounded-lg text-xs ${result.success ? (isDark ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'bg-emerald-50 text-emerald-600 border border-emerald-200') : (isDark ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-50 text-red-600 border border-red-200')}`}>
                  {result.msg}
                </div>
              )}

              {/* Botoes */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReject}
                  disabled={isProcessing}
                  className={`${isDark ? 'border-slate-700 text-slate-300' : ''}`}
                >
                  <XCircle className="w-4 h-4 mr-1 text-red-400" />
                  Recusar
                </Button>
                <Button
                  size="sm"
                  onClick={handleAccept}
                  disabled={isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aceitar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
