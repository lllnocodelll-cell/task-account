import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import {
  LayoutDashboard,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  Hexagon,
  ChevronLeft,
  ChevronRight,
  MessageSquareMore,
  ListTodo,
  UserCircle,
  Sun,
  Moon
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout?: () => void;
  userRole: UserRole;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

interface MenuItemProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  restrictedTo?: string[];
  badge?: number;
  badgeInternal?: number;
  badgeSupport?: number;
  badgeNotification?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  toggleSidebar,
  isMobileOpen,
  onCloseMobile,
  onLogout,
  userRole,
  isDarkMode,
  toggleTheme
}) => {
  const [unreadCounts, setUnreadCounts] = useState<{ internal: number; support: number; notification: number }>({ internal: 0, support: 0, notification: 0 });
  const chatSubsRef = useRef<any[]>([]);
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    fetchChatsCountAndSetupRealtime();

    // Polling unificado para badges (chats)
    pollIntervalRef.current = setInterval(() => {
      fetchChatsCount();
    }, 5000);

    return () => {
      chatSubsRef.current.forEach(sub => supabase.removeChannel(sub));
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const fetchChatsCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await (supabase
        .from('chat_channel_members') as any)
        .select('channel_id, last_read_at')
        .eq('user_id', user.id);

      const memberChannelIds = (memberData || []).map((m: any) => m.channel_id);
      const lastReadMap = new Map((memberData || []).map((m: any) => [m.channel_id, m.last_read_at || '2000-01-01T00:00:00Z']));

      let channelData: any[] = [];
      if (userRole !== 'cliente') {
        const memberFilterStr = memberChannelIds.length > 0 ? memberChannelIds.join(',') : '00000000-0000-0000-0000-000000000000';
        const { data } = await supabase
          .from('chat_channels')
          .select('id, type, assigned_to, support_status, status, is_notification')
          .or(`type.eq.support,id.in.(${memberFilterStr})`);
        channelData = data || [];
      } else {
        if (memberChannelIds.length > 0) {
          const { data } = await supabase
            .from('chat_channels')
            .select('id, type, assigned_to, support_status, status, is_notification')
            .in('id', memberChannelIds);
          channelData = data || [];
        }
      }

      let internalTotal = 0;
      let supportTotal = 0;
      let notificationTotal = 0;

      await Promise.all(
        channelData.map(async (ch: any) => {
          const isNotification = ch.is_notification === true || ch.type === 'notification';

          if (userRole !== 'cliente') {
            if (ch.type === 'support' && !isNotification) {
              const isClosed = ch.support_status === 'resolved' || ch.status === 'closed';
              if (isClosed) return;
              // Para staff: não soma atendimentos que estão atribuídos a outros colegas
              if (ch.assigned_to && ch.assigned_to !== user.id) {
                return;
              }
            }
          }

          const lastRead = lastReadMap.get(ch.id) || '2000-01-01T00:00:00Z';
          const { count, error } = await (supabase
            .from('chat_messages') as any)
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', ch.id)
            .gt('created_at', lastRead)
            .neq('sender_id', user.id);

          if (!error && count) {
            if (isNotification) {
              notificationTotal += count;
            } else if (userRole === 'cliente') {
              // Para clientes, todas as mensagens não-notificação são de Atendimento/Suporte!
              supportTotal += count;
            } else if (ch.type === 'support') {
              supportTotal += count;
            } else {
              internalTotal += count;
            }
          }
        })
      );
      setUnreadCounts({ internal: internalTotal, support: supportTotal, notification: notificationTotal });
    } catch (error) {
      console.error('Error polling chats count:', error);
    }
  };

  const fetchChatsCountAndSetupRealtime = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await fetchChatsCount();

      // Limpar antigos listeners antes de instanciar novos
      chatSubsRef.current.forEach(sub => supabase.removeChannel(sub));
      chatSubsRef.current = [];

      // Ouvinte de mensagens novas em tempo real
      const messagesSub = supabase
        .channel(`sidebar-all-messages-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
          },
          () => {
            fetchChatsCount();
          }
        )
        .subscribe();

      // Ouvinte para atualizações de leitura (last_read_at)
      const memberSub = supabase
        .channel(`sidebar-memberships-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_channel_members',
          },
          () => {
            fetchChatsCount();
          }
        )
        .subscribe();

      // Ouvinte para mudanças de atribuição nos canais
      const channelsSub = supabase
        .channel(`sidebar-channels-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_channels',
          },
          () => {
            fetchChatsCount();
          }
        )
        .subscribe();

      chatSubsRef.current = [messagesSub, memberSub, channelsSub];
    } catch (error) {
      console.error('Error setting up sidebar realtime:', error);
    }
  };

  const mainMenuItems: MenuItemProps[] = userRole === 'cliente' 
    ? [
        { id: 'client-portal', label: 'Área do Cliente', icon: <UserCircle size={20} /> },
        {
          id: 'chat',
          label: 'Atendimento',
          icon: <MessageSquareMore size={20} />,
          badgeSupport: unreadCounts.support > 0 ? unreadCounts.support : undefined,
          badgeNotification: unreadCounts.notification > 0 ? unreadCounts.notification : undefined,
        },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'tasks', label: 'Tarefas', icon: <ListTodo size={20} /> },
        { id: 'clients', label: 'Cadastros', icon: <Users size={20} /> },
        {
          id: 'chat',
          label: 'Chat',
          icon: <MessageSquareMore size={20} />,
          badgeInternal: unreadCounts.internal > 0 ? unreadCounts.internal : undefined,
          badgeSupport: unreadCounts.support > 0 ? unreadCounts.support : undefined,
          badgeNotification: unreadCounts.notification > 0 ? unreadCounts.notification : undefined,
        },
      ];

  const bottomMenuItems: MenuItemProps[] = [
    { id: 'settings', label: 'Configurações', icon: <Settings size={20} />, restrictedTo: ['gestor'] },
    ...(userRole !== 'cliente' ? [{ id: 'support', label: 'Suporte', icon: <HelpCircle size={20} /> }] : [])
  ];

  const renderMenuItem = (item: MenuItemProps) => {
    if (item.restrictedTo && !item.restrictedTo.includes(userRole)) {
      return null;
    }

    const hasBadges = item.badgeInternal !== undefined || item.badgeSupport !== undefined || item.badgeNotification !== undefined;
    const hasSingleBadge = item.badge !== undefined;

    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        className={`group w-full flex justify-between items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap relative ${activeTab === item.id
          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          } ${isCollapsed ? 'justify-center' : ''}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 relative">
            {item.icon}

            {/* Badges para modo recolhido (Collapsed) */}
            {isCollapsed && (
              <>
                {hasBadges && (
                  <div className="absolute -top-2 -right-3.5 flex items-center shadow-md rounded-full overflow-hidden ring-2 ring-white dark:ring-slate-900 z-10 text-[8px] font-black leading-none">
                    {item.badgeInternal !== undefined && (
                      <span title="Equipe" className="px-1 py-0.5 bg-indigo-600 text-white flex items-center justify-center min-w-[12px] h-[14px]">
                        {item.badgeInternal > 99 ? '99+' : item.badgeInternal}
                      </span>
                    )}
                    {item.badgeSupport !== undefined && (
                      <span title="Atendimento" className="px-1 py-0.5 bg-emerald-600 text-white flex items-center justify-center min-w-[12px] h-[14px]">
                        {item.badgeSupport > 99 ? '99+' : item.badgeSupport}
                      </span>
                    )}
                    {item.badgeNotification !== undefined && (
                      <span title="Alertas" className="px-1 py-0.5 bg-amber-500 text-white flex items-center justify-center min-w-[12px] h-[14px]">
                        {item.badgeNotification > 99 ? '99+' : item.badgeNotification}
                      </span>
                    )}
                  </div>
                )}

                {/* Badge simples */}
                {hasSingleBadge && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center bg-indigo-500 text-white rounded-full text-[9px] font-bold px-1 ring-2 ring-white dark:ring-slate-900 z-10">
                    {item.badge! > 99 ? '99+' : item.badge}
                  </span>
                )}
              </>
            )}
          </div>
          <span className={`transition-all duration-300 truncate ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
            {item.label}
          </span>
        </div>

        {/* Badges para modo expandido (Sidebar aberta) */}
        {!isCollapsed && (
          <>
            {hasBadges && (
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {item.badgeInternal !== undefined && (
                  <span
                    title="Mensagens internas da equipe"
                    className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded-full text-[10px] font-black tracking-tight transition-all shadow-xs"
                  >
                    {item.badgeInternal > 99 ? '99+' : item.badgeInternal}
                  </span>
                )}
                {item.badgeSupport !== undefined && (
                  <span
                    title="Atendimentos de clientes"
                    className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-[10px] font-black tracking-tight transition-all shadow-xs"
                  >
                    {item.badgeSupport > 99 ? '99+' : item.badgeSupport}
                  </span>
                )}
                {item.badgeNotification !== undefined && (
                  <span
                    title="Alertas e comunicados"
                    className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 rounded-full text-[10px] font-black tracking-tight transition-all shadow-xs"
                  >
                    {item.badgeNotification > 99 ? '99+' : item.badgeNotification}
                  </span>
                )}
              </div>
            )}

            {/* Badge simples */}
            {hasSingleBadge && (
              <span className="shrink-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 py-0.5 px-2 rounded-full text-xs font-bold transition-all duration-300">
                {item.badge}
              </span>
            )}
          </>
        )}

        {/* Tooltip rica ao hover no modo recolhido */}
        {isCollapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none whitespace-nowrap border border-slate-700">
            <div className="flex flex-col gap-0.5">
              <span className="font-bold">{item.label}</span>
              {hasBadges && (
                <div className="flex items-center gap-2 text-[10px] text-slate-300 font-normal border-t border-slate-700/80 pt-1 mt-0.5">
                  {item.badgeInternal !== undefined && (
                    <span className="flex items-center gap-1 text-indigo-300 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      {item.badgeInternal} equipe
                    </span>
                  )}
                  {item.badgeSupport !== undefined && (
                    <span className="flex items-center gap-1 text-emerald-300 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      {item.badgeSupport} suporte
                    </span>
                  )}
                  {item.badgeNotification !== undefined && (
                    <span className="flex items-center gap-1 text-amber-300 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      {item.badgeNotification} alertas
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] md:hidden transition-opacity duration-300 ease-in-out"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <div className={`fixed left-0 top-0 bottom-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-[80] transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'} ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}`}>
      <div className={`h-16 flex items-center border-b border-slate-200 dark:border-slate-800 ${isCollapsed ? 'justify-center' : 'px-6'}`}>
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-500 overflow-hidden whitespace-nowrap">
          <Hexagon size={28} strokeWidth={2.5} className="shrink-0" />
          <span className={`text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none mt-1 transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
            Task Account
          </span>
        </div>
      </div>

      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-[3.75rem] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white rounded-full p-1 shadow-md z-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Main Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {mainMenuItems.map(renderMenuItem)}
      </nav>

      {/* Bottom Navigation & Logout */}
      <div className="px-3 pb-4 space-y-1">
        <div className="border-t border-slate-200 dark:border-slate-800 my-2 mx-2" />

        <button
          onClick={toggleTheme}
          className={`group w-full flex justify-between items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap relative text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 ${isCollapsed ? 'justify-center' : ''}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 relative">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </div>
            <span className={`transition-all duration-300 truncate ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
              {isDarkMode ? "Modo Claro" : "Modo Escuro"}
            </span>
          </div>

          {/* Tooltip */}
          {isCollapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none whitespace-nowrap border border-slate-700">
              {isDarkMode ? "Modo Claro" : "Modo Escuro"}
            </div>
          )}
        </button>

        {bottomMenuItems.map(renderMenuItem)}

        <button
          onClick={onLogout}
          className={`group w-full flex justify-between items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap relative text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 ${isCollapsed ? 'justify-center' : ''}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 relative">
              <LogOut size={20} />
            </div>
            <span className={`transition-all duration-300 truncate ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
              Sair
            </span>
          </div>

          {/* Tooltip Logout */}
          {isCollapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none whitespace-nowrap border border-slate-700">
              Sair
            </div>
          )}
        </button>
      </div>
    </div>
    </>
  );
};
