import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import {
  LayoutDashboard,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  Zap,
  ChevronLeft,
  ChevronRight,
  MessageSquareMore,
  ListTodo,
  UserCircle,
  Sun,
  Moon,
  Smartphone,
  Palette
} from 'lucide-react';
import { BrandLogo } from './ui/BrandLogo';
import { Tooltip } from './ui/Tooltip';
import { UserRole } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ThemeSelectorModal } from './ThemeSelectorModal';
import { BackgroundThemeId, DEFAULT_BACKGROUND_THEME } from '../constants/backgroundThemes';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout?: () => void;
  onOpenInstall?: () => void;
  userRole: UserRole;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  backgroundTheme?: BackgroundThemeId;
  onChangeBackgroundTheme?: (themeId: BackgroundThemeId) => Promise<{ ok: boolean; error?: string }>;
  pendingDocsCount?: number;
  onChatUnreadCountChange?: (count: number) => void;
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
  isMinimized = false,
  onToggleMinimize,
  isMobileOpen,
  onCloseMobile,
  onLogout,
  onOpenInstall,
  userRole,
  isDarkMode,
  toggleTheme,
  backgroundTheme = DEFAULT_BACKGROUND_THEME,
  onChangeBackgroundTheme,
  pendingDocsCount = 0,
  onChatUnreadCountChange
}) => {
  const { isStandalone, isInstalled, isMobile } = usePWAInstall();
  const isGlassMode = backgroundTheme !== 'none';
  const [unreadCounts, setUnreadCounts] = useState<{ internal: number; support: number; notification: number }>({ internal: 0, support: 0, notification: 0 });
  const hasPendingAlerts = unreadCounts.internal + unreadCounts.support + unreadCounts.notification + pendingDocsCount > 0;
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isHoverPeek, setIsHoverPeek] = useState(false);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressHoverRef = useRef(false);
  const isDesktopMinimizedBox = isMinimized && !isHoverPeek;
  const chatSubsRef = useRef<any[]>([]);
  const pollIntervalRef = useRef<any>(null);

  const clearHoverCloseTimer = () => {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isMinimized) {
      clearHoverCloseTimer();
      setIsHoverPeek(false);
    }
  }, [isMinimized]);

  useEffect(() => {
    return () => clearHoverCloseTimer();
  }, []);

  const handleSidebarMouseEnter = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
    clearHoverCloseTimer();
    if (!isMinimized || suppressHoverRef.current) return;
    setIsHoverPeek(true);
  };

  const handleSidebarMouseLeave = () => {
    suppressHoverRef.current = false;
    if (!isMinimized) return;
    clearHoverCloseTimer();
    hoverCloseTimerRef.current = setTimeout(() => {
      setIsHoverPeek(false);
    }, 160);
  };

  const handleLogoToggleClick = () => {
    clearHoverCloseTimer();
    if (!isMinimized) {
      suppressHoverRef.current = true;
    } else {
      suppressHoverRef.current = false;
    }
    setIsHoverPeek(false);
    onToggleMinimize?.();
  };

  useEffect(() => {
    fetchChatsCountAndSetupRealtime();

    // Polling de fallback suave (60s) apenas com aba ativa (o Realtime já notifica instantaneamente)
    pollIntervalRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchChatsCount();
      }
    }, 60000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchChatsCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      chatSubsRef.current.forEach(sub => supabase.removeChannel(sub));
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
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
      const totalUnread = userRole === 'cliente'
        ? (supportTotal + notificationTotal)
        : (internalTotal + supportTotal + notificationTotal);
      onChatUnreadCountChange?.(totalUnread);
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
      {
        id: 'client-portal',
        label: 'Área do Cliente',
        icon: <UserCircle size={20} />,
        badgeNotification: pendingDocsCount > 0 ? pendingDocsCount : undefined,
      },
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
      <a
        key={item.id}
        href={`?tab=${item.id}`}
        onClick={(e) => {
          if (!e.ctrlKey && !e.metaKey && e.button === 0) {
            e.preventDefault();
            setIsHoverPeek(false);
            setActiveTab(item.id);
          }
        }}
        className={`group w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap relative select-none border ${activeTab === item.id
          ? 'bg-white/70 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-white/80 dark:border-indigo-500/40 shadow-xs font-semibold'
          : 'border-transparent text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/50'
          } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
      >
        <div className={`flex items-center min-w-0 ${isCollapsed ? '' : 'gap-3'}`}>
          <div className="shrink-0 relative">
            {item.icon}

            {/* Badges para modo recolhido (Collapsed) */}
            {isCollapsed && (
              <>
                {hasBadges && (
                  <div className="absolute -top-2 -right-3.5 flex items-center shadow-md rounded-full overflow-hidden ring-2 ring-white/90 dark:ring-slate-900/90 z-10 text-[8px] font-black leading-none">
                    {item.badgeInternal !== undefined && (
                      <span className="px-1 py-0.5 bg-indigo-600 text-white flex items-center justify-center min-w-[12px] h-[14px]">
                        {item.badgeInternal > 99 ? '99+' : item.badgeInternal}
                      </span>
                    )}
                    {item.badgeSupport !== undefined && (
                      <span className="px-1 py-0.5 bg-emerald-600 text-white flex items-center justify-center min-w-[12px] h-[14px]">
                        {item.badgeSupport > 99 ? '99+' : item.badgeSupport}
                      </span>
                    )}
                    {item.badgeNotification !== undefined && (
                      <span className="px-1 py-0.5 bg-amber-500 text-white flex items-center justify-center min-w-[12px] h-[14px]">
                        {item.badgeNotification > 99 ? '99+' : item.badgeNotification}
                      </span>
                    )}
                  </div>
                )}

                {/* Badge simples */}
                {hasSingleBadge && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center bg-indigo-500 text-white rounded-full text-[9px] font-bold px-1 ring-2 ring-white/90 dark:ring-slate-900/90 z-10">
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
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            {hasBadges && (
              <div className="flex items-center gap-1 shrink-0">
                {item.badgeInternal !== undefined && (
                  <Tooltip content="Mensagens internas da equipe" position="right">
                    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded-full text-[10px] font-black tracking-tight transition-all shadow-xs">
                      {item.badgeInternal > 99 ? '99+' : item.badgeInternal}
                    </span>
                  </Tooltip>
                )}
                {item.badgeSupport !== undefined && (
                  <Tooltip content="Atendimentos de clientes" position="right">
                    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-[10px] font-black tracking-tight transition-all shadow-xs">
                      {item.badgeSupport > 99 ? '99+' : item.badgeSupport}
                    </span>
                  </Tooltip>
                )}
                {item.badgeNotification !== undefined && (
                  <Tooltip content="Alertas e comunicados" position="right">
                    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-amber-50/90 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 rounded-full text-[10px] font-black tracking-tight transition-all shadow-xs">
                      {item.badgeNotification > 99 ? '99+' : item.badgeNotification}
                    </span>
                  </Tooltip>
                )}
              </div>
            )}

            {/* Badge simples */}
            {hasSingleBadge && (
              <span className="shrink-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 py-0.5 px-2 rounded-full text-xs font-bold transition-all duration-300">
                {item.badge}
              </span>
            )}
          </div>
        )}

        {/* Tooltip com nome do módulo ao hover no modo recolhido */}
        {isCollapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none whitespace-nowrap border border-slate-700/80 flex items-center gap-2">
            <span>{item.label}</span>
            {hasBadges && (
              <div className="flex items-center gap-1 text-[10px]">
                {item.badgeInternal !== undefined && (
                  <span className="px-1.5 py-0.2 bg-indigo-500 text-white rounded-full font-bold">
                    {item.badgeInternal}
                  </span>
                )}
                {item.badgeSupport !== undefined && (
                  <span className="px-1.5 py-0.2 bg-emerald-500 text-white rounded-full font-bold">
                    {item.badgeSupport}
                  </span>
                )}
                {item.badgeNotification !== undefined && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full font-bold">
                    {item.badgeNotification}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </a>
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

      <div
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        className={`fixed left-0 top-0 bottom-0 md:left-3 md:top-3 md:bottom-auto mobile-sidebar-safe rounded-r-2xl md:rounded-2xl flex flex-col z-[80] transition-all duration-300 ease-in-out ${
          isGlassMode
            ? 'p-1.5 bg-white/35 dark:bg-slate-800/35 backdrop-blur-lg backdrop-saturate-150 border-r md:border border-white/85 dark:border-white/20 md:ring-1 md:ring-slate-900/5 dark:md:ring-white/10 shadow-[0_14px_38px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] dark:shadow-[0_22px_52px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.20)]'
            : 'bg-white dark:bg-slate-900 border-r md:border border-slate-200 dark:border-slate-800 shadow-[0_12px_36px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)]'
        } ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isDesktopMinimizedBox ? 'md:w-16 md:h-16' : 'md:h-[calc(100vh-1.5rem)]'
        } ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}`}
      >
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          className={`${isDesktopMinimizedBox ? 'hidden' : 'hidden md:flex'} items-center justify-center absolute -right-3 top-[3.35rem] bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/90 dark:border-white/15 text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white rounded-full p-1 shadow-md z-50 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer`}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Container interno encaixado dentro da moldura translúcida */}
        <div
          className={`flex-1 flex flex-col min-h-0 w-full ${
            isGlassMode
              ? 'rounded-r-[11px] md:rounded-[11px] bg-gradient-to-b from-white/60 via-white/40 to-white/50 dark:from-slate-900/65 dark:via-slate-950/55 dark:to-slate-950/65 border border-white/80 dark:border-white/10 shadow-[inset_0_2px_6px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]'
              : ''
          }`}
        >
          <div
            className={`flex items-center border-slate-200/70 dark:border-white/10 transition-all duration-200 ${
              isGlassMode
                ? isDesktopMinimizedBox
                  ? 'h-[58px] border-b md:h-full md:border-b-0'
                  : 'h-[58px] border-b'
                : isDesktopMinimizedBox
                  ? 'h-16 border-b md:h-full md:border-b-0'
                  : 'h-16 border-b'
            } ${
              isCollapsed
                ? 'justify-center px-2'
                : isDesktopMinimizedBox
                  ? 'px-5 md:justify-center md:px-0'
                  : 'px-5'
            }`}
          >
            <Tooltip
              content={
                !isMinimized
                  ? 'Recolher menu no ícone'
                  : isHoverPeek
                    ? 'Clique para fixar o menu'
                    : 'Abrir menu lateral'
              }
              position={!isMinimized || isHoverPeek ? 'right' : 'bottom'}
              className="inline-flex items-center justify-center"
            >
              <button
                type="button"
                onClick={handleLogoToggleClick}
                aria-label={
                  !isMinimized
                    ? 'Recolher menu no ícone'
                    : isHoverPeek
                      ? 'Fixar menu lateral'
                      : 'Abrir menu lateral'
                }
                className="relative flex items-center justify-center rounded-xl focus:outline-none cursor-pointer group/logo transition-transform active:scale-95"
              >
                {isCollapsed ? (
                  <div className="relative w-8 h-8 rounded-xl bg-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(250,204,21,0.4)] shrink-0 transition-transform group-hover/logo:scale-105">
                    <Zap size={18} className="fill-slate-950 stroke-slate-950" />
                    {isDesktopMinimizedBox && hasPendingAlerts && (
                      <span className="hidden md:block absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                    )}
                  </div>
                ) : isDesktopMinimizedBox ? (
                  <>
                    <BrandLogo size="md" className="md:hidden" />
                    <div className="hidden md:flex relative w-8 h-8 rounded-xl bg-yellow-400 items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(250,204,21,0.4)] shrink-0 transition-transform group-hover/logo:scale-105">
                      <Zap size={18} className="fill-slate-950 stroke-slate-950" />
                      {hasPendingAlerts && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                      )}
                    </div>
                  </>
                ) : (
                  <BrandLogo size="md" className="group-hover/logo:opacity-90 transition-opacity" />
                )}
              </button>
            </Tooltip>
          </div>

          {/* Corpo retrátil da gaveta (encolhe suavemente para dentro do ícone no desktop) */}
          <div
            className={`flex-1 flex flex-col min-h-0 transition-all duration-200 origin-top ${
              isDesktopMinimizedBox
                ? 'md:max-h-0 md:opacity-0 md:scale-y-95 md:pointer-events-none md:overflow-hidden'
                : 'opacity-100'
            }`}
          >
            {/* Main Navigation */}
            <nav className={`flex-1 py-5 space-y-1 ${isGlassMode ? 'px-2' : 'px-3'}`}>
              {mainMenuItems.map(renderMenuItem)}
            </nav>

            {/* Bottom Navigation & Logout */}
            <div className={`pb-4 space-y-1 ${isGlassMode ? 'px-2' : 'px-3'}`}>
          <div className="border-t border-slate-200/70 dark:border-white/10 my-2 mx-2" />

          <button
            type="button"
            onClick={toggleTheme}
            className={`group w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap relative text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/45 dark:hover:bg-slate-800/50 cursor-pointer ${isCollapsed ? 'justify-center' : 'justify-between'}`}
          >
            <div className={`flex items-center min-w-0 ${isCollapsed ? '' : 'gap-3'}`}>
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

          {onChangeBackgroundTheme && (
            <button
              type="button"
              onClick={() => {
                setIsHoverPeek(false);
                setIsThemeModalOpen(true);
                onCloseMobile();
              }}
              className={`group w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap relative text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/45 dark:hover:bg-slate-800/50 cursor-pointer ${isCollapsed ? 'justify-center' : 'justify-between'}`}
            >
              <div className={`flex items-center min-w-0 ${isCollapsed ? '' : 'gap-3'}`}>
                <div className="shrink-0 relative">
                  <Palette size={20} />
                </div>
                <span className={`transition-all duration-300 truncate ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                  Temas
                </span>
              </div>

              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none whitespace-nowrap border border-slate-700">
                  Temas de Fundo
                </div>
              )}
            </button>
          )}

          {isMobile && !isStandalone && !isInstalled && onOpenInstall && (
            <button
              onClick={() => {
                setIsHoverPeek(false);
                onOpenInstall();
              }}
              className={`group w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap relative text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-500/10 dark:hover:bg-indigo-400/15 ${isCollapsed ? 'justify-center' : 'justify-between'}`}
            >
              <div className={`flex items-center min-w-0 ${isCollapsed ? '' : 'gap-3'}`}>
                <div className="shrink-0 relative">
                  <Smartphone size={20} className="text-indigo-500 animate-pulse" />
                </div>
                <span className={`transition-all duration-300 truncate font-semibold ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                  Instalar App
                </span>
              </div>

              {/* Tooltip */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none whitespace-nowrap border border-slate-700">
                  Instalar Aplicativo
                </div>
              )}
            </button>
          )}

          {bottomMenuItems.map(renderMenuItem)}

          <button
            onClick={onLogout}
            className={`group w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap relative text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-slate-800/50 ${isCollapsed ? 'justify-center' : 'justify-between'}`}
          >
            <div className={`flex items-center min-w-0 ${isCollapsed ? '' : 'gap-3'}`}>
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
        </div>
      </div>

      {/* Modal renderizado fora da div com backdrop-blur para não ficar aprisionado pelo containing block */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentThemeId={backgroundTheme}
        isDarkMode={Boolean(isDarkMode)}
        onSelectTheme={onChangeBackgroundTheme}
      />
    </>
  );
};
