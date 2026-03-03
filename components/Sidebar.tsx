
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  Hexagon,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  StickyNote
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  onLogout?: () => void;
  userRole: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  toggleSidebar,
  onLogout,
  userRole
}) => {
  const [notesCount, setNotesCount] = useState<number>(0);
  const [chatsCount, setChatsCount] = useState<number>(0);
  const chatSubsRef = useRef<any[]>([]);

  useEffect(() => {
    fetchNotesCount();
    fetchChatsCountAndSetupRealtime();

    return () => {
      chatSubsRef.current.forEach(sub => supabase.removeChannel(sub));
    };
  }, []);

  const fetchNotesCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_archived', false);

      if (!error && count !== null) {
        setNotesCount(count);
      }
    } catch (error) {
      console.error('Error fetching notes count:', error);
    }
  };

  const fetchChatsCountAndSetupRealtime = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData, error: memberError } = await supabase
        .from('chat_channel_members')
        .select('channel_id, last_read_at')
        .eq('user_id', user.id);

      if (memberError || !memberData || memberData.length === 0) {
        setChatsCount(0);
        return;
      }

      const channelIds = memberData.map(m => m.channel_id);

      const calculateTotalUnread = async (members: any[]) => {
        let total = 0;
        await Promise.all(
          members.map(async (m: any) => {
            const lastRead = m.last_read_at || '2000-01-01T00:00:00Z';
            const { count, error } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('channel_id', m.channel_id)
              .neq('sender_id', user.id)
              .gt('created_at', lastRead);

            if (error) {
              console.error('Falha de COUNT em messages no Sidebar:', error);
            } else if (count) {
              total += count;
            }
          })
        );
        return total;
      };

      const initialCount = await calculateTotalUnread(memberData);
      setChatsCount(initialCount);

      // Limpar antigos listeners antes de instanciar novos
      chatSubsRef.current.forEach(sub => supabase.removeChannel(sub));
      chatSubsRef.current = [];

      // Listener global e abrangente para Inserções sem limites de Chunk no Postgres
      const globalMessageSub = supabase
        .channel(`sidebar-chats-global-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages'
          },
          (payload) => {
            const newMsg = payload.new as any;
            if (newMsg.sender_id !== user.id && channelIds.includes(newMsg.channel_id)) {
              setChatsCount(prev => prev + 1);
            }
          }
        )
        .subscribe();

      // Ouvinte para atualizações de leitura (last_read_at)
      const memberSub = supabase
        .channel('sidebar-memberships')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_channel_members',
            filter: `user_id=eq.${user.id}`
          },
          async () => {
            const { data: updatedMemberData } = await supabase
              .from('chat_channel_members')
              .select('channel_id, last_read_at')
              .eq('user_id', user.id);

            if (updatedMemberData) {
              const newTotal = await calculateTotalUnread(updatedMemberData);
              setChatsCount(newTotal);
            }
          }
        )
        .subscribe();

      chatSubsRef.current = [globalMessageSub, memberSub];

    } catch (error) {
      console.error('Error fetching chats count:', error);
    }
  };

  const mainMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'tasks', label: 'Tarefas', icon: <CheckSquare size={20} /> },
    { id: 'clients', label: 'Cadastros', icon: <Users size={20} /> },
    {
      id: 'notes',
      label: 'Anotações',
      icon: <StickyNote size={20} />,
      badge: notesCount > 0 ? notesCount : undefined
    },
    {
      id: 'chat',
      label: 'Chat Equipe',
      icon: <MessageSquare size={20} />,
      badge: chatsCount > 0 ? chatsCount : undefined
    },
  ];

  const bottomMenuItems = [
    { id: 'settings', label: 'Configurações', icon: <Settings size={20} />, restrictedTo: ['gestor'] },
    { id: 'support', label: 'Suporte', icon: <HelpCircle size={20} /> },
  ];

  const renderMenuItem = (item: { id: string; label: string; icon: React.ReactNode; restrictedTo?: string[]; badge?: number }) => {
    if (item.restrictedTo && !item.restrictedTo.includes(userRole)) {
      return null;
    }

    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        title={isCollapsed ? item.label : undefined}
        className={`w-full flex justify-between items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap relative ${activeTab === item.id
          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          } ${isCollapsed ? 'justify-center' : ''}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 relative">
            {item.icon}
            {item.badge !== undefined && isCollapsed && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center bg-indigo-500 text-white rounded-full text-[9px] font-bold px-1 ring-2 ring-white dark:ring-slate-900 z-10">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </div>
          <span className={`transition-all duration-300 truncate ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
            {item.label}
          </span>
        </div>

        {item.badge !== undefined && !isCollapsed && (
          <span className={`shrink-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 py-0.5 px-2 rounded-full text-xs font-bold transition-all duration-300`}>
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className={`fixed left-0 top-0 bottom-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-40 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`h-16 flex items-center border-b border-slate-200 dark:border-slate-800 ${isCollapsed ? 'justify-center' : 'px-6'}`}>
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-500 overflow-hidden whitespace-nowrap">
          <Hexagon size={28} strokeWidth={2.5} className="shrink-0" />
          <span className={`text-xl font-bold tracking-tight text-slate-900 dark:text-white transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
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
        {bottomMenuItems.map(renderMenuItem)}

        <button
          onClick={onLogout}
          title={isCollapsed ? "Sair" : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 w-full transition-colors overflow-hidden whitespace-nowrap ${isCollapsed ? 'justify-center' : ''}`}
        >
          <div className="shrink-0"><LogOut size={20} /></div>
          <span className={`transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
            Sair
          </span>
        </button>
      </div>
    </div>
  );
};
