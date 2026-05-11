import { CreditCard, Plus, Trash2, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SubscriptionManagerProps {
  subscriptions: any[];
  theme: string;
  onAdd: (sub: any) => Promise<{ success: boolean }>;
  onDelete: (id: string) => Promise<{ success: boolean }>;
  onConfirmPayment: (id: string) => Promise<{ success: boolean }>;
}

export function SubscriptionManager({ subscriptions, theme, onAdd, onDelete, onConfirmPayment }: SubscriptionManagerProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');

  const handleAdd = async () => {
    if (!name.trim() || !cost) return;
    await onAdd({ name: name.trim(), cost: parseFloat(cost), frequency: 'monthly' });
    setName(''); setCost(''); setShowAdd(false);
  };

  return (
    <div className={`p-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-gray-200'}`}>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <CreditCard className="w-4 h-4" /> Assinaturas
      </h3>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {subscriptions.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-2">Nenhuma assinatura</p>
        ) : (
          subscriptions.map((sub: any) => (
            <div key={sub.id} className={`flex items-center justify-between p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
              <div className="min-w-0">
                <p className="text-sm text-slate-300 truncate">{sub.name}</p>
                <p className="text-xs text-slate-500">R$ {sub.cost?.toFixed(2)}/mes</p>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => onConfirmPayment(sub.id)} 
                  className="p-1 text-emerald-500 hover:text-emerald-400"
                  title="Confirmar pagamento"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onDelete(sub.id)} 
                  className="p-1 text-red-500 hover:text-red-400"
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAdd ? (
        <div className="mt-2 space-y-2">
          <Label className="text-slate-400 text-xs">Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-slate-900 border-slate-700 text-white text-sm" placeholder="Netflix, ChatGPT..." />
          <Label className="text-slate-400 text-xs">Custo mensal (R$)</Label>
          <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="bg-slate-900 border-slate-700 text-white text-sm" placeholder="29.90" />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)} className="text-xs border-slate-700">Cancelar</Button>
            <Button size="sm" onClick={handleAdd} className="text-xs bg-violet-600">Adicionar</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowAdd(true)} className="w-full mt-2 text-xs border-slate-700 text-slate-400">
          <Plus className="w-3 h-3 mr-1" /> Nova assinatura
        </Button>
      )}
    </div>
  );
}
