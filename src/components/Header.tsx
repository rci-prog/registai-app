import { useState } from 'react';
import { LogOut, Shield, User, UserPlus, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import type { AppNotification } from '@/hooks/useNotifications';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { SupportModal } from '@/components/SupportModal';
import { NotificationDetailModal } from '@/components/NotificationDetailModal';

interface HeaderProps {
  onLogin: () => void;
  onProfile: () => void;
  onAdmin: () => void;
}

export function Header({ onLogin, onProfile, onAdmin }: HeaderProps) {
  const { currentUser, isAdmin, theme, logout } = useAuth();
  const [supportOpen, setSupportOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [detailNotif, setDetailNotif] = useState<AppNotification | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAllNotifications } = useNotifications(currentUser?.email);

  const handleOpenNotifDetail = (notif: AppNotification) => {
    setDetailNotif(notif);
    setDetailOpen(true);
    if (notif.status === 'unread') {
      markAsRead(notif.id);
    }
  };

  return (
    <header className="w-full border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between relative">
        {/* Logo registAI */}
        <div className="flex items-center gap-3">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
          >
            <path
              d="M20 2L36 11V29L20 38L4 29V11L20 2Z"
              stroke="#8b5cf6"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M12 16H28"
              stroke="#8b5cf6"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <rect x="12" y="20" width="5" height="5" rx="1" fill="#8b5cf6" opacity="0.9" />
            <rect x="17.5" y="20" width="5" height="5" rx="1" fill="#a78bfa" opacity="0.9" />
            <rect x="23" y="20" width="5" height="5" rx="1" fill="#c4b5fd" opacity="0.9" />
            <circle cx="20" cy="13" r="2.5" fill="#06b6d4" />
          </svg>
          
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              registAI
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Catalogo Inteligente de IA</p>
          </div>
        </div>

        {/* CENTRO — Botao Painel ADM (apenas admin) */}
        {isAdmin && (
          <div className="absolute left-1/2 -translate-x-1/2 hidden sm:block">
            <Button
              size="sm"
              onClick={onAdmin}
              className="bg-gradient-to-r from-violet-600/80 to-fuchsia-600/80 hover:from-violet-600 hover:to-fuchsia-600 text-white text-xs px-3 py-1 h-8 border border-violet-500/30"
            >
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              Painel ADM
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!currentUser ? (
            <Button
              onClick={onLogin}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
              size="sm"
            >
              Entrar
            </Button>
          ) : (
            <>
              {/* Invite Button */}
              <Button
                size="sm"
                variant="ghost"
                className="hidden sm:flex items-center gap-1.5 text-slate-300 hover:text-white"
              >
                <UserPlus className="w-4 h-4" />
                Convidar
              </Button>

              {/* Notifications */}
              <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 p-0">
                    <Bell className="w-5 h-5 text-slate-400" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72 max-h-80 overflow-y-auto bg-slate-900 border-slate-700 text-white" align="end">
                  <div className="flex items-center justify-between p-2 border-b border-slate-700">
                    <span className="text-sm font-semibold">Notificacoes</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-violet-400 hover:text-violet-300"
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Nenhuma notificacao
                    </div>
                  ) : (
                    <>
                      {notifications.slice(0, 20).map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => { handleOpenNotifDetail(notif); setNotifOpen(false); }}
                          className={`p-3 cursor-pointer border-b border-slate-700 transition-colors ${
                            notif.status === 'unread' ? 'bg-slate-800/50' : 'opacity-60'
                          } hover:bg-slate-800`}
                        >
                          <div className="flex items-start gap-2">
                            {notif.status === 'unread' && (
                              <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-white truncate">{notif.title}</p>
                              <p className="text-[11px] text-slate-400 line-clamp-2">{notif.message}</p>
                              <p className="text-[10px] text-slate-600 mt-1">
                                {new Date(notif.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {notifications.length > 0 && (
                        <div className="p-2 border-t border-slate-700 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); clearAllNotifications(); }}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          >
                            Limpar notificacoes
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 w-9 p-0 rounded-full">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-medium">
                      {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-900 border-slate-700 text-white" align="end">
                  <div className="px-2 py-1.5 text-xs text-slate-500 border-b border-slate-700">
                    {currentUser.email}
                  </div>
                  <DropdownMenuItem onClick={onProfile} className="cursor-pointer text-slate-300 focus:text-white focus:bg-slate-800">
                    <User className="w-4 h-4 mr-2" />
                    Perfil
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={onAdmin} className="cursor-pointer text-slate-300 focus:text-white focus:bg-slate-800">
                      <Shield className="w-4 h-4 mr-2" />
                      Painel Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setSupportOpen(true)} className="cursor-pointer text-slate-300 focus:text-white focus:bg-slate-800">
                    <span className="text-xs mr-2">?</span>
                    Suporte
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-slate-800">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
      <NotificationDetailModal
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailNotif(null); }}
        notification={detailNotif}
        theme={theme}
      />
    </header>
  );
}
