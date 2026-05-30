import { useState, useMemo } from 'react';
import { BarChart3, MousePointerClick, Info, Trash2, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Tool {
  id: string;
  name: string;
  category: string;
}

interface AnalyticsSidebarProps {
  tools: Tool[];
  clickData: Map<string, number>;
  theme: 'light' | 'dark';
  onReset?: () => void | Promise<{ success: boolean; message?: string }>;
}

export function AnalyticsSidebar({ tools, clickData, theme, onReset }: AnalyticsSidebarProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const safeTools = Array.isArray(tools) ? tools : [];
  const rankedTools = useMemo(() => {
    return safeTools
      .map((tool) => ({
        ...tool,
        clicks: clickData.get(tool.id) || 0,
      }))
      .sort((a, b) => b.clicks - a.clicks);
  }, [safeTools, clickData]);

  const totalClicks = useMemo(() => {
    return rankedTools.reduce((sum, t) => sum + t.clicks, 0);
  }, [rankedTools]);

  const maxClicks = useMemo(() => {
    if (rankedTools.length === 0) return 1;
    return Math.max(...rankedTools.map((t) => t.clicks), 1);
  }, [rankedTools]);

  return (
    <>
      <div className="mt-4 mx-3 rounded-xl border p-4 bg-slate-900/60 border-slate-800/60 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-violet-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Meus Acessos
          </h3>
          <div className="flex-1" />
          <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400">
            <MousePointerClick className="w-3 h-3" />
            {totalClicks}
          </div>
        </div>

        {totalClicks === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-slate-500">
            <Info className="w-8 h-8 opacity-50" />
            <p className="text-xs leading-relaxed max-w-[180px]">
              Nenhum acesso registrado ainda.<br />
              Comece a explorar!
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {rankedTools
              .filter((tool) => tool.clicks > 0)
              .map((tool) => {
                const percentage = (tool.clicks / maxClicks) * 100;
                return (
                  <div key={tool.id} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs truncate max-w-[140px] text-slate-400" title={tool.name}>
                        {tool.name}
                      </span>
                      <span className="text-xs font-medium text-slate-300">
                        {tool.clicks}
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}

            {onReset && (
              <div className="pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirm(true)}
                  className="w-full text-[11px] h-7 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Limpar Histórico
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Limpar Histórico?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja zerar todos os registros de acesso? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirm(false)} className="bg-slate-800 text-white border-slate-700">
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onReset?.(); setShowConfirm(false); }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Sim, Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
