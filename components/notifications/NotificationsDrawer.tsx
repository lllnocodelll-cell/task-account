import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  Filter,
  ShieldCheck,
  KeyRound,
  GraduationCap,
  ChevronDown,
  User,
  Building
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { DrawerBackButton } from '../ui/DrawerBackButton';
import { soundEffects } from '../../utils/soundEffects';
import { 
  sendBrowserNotification, 
  requestBrowserNotificationPermission, 
  isBrowserNotificationSupported 
} from '../../utils/browserNotification';

const PAGE_SIZE = 30;

interface NotificationsDrawerProps {
  userId: string;
  orgId?: string | null;
  userRole?: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tabName: string, id?: string) => void;
  onUnreadCountChange: (count: number) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  userId,
  orgId,
  userRole,
  isOpen,
  onClose,
  onNavigate,
  onUnreadCountChange
}) => {
  const isGestor = userRole === 'gestor';
  const [scope, setScope] = useState<'mine' | 'org'>('mine');

  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Contagens por escopo
  const [mineTotalCount, setMineTotalCount] = useState(0);
  const [orgTotalCount, setOrgTotalCount] = useState(0);

  // Mapa de nomes de destinatários para quando scope === 'org'
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});

  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied';
  });

  // Filtros e busca
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'unread' | 'tasks' | 'clients' | 'tax' | 'certificates' | 'licenses'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Contagens reais por categoria
  const [categoryCounts, setCategoryCounts] = useState({
    all: 0,
    unread: 0,
    tasks: 0,
    clients: 0,
    tax: 0,
    certificates: 0,
    licenses: 0
  });

  // Drawer animation states
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Helpers para distinguir Certificados e Licenças
  const isCertType = (type: string, title?: string, message?: string) => {
    if (['certificate_expired', 'certificate_renewed', 'certificate_updated'].includes(type)) return true;
    if (type === 'license_expiring') {
      const text = `${title || ''} ${message || ''}`.toLowerCase();
      return text.includes('certificado');
    }
    return false;
  };

  const isLicenseType = (type: string, title?: string, message?: string) => {
    if (['license_expired', 'license_renewed', 'license_updated'].includes(type)) return true;
    if (type === 'license_expiring') {
      const text = `${title || ''} ${message || ''}`.toLowerCase();
      return !text.includes('certificado');
    }
    return false;
  };

  // Carrega mapeamento de nomes dos membros do escritório
  useEffect(() => {
    if (!orgId || orgId === 'demo-org') return;
    const loadProfiles = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('org_id', orgId);
        if (data) {
          const map: Record<string, string> = {};
          data.forEach(p => {
            if (p.id && p.full_name) map[p.id] = p.full_name;
          });
          setProfilesMap(map);
        }
      } catch (err) {
        console.error('Erro ao carregar perfis para o drawer:', err);
      }
    };
    loadProfiles();
  }, [orgId]);

  // Busca contagens reais de categorias diretamente do banco
  const fetchCategoryCounts = useCallback(async (targetScope = scope) => {
    try {
      let query: any = supabase
        .from('notifications')
        .select('type, read, title, message');

      if (targetScope === 'mine') {
        query = query.eq('user_id', userId);
      } else if (orgId && orgId !== 'demo-org') {
        query = query.eq('org_id', orgId);
      }

      const { data, error } = await query;
      if (error || !data) return;

      const unread = data.filter(n => !n.read).length;
      const tasks = data.filter(n => ['task_assigned', 'task_reassigned', 'task_concluded', 'task_due_soon', 'task_overdue', 'task_alert', 'task_alert_critical'].includes(n.type)).length;
      const clients = data.filter(n => ['client_created', 'client_contact_updated', 'client_address_changed'].includes(n.type)).length;
      const tax = data.filter(n => ['client_tax_regime_changed', 'client_legislation_added', 'task_alert', 'task_alert_critical'].includes(n.type)).length;
      const certificates = data.filter(n => isCertType(n.type, n.title, n.message)).length;
      const licenses = data.filter(n => isLicenseType(n.type, n.title, n.message)).length;

      setCategoryCounts({
        all: data.length,
        unread,
        tasks,
        clients,
        tax,
        certificates,
        licenses
      });

      if (targetScope === 'mine') {
        setMineTotalCount(data.length);
      } else {
        setOrgTotalCount(data.length);
      }
    } catch (err) {
      console.error('Erro ao buscar contagens de categoria:', err);
    }
  }, [scope, userId, orgId]);

  // Atualiza também contagens dos dois escopos se gestor
  const refreshScopeTotals = useCallback(async () => {
    if (!isGestor) return;
    try {
      const { count: mineCount } = await (supabase
        .from('notifications') as any)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (mineCount !== null && mineCount !== undefined) setMineTotalCount(mineCount);

      if (orgId && orgId !== 'demo-org') {
        const { count: orgCount } = await (supabase
          .from('notifications') as any)
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId);
        if (orgCount !== null && orgCount !== undefined) setOrgTotalCount(orgCount);
      }
    } catch (e) {
      console.error('Erro ao atualizar totais de escopo:', e);
    }
  }, [isGestor, userId, orgId]);

  // Consulta paginada das notificações
  const fetchNotifications = useCallback(async (
    pageIndex = 0,
    isLoadMore = false,
    targetScope = scope,
    targetCategory = categoryFilter,
    targetType = typeFilter,
    targetSearch = searchQuery
  ) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      let query: any = supabase
        .from('notifications')
        .select('*', { count: 'exact' });

      if (targetScope === 'mine') {
        query = query.eq('user_id', userId);
      } else if (orgId && orgId !== 'demo-org') {
        query = query.eq('org_id', orgId);
      }

      // Filtro por Categoria no banco
      if (targetCategory === 'unread') {
        query = query.eq('read', false);
      } else if (targetCategory === 'tasks') {
        query = query.in('type', ['task_assigned', 'task_reassigned', 'task_concluded', 'task_due_soon', 'task_overdue', 'task_alert', 'task_alert_critical']);
      } else if (targetCategory === 'clients') {
        query = query.in('type', ['client_created', 'client_contact_updated', 'client_address_changed']);
      } else if (targetCategory === 'tax') {
        query = query.in('type', ['client_tax_regime_changed', 'client_legislation_added', 'task_alert', 'task_alert_critical']);
      } else if (targetCategory === 'certificates') {
        query = query.in('type', ['certificate_expired', 'certificate_renewed', 'certificate_updated', 'license_expiring']);
      } else if (targetCategory === 'licenses') {
        query = query.in('type', ['license_expired', 'license_renewed', 'license_updated', 'license_expiring']);
      }

      // Filtro por Tipo específico
      if (targetType !== 'all') {
        if (targetType === 'task_alert') {
          query = query.in('type', ['task_alert', 'task_alert_critical']);
        } else {
          query = query.eq('type', targetType);
        }
      }

      // Busca por texto
      if (targetSearch.trim()) {
        const q = targetSearch.trim();
        query = query.or(`title.ilike.%${q}%,message.ilike.%${q}%`);
      }

      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      let items = data || [];

      // Refinamento de certificados / licenças para license_expiring
      if (targetCategory === 'certificates') {
        items = items.filter((n: NotificationType) => isCertType(n.type, n.title, n.message));
      } else if (targetCategory === 'licenses') {
        items = items.filter((n: NotificationType) => isLicenseType(n.type, n.title, n.message));
      }

      if (isLoadMore) {
        setNotifications(prev => [...prev, ...items]);
      } else {
        setNotifications(items);
      }

      setPage(pageIndex);
      const total = count ?? 0;
      setTotalCount(total);
      setHasMore(to + 1 < total);

    } catch (e) {
      console.error('Erro ao buscar notificações no drawer:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [scope, categoryFilter, typeFilter, searchQuery, userId, orgId]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      let query: any = supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (orgId && orgId !== 'demo-org') {
        query = query.eq('org_id', orgId);
      }

      const { count, error } = await query;

      if (!error && count !== null && count !== undefined) {
        onUnreadCountChange(count);
      }
    } catch (e) {
      console.error('Erro ao buscar total não lidas:', e);
    }
  }, [userId, orgId, onUnreadCountChange]);

  // Atualização ao abrir o drawer
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      fetchNotifications(0, false, scope, categoryFilter, typeFilter, searchQuery);
      fetchCategoryCounts(scope);
      fetchUnreadCount();
      refreshScopeTotals();
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleTransitionEnd = () => {
    if (!isVisible) setShouldRender(false);
  };

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    fetchUnreadCount();
    refreshScopeTotals();

    const channel = supabase
      .channel(`public:notifications_drawer:${userId}${orgId ? `:${orgId}` : ''}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications'
      }, (payload) => {
        const newNotif = payload.new as NotificationType;
        
        // Verifica se a notificação pertence ao escopo
        const belongsToUser = newNotif.user_id === userId;
        const belongsToOrg = orgId && newNotif.org_id === orgId;

        if (scope === 'mine' && !belongsToUser) return;
        if (scope === 'org' && !belongsToOrg) return;

        setNotifications((prev) => [newNotif, ...prev]);
        setTotalCount(c => c + 1);
        
        if (belongsToUser) {
          soundEffects.playNotificationSound();
          sendBrowserNotification(newNotif.title, {
            body: newNotif.message || undefined,
            onClick: () => handleNotificationClick(newNotif)
          });
        }

        fetchUnreadCount();
        fetchCategoryCounts(scope);
        refreshScopeTotals();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'notifications'
      }, (payload) => {
        const updatedNotif = payload.new as NotificationType;
        setNotifications((prev) => 
          prev.map(n => n.id === updatedNotif.id ? updatedNotif : n)
        );
        fetchUnreadCount();
        fetchCategoryCounts(scope);
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'notifications'
      }, (payload) => {
        setNotifications((prev) => prev.filter(n => n.id !== payload.old.id));
        setTotalCount(c => Math.max(0, c - 1));
        fetchUnreadCount();
        fetchCategoryCounts(scope);
        refreshScopeTotals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, orgId, scope, fetchUnreadCount, fetchCategoryCounts, refreshScopeTotals]);

  // Troca de escopo
  const handleScopeChange = (newScope: 'mine' | 'org') => {
    if (newScope === scope) return;
    setScope(newScope);
    setPage(0);
    fetchNotifications(0, false, newScope, categoryFilter, typeFilter, searchQuery);
    fetchCategoryCounts(newScope);
  };

  // Troca de categoria
  const handleCategoryChange = (newCategory: typeof categoryFilter) => {
    setCategoryFilter(newCategory);
    setTypeFilter('all');
    setPage(0);
    fetchNotifications(0, false, scope, newCategory, 'all', searchQuery);
  };

  // Troca de tipo
  const handleTypeChange = (newType: string) => {
    setTypeFilter(newType);
    setCategoryFilter('all');
    setPage(0);
    fetchNotifications(0, false, scope, 'all', newType, searchQuery);
  };

  // Busca
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(0);
    fetchNotifications(0, false, scope, categoryFilter, typeFilter, query);
  };

  // Carregar mais notificações
  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    fetchNotifications(nextPage, true, scope, categoryFilter, typeFilter, searchQuery);
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
      fetchCategoryCounts(scope);
    } catch (e) {
      console.error('Erro ao marcar como lida:', e);
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
      fetchCategoryCounts(scope);
    } catch (e2) {
      console.error('Erro ao marcar como não lida:', e2);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      let query: any = supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

      if (scope === 'mine') {
        query = query.eq('user_id', userId);
      } else if (orgId && orgId !== 'demo-org') {
        query = query.eq('org_id', orgId);
      }

      const { error } = await query;
      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      fetchUnreadCount();
      fetchCategoryCounts(scope);
    } catch (e) {
      console.error('Erro ao marcar todas como lidas:', e);
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setNotifications(prev => prev.filter(n => n.id !== id));
      setTotalCount(c => Math.max(0, c - 1));
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchUnreadCount();
      fetchCategoryCounts(scope);
      refreshScopeTotals();
    } catch (e2) {
      console.error('Erro ao excluir notificação:', e2);
      fetchNotifications(0, false);
    }
  };

  const handleNotificationClick = async (notification: NotificationType) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    
    // Licenças e Alvarás
    if (isLicenseType(notification.type, notification.title, notification.message) && onNavigate) {
      const match = notification.link?.match(/[?&]id=([^&]+)/);
      let targetClientId = match ? match[1] : notification.related_entity_id;

      if (targetClientId) {
        try {
          const { data: licRow } = await supabase
            .from('client_licenses')
            .select('client_id')
            .eq('id', targetClientId)
            .maybeSingle();

          if (licRow?.client_id) {
            targetClientId = licRow.client_id;
          }
        } catch (e) {
          console.error('Erro ao resolver cliente para notificação de licença:', e);
        }

        onNavigate('clients', targetClientId);
        onClose();
        return;
      }

      onNavigate('clients');
      onClose();
      return;
    }

    // Regime tributário e Legislação
    if (['client_tax_regime_changed', 'client_legislation_added'].includes(notification.type) && onNavigate) {
      if (notification.link?.includes('/tasks')) {
        const match = notification.link.match(/[?&]id=([^&]+)/);
        const taskId = match ? match[1] : notification.related_entity_id;
        if (taskId) {
          onNavigate('tasks', taskId);
          onClose();
          return;
        }
      }

      const matchClient = notification.link?.match(/[?&]id=([^&]+)/);
      const targetClientId = notification.related_entity_id || matchClient?.[1];

      if (targetClientId) {
        try {
          const { data: clientTask } = await supabase
            .from('tasks')
            .select('id')
            .eq('client_id', targetClientId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (clientTask?.id) {
            onNavigate('tasks', clientTask.id);
            onClose();
            return;
          }
        } catch (e) {
          console.error('Erro ao buscar tarefa do cliente para Dados da Tarefa:', e);
        }
      }

      onNavigate('tasks');
      onClose();
      return;
    }

    // Links gerais
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
      case 'new_tutorial': return <GraduationCap size={16} className="text-indigo-500" />;
      case 'task_due_soon': return <CalendarClock size={16} className="text-orange-500" />;
      case 'task_overdue': return <AlertTriangle size={16} className="text-rose-600" />;
      case 'license_expiring': return <ShieldAlert size={16} className="text-orange-500" />;
      case 'license_expired': return <ShieldAlert size={16} className="text-rose-600" />;
      case 'license_renewed': return <ShieldCheck size={16} className="text-emerald-500" />;
      case 'license_updated': return <ShieldCheck size={16} className="text-indigo-500" />;
      case 'certificate_expired': return <KeyRound size={16} className="text-rose-600" />;
      case 'certificate_renewed': return <CheckCircle size={16} className="text-teal-500" />;
      case 'certificate_updated': return <KeyRound size={16} className="text-indigo-500" />;
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
        className={`fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl z-[9999] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25, 0.1, 0.25, 1)] border-l border-white/20 dark:border-slate-800/50 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 shrink-0">
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
                disabled={categoryCounts.unread === 0}
                className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 hover:bg-indigo-50/80 dark:hover:bg-slate-800 border border-transparent hover:border-indigo-100 dark:hover:border-slate-700/60 px-2.5 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <Check size={12} strokeWidth={3} />
                <span>Lidas</span>
              </button>
            </Tooltip>
            <DrawerBackButton onClick={onClose} />
          </div>
        </div>

        {/* Scope Selector para Gestor: Minhas Notificações vs Escritório */}
        {isGestor && (
          <div className="px-4 pt-3 shrink-0">
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold shadow-2xs">
              <button
                onClick={() => handleScopeChange('mine')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  scope === 'mine'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User size={13} />
                <span>Minhas</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  {mineTotalCount}
                </span>
              </button>
              <button
                onClick={() => handleScopeChange('org')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  scope === 'org'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Building size={13} />
                <span>Escritório</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  {orgTotalCount > 999 ? `${(orgTotalCount / 1000).toFixed(1)}k` : orgTotalCount}
                </span>
              </button>
            </div>
          </div>
        )}

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
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
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
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar por título ou mensagem..."
              className="w-full px-3 pr-8 py-1.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/70 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full cursor-pointer"
                title="Limpar busca"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Category Filter Chips com contagens reais */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] cursor-pointer ${
                categoryFilter === 'all' && typeFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <Bell size={11} className={categoryFilter === 'all' && typeFilter === 'all' ? 'text-white' : 'text-slate-400'} />
              <span>Todas</span>
              <span className="text-[10px] opacity-75">({categoryCounts.all})</span>
            </button>
            <button
              onClick={() => handleCategoryChange('unread')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 text-[11px] cursor-pointer ${
                categoryFilter === 'unread'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <Mail size={11} className={categoryFilter === 'unread' ? 'text-white' : 'text-slate-400'} />
              <span>Não lidas</span>
              {categoryCounts.unread > 0 && (
                <span className="px-1.5 py-0.2 bg-red-500 text-white text-[9px] font-bold rounded-full">
                  {categoryCounts.unread}
                </span>
              )}
            </button>
            <button
              onClick={() => handleCategoryChange('tasks')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] cursor-pointer ${
                categoryFilter === 'tasks'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <Clock size={11} className={categoryFilter === 'tasks' ? 'text-white' : 'text-slate-400'} />
              <span>Tarefas</span>
              <span className="text-[10px] opacity-75">({categoryCounts.tasks})</span>
            </button>
            <button
              onClick={() => handleCategoryChange('clients')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] cursor-pointer ${
                categoryFilter === 'clients'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <Building2 size={11} className={categoryFilter === 'clients' ? 'text-white' : 'text-slate-400'} />
              <span>Clientes</span>
              <span className="text-[10px] opacity-75">({categoryCounts.clients})</span>
            </button>
            <button
              onClick={() => handleCategoryChange('tax')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] cursor-pointer ${
                categoryFilter === 'tax'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <Scale size={11} className={categoryFilter === 'tax' ? 'text-white' : 'text-slate-400'} />
              <span>Fiscal</span>
              <span className="text-[10px] opacity-75">({categoryCounts.tax})</span>
            </button>
            <button
              onClick={() => handleCategoryChange('certificates')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] cursor-pointer ${
                categoryFilter === 'certificates'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <KeyRound size={11} className={categoryFilter === 'certificates' ? 'text-white' : 'text-slate-400'} />
              <span>Certificados</span>
              <span className="text-[10px] opacity-75">({categoryCounts.certificates})</span>
            </button>
            <button
              onClick={() => handleCategoryChange('licenses')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] cursor-pointer ${
                categoryFilter === 'licenses'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <ShieldCheck size={11} className={categoryFilter === 'licenses' ? 'text-white' : 'text-slate-400'} />
              <span>Licenças</span>
              <span className="text-[10px] opacity-75">({categoryCounts.licenses})</span>
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
              onChange={(e) => handleTypeChange(e.target.value)}
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
              <option value="certificate_renewed">Certificado Digital Renovado</option>
              <option value="certificate_updated">Certificado Digital Atualizado</option>
              <option value="certificate_expired">Certificado Digital Vencido</option>
              <option value="license_renewed">Licença / Alvará Renovado</option>
              <option value="license_updated">Licença / Alvará Atualizado</option>
              <option value="license_expiring">Certificado / Licença Expirando</option>
              <option value="license_expired">Licença / Alvará Vencido</option>
              <option value="task_alert">Alertas Fiscais (Sublimite / Exclusão)</option>
              <option value="new_tutorial">Novos Tutoriais</option>
            </select>
            {(typeFilter !== 'all' || searchQuery || categoryFilter !== 'all') && (
              <button
                onClick={() => {
                  setTypeFilter('all');
                  setCategoryFilter('all');
                  setSearchQuery('');
                  setPage(0);
                  fetchNotifications(0, false, scope, 'all', 'all', '');
                }}
                className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
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
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {scope === 'org' ? 'Nenhuma notificação registrada no escritório.' : 'Tudo limpo por aqui.'}
              </p>
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
                            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0 cursor-pointer"
                            title="Marcar como não lida"
                          >
                            <Mail size={12} />
                          </button>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-500 shrink-0 mt-1 mr-1" />
                        )}
                        <button
                          onClick={(e) => handleDeleteNotification(notif.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0 cursor-pointer"
                          title="Excluir notificação"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line line-clamp-4 mb-2 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        {formatTime(notif.created_at)}
                      </p>
                      {scope === 'org' && notif.user_id !== userId && profilesMap[notif.user_id] && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200/60 dark:border-slate-700/50">
                          Para: {profilesMap[notif.user_id]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Botão Carregar Mais Notificações */}
              {hasMore && (
                <div className="pt-2 pb-1 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-2.5 px-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50/80 hover:bg-indigo-100/80 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border border-indigo-200/70 dark:border-indigo-500/30 rounded-xl transition-all flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50 cursor-pointer"
                  >
                    {loadingMore ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        <span>Carregando notificações...</span>
                      </>
                    ) : (
                      <>
                        <span>Carregar mais notificações</span>
                        <span className="text-[10px] font-normal opacity-75">
                          ({notifications.length} de {totalCount})
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <button 
            onClick={() => { onClose(); if (onNavigate) onNavigate('notifications'); }}
            className="w-full py-2.5 text-xs text-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold rounded-lg border border-slate-200/60 dark:border-slate-800/60 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
          >
            Ver histórico completo
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};
