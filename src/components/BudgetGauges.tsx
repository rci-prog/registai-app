import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BudgetGaugesProps {
  subscriptions: any[];
  budget: { monthly: number; yearly: number };
  theme: string;
  onSetBudget: () => void;
}

export function BudgetGauges({ subscriptions, budget, theme, onSetBudget }: BudgetGaugesProps) {
  // MODIFICAÇÃO PASSO 3: Blindagem para garantir que subscriptions seja um array
  const safeSubscriptions = Array.isArray(subscriptions) ? subscriptions : [];
  
  // MODIFICAÇÃO PASSO 3: Uso do safeSubscriptions para evitar erro .reduce
  const monthlyCost = safeSubscriptions.reduce((sum: number, s: any) => sum + (s.cost || 0), 0);
  
  const monthlyLimit = (budget && budget.monthly) ? budget.monthly : 1000;
  const monthlyPercent = Math.min((monthlyCost / monthlyLimit) * 100, 100);
  const isOverBudget = monthlyCost > monthlyLimit;

  return (
    <div className={`p-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-gray-200'}`}>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <DollarSign className="w-4 h-4" /> Orcamento
      </h3>
      
      <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Mensal</span>
          <span className={`text-sm font-medium ${isOverBudget ? 'text-red-400' : 'text-emerald-400'}`}>
            R$ {monthlyCost.toFixed(2)} / R$ {monthlyLimit.toFixed(2)}
          </span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${monthlyPercent}%` }}
          />
        </div>
        {isOverBudget && (
          <div className="flex items-center gap-1 mt-2 text-red-400 text-[11px]">
            <AlertTriangle className="w-3 h-3" />
            <span>Acima do limite!</span>
          </div>
        )}
      </div>

      <Button 
        variant="outline" 
        size="sm" 
        onClick={onSetBudget}
        className="w-full mt-2 text-xs border-slate-700 text-slate-400 hover:text-white"
      >
        <TrendingUp className="w-3 h-3 mr-1" />
        Definir orcamento
      </Button>
    </div>
  );
}
