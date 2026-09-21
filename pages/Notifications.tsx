import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Mail,
  ExternalLink,
  Building2,
  ArrowRightLeft,
  Scale,
  BookOpen,
  Users,
  MapPin,
  ShieldCheck,
  KeyRound,
  GraduationCap,
  Search,
  Filter,
  X,
  User,
  Building
} from 'lucide-react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { DrawerBackButton } from '../components/ui/DrawerBackButton';

const PAGE_SIZE = 30;

interface NotificationsProps {
  userProfile?: any;
  onNavigateToTask?: (taskId: string) => void;
  onNavigateToClient?: (clientId: string) => void;
  onNavigateToTab?: (tabName: string) => void;
  onOpenTutorials?: () => void;
  onBack?: () => void;
}

export const Notifications: React.FC<NotificationsProps> = ({
  userProfile,
  onNavigateToTask,
  onNavigateToClient,
  onNavigateToTab,
  onOpenTutorials,
  onBack
}) => {
  const isGestor = userProfile?.role === 'gestor';
  const orgId = userProfile?.org_id;

  const [userId, setUserId] = useState<string | null>(null);
  const [scope, setScope] = useState<'mine' | 'org'>('mine');

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'unread' | 'tasks' | 'clients' | 'tax' | 'certificates' | 'licenses'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Notificações e paginação
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Contagens por escopo
  const [mineTotalCount, setMineTotalCount] = useState(0);
  const [orgTotalCount, setOrgTotalCount] = useState(0);

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

  // Mapeamento de perfis para quando scope === 'org'
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});

  // Seleção e exclusão em massa
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // Carrega mapeamento de nomes dos membros da organização
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
        console.error('Erro ao carregar perfis na página de notificações:', err);
      }
    };
    loadProfiles();
  }, [orgId]);

  // Busca contagens reais de categorias diretamente no banco
  const fetchCategoryCounts = useCallback(async (currentUid: string, targetScope = scope) => {
    try {
      let query: any = supabase
        .from('notifications')
        .select('type, read, title, message');

      if (targetScope === 'mine') {
        query = query.eq('user_id', currentUid);
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
      console.error('Erro ao buscar contagens de categoria na página:', err);
    }
  }, [scope, orgId]);

  // Atualiza totais de escopo para gestor
  const refreshScopeTotals = useCallback(async (currentUid: string) => {
    if (!isGestor) return;
    try {
      const { count: mineCount } = await (supabase
        .from('notifications') as any)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUid);
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
  }, [isGestor, orgId]);

  // Consulta paginada das notificações
  const fetchNotifications = useCallback(async (
    currentUid: string,
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
        query = query.eq('user_id', currentUid);
      } else if (orgId && orgId !== 'demo-org') {
        query = query.eq('org_id', orgId);
      }

      // Filtro por Categoria
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
        items = items.filter((n: Notification) => isCertType(n.type, n.title, n.message));
      } else if (targetCategory === 'licenses') {
        items = items.filter((n: Notification) => isLicenseType(n.type, n.title, n.message));
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
      console.error('Erro ao buscar notificações na página:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [scope, categoryFilter, typeFilter, searchQuery, orgId]);

  // Inicialização
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchNotifications(user.id, 0, false, scope, categoryFilter, typeFilter, searchQuery);
        fetchCategoryCounts(user.id, scope);
        refreshScopeTotals(user.id);
      } else {
        setLoading(false);
      }
    };
    init();
  }, [userProfile?.org_id]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`public:notifications_page_feed:${userId}${orgId ? `:${orgId}` : ''}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications'
      }, (payload) => {
        const newNotif = payload.new as Notification;
        const belongsToUser = newNotif.user_id === userId;
        const belongsToOrg = orgId && newNotif.org_id === orgId;

        if (scope === 'mine' && !belongsToUser) return;
        if (scope === 'org' && !belongsToOrg) return;

        setNotifications((prev) => [newNotif, ...prev]);
        setTotalCount(c => c + 1);
        fetchCategoryCounts(userId, scope);
        refreshScopeTotals(userId);
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'notifications'
      }, (payload) => {
        const updatedNotif = payload.new as Notification;
        setNotifications((prev) => 
          prev.map(n => n.id === updatedNotif.id ? updatedNotif : n)
        );
        fetchCategoryCounts(userId, scope);
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'notifications'
      }, (payload) => {
        setNotifications((prev) => prev.filter(n => n.id !== payload.old.id));
        setTotalCount(c => Math.max(0, c - 1));
        fetchCategoryCounts(userId, scope);
        refreshScopeTotals(userId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, orgId, scope, fetchCategoryCounts, refreshScopeTotals]);

  // Troca de escopo (Minhas vs Escritório)
  const handleScopeChange = (newScope: 'mine' | 'org') => {
    if (!userId || newScope === scope) return;
    setScope(newScope);
    setPage(0);
    setSelectedIds([]);
    fetchNotifications(userId, 0, false, newScope, categoryFilter, typeFilter, searchQuery);
    fetchCategoryCounts(userId, newScope);
  };

  // Troca de categoria
  const handleCategoryChange = (newCategory: typeof categoryFilter) => {
    if (!userId) return;
    setCategoryFilter(newCategory);
    setTypeFilter('all');
    setPage(0);
    setSelectedIds([]);
    fetchNotifications(userId, 0, false, scope, newCategory, 'all', searchQuery);
  };

  // Troca de tipo específico
  const handleTypeChange = (newType: string) => {
    if (!userId) return;
    setTypeFilter(newType);
    setCategoryFilter('all');
    setPage(0);
    setSelectedIds([]);
    fetchNotifications(userId, 0, false, scope, 'all', newType, searchQuery);
  };

  // Busca
  const handleSearchChange = (query: string) => {
    if (!userId) return;
    setSearchQuery(query);
    setPage(0);
    setSelectedIds([]);
    fetchNotifications(userId, 0, false, scope, categoryFilter, typeFilter, query);
  };

  // Carregar mais
  const handleLoadMore = () => {
    if (!userId || loadingMore || !hasMore) return;
    const nextPage = page + 1;
    fetchNotifications(userId, nextPage, true, scope, categoryFilter, typeFilter, searchQuery);
  };

  const markAllAsRead = async () => {
    if (!userId) return;
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
      fetchCategoryCounts(userId, scope);
    } catch (e) {
      console.error('Erro ao marcar todas como lidas:', e);
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
      if (userId) fetchCategoryCounts(userId, scope);
    } catch (e) {
      console.error('Erro ao marcar como lida:', e);
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
      if (userId) fetchCategoryCounts(userId, scope);
    } catch (e) {
      console.error('Erro ao marcar como não lida:', e);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== id));
      setSelectedIds(prev => prev.filter(i => i !== id));
      setTotalCount(c => Math.max(0, c - 1));
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;
      
      if (userId) {
        fetchCategoryCounts(userId, scope);
        refreshScopeTotals(userId);
      }
    } catch (e) {
      console.error('Erro ao excluir notificação:', e);
      if (userId) fetchNotifications(userId, 0, false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === notifications.length && notifications.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map(n => n.id));
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
      setTotalCount(c => Math.max(0, c - selectedIds.length));
      setSelectedIds([]);
      setIsConfirmOpen(false);

      if (userId) {
        fetchCategoryCounts(userId, scope);
        refreshScopeTotals(userId);
      }
    } catch (e) {
      console.error('Erro ao excluir notificações selecionadas:', e);
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
      case 'new_tutorial': return <GraduationCap size={20} className="text-indigo-500" />;
      case 'task_due_soon': return <CalendarClock size={20} className="text-orange-500" />;
      case 'task_overdue': return <AlertTriangle size={20} className="text-rose-600" />;
      case 'license_expiring': return <ShieldAlert size={20} className="text-orange-500" />;
      case 'license_expired': return <ShieldAlert size={20} className="text-rose-600" />;
      case 'license_renewed': return <ShieldCheck size={20} className="text-emerald-500" />;
      case 'license_updated': return <ShieldCheck size={20} className="text-indigo-500" />;
      case 'certificate_expired': return <KeyRound size={20} className="text-rose-600" />;
      case 'certificate_renewed': return <CheckCircle size={20} className="text-teal-500" />;
      case 'certificate_updated': return <KeyRound size={20} className="text-indigo-500" />;
      case 'client_created': return <Building2 size={20} className="text-emerald-500" />;
      case 'task_reassigned': return <ArrowRightLeft size={20} className="text-indigo-500" />;
      case 'client_tax_regime_changed': return <Scale size={20} className="text-amber-500" />;
      case 'client_legislation_added': return <BookOpen size={20} className="text-cyan-500" />;
      case 'client_contact_updated': return <Users size={20} className="text-sky-500" />;
      case 'client_address_changed': return <MapPin size={20} className="text-rose-500" />;
      default: return <Info size={20} className="text-slate-500" />;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Licenças e Alvarás
    if (isLicenseType(notification.type, notification.title, notification.message)) {
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

        if (onNavigateToClient) {
          onNavigateToClient(targetClientId);
          return;
        }
      }

      if (onNavigateToTab) {
        onNavigateToTab('clients');
      }
      return;
    }

    // Regime tributário e Legislação
    if (['client_tax_regime_changed', 'client_legislation_added'].includes(notification.type)) {
      if (notification.link?.includes('/tasks')) {
        const match = notification.link.match(/[?&]id=([^&]+)/);
        const taskId = match ? match[1] : notification.related_entity_id;
        if (taskId && onNavigateToTask) {
          onNavigateToTask(taskId);
          return;
        } else if (onNavigateToTab) {
          onNavigateToTab('tasks');
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

          if (clientTask?.id && onNavigateToTask) {
            onNavigateToTask(clientTask.id);
            return;
          }
        } catch (e) {
          console.error('Erro ao buscar tarefa do cliente para Dados da Tarefa:', e);
        }
      }

      if (onNavigateToTab) {
        onNavigateToTab('tasks');
      }
      return;
    }

    // Links normais
    if (notification.link) {
      if (notification.link.includes('/tasks')) {
        const match = notification.link.match(/[?&]id=([^&]+)/);
        const taskId = match ? match[1] : (notification.related_entity_id || undefined);
        if (taskId && onNavigateToTask) {
          onNavigateToTask(taskId);
        } else if (onNavigateToTab) {
          onNavigateToTab('tasks');
        }
      } else if (notification.link.includes('/clients')) {
        const match = notification.link.match(/[?&]id=([^&]+)/);
        const clientId = match ? match[1] : (notification.related_entity_id || undefined);
        if (clientId && onNavigateToClient) {
          onNavigateToClient(clientId);
        } else if (onNavigateToTab) {
          onNavigateToTab('clients');
        }
      } else if (notification.link.includes('/chat') && onNavigateToTab) {
        onNavigateToTab('chat');
      } else if (notification.link.includes('/tutorials') && onOpenTutorials) {
        onOpenTutorials();
      }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigateToTab) {
      onNavigateToTab('dashboard');
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <DrawerBackButton onClick={handleBack} />
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

        {/* Scope Selector para Gestor */}
        {isGestor && (
          <div className="flex items-center p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-bold">
            <button
              onClick={() => handleScopeChange('mine')}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                scope === 'mine'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User size={13} />
              <span>Minhas</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${scope === 'mine' ? 'bg-indigo-700/60 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {mineTotalCount}
              </span>
            </button>
            <button
              onClick={() => handleScopeChange('org')}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                scope === 'org'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building size={13} />
              <span>Escritório</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${scope === 'org' ? 'bg-indigo-700/60 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {orgTotalCount > 999 ? `${(orgTotalCount / 1000).toFixed(1)}k` : orgTotalCount}
              </span>
            </button>
          </div>
        )}

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
            disabled={categoryCounts.unread === 0}
            icon={<Check size={16} />}
            className="text-xs font-semibold"
          >
            Marcar todas como lidas
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
        
        {/* Search & Category Filter Section */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
          {/* Search bar */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar notificações por título, mensagem ou detalhes..."
              className="w-full pl-9 pr-9 py-2 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full cursor-pointer"
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                categoryFilter === 'all' && typeFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <Bell size={13} className={categoryFilter === 'all' && typeFilter === 'all' ? 'text-white' : 'text-slate-400'} />
              <span>Todas</span>
              <span className="text-[10px] opacity-80">({categoryCounts.all})</span>
            </button>
            <button
              onClick={() => handleCategoryChange('unread')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                categoryFilter === 'unread'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <Mail size={13} className={categoryFilter === 'unread' ? 'text-white' : 'text-slate-400'} />
              <span>Não lidas</span>
              {categoryCounts.unread > 0 && (
                <span className="px-1.5 py-0.2 bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {categoryCounts.unread}
                </span>
              )}
            </button>
            <button
              onClick={() => handleCategoryChange('tasks')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                categoryFilter === 'tasks'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <Clock size={13} className={categoryFilter === 'tasks' ? 'text-white' : 'text-slate-400'} />
              <span>Tarefas</span>
              <span className="text-[10px] opacity-80">({categoryCounts.tasks})</span>
            </button>
            <button
              onClick={() => handleCategoryChange('clients')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                categoryFilter === 'clients'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <Building2 size={13} className={categoryFilter === 'clients' ? 'text-white' : 'text-slate-400'} />
              <span>Clientes</span>
              <span className="text-[10px] opacity-80">({categoryCounts.clients})</span>
            </button>
            <button
              onClick={() => handleCategoryChange('tax')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                categoryFilter === 'tax'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <Scale size={13} className={categoryFilter === 'tax' ? 'text-white' : 'text-slate-400'} />
              <span>Fiscal</span>
              <span className="text-[10px] opacity-80">({categoryCounts.tax})</span>
            </button>
            <button
              onClick={() => handleCategoryChange('certificates')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                categoryFilter === 'certificates'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <KeyRound size={13} className={categoryFilter === 'certificates' ? 'text-white' : 'text-slate-400'} />
              <span>Certificados</span>
              <span className="text-[10px] opacity-80">({categoryCounts.certificates})</span>
            </button>
            <button
              onClick={() => handleCategoryChange('licenses')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                categoryFilter === 'licenses'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <ShieldCheck size={13} className={categoryFilter === 'licenses' ? 'text-white' : 'text-slate-400'} />
              <span>Licenças</span>
              <span className="text-[10px] opacity-80">({categoryCounts.licenses})</span>
            </button>

            {/* Type selector */}
            <div className="ml-auto flex items-center gap-2">
              <Filter size={13} className="text-slate-400 shrink-0" />
              <select
                value={typeFilter}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm truncate max-w-[200px]"
              >
                <option value="all">Todos os tipos</option>
                <option value="task_assigned">Nova Tarefa Atribuída</option>
                <option value="task_reassigned">Tarefa Transferida</option>
                <option value="task_concluded">Tarefa Concluída</option>
                <option value="task_due_soon">Tarefa Próxima do Vencimento</option>
                <option value="task_overdue">Tarefa Atrasada</option>
                <option value="client_created">Novo Cliente Cadastrado</option>
                <option value="client_tax_regime_changed">Regime Tributário Alterado</option>
                <option value="client_legislation_added">Nova Legislação Vinculada</option>
                <option value="client_contact_updated">Contato Adicionado / Atualizado</option>
                <option value="client_address_changed">Mudança de Endereço</option>
                <option value="certificate_renewed">Certificado Renovado</option>
                <option value="certificate_updated">Certificado Atualizado</option>
                <option value="certificate_expired">Certificado Vencido</option>
                <option value="license_renewed">Licença Renovada</option>
                <option value="license_updated">Licença Atualizada</option>
                <option value="license_expiring">Certificado / Licença Expirando</option>
                <option value="license_expired">Licença Vencida</option>
                <option value="task_alert">Alertas Fiscais</option>
                <option value="new_tutorial">Novos Tutoriais</option>
              </select>

              {(typeFilter !== 'all' || searchQuery || categoryFilter !== 'all') && (
                <button
                  onClick={() => {
                    setTypeFilter('all');
                    setCategoryFilter('all');
                    setSearchQuery('');
                    setPage(0);
                    if (userId) fetchNotifications(userId, 0, false, scope, 'all', 'all', '');
                  }}
                  className="px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
                  title="Limpar filtros"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Selection Bar & Stats */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 py-3 justify-between items-center bg-white dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {loading ? (
              'Carregando notificações...'
            ) : totalCount === 0 ? (
              'Nenhuma notificação'
            ) : (
              `Exibindo ${notifications.length} de ${totalCount} notificações`
            )}
          </span>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox"
              id="select-all"
              checked={selectedIds.length === notifications.length && notifications.length > 0}
              onChange={selectAll}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="select-all" className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              Selecionar tudo ({notifications.length})
            </label>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800 min-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center h-[400px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 dark:text-slate-500">
              <Bell size={48} strokeWidth={1.5} className="mb-4 opacity-40" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">Nenhuma notificação encontrada.</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery || categoryFilter !== 'all' || typeFilter !== 'all'
                  ? 'Tente remover os filtros ou o termo de busca.'
                  : scope === 'org'
                  ? 'Nenhuma notificação registrada no escritório.'
                  : 'Tudo limpo por aqui.'}
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-5 flex gap-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                  !notification.read ? 'bg-indigo-50/40 dark:bg-indigo-500/5' : ''
                } ${selectedIds.includes(notification.id) ? 'bg-indigo-50/70 dark:bg-indigo-500/10' : ''}`}
                onClick={() => toggleSelect(notification.id)}
              >
                <div className="mt-1 shrink-0 flex items-start gap-3.5">
                  <div onClick={(e) => e.stopPropagation()} className="flex items-center h-10">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(notification.id)}
                      onChange={() => toggleSelect(notification.id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    !notification.read ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700/60' : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    {getIcon(notification.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1 gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-sm font-bold truncate ${!notification.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                      )}
                      {scope === 'org' && notification.user_id !== userId && profilesMap[notification.user_id] && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200/60 dark:border-slate-700/50">
                          Para: {profilesMap[notification.user_id]}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap shrink-0">{formatTime(notification.created_at)}</span>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line line-clamp-6 leading-relaxed mb-2">
                    {notification.message}
                  </p>

                  {notification.link && !isLicenseType(notification.type, notification.title, notification.message) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNotificationClick(notification);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline mt-1 cursor-pointer"
                    >
                      <span>Acessar item relacionado</span>
                      <ExternalLink size={12} />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0 ml-4 border-l pl-4 border-slate-100 dark:border-slate-800 justify-center">
                  {notification.link && !isLicenseType(notification.type, notification.title, notification.message) && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleNotificationClick(notification); }}
                      className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer" 
                      title="Acessar item relacionado"
                    >
                      <ExternalLink size={18} />
                    </button>
                  )}
                  {!notification.read ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                      className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer" 
                      title="Marcar como lida"
                    >
                      <MailOpen size={18} />
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => { e.stopPropagation(); markAsUnread(notification.id); }}
                      className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer" 
                      title="Marcar como não lida"
                    >
                      <Mail size={18} />
                    </button>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer" 
                    title="Excluir notificação"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Pagination / Load More */}
        {hasMore && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="py-2.5 px-6 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-white dark:bg-slate-800 hover:bg-indigo-50/80 dark:hover:bg-indigo-500/10 border border-slate-200 dark:border-slate-700 rounded-xl transition-all inline-flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
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