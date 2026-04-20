import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { Notification as NotificationType } from '../../types';
import { Check, Clock, TrendingUp, AlertCircle, FileText, Bell, CheckCircle, CalendarClock, ShieldAlert, MailOpen, Mail, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../ui/ConfirmModal';

interface NotificationsPopoverProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tabName: string, id?: string) => void;
  onUnreadCountChange: (count: number) => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  userId,
  isOpen,
  onClose,
  onNavigate,
  onUnreadCountChange
}) => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();

    // Setup realtime subscription
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        setNotifications((prev) => [payload.new as NotificationType, ...prev]);
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        setNotifications((prev) => 
          prev.map(n => n.id === payload.new.id ? (payload.new as NotificationType) : n)
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    onUnreadCountChange(unreadCount);
  }, [notifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (data) setNotifications(data);
    } catch (e) {
      console.error('Error fetching notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (e) {
      console.error('Error marking as read:', e);
    }
  };

  const handleMarkAsUnread = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: false })
        .eq('id', id);
      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: false } : n)
      );
    } catch (e2) {
      console.error('Error marking as unread:', e2);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);
      
      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error('Error marking all as read:', e);
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Optimistic update
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (e2) {
      console.error('Error deleting notification:', e2);
      fetchNotifications(); // Rollback/Refresh on error
    }
  };



  const handleNotificationClick = (notification: NotificationType) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    
    // Parse the link if it exists
    if (notification.link && onNavigate) {
      if (notification.link.includes('/tasks')) {
        onNavigate('tasks');
      } else if (notification.link.includes('/chat')) {
        onNavigate('chat');
      } else if (notification.link.includes('/clients')) {
        onNavigate('clients');
      } else if (notification.link.includes('/tutorials')) {
        onNavigate('tutorials');
      }
    }
    onClose();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'task_assigned': return <Clock size={16} className="text-blue-500" />;
      case 'task_concluded': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'task_alert': return <AlertCircle size={16} className="text-amber-500" />;
      case 'task_alert_critical': return <AlertCircle size={16} className="text-red-500" />;
      case 'new_tutorial': return <FileText size={16} className="text-indigo-500" />;
      case 'task_due_soon': return <CalendarClock size={16} className="text-orange-500" />;
      case 'license_expiring': return <ShieldAlert size={16} className="text-rose-500" />;
      default: return <Bell size={16} className="text-slate-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString('pt-BR');
  };

  return (
    <div 
      ref={popoverRef}
      className={`absolute top-14 right-[-75px] w-72 sm:w-80 max-h-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl flex flex-col z-50 overflow-hidden ${!isOpen ? 'hidden' : ''}`}
    >
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex flex-col text-left">
          <h1 className="text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
            Notificações
          </h1>
          <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
        </div>
        <button 
          onClick={handleMarkAllAsRead}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center gap-1"
        >
          <Check size={12} />
          Marcar todas como lidas
        </button>
      </div>

      <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
            <Bell className="mx-auto mb-2 opacity-20" size={32} />
            <p>Nenhuma notificação encontrada.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {notifications.map((notif) => (
              <div 
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3 rounded-lg flex gap-3 cursor-pointer transition-colors ${
                  notif.read 
                    ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50 opacity-70' 
                    : 'bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                }`}
              >
                <div className="mt-0.5 shrink-0 bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-0.5">
                    <p className={`text-sm truncate ${notif.read ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-900 dark:text-white font-bold'}`}>
                      {notif.title}
                    </p>
                  <div className="flex flex-col gap-2 items-center">
                    {!notif.read 
                      ? <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                      : <button
                          onClick={(e) => handleMarkAsUnread(notif.id, e)}
                          className="p-0.5 text-slate-400 hover:text-amber-500 rounded transition-colors shrink-0 mt-0.5"
                          title="Marcar como não lida"
                        >
                          <Mail size={12} />
                        </button>
                    }
                    <button
                      onClick={(e) => handleDeleteNotification(notif.id, e)}
                      className="p-0.5 text-slate-400 hover:text-red-500 rounded transition-colors shrink-0"
                      title="Excluir notificação"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line line-clamp-4 mb-1.5 leading-snug">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    {formatTime(notif.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <button 
          onClick={() => { onClose(); if (onNavigate) onNavigate('notifications'); }}
          className="w-full py-1.5 text-xs text-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Ver histórico completo
        </button>
      </div>
    </div>
  );
};
