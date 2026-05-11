import { BarChart3, TrendingUp, MousePointer, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnalyticsSidebarProps {
  tools: any[];
  clickData: any[];
  theme: string;
  onReset: () => Promise<{ success: boolean }>;
}

export function AnalyticsSidebar({ tools, clickData, theme, onReset }: AnalyticsSidebarProps) {
  const totalClicks = clickData.reduce((sum: number, c: any) => sum + (c.count || 0), 0);
  const topTool = tools.length > 0 ? tools[0] : null;

  return (
    <div className={`p-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-gray-200'}`}>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <BarChart3 className="w-4 h-4" /> Analise
      </h3>
      <div className="space-y-3">
        <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <MousePointer className="w-4 h-4" />
            <span>Cliques totais</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1">{totalClicks}</div>
        </div>
        {topTool && (
          <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>Mais acessada</span>
            </div>
            <div className="text-sm font-medium text-violet-400 mt-1 truncate">{topTool.name}</div>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => onReset()} className="w-full text-xs border-slate-700 text-slate-400 hover:text-white">
          <RotateCcw className="w-3 h-3 mr-1" /> Resetar cliques
        </Button>
      </div>
    </div>
  );
}
