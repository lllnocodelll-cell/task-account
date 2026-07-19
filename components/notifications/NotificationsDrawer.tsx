import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../utils/supabaseClient';
import { Notification as NotificationType } from '../../types';
import { Check, Clock, AlertCircle, FileText, Bell, CheckCircle, CalendarClock, ShieldAlert, Mail, Trash2, X } from 'lucide-react';

interface NotificationsDrawerProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tabName: string, id?: string) => void;
  onUnreadCountChange: (count: number) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  userId,
  isOpen,
  onClose,
  onNavigate,
  onUnreadCountChange
}) => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer animation states
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

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
    if (isOpen) {
      setShouldRender(true);
      fetchNotifications();
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleTransitionEnd = () => {
    if (!isVisible) setShouldRender(false);
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

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

  if (!shouldRender) return null;

  return createPortal(
    <>
      {/* Backdrop overlay */}
      <div 
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[9998] transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        onTransitionEnd={handleTransitionEnd}
        className={`fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl z-[9999] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25, 0.1, 0.25, 1)] border-l border-white/20 dark:border-slate-800/50 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-lg flex-shrink-0 shadow-sm">
              <Bell size={18} className="text-indigo-650 dark:text-indigo-400" />
            </div>
            <div className="flex flex-col text-left">
              <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                Notificações
              </h1>
              <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleMarkAllAsRead}
              disabled={notifications.filter(n => !n.read).length === 0}
              className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-850 p-2 rounded-lg transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
              title="Marcar todas como lidas"
            >
              <Check size={12} strokeWidth={3} />
              <span>Lidas</span>
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-650"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-450 text-center">
              <Bell className="mb-3 opacity-20 text-slate-400" size={40} />
              <p className="text-sm font-medium">Nenhuma notificação encontrada</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Tudo limpo por aqui.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 rounded-xl flex gap-3.5 border transition-all cursor-pointer ${
                    notif.read 
                      ? 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-850/50 opacity-60 hover:opacity-90 hover:bg-slate-50 dark:hover:bg-slate-800/40' 
                      : 'bg-indigo-50/40 dark:bg-indigo-950/10 border-indigo-100/40 dark:border-indigo-900/30 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/20 shadow-sm'
                  }`}
                >
                  <div className="mt-0.5 shrink-0 bg-white dark:bg-slate-850 p-2 rounded-xl shadow-sm border border-slate-100/80 dark:border-slate-800 flex items-center justify-center w-9 h-9">
                    {getIcon(notif.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-0.5">
                      <p className={`text-xs sm:text-sm truncate leading-snug ${notif.read ? 'text-slate-700 dark:text-slate-300 font-bold' : 'text-slate-950 dark:text-white font-black'}`}>
                        {notif.title}
                      </p>
                      
                      <div className="flex gap-1.5 shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
                        {notif.read ? (
                          <button
                            onClick={(e) => handleMarkAsUnread(notif.id, e)}
                            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0"
                            title="Marcar como não lida"
                          >
                            <Mail size={12} />
                          </button>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-500 shrink-0 mt-1 mr-1" />
                        )}
                        <button
                          onClick={(e) => handleDeleteNotification(notif.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-450 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0"
                          title="Excluir notificação"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-655 dark:text-slate-400 whitespace-pre-line line-clamp-4 mb-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      {formatTime(notif.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <button 
            onClick={() => { onClose(); if (onNavigate) onNavigate('notifications'); }}
            className="w-full py-2.5 text-xs text-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold rounded-lg border border-slate-200/60 dark:border-slate-800/60 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            Ver histórico completo
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};
