import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../utils/supabaseClient';
import { Notification as NotificationType } from '../../types';
import { 
  Check, 
  Clock, 
  AlertCircle, 
  FileText, 
  Bell, 
  CheckCircle, 
  CalendarClock, 
  ShieldAlert, 
  Mail, 
  Trash2, 
  X, 
  AlertTriangle, 
  MonitorCheck, 
  Building2, 
  ArrowRightLeft, 
  Scale, 
  BookOpen, 
  Users, 
  MapPin,
  Search,
  Filter
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { soundEffects } from '../../utils/soundEffects';
import { 
  sendBrowserNotification, 
  requestBrowserNotificationPermission, 
  isBrowserNotificationSupported 
} from '../../utils/browserNotification';

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
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied';
  });

  // Filtros e busca
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'unread' | 'tasks' | 'clients' | 'tax' | 'certificates'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Drawer animation states
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Contagens dinâmicas por categoria
  const counts = useMemo(() => {
    const unread = notifications.filter(n => !n.read).length;
    const tasks = notifications.filter(n => ['task_assigned', 'task_reassigned', 'task_concluded', 'task_due_soon', 'task_overdue', 'task_alert', 'task_alert_critical'].includes(n.type)).length;
    const clients = notifications.filter(n => ['client_created', 'client_contact_updated', 'client_address_changed'].includes(n.type)).length;
    const tax = notifications.filter(n => ['client_tax_regime_changed', 'client_legislation_added', 'task_alert', 'task_alert_critical'].includes(n.type)).length;
    const certificates = notifications.filter(n => n.type === 'license_expiring').length;
    return { all: notifications.length, unread, tasks, clients, tax, certificates };
  }, [notifications]);

  // Lista filtrada por busca de texto, categoria e tipo específico
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // 1. Busca por nome da notificação / título ou mensagem
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = notif.title ? notif.title.toLowerCase().includes(q) : false;
        const matchMessage = notif.message ? notif.message.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchMessage) return false;
      }

      // 2. Filtro por Tipo específico
      if (typeFilter !== 'all') {
        if (typeFilter === 'task_alert') {
          if (notif.type !== 'task_alert' && notif.type !== 'task_alert_critical') return false;
        } else if (notif.type !== typeFilter) {
          return false;
        }
      }

      // 3. Filtro por Categoria
      if (categoryFilter === 'unread') {
        if (notif.read) return false;
      } else if (categoryFilter === 'tasks') {
        const taskTypes = ['task_assigned', 'task_reassigned', 'task_concluded', 'task_due_soon', 'task_overdue', 'task_alert', 'task_alert_critical'];
        if (!taskTypes.includes(notif.type)) return false;
      } else if (categoryFilter === 'clients') {
        const clientTypes = ['client_created', 'client_contact_updated', 'client_address_changed'];
        if (!clientTypes.includes(notif.type)) return false;
      } else if (categoryFilter === 'tax') {
        const taxTypes = ['client_tax_regime_changed', 'client_legislation_added', 'task_alert', 'task_alert_critical'];
        if (!taxTypes.includes(notif.type)) return false;
      } else if (categoryFilter === 'certificates') {
        if (notif.type !== 'license_expiring') return false;
      }

      return true;
    });
  }, [notifications, searchQuery, typeFilter, categoryFilter]);

  const fetchUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (!error && count !== null && count !== undefined) {
        onUnreadCountChange(count);
      }
    } catch (e) {
      console.error('Error fetching unread count:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Setup realtime subscription
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const newNotif = payload.new as NotificationType;
        setNotifications((prev) => [newNotif, ...prev]);
        
        // Disparo de efeitos sonoros suaves e notificação nativa do navegador
        soundEffects.playNotificationSound();
        sendBrowserNotification(newNotif.title, {
          body: newNotif.message || undefined,
          onClick: () => handleNotificationClick(newNotif)
        });

        fetchUnreadCount();
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
        fetchUnreadCount();
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        setNotifications((prev) => prev.filter(n => n.id !== payload.old.id));
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      fetchNotifications();
      fetchUnreadCount();
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
      fetchUnreadCount();
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
      fetchUnreadCount();
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
      fetchUnreadCount();
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
      fetchUnreadCount();
    } catch (e2) {
      console.error('Error deleting notification:', e2);
      fetchNotifications(); // Rollback/Refresh on error
    }
  };

  const handleNotificationClick = (notification: NotificationType) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    
    // Parse the link if it exists and pass targeted entity ID
    if (notification.link && onNavigate) {
      if (notification.link.includes('/tasks')) {
        const match = notification.link.match(/[?&]id=([^&]+)/);
        const taskId = match ? match[1] : (notification.related_entity_id || undefined);
        onNavigate('tasks', taskId);
      } else if (notification.link.includes('/chat')) {
        onNavigate('chat');
      } else if (notification.link.includes('/clients')) {
        const match = notification.link.match(/[?&]id=([^&]+)/);
        const clientId = match ? match[1] : (notification.related_entity_id || undefined);
        onNavigate('clients', clientId);
      } else if (notification.link.includes('/tutorials')) {
        onNavigate('tutorials');
      }
    }
    onClose();
  };

  const handleEnableDesktopAlerts = async () => {
    const perm = await requestBrowserNotificationPermission();
    setBrowserPermission(perm);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'task_assigned': return <Clock size={16} className="text-blue-500" />;
      case 'task_concluded': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'task_alert': return <AlertCircle size={16} className="text-amber-500" />;
      case 'task_alert_critical': return <AlertCircle size={16} className="text-red-500" />;
      case 'new_tutorial': return <FileText size={16} className="text-indigo-500" />;
      case 'task_due_soon': return <CalendarClock size={16} className="text-orange-500" />;
      case 'task_overdue': return <AlertTriangle size={16} className="text-rose-600" />;
      case 'license_expiring': return <ShieldAlert size={16} className="text-rose-500" />;
      case 'client_created': return <Building2 size={16} className="text-emerald-500" />;
      case 'task_reassigned': return <ArrowRightLeft size={16} className="text-indigo-500" />;
      case 'client_tax_regime_changed': return <Scale size={16} className="text-amber-500" />;
      case 'client_legislation_added': return <BookOpen size={16} className="text-cyan-500" />;
      case 'client_contact_updated': return <Users size={16} className="text-sky-500" />;
      case 'client_address_changed': return <MapPin size={16} className="text-rose-500" />;
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
              <Bell size={18} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex flex-col text-left">
              <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                Notificações
              </h1>
              <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Tooltip content="Marcar todas como lidas" position="bottom">
              <button 
                onClick={handleMarkAllAsRead}
                disabled={notifications.filter(n => !n.read).length === 0}
                className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 hover:bg-indigo-50/80 dark:hover:bg-slate-800 border border-transparent hover:border-indigo-100 dark:hover:border-slate-700/60 px-2.5 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Check size={12} strokeWidth={3} />
                <span>Lidas</span>
              </button>
            </Tooltip>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Banner para Ativação de Notificações no Navegador */}
        {isBrowserNotificationSupported() && browserPermission === 'default' && (
          <div className="mx-4 mt-3 p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/50 rounded-xl flex items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2.5">
              <MonitorCheck size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Alertas na Área de Trabalho</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Receba avisos mesmo com o navegador em 2º plano.</p>
              </div>
            </div>
            <button
              onClick={handleEnableDesktopAlerts}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shrink-0 transition-colors"
            >
              Ativar
            </button>
          </div>
        )}

        {/* Search and Filters Section */}
        <div className="px-4 py-3 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 space-y-2.5">
          {/* Search Input */}
          <div className="relative">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título ou mensagem..."
              className="w-full px-3 pr-8 py-1.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/70 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
                title="Limpar busca"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={() => { setCategoryFilter('all'); setTypeFilter('all'); }}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] ${
                categoryFilter === 'all' && typeFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <Bell size={11} className={categoryFilter === 'all' && typeFilter === 'all' ? 'text-white' : 'text-slate-400'} />
              <span>Todas</span>
              <span className="text-[10px] opacity-75">({counts.all})</span>
            </button>
            <button
              onClick={() => { setCategoryFilter('unread'); setTypeFilter('all'); }}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 text-[11px] ${
                categoryFilter === 'unread'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <Mail size={11} className={categoryFilter === 'unread' ? 'text-white' : 'text-slate-400'} />
              <span>Não lidas</span>
              {counts.unread > 0 && (
                <span className="px-1.5 py-0.2 bg-red-500 text-white text-[9px] font-bold rounded-full">
                  {counts.unread}
                </span>
              )}
            </button>
            <button
              onClick={() => { setCategoryFilter('tasks'); setTypeFilter('all'); }}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] ${
                categoryFilter === 'tasks'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <Clock size={11} className={categoryFilter === 'tasks' ? 'text-white' : 'text-slate-400'} />
              <span>Tarefas</span>
              <span className="text-[10px] opacity-75">({counts.tasks})</span>
            </button>
            <button
              onClick={() => { setCategoryFilter('clients'); setTypeFilter('all'); }}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] ${
                categoryFilter === 'clients'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <Building2 size={11} className={categoryFilter === 'clients' ? 'text-white' : 'text-slate-400'} />
              <span>Clientes</span>
              <span className="text-[10px] opacity-75">({counts.clients})</span>
            </button>
            <button
              onClick={() => { setCategoryFilter('tax'); setTypeFilter('all'); }}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] ${
                categoryFilter === 'tax'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <Scale size={11} className={categoryFilter === 'tax' ? 'text-white' : 'text-slate-400'} />
              <span>Fiscal</span>
              <span className="text-[10px] opacity-75">({counts.tax})</span>
            </button>
            <button
              onClick={() => { setCategoryFilter('certificates'); setTypeFilter('all'); }}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] ${
                categoryFilter === 'certificates'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <ShieldAlert size={11} className={categoryFilter === 'certificates' ? 'text-white' : 'text-slate-400'} />
              <span>Certificados</span>
              <span className="text-[10px] opacity-75">({counts.certificates})</span>
            </button>
          </div>

          {/* Select de Tipo Específico */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
              <Filter size={12} />
              <span>Tipo:</span>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCategoryFilter('all'); }}
              className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/70 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm truncate"
            >
              <option value="all">Todos os tipos</option>
              <option value="task_assigned">Nova Tarefa Atribuída</option>
              <option value="task_reassigned">Tarefa Transferida (Reatribuição)</option>
              <option value="task_concluded">Tarefa Concluída</option>
              <option value="task_due_soon">Tarefa Próxima do Vencimento</option>
              <option value="task_overdue">Tarefa Atrasada</option>
              <option value="client_created">Novo Cliente Cadastrado</option>
              <option value="client_tax_regime_changed">Regime Tributário Alterado</option>
              <option value="client_legislation_added">Nova Legislação Vinculada</option>
              <option value="client_contact_updated">Contato Adicionado / Atualizado</option>
              <option value="client_address_changed">Mudança de Domicílio Fiscal / Endereço</option>
              <option value="license_expiring">Certificado / Licença Expirando</option>
              <option value="task_alert">Alertas Fiscais (Sublimite / Exclusão)</option>
              <option value="new_tutorial">Novos Tutoriais</option>
            </select>
            {(typeFilter !== 'all' || searchQuery || categoryFilter !== 'all') && (
              <button
                onClick={() => { setTypeFilter('all'); setCategoryFilter('all'); setSearchQuery(''); }}
                className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors shrink-0"
                title="Limpar todos os filtros"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400 text-center">
              <Bell className="mb-3 opacity-20 text-slate-400" size={40} />
              <p className="text-sm font-medium">Nenhuma notificação encontrada</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Tudo limpo por aqui.</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400 text-center">
              <Search className="mb-3 opacity-20 text-slate-400" size={40} />
              <p className="text-sm font-medium">Nenhum resultado encontrado</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">Tente ajustar a busca ou os filtros selecionados.</p>
              <button
                onClick={() => { setTypeFilter('all'); setCategoryFilter('all'); setSearchQuery(''); }}
                className="px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg transition-all"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredNotifications.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 rounded-xl flex gap-3.5 border transition-all cursor-pointer ${
                    notif.read 
                      ? 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-850/50 opacity-60 hover:opacity-90 hover:bg-slate-50 dark:hover:bg-slate-800/40' 
                      : 'bg-indigo-50/40 dark:bg-indigo-950/10 border-indigo-100/40 dark:border-indigo-900/30 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/20 shadow-sm'
                  }`}
                >
                  <div className="mt-0.5 shrink-0 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-100/80 dark:border-slate-800 flex items-center justify-center w-9 h-9">
                    {getIcon(notif.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0 text-left">
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
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0"
                          title="Excluir notificação"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line line-clamp-4 mb-2 leading-relaxed">
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
