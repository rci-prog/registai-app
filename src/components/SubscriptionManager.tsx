import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  ExternalLink,
  Calendar,
  DollarSign,
  Repeat,
  Clock,
  X,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Subscription {
  id: string;
  name: string;
  url: string | null;
  price: number;
  type: 'monthly' | 'yearly' | 'one_time';
  start_date: string | null;
  expiry_date: string | null;
  payments_made?: number;
  total_spent?: number;
}

interface SubscriptionManagerProps {
  subscriptions: Subscription[];
  theme: 'light' | 'dark';
  onAdd: (sub: Omit<Subscription, 'id'>) => void;
  onDelete: (id: string) => void;
  onConfirmPayment?: (id: string, type: string, price: number) => Promise<{ success: boolean; message?: string; payments?: number; totalSpent?: number }>;
}

const typeLabels: Record<string, string> = {
  monthly: 'Mensal',
  yearly: 'Anual',
  one_time: 'Unica',
};

const typeColors: Record<string, string> = {
  monthly: 'bg-blue-500/20 text-blue-400',
  yearly: 'bg-violet-500/20 text-violet-400',
  one_time: 'bg-green-500/20 text-green-400',
};

// Verificar se data vence em 7 dias ou menos
function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
}

export function SubscriptionManager({ subscriptions, theme, onAdd, onDelete, onConfirmPayment }: SubscriptionManagerProps) {
  console.log('[SubscriptionManager] RENDER');
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expiryAlerts, setExpiryAlerts] = useState<Subscription[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    price: '',
    type: 'monthly' as 'monthly' | 'yearly' | 'one_time',
    start_date: '',
    expiry_date: '',
  });
  
  // Calcular totais
  const totalMonthly = subscriptions
    .filter(s => s.type === 'monthly')
    .reduce((sum, s) => sum + s.price, 0);
  // Total Anual: soma TUDO (unica + mensal*parcelasPagas + anual)
  const grandTotal = subscriptions.reduce((sum, s) => {
    if (s.type === 'monthly') {
      return sum + (s.price * (s.payments_made || 1));
    }
    return sum + s.price;
  }, 0);
  
  // TOTAL GASTO — soma de (price × payments_made) para todas as assinaturas
  const totalGasto = subscriptions.reduce((sum, s) => {
    const payments = s.payments_made || (s.type === 'one_time' ? 1 : 1);
    return sum + (s.price * payments);
  }, 0);
  
  // Detectar assinaturas vencendo em breve
  useEffect(() => {
    const expiring = subscriptions.filter(s => isExpiringSoon(s.expiry_date));
    setExpiryAlerts(expiring);
  }, [subscriptions]);
  
  const handleAdd = () => {
    if (!formData.name || !formData.price) {
      console.log('[Subs] Campos obrigatorios faltando');
      return;
    }
    
    const payload = {
      name: formData.name,
      url: formData.url || null,
      price: parseFloat(formData.price) || 0,
      type: formData.type,
      start_date: formData.start_date || null,
      expiry_date: formData.expiry_date || null,
    };
    console.log('[Subs] Salvando:', JSON.stringify(payload));
    
    onAdd(payload);
    
    setFormData({ name: '', url: '', price: '', type: 'monthly', start_date: '', expiry_date: '' });
    setShowAdd(false);
  };
  
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    setConfirmMsg(null);
  };
  
  const handleConfirmPayment = async (sub: Subscription) => {
    if (!onConfirmPayment) return;
    setConfirmingId(sub.id);
    setConfirmMsg(null);
    
    const result = await onConfirmPayment(sub.id, sub.type, sub.price);
    
    if (result.success) {
      setConfirmMsg(result.message || 'Pagamento confirmado!');
      setTimeout(() => setConfirmMsg(null), 3000);
    } else {
      setConfirmMsg('Erro: ' + (result.message || 'Falha ao confirmar'));
    }
    setConfirmingId(null);
  };
  
  const dismissAlert = (id: string) => {
    setExpiryAlerts(prev => prev.filter(a => a.id !== id));
  };
  
  return (
    <>
      {/* Notificacoes de vencimento */}
      {expiryAlerts.length > 0 && (
        <div className="mx-3 mt-3 space-y-2">
          {expiryAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <Clock className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-medium ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`}>
                  Atenção: <span className="font-bold">{alert.name}</span> vence em breve!
                </p>
                <p className={`text-[9px] ${theme === 'dark' ? 'text-amber-400/70' : 'text-amber-600/70'}`}>
                  {alert.expiry_date ? new Date(alert.expiry_date).toLocaleDateString('pt-BR') : ''}
                </p>
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className={`p-1 rounded-md ${theme === 'dark' ? 'hover:bg-amber-500/20' : 'hover:bg-amber-200'}`}
              >
                <X className={`w-3 h-3 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
              </button>
            </div>
          ))}
        </div>
      )}
    
      {/* Card principal */}
      <div className={`mt-4 mx-3 rounded-xl border p-4 ${
        theme === 'dark'
          ? 'bg-slate-900/60 border-slate-800/60 backdrop-blur-sm'
          : 'bg-white/60 border-gray-200/60 backdrop-blur-sm'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className={`w-4 h-4 ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`} />
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
            }`}>
              Assinaturas
            </h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'
            }`}>
              {subscriptions.length}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAdd(true)}
            className={`h-7 w-7 p-0 rounded-md ${
              theme === 'dark' ? 'text-violet-400 hover:bg-violet-500/10' : 'text-violet-600 hover:bg-violet-50'
            }`}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Resumo de gastos */}
        {confirmMsg && (
          <div className={`mb-2 p-2 rounded text-center text-xs ${
            confirmMsg.includes('Erro') 
              ? (theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600')
              : (theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
          }`}>
            {confirmMsg}
          </div>
        )}
        <div className={`flex items-center gap-4 mb-3 text-[11px] ${
          theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
        }`}>
          <div className="flex items-center gap-1">
            <Repeat className="w-3 h-3 text-blue-400" />
            <span>R$ {totalMonthly.toFixed(0)}/mes</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-violet-400" />
            <span>R$ {grandTotal.toFixed(0)}/ano</span>
          </div>
        </div>
        
        {/* Lista */}
        <div className="space-y-1">
          {subscriptions.map((sub) => (
            <div key={sub.id}>
              <button
                onClick={() => toggleExpand(sub.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-slate-800/60' 
                    : 'hover:bg-gray-50/60'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${typeColors[sub.type]}`}>
                    {typeLabels[sub.type]}
                  </span>
                  <span className={`text-xs truncate ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                    {sub.name}
                  </span>
                  {isExpiringSoon(sub.expiry_date) && (
                    <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    R$ {sub.price.toFixed(0)}
                  </span>
                  {expandedId === sub.id ? (
                    <ChevronUp className={`w-3 h-3 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`} />
                  ) : (
                    <ChevronDown className={`w-3 h-3 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`} />
                  )}
                </div>
              </button>
              
              {expandedId === sub.id && (
                <div className={`mx-2 px-3 pb-2 pt-1 rounded-b-lg text-[11px] space-y-1.5 ${
                  theme === 'dark' ? 'bg-slate-800/40 text-slate-400' : 'bg-gray-50/60 text-gray-500'
                }`}>
                  {sub.url && (
                    <a 
                      href={sub.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span className="truncate">{sub.url}</span>
                    </a>
                  )}
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3" />
                    <span>R$ {sub.price.toFixed(2)}</span>
                  </div>
                  {sub.start_date && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      <span>Desde: {new Date(sub.start_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                  {sub.expiry_date && (
                    <div className={`flex items-center gap-1.5 ${
                      isExpiringSoon(sub.expiry_date) ? 'text-amber-400' : ''
                    }`}>
                      <Calendar className="w-3 h-3" />
                      <span>Vence: {new Date(sub.expiry_date).toLocaleDateString('pt-BR')}</span>
                      {isExpiringSoon(sub.expiry_date) && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">Em breve!</span>
                      )}
                    </div>
                  )}
                  {/* Confirmar Pagamento — apenas recorrentes */}
                  {(sub.type === 'monthly' || sub.type === 'yearly') && onConfirmPayment && (
                    <button
                      onClick={() => handleConfirmPayment(sub)}
                      disabled={confirmingId === sub.id}
                      className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors mt-1"
                    >
                      {confirmingId === sub.id ? (
                        <span className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      <span>Confirmar pagamento ({sub.payments_made || 1})</span>
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteId(sub.id)}
                    className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors mt-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remover assinatura</span>
                  </button>
                </div>
              )}
            </div>
          ))}
          
          {subscriptions.length === 0 && (
            <p className={`text-[11px] text-center py-3 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
              Nenhuma assinatura cadastrada
            </p>
          )}
        </div>
        
        {/* Totalizador */}
        {subscriptions.length > 0 && (
          <div className={`mt-3 pt-3 border-t ${
            theme === 'dark' ? 'border-slate-800' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-semibold uppercase ${
                theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
              }`}>
                Total Mensal
              </span>
              <span className={`text-sm font-bold ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`}>
                R$ {totalMonthly.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className={`text-[10px] font-semibold uppercase ${
                theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
              }`}>
                Total Anual
              </span>
              <span className={`text-sm font-bold ${theme === 'dark' ? 'text-fuchsia-400' : 'text-fuchsia-600'}`}>
                R$ {grandTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-dashed border-slate-700/30">
              <span className={`text-[10px] font-semibold uppercase ${
                theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
              }`}>
                Total Gasto
              </span>
              <span className={`text-sm font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                R$ {totalGasto.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal Nova Assinatura */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className={`max-w-md ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              Nova Assinatura
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 pt-2">
            <div>
              <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: ChatGPT Plus"
                className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}
              />
            </div>
            <div>
              <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>URL</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
                className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="29.90"
                  className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}
                />
              </div>
              <div className="flex-1">
                <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Tipo *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as 'monthly' | 'yearly' | 'one_time' })}
                >
                  <SelectTrigger className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-slate-900 border-slate-700' : ''}>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                    <SelectItem value="one_time">Unica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Data de adesao</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}
                />
              </div>
              <div className="flex-1">
                <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Vencimento</Label>
                <Input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button 
                onClick={handleAdd}
                className="bg-violet-600 hover:bg-violet-700 text-white"
                disabled={!formData.name || !formData.price}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className={theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}>
          <AlertDialogHeader>
            <AlertDialogTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              Remover assinatura?
            </AlertDialogTitle>
            <AlertDialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
              Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : ''}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { deleteId && onDelete(deleteId); setDeleteId(null); }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
