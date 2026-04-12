import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../utils/supabaseClient';
import { Notification } from '../types';
import { 
  Bell,
  BellDot,
  CheckCircle,
  AlertTriangle,
  Info, 
  Clock, 
  Check, 
  Trash2, 
  AlertCircle,
  FileText,
  CalendarClock,
  ShieldAlert,
  MailOpen,
  Mail
} from 'lucide-react';
import { ConfirmModal } from '../components/ui/ConfirmModal';

export const Notifications: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchNotifications(user.id);
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('public:notifications_page')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        setNotifications((prev) => 
          prev.map(n => n.id === payload.new.id ? (payload.new as Notification) : n)
        );
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        setNotifications((prev) => prev.filter(n => n.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchNotifications = async (uid: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      if (data) setNotifications(data);
    } catch (e) {
      console.error('Error fetching notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const markAllAsRead = async () => {
    if (!userId) return;
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

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      if (error) throw error;
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {
      console.error('Error marking as read:', e);
    }
  };

  const markAsUnread = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: false })
        .eq('id', id);
      if (error) throw error;
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
    } catch (e) {
      console.error('Error marking as unread:', e);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;
      
    } catch (e) {
      console.error('Error deleting notification:', e);
      if (userId) fetchNotifications(userId);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredNotifications.length && filteredNotifications.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map(n => n.id));
    }
  };

  const deleteSelected = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', selectedIds);
      
      if (error) throw error;
      
      setNotifications(prev => prev.filter(n => !selectedIds.includes(n.id)));
      setSelectedIds([]);
      setIsConfirmOpen(false);
    } catch (e) {
      console.error('Error deleting selected notifications:', e);
    } finally {
      setDeleting(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'task_assigned': return <Clock size={20} className="text-blue-500" />;
      case 'task_concluded': return <CheckCircle size={20} className="text-emerald-500" />;
      case 'task_alert': return <AlertTriangle size={20} className="text-amber-500" />;
      case 'task_alert_critical': return <AlertCircle size={20} className="text-red-500" />;
      case 'new_tutorial': return <FileText size={20} className="text-indigo-500" />;
      case 'task_due_soon': return <CalendarClock size={20} className="text-orange-500" />;
      case 'license_expiring': return <ShieldAlert size={20} className="text-rose-500" />;
      default: return <Info size={20} className="text-slate-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
            <BellDot size={18} className="text-slate-500 dark:text-slate-400" />
          </div>
          <div className="flex flex-col text-left">
            <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
              Notificações
            </h1>
            <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2">
           {selectedIds.length > 0 && (
             <Button 
               variant="secondary" 
               onClick={() => setIsConfirmOpen(true)}
               icon={<Trash2 size={16} />}
               className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 border-red-100 dark:border-red-900/50"
             >
               Excluir Selecionadas ({selectedIds.length})
             </Button>
           )}
           <Button 
             variant="ghost" 
             onClick={markAllAsRead}
             disabled={notifications.filter(n => !n.read).length === 0}
             icon={<Check size={16} />}
             className="text-xs font-semibold"
           >
             Marcar todas como lidas
           </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-2 justify-between items-center">
          <div className="flex">
            <button
              onClick={() => { setFilter('all'); setSelectedIds([]); }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                filter === 'all' 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => { setFilter('unread'); setSelectedIds([]); }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                filter === 'unread' 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Não lidas
              {notifications.filter(n => !n.read).length > 0 && (
                 <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 font-bold rounded-full">
                   {notifications.filter(n => !n.read).length}
                 </span>
              )}
            </button>
          </div>
          
          <div className="px-4 flex items-center gap-2">
            <input 
              type="checkbox"
              id="select-all"
              checked={selectedIds.length === filteredNotifications.length && filteredNotifications.length > 0}
              onChange={selectAll}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="select-all" className="text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer select-none">
              Selecionar tudo
            </label>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800 min-h-[400px]">
           {loading ? (
             <div className="flex justify-center items-center h-[400px]">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
             </div>
           ) : filteredNotifications.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 dark:text-slate-500">
               <Bell size={48} strokeWidth={1.5} className="mb-4 opacity-50" />
               <p>Nenhuma notificação encontrada.</p>
             </div>
           ) : (
             filteredNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-6 flex gap-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!notification.read ? 'bg-indigo-50/40 dark:bg-indigo-500/5' : ''} ${selectedIds.includes(notification.id) ? 'bg-indigo-50/70 dark:bg-indigo-500/10' : ''}`}
                  onClick={() => toggleSelect(notification.id)}
                >
                  <div className="mt-1 shrink-0 flex items-start gap-4">
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center h-10">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(notification.id)}
                        onChange={() => toggleSelect(notification.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!notification.read ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        {getIcon(notification.type)}
                     </div>
                  </div>
                 <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1 gap-4">
                       <h4 className={`text-sm font-semibold truncate ${!notification.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                         {notification.title}
                       </h4>
                       <span className="text-xs text-slate-400 font-medium whitespace-nowrap shrink-0">{formatTime(notification.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line line-clamp-6 leading-relaxed mb-2">
                      {notification.message}
                    </p>
                 </div>
                 <div className="flex flex-col gap-2 shrink-0 ml-4 border-l pl-4 border-slate-100 dark:border-slate-800 justify-center">
                    {!notification.read ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors" 
                        title="Marcar como lida"
                      >
                        <MailOpen size={18} />
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); markAsUnread(notification.id); }}
                        className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors" 
                        title="Marcar como não lida"
                      >
                        <Mail size={18} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" 
                      title="Excluir notificação"
                    >
                      <Trash2 size={18} />
                    </button>
                 </div>
               </div>
             ))
           )}
        </div>
      </div>
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={deleteSelected}
        title="Confirmar Exclusão"
        message={`Deseja realmente excluir as ${selectedIds.length} notificações selecionadas? Esta ação não pode ser desfeita.`}
        confirmText="Excluir Agora"
        cancelText="Manter Notificações"
        loading={deleting}
      />
    </div>
  );
};