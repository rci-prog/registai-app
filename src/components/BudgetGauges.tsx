import { useMemo } from 'react';
import { Gauge } from 'lucide-react';

interface Subscription {
  id: string;
  name: string;
  price: number;
  type: 'monthly' | 'yearly' | 'one_time';
  payments_made?: number;
}

interface BudgetGaugesProps {
  subscriptions: Subscription[];
  budget: { monthly_limit: number; yearly_limit: number } | null;
  theme: 'light' | 'dark';
  onSetBudget: () => void;
}

export function BudgetGauges({ subscriptions, budget, theme, onSetBudget }: BudgetGaugesProps) {
  console.log('[BudgetGauges] RENDER subscriptions:', subscriptions?.length);
  const { monthlySpent, yearlySpent } = useMemo(() => {
    const subs = Array.isArray(subscriptions) ? subscriptions : [];
    const monthly = subs
      .filter(s => s.type === 'monthly')
      .reduce((sum, s) => sum + s.price, 0);

    const yearly = subs.reduce((sum, s) => {
      if (s.type === 'monthly') {
        return sum + (s.price * (s.payments_made || 1));
      }
      return sum + s.price;
    }, 0);

    return { monthlySpent: monthly, yearlySpent: yearly };
  }, [subscriptions]);

  const monthlyLimit = budget?.monthly_limit || 0;
  const yearlyLimit = budget?.yearly_limit || 0;

  return (
    <div className="mt-4 mx-3 rounded-xl border p-4 backdrop-blur-sm bg-slate-900/60 border-slate-800/60">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-white">
          <Gauge className="w-4 h-4 text-violet-500" />
          ORÇAMENTO
        </h3>
        <button
          onClick={onSetBudget}
          className="text-xs px-3 py-1 rounded-lg transition-colors bg-slate-800 hover:bg-slate-700 text-slate-300"
        >
          Definir
        </button>
      </div>

      <div className="flex items-center justify-around gap-1">
        <GaugeSVG value={monthlySpent} max={monthlyLimit} label="MENSAL" />
        <div className="w-px h-14 bg-slate-700" />
        <GaugeSVG value={yearlySpent} max={yearlyLimit} label="ANUAL" />
      </div>
    </div>
  );
}

function GaugeSVG({ value, max, label }: { value: number; max: number; label: string }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  const getColor = (pct: number) => {
    if (pct >= 100) return '#ef4444';
    if (pct >= 80) return '#f59e0b';
    if (pct >= 60) return '#eab308';
    return '#8b5cf6';
  };
  const color = getColor(percentage);

  const rotation = 90 + (percentage / 100) * 180;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 110 70" className="w-24 h-auto">
        <path
          d="M 12 65 A 43 43 0 0 1 98 65"
          fill="none"
          stroke="#334155"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 12 65 A 43 43 0 0 1 98 65"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(percentage / 100) * 135} 200`}
        />
        <circle cx="55" cy="65" r="3" fill="#94a3b8" />
        <line
          x1="55"
          y1="65"
          x2="55"
          y2="97"
          stroke="#94a3b8"
          strokeWidth="2.5"
          strokeLinecap="round"
          transform={`rotate(${rotation}, 55, 65)`}
          className="transition-all duration-700"
        />
      </svg>
      <p className="text-[10px] font-medium mt-1 text-slate-400">{label}</p>
      <p className="text-xs font-bold text-white">
        R$ {value.toLocaleString('pt-BR')} <span className="text-[10px] font-normal text-slate-500">/ R$ {max.toLocaleString('pt-BR')}</span>
      </p>
    </div>
  );
}
