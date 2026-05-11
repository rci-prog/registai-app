import { useEffect, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TransferNotificationProps {
  theme: string;
}

interface Transfer {
  id: string;
  from_user_email: string;
  tool_names: string[];
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export function TransferNotification({ theme }: TransferNotificationProps) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Carregar transferencias pendentes do localStorage (simulacao)
  useEffect(() => {
    const stored = localStorage.getItem('pending_transfers');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTransfers(parsed.filter((t: Transfer) => t.status === 'pending'));
      } catch { /* ignore */ }
    }
  }, []);

  const handleAccept = (transferId: string) => {
    setTransfers((prev) => prev.filter((t) => t.id !== transferId));
    // Dispara evento para refetch de ferramentas
    window.dispatchEvent(new CustomEvent('tools-changed'));
  };

  const handleReject = (transferId: string) => {
    setTransfers((prev) => prev.filter((t) => t.id !== transferId));
  };

  const handleDismiss = (transferId: string) => {
    setDismissed((prev) => new Set(prev).add(transferId));
  };

  const visibleTransfers = transfers.filter((t) => !dismissed.has(t.id));

  if (visibleTransfers.length === 0) return null;

  return (
    <div className={`px-6 py-3 border-b ${theme === 'dark' ? 'bg-violet-900/20 border-violet-800/50' : 'bg-violet-50 border-violet-200'}`}>
      {visibleTransfers.map((transfer) => (
        <div key={transfer.id} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className={`w-5 h-5 ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`} />
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-violet-300' : 'text-violet-700'}`}>
                Novas ferramentas recebidas!
              </p>
              <p className={`text-xs ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`}>
                {transfer.from_user_email} compartilhou {transfer.tool_names.length} ferramenta(s) com voce
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => handleAccept(transfer.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3 text-xs">
              <Check className="w-3 h-3 mr-1" /> Aceitar
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleReject(transfer.id)} className="border-slate-700 text-slate-400 h-7 px-3 text-xs">
              <X className="w-3 h-3 mr-1" /> Recusar
            </Button>
            <button onClick={() => handleDismiss(transfer.id)} className="text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
