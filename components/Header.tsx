
import React, { useState } from 'react';
import { Bell, Sun, Moon, Menu, Link2, MonitorPlay, ExternalLink, MessageSquareMore, UserCircle } from 'lucide-react';
import { UserRole } from '../types';
import { NotificationsDrawer } from './notifications/NotificationsDrawer';
import { UsefulLinksDrawer } from './UsefulLinksDrawer';
import { TAB_CONFIG } from '../utils/tabFavicon';
import { BrandLogo } from './ui/BrandLogo';

interface UserProfile {
  id: string;
  full_name: string | null;
  role: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  avatar_url: string | null;
  org_name: string | null;
  job_title?: string | null;
  org_id?: string;
}

interface HeaderProps {
  activeTab?: string;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onProfileClick: () => void;
  onNavigateToTab?: (tabName: string) => void;
  onToggleMobileMenu?: () => void;
  onOpenTutorials?: () => void;
  onNavigateToTask?: (taskId: string) => void;
  onNavigateToClient?: (clientId: string) => void;
  onUnreadCountChange?: (count: number) => void;
  userRole: UserRole;
  userProfile: UserProfile | null;
  chatUnreadCount?: number;
  pendingDocsCount?: number;
  isSidebarMinimized?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  isDarkMode,
  toggleTheme,
  onProfileClick,
  onNavigateToTab,
  onToggleMobileMenu,
  onOpenTutorials,
  onNavigateToTask,
  onNavigateToClient,
  onUnreadCountChange,
  userRole,
  userProfile,
  chatUnreadCount = 0,
  pendingDocsCount = 0,
  isSidebarMinimized = false
}) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLinksOpen, setIsLinksOpen] = useState(false);

  const currentTabMeta = activeTab ? TAB_CONFIG[activeTab] : null;
  const currentTabLabel = activeTab === 'chat' && userRole === 'cliente' ? 'Atendimento' : currentTabMeta?.title;

  const handleDrawerNavigate = (tabName: string, id?: string) => {
    if (tabName === 'tutorials') {
      onOpenTutorials?.();
      return;
    }
    if (tabName === 'tasks' && id) {
      onNavigateToTask?.(id);
    } else if (tabName === 'clients' && id) {
      onNavigateToClient?.(id);
    } else if (onNavigateToTab) {
      onNavigateToTab(tabName);
    }
  };

  const handleUnreadCount = (count: number) => {
    setUnreadCount(count);
    onUnreadCountChange?.(count);
  };

  return (
    <>
      <div className={`sticky top-0 z-[60] md:pt-3 md:pr-3 pointer-events-none transition-all duration-300 ${isSidebarMinimized ? 'md:ml-[calc(4rem+1.5rem)]' : ''}`}>
        <header
          className="relative pointer-events-auto mobile-header-safe md:h-16 bg-gradient-to-r from-white/55 via-white/40 to-white/50 dark:from-slate-900/55 dark:via-slate-950/40 dark:to-slate-900/55 backdrop-blur-md backdrop-saturate-150 border-b md:border border-white/80 dark:border-white/15 md:ring-1 md:ring-slate-900/5 dark:md:ring-white/5 md:rounded-2xl md:shadow-[0_12px_36px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.95)] md:dark:shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.16)] flex items-center justify-between sm:px-4 md:px-6 transition-all duration-300"
        >
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 -ml-1 text-slate-500 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/[0.08] rounded-xl transition-colors shrink-0 touch-manipulation cursor-pointer"
              aria-label="Toggle menu"
            >
              <Menu size={22} />
            </button>

            {/* Logo oficial no cabeçalho mobile: ícone compacto sem texto para poupar espaço */}
            <div className="md:hidden flex items-center shrink-0">
              <BrandLogo size="sm" showVersion={false} hideTextOnMobile={true} />
            </div>

            {currentTabLabel && activeTab && (
              <div className="tooltip-container tooltip-bottom hidden sm:inline-flex">
                <a
                  href={`?tab=${activeTab}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 bg-slate-900/5 dark:bg-white/[0.06] hover:bg-indigo-500/10 dark:hover:bg-indigo-400/15 border border-slate-200/70 dark:border-white/10 hover:border-indigo-300/60 dark:hover:border-indigo-400/30 transition-all duration-200 group shadow-2xs"
                >
                  <span>{currentTabLabel}</span>
                  <ExternalLink size={12} className="text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
                </a>
                <span className="tooltip-content flex items-center gap-1.5">
                  <span>Abrir em nova aba</span>
                  <ExternalLink size={10} className="text-indigo-400" />
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end flex-nowrap shrink-0 gap-1.5 sm:gap-2 md:gap-2.5 ml-auto">
            {/* Atalhos Rápidos para o Cliente: Área do Cliente & Chat (dispensa abrir a sidebar no celular) */}
            {(userRole === 'cliente' || activeTab === 'client-portal') && onNavigateToTab && (
              <div className="flex items-center bg-slate-900/5 dark:bg-white/[0.06] p-0.5 sm:p-1 rounded-xl border border-slate-200/70 dark:border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigateToTab('client-portal')}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                    activeTab === 'client-portal'
                      ? 'bg-white/95 dark:bg-slate-800/90 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <UserCircle size={15} />
                  <span className="hidden sm:inline">Área do Cliente</span>
                  <span className="sm:hidden text-[11px]">Portal</span>
                  {pendingDocsCount > 0 && (
                    <span className="min-w-[17px] h-[17px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center animate-in zoom-in duration-200 shadow-xs">
                      {pendingDocsCount > 99 ? '99+' : pendingDocsCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('chat')}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                    activeTab === 'chat'
                      ? 'bg-white/95 dark:bg-slate-800/90 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <MessageSquareMore size={15} />
                  <span className="text-[11px] sm:text-xs">Chat</span>
                  {chatUnreadCount > 0 && (
                    <span className="min-w-[17px] h-[17px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center animate-in zoom-in duration-200 shadow-xs">
                      {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {userRole !== 'cliente' && (
              <>
                <div className="tooltip-container tooltip-bottom shrink-0">
                  <button
                    onClick={() => setIsLinksOpen(true)}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900/5 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-500/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                  >
                    <Link2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                  <span className="tooltip-content">Links Úteis</span>
                </div>

                <div className="tooltip-container tooltip-bottom shrink-0">
                  <button
                    onClick={() => onOpenTutorials?.()}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900/5 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-500/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                  >
                    <MonitorPlay size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                  <span className="tooltip-content">Tutoriais</span>
                </div>

                <div className="relative shrink-0">
                  <div className="tooltip-container tooltip-bottom">
                    <button
                      onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900/5 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-500/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors relative shrink-0 cursor-pointer"
                    >
                      <Bell size={16} className="sm:w-[18px] sm:h-[18px]" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 sm:top-0.5 sm:right-0.5 min-w-3.5 h-3.5 sm:min-w-4 sm:h-4 px-0.5 bg-red-500 text-white text-[8px] sm:text-[9px] font-bold rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                    <span className="tooltip-content">Notificações</span>
                  </div>
                </div>
              </>
            )}

            <div className="tooltip-container tooltip-bottom shrink-0">
              <button
                onClick={onProfileClick}
                className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3.5 border-l border-slate-200/70 dark:border-white/10 hover:opacity-80 transition-opacity shrink-0 cursor-pointer"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight">
                    {userProfile?.full_name || 'Usuário'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{userProfile?.role || userRole}</p>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-xs sm:text-sm shadow-sm overflow-hidden shrink-0 ring-2 ring-white/70 dark:ring-white/15">
                  {userProfile?.avatar_url ? (
                    <img src={userProfile.avatar_url} alt={userProfile.full_name || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    (userProfile?.full_name || 'U').substring(0, 2).toUpperCase()
                  )}
                </div>
              </button>
              <span className="tooltip-content">Ver Perfil</span>
            </div>
          </div>
        </header>
      </div>

      {/* Drawers renderizados fora do <header> para evitar contenção de position:fixed pelo backdrop-blur */}
      {userRole !== 'cliente' && (
        <UsefulLinksDrawer isOpen={isLinksOpen} onClose={() => setIsLinksOpen(false)} orgId={userProfile?.org_id || ''} />
      )}

      {userProfile?.id && (
        <NotificationsDrawer
          userId={userProfile.id}
          orgId={userProfile.org_id}
          userRole={userProfile?.role || userRole}
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          onNavigate={handleDrawerNavigate}
          onUnreadCountChange={handleUnreadCount}
        />
      )}
    </>
  );
};
