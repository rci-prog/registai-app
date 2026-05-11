import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BarChart3, FileText, X } from 'lucide-react';
import type { AppNotification } from '@/hooks/useNotifications';

interface NotificationDetailModalProps {
  open: boolean;
  onClose: () => void;
  notification: AppNotification | null;
  theme: 'light' | 'dark';
}

export function NotificationDetailModal({ open, onClose, notification, theme }: NotificationDetailModalProps) {
  const isDark = theme === 'dark';
  if (!notification) return null;

  const totalClicks = notification.data?.total_clicks ?? 0;
  const isReport = notification.type === 'ad_report';
  const reportData: { date: string; count: number }[] = notification.data?.clicks_data || [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={`max-w-lg ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {isReport ? (
              <BarChart3 className="w-5 h-5 text-violet-500" />
            ) : (
              <FileText className="w-5 h-5 text-violet-500" />
            )}
            {notification.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Data */}
          <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            Recebido em {new Date(notification.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>

          {/* Mensagem */}
          <div className={`p-3 rounded-lg overflow-hidden ${isDark ? 'bg-slate-800/60' : 'bg-gray-50'}`}>
            <p className={`text-sm break-all whitespace-pre-wrap ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              {notification.message}
            </p>
          </div>

          {/* Relatorio de cliques */}
          {isReport && (
            <div>
              <div className={`flex items-center gap-3 p-3 rounded-lg mb-3 ${isDark ? 'bg-violet-900/20 border border-violet-800/30' : 'bg-violet-50 border border-violet-200'}`}>
                <div className={`text-2xl font-bold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                  {totalClicks}
                </div>
                <div>
                  <p className={`text-xs font-medium ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
                    clique{totalClicks !== 1 ? 's' : ''} no total
                  </p>
                  <p className={`text-[10px] ${isDark ? 'text-violet-500' : 'text-violet-500'}`}>
                    nos ultimos 40 dias
                  </p>
                </div>
              </div>

              {reportData.length > 0 ? (
                <div>
                  <h4 className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                    Cliques por dia
                  </h4>
                  <div className={`max-h-48 overflow-y-auto rounded-lg border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className={isDark ? 'bg-slate-800' : 'bg-gray-50'}>
                          <th className={`text-left p-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Data</th>
                          <th className={`text-right p-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Cliques</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((row, i) => (
                          <tr key={i} className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                            <td className={`p-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                              {new Date(row.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })}
                            </td>
                            <td className={`p-2 text-right font-medium ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                              {row.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className={`text-xs text-center py-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Nenhum clique registrado.
                </p>
              )}
            </div>
          )}

          {/* Botao Fechar */}
          <div className="flex justify-end pt-2">
            <Button size="sm" variant="outline" onClick={onClose} className={isDark ? 'border-slate-700 text-slate-300' : ''}>
              <X className="w-4 h-4 mr-1" />
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
