import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Card, MetricCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  FileText,
  Download,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Upload,
  Calendar,
  Eye,
  Loader2,
  Send,
  Trash2,
  Calculator,
  Users,
  Briefcase,
  File,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TriangleAlert,
  TrendingUp,
  Zap,
  BadgeCheck,
  X,
  DollarSign,
  BanknoteArrowDown,
  Filter,
  SlidersHorizontal,
  LayoutList,
  LayoutGrid,
  Building2,
  Check
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { Modal } from '../components/ui/Modal';
import { Tooltip } from '../components/ui/Tooltip';
import { useToast } from '../contexts/ToastContext';

interface ClientPortalProps {
  userProfile: any;
  onNavigateToChat?: () => void;
  onPendingDocsCountChange?: (count: number) => void;
  chatUnreadCount?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const COMPETENCE_MONTHS = () => {
  const months = [];
  const date = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
    const value = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    months.push({ label, value });
  }
  return months;
};

const getSectorStyle = (sectorName: string | undefined | null) => {
  const name = (sectorName || 'geral').toLowerCase();
  if (name.includes('fiscal') || name.includes('tributário') || name.includes('tributario')) {
    return { bar: 'bg-purple-500', nameBg: 'bg-purple-50 dark:bg-purple-950/30', badge: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800', icon: <FileText size={11} /> };
  }
  if (name.includes('contábil') || name.includes('contabil')) {
    return { bar: 'bg-blue-500', nameBg: 'bg-blue-50 dark:bg-blue-950/30', badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800', icon: <Calculator size={11} /> };
  }
  if (name.includes('dp') || name.includes('pessoal') || name.includes('rh')) {
    return { bar: 'bg-orange-500', nameBg: 'bg-orange-50 dark:bg-orange-950/30', badge: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800', icon: <Users size={11} /> };
  }
  if (name.includes('societário') || name.includes('societario') || name.includes('legalização') || name.includes('legalizacao')) {
    return { bar: 'bg-emerald-500', nameBg: 'bg-emerald-50 dark:bg-emerald-950/30', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800', icon: <Briefcase size={11} /> };
  }
  return { bar: 'bg-slate-400', nameBg: 'bg-slate-50 dark:bg-slate-900/50', badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', icon: <File size={11} /> };
};

const getDueDateStatus = (dueDateStr: string | null | undefined): { label: string; className: string; daysLeft: number } | null => {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr + 'T23:59:59');
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const [year, month, day] = dueDateStr.split('-');
  const formattedDate = `${day}/${month}/${year}`;

  if (daysLeft < 0) return { label: `Vencido em ${formattedDate}`, className: 'text-red-600 dark:text-red-400', daysLeft };
  if (daysLeft === 0) return { label: `Vence hoje (${formattedDate})`, className: 'text-red-600 dark:text-red-400', daysLeft };
  if (daysLeft <= 3) return { label: `Vence em ${formattedDate}`, className: 'text-red-600 dark:text-red-400', daysLeft };
  if (daysLeft <= 7) return { label: `Vence em ${formattedDate}`, className: 'text-amber-600 dark:text-amber-400', daysLeft };
  return { label: `Vence em ${formattedDate}`, className: 'text-slate-500 dark:text-slate-400', daysLeft };
};

const parseCompetenceToDate = (competence: string): Date => {
  const [month, year] = competence.split('/');
  return new Date(parseInt(year), parseInt(month) - 1, 1);
};

const formatCompetenceLabel = (competence: string): string => {
  const [month, year] = competence.split('/');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(' de ', ' ').toUpperCase();
};

// ─── Componente Principal ────────────────────────────────────────────────────

export const ClientPortal: React.FC<ClientPortalProps> = ({ 
  userProfile, 
  onNavigateToChat,
  onPendingDocsCountChange,
  chatUnreadCount = 0
}) => {
  const { addToast } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'read'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompetence, setSelectedCompetence] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companies, setCompanies] = useState<{ id: string; name: string; trade_name?: string; company_name?: string; document?: string }[]>([]);

  // Estados para o seletor dropdown flutuante de empresas
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const companyDropdownRef = useRef<HTMLDivElement>(null);

  // Estados para o seletor dropdown flutuante de setores
  const [isSectorDropdownOpen, setIsSectorDropdownOpen] = useState(false);
  const sectorDropdownRef = useRef<HTMLDivElement>(null);

  // Modo de visualização: Lista ou Cards (com persistência no localStorage, padrão: 'card')
  const [viewMode, setViewMode] = useState<'list' | 'card'>(() => {
    return (localStorage.getItem('taskaccount_portal_view_mode') as 'list' | 'card') || 'card';
  });

  const handleViewModeChange = (mode: 'list' | 'card') => {
    setViewMode(mode);
    localStorage.setItem('taskaccount_portal_view_mode', mode);
  };

  // Estado para a Gaveta Lateral de Filtros (Filter Drawer)
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Efeito para fechar a gaveta ao pressionar a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFilterDrawerOpen) {
        setIsFilterDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFilterDrawerOpen]);

  // Bloquear scroll do body quando a gaveta de filtros estiver aberta
  useEffect(() => {
    if (isFilterDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFilterDrawerOpen]);

  // Estados para o filtro de vencimento com calendário interativo e dots
  const [selectedDueDate, setSelectedDueDate] = useState<string>('');
  const [isDueDatePickerOpen, setIsDueDatePickerOpen] = useState(false);
  const [dueDatePickerMonth, setDueDatePickerMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });
  const dueDatePickerRef = useRef<HTMLDivElement>(null);

  // Estados para o filtro de calendário por período
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => {
    if (selectedCompetence) {
      const [, year] = selectedCompetence.split('/');
      return parseInt(year);
    }
    return new Date().getFullYear();
  });
  const calendarRef = useRef<HTMLDivElement>(null);

  // Efeito para fechar os popovers ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
      if (dueDatePickerRef.current && !dueDatePickerRef.current.contains(event.target as Node)) {
        setIsDueDatePickerOpen(false);
      }
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
      if (sectorDropdownRef.current && !sectorDropdownRef.current.contains(event.target as Node)) {
        setIsSectorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Efeito para manter o ano do calendário sincronizado quando a competência selecionada mudar
  useEffect(() => {
    if (selectedCompetence) {
      const [, year] = selectedCompetence.split('/');
      setCalendarYear(parseInt(year));
    } else {
      setCalendarYear(new Date().getFullYear());
    }
  }, [selectedCompetence]);

  const getShortCompetenceLabel = (competence: string) => {
    if (!competence) return '';
    const [month, year] = competence.split('/');
    const monthNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const monthIdx = parseInt(month) - 1;
    const shortYear = year.slice(-2);
    return `${monthNames[monthIdx]}/${shortYear}`;
  };


  // Modal Protocolos
  const [protocolModalOpen, setProtocolModalOpen] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [protocolDocName, setProtocolDocName] = useState('');

  // Collapsible groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});



  const allMonths = COMPETENCE_MONTHS();

  // Índice do mês selecionado no array de meses
  const periodIndex = selectedCompetence
    ? allMonths.findIndex(m => m.value === selectedCompetence)
    : -1;

  const userClientIds = useMemo(() => {
    if (Array.isArray(userProfile?.client_ids) && userProfile.client_ids.length > 0) {
      return userProfile.client_ids.filter(Boolean);
    }
    if (userProfile?.client_id) {
      return [userProfile.client_id];
    }
    return [];
  }, [userProfile?.client_ids, userProfile?.client_id]);

  useEffect(() => {
    fetchDocuments();
    fetchCompanies();
  }, [userClientIds]);

  const fetchCompanies = async () => {
    if (userClientIds.length === 0) return;
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name, trade_name, document')
        .in('id', userClientIds)
        .order('company_name');

      if (!error && data) {
        setCompanies(data.map((c: any) => ({
          id: c.id,
          name: c.trade_name || c.company_name,
          trade_name: c.trade_name,
          company_name: c.company_name,
          document: c.document
        })));
      }
    } catch (err) {
      console.error('Error fetching linked companies:', err);
    }
  };

  const fetchDocuments = async () => {
    if (userClientIds.length === 0) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('client_documents')
        .select(`*, sectors(name), clients(id, company_name, trade_name, document)`)
        .in('client_id', userClientIds)
        .neq('status', 'Excluído')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      addToast('error', 'Erro', 'Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  // Notificar contagem de documentos pendentes para o Header e Sidebar
  useEffect(() => {
    const pendingCount = documents.filter(d => d.status === 'Pendente').length;
    onPendingDocsCountChange?.(pendingCount);
  }, [documents, onPendingDocsCountChange]);



  const handleDownload = async (doc: any) => {
    try {
      try {
        await (supabase as any).from('client_document_logs').insert({
          document_id: doc.id,
          user_id: userProfile.id,
          user_agent: navigator.userAgent
        });
      } catch (logError) {
        console.warn('Erro ao gravar log:', logError);
      }

      if (doc.storage_path) {
        const { data, error } = await supabase.storage
          .from('client-documents')
          .createSignedUrl(doc.storage_path, 60);

        if (error) throw new Error('Arquivo indisponível no servidor: ' + error.message);
        window.open(data?.signedUrl, '_blank');
      } else {
        throw new Error('Este registro não possui arquivo mapeado.');
      }

      if (doc.status === 'Pendente' || doc.status === 'Enviado') {
        setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'Lido' } : d));
        await (supabase as any).from('client_documents').update({ status: 'Lido' }).eq('id', doc.id);
        fetchDocuments();
      }

      addToast('success', 'Documento Aberto', 'Acesso registrado com sucesso.');
    } catch (error: any) {
      addToast('error', 'Arquivo Indisponível', error.message || 'Erro ao carregar o arquivo.');
    }
  };

  const handlePaymentToggle = async (doc: any) => {
    try {
      const newStatus = !doc.is_paid;
      const { error } = await (supabase as any)
        .from('client_documents')
        .update({ is_paid: newStatus })
        .eq('id', doc.id);

      if (error) throw error;
      addToast('success', 'Atualizado', `Documento marcado como ${newStatus ? 'Pago' : 'Pendente de Pagamento'}`);
      fetchDocuments();
    } catch (error) {
      addToast('error', 'Erro', 'Erro ao atualizar pagamento');
    }
  };

  const handleViewProtocol = async (doc: any) => {
    setProtocolDocName(doc.name);
    setProtocolModalOpen(true);
    setLogsLoading(true);
    setSelectedLogs([]);
    try {
      const { data, error } = await (supabase as any)
        .from('client_document_logs')
        .select(`*, profiles:user_id(full_name)`)
        .eq('document_id', doc.id)
        .order('read_at', { ascending: false });

      if (error) throw error;
      setSelectedLogs(data || []);
    } catch {
      const { data } = await (supabase as any)
        .from('client_document_logs')
        .select('*')
        .eq('document_id', doc.id)
        .order('read_at', { ascending: false });
      setSelectedLogs(data || []);
    } finally {
      setLogsLoading(false);
    }
  };



  // ─── Dados derivados ─────────────────────────────────────────────────────

  // Lista unificada de empresas vinculadas
  const availableCompanies = useMemo(() => {
    if (companies.length > 0) return companies;
    const map = new Map<string, { id: string; name: string; document?: string; company_name?: string; trade_name?: string }>();
    documents.forEach(doc => {
      if (doc.client_id && doc.clients) {
        map.set(doc.client_id, {
          id: doc.client_id,
          name: doc.clients.trade_name || doc.clients.company_name,
          trade_name: doc.clients.trade_name,
          company_name: doc.clients.company_name,
          document: doc.clients.document
        });
      }
    });
    return Array.from(map.values());
  }, [companies, documents]);

  // Contagem de documentos vinculados a cada empresa
  const companyDocCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    documents.forEach(doc => {
      if (doc.client_id) {
        counts[doc.client_id] = (counts[doc.client_id] || 0) + 1;
      }
    });
    return counts;
  }, [documents]);

  // Empresa atualmente selecionada
  const selectedCompany = useMemo(() => {
    return availableCompanies.find(c => c.id === selectedCompanyId);
  }, [availableCompanies, selectedCompanyId]);

  // Quantidade total de filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCompanyId) count++;
    if (selectedDueDate) count++;
    if (selectedCompetence) count++;
    if (selectedSector) count++;
    return count;
  }, [selectedCompanyId, selectedDueDate, selectedCompetence, selectedSector]);

  // Lista de empresas filtrada pela busca interna do dropdown
  const filteredAvailableCompanies = useMemo(() => {
    if (!companySearchTerm.trim()) return availableCompanies;
    const term = companySearchTerm.toLowerCase().trim();
    return availableCompanies.filter(c => 
      c.name.toLowerCase().includes(term) ||
      (c.company_name && c.company_name.toLowerCase().includes(term)) ||
      (c.document && c.document.toLowerCase().includes(term))
    );
  }, [availableCompanies, companySearchTerm]);

  const companyDocs = selectedCompanyId
    ? documents.filter(d => d.client_id === selectedCompanyId)
    : documents;
  const pendingDocs = companyDocs.filter(d => d.status === 'Pendente');
  const readDocs = companyDocs.filter(d => d.status === 'Lido');
  const readPercent = companyDocs.length > 0 ? Math.round((readDocs.length / companyDocs.length) * 100) : 0;

  // Mapa de dots de vencimento por data (YYYY-MM-DD)
  const dueDateDotsMap = useMemo(() => {
    const map = new Map<string, {
      total: number;
      pendingCount: number;
      overdueCount: number;
      paidCount: number;
    }>();

    companyDocs.forEach(doc => {
      if (!doc.due_date) return;
      const dateKey = doc.due_date;
      const statusInfo = getDueDateStatus(doc.due_date);
      const isOverdue = statusInfo ? statusInfo.daysLeft < 0 && !doc.is_paid : false;
      const isPending = doc.status === 'Pendente' && !doc.is_paid;
      const isPaid = doc.is_paid || doc.status === 'Lido';

      const current = map.get(dateKey) || { total: 0, pendingCount: 0, overdueCount: 0, paidCount: 0 };
      current.total += 1;
      if (isOverdue) current.overdueCount += 1;
      if (isPending) current.pendingCount += 1;
      if (isPaid) current.paidCount += 1;

      map.set(dateKey, current);
    });

    return map;
  }, [companyDocs]);

  // Dias para a grade do calendário mensal de vencimento
  const calendarDays = useMemo(() => {
    const { year, month } = dueDatePickerMonth;
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Domingo
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: Array<{
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}-${(todayDate.getMonth() + 1).toString().padStart(2, '0')}-${todayDate.getDate().toString().padStart(2, '0')}`;

    // Dias do mês anterior para completar a primeira semana
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${(prevMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      days.push({ day: d, dateStr, isCurrentMonth: false, isToday: dateStr === todayStr });
    }

    // Dias do mês atual
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      days.push({ day: d, dateStr, isCurrentMonth: true, isToday: dateStr === todayStr });
    }

    // Dias do próximo mês para completar 35 ou 42 células
    const totalCells = days.length > 35 ? 42 : 35;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      days.push({ day: d, dateStr, isCurrentMonth: false, isToday: dateStr === todayStr });
    }

    return days;
  }, [dueDatePickerMonth]);

  const getDueDateButtonLabel = () => {
    if (!selectedDueDate) return 'VENCIMENTO';
    if (selectedDueDate === 'overdue') return 'VENCIDOS';
    if (selectedDueDate === 'due_today') return 'VENCE HOJE';
    if (selectedDueDate === 'due_next_7') return 'PRÓX. 7 DIAS';
    const [year, month, day] = selectedDueDate.split('-');
    return `VENC: ${day}/${month}`;
  };

  // Setor disponíveis no conjunto atual de documentos
  const availableSectors = Array.from(
    new Set(companyDocs.map(d => d.sectors?.name).filter(Boolean))
  ) as string[];

  // Contagem de documentos por setor no conjunto atual
  const sectorDocCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    companyDocs.forEach(doc => {
      const sName = doc.sectors?.name;
      if (sName) {
        counts[sName] = (counts[sName] || 0) + 1;
      }
    });
    return counts;
  }, [companyDocs]);

  // Documentos filtrados
  const filteredDocs = documents.filter(doc => {
    const matchesCompany = !selectedCompanyId || doc.client_id === selectedCompanyId;
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.clients?.company_name && doc.clients.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.clients?.trade_name && doc.clients.trade_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTab = activeTab === 'all' || (activeTab === 'pending' ? doc.status === 'Pendente' : doc.status === 'Lido');
    const matchesCompetence = !selectedCompetence || doc.competence_month === selectedCompetence;
    const matchesSector = !selectedSector || doc.sectors?.name === selectedSector;

    // Filtro de vencimento
    let matchesDueDate = true;
    if (selectedDueDate) {
      if (selectedDueDate === 'overdue') {
        const status = getDueDateStatus(doc.due_date);
        matchesDueDate = !!status && status.daysLeft < 0 && !doc.is_paid;
      } else if (selectedDueDate === 'due_today') {
        const status = getDueDateStatus(doc.due_date);
        matchesDueDate = !!status && status.daysLeft === 0;
      } else if (selectedDueDate === 'due_next_7') {
        const status = getDueDateStatus(doc.due_date);
        matchesDueDate = !!status && status.daysLeft >= 0 && status.daysLeft <= 7;
      } else {
        matchesDueDate = doc.due_date === selectedDueDate;
      }
    }

    return matchesCompany && matchesSearch && matchesTab && matchesCompetence && matchesSector && matchesDueDate;
  });

  // Agrupamento por competência
  const groupedDocs: Record<string, any[]> = {};
  filteredDocs.forEach(doc => {
    const key = doc.competence_month || 'Sem Competência';
    if (!groupedDocs[key]) groupedDocs[key] = [];
    groupedDocs[key].push(doc);
  });

  const sortedGroups = Object.entries(groupedDocs).sort(([a], [b]) => {
    if (a === 'Sem Competência') return 1;
    if (b === 'Sem Competência') return -1;
    return parseCompetenceToDate(b).getTime() - parseCompetenceToDate(a).getTime();
  });

  const toggleGroup = (key: string) =>
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  // Navegação de período
  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (periodIndex === -1) {
        setSelectedCompetence(allMonths[0].value);
      } else if (periodIndex < allMonths.length - 1) {
        setSelectedCompetence(allMonths[periodIndex + 1].value);
      }
    } else {
      if (periodIndex <= 0) {
        setSelectedCompetence('');
      } else {
        setSelectedCompetence(allMonths[periodIndex - 1].value);
      }
    }
  };

  const currentPeriodLabel = selectedCompetence
    ? allMonths.find(m => m.value === selectedCompetence)?.label || selectedCompetence
    : 'TODOS';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-24 md:pb-8 overflow-x-hidden max-w-full">

      {/* ── Hero Header ── */}
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Building2 size={16} className="text-indigo-500" />
            <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 tracking-[0.25em] uppercase">Portal do Cliente</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
            Olá, <span className="text-indigo-600 dark:text-indigo-400">{userProfile?.full_name?.split(' ')[0]}</span>!
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Aqui estão os documentos da sua empresa.
          </p>
        </div>

        {/* Atalho Rápido para o Chat de Atendimento */}
        {onNavigateToChat && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={onNavigateToChat}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <MessageSquare size={14} />
              <span>Falar no Chat</span>
              {chatUnreadCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                  {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                </span>
              )}
            </button>
          </div>
        )}
      </header>

      {/* ── Dashboard Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card Pendentes */}
        <div className="col-span-1 lg:col-span-2">
          <MetricCard
            title="Pendentes"
            value={pendingDocs.length}
            icon={<Clock size={20} />}
            color="amber"
            variant="horizontal"
            onClick={() => setActiveTab('pending')}
          />
        </div>

        {/* Card Protocolados */}
        <div className="col-span-1 lg:col-span-2">
          <MetricCard
            title="Protocolados"
            value={readDocs.length}
            icon={<BadgeCheck size={20} />}
            color="emerald"
            variant="horizontal"
            onClick={() => setActiveTab('read')}
            trend={`Lidos: ${readDocs.length} · Não Lidos: ${pendingDocs.length}`}
          />
        </div>
      </div>

      {/* ── Toolbar de Filtros Compacta ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800">
          {/* Tabs de status e Alternador de Visualização */}
          <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl gap-0.5 shrink-0">
              {([['all', 'Todos'], ['pending', 'Pendentes'], ['read', 'Lidos']] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 sm:px-5 py-1.5 text-[11px] sm:text-xs font-black tracking-tight rounded-lg transition-all ${
                    activeTab === tab
                      ? 'bg-white dark:bg-slate-800 shadow-md text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {label}
                  {tab === 'pending' && pendingDocs.length > 0 && (
                    <span className="ml-1.5 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                      {pendingDocs.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Alternador de Modo: Lista vs Cards */}
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl gap-0.5 shrink-0 border border-slate-200/60 dark:border-slate-800">
              <Tooltip content="Visualizar em Lista" position="bottom">
                <button
                  type="button"
                  onClick={() => handleViewModeChange('list')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                  aria-label="Modo Lista"
                >
                  <LayoutList size={14} />
                </button>
              </Tooltip>

              <Tooltip content="Visualizar em Cards" position="bottom">
                <button
                  type="button"
                  onClick={() => handleViewModeChange('card')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'card'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                  aria-label="Modo Cards"
                >
                  <LayoutGrid size={14} />
                </button>
              </Tooltip>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            {/* 1. Busca */}
            <div className="relative flex-1 min-w-[140px]">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar documento..."
                className="pl-8 pr-3 py-2 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* 2. Botão que aciona a Gaveta Lateral de Filtros com Tooltip padrão */}
            <Tooltip content="Abrir gaveta de filtros" position="bottom">
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activeFiltersCount > 0
                    ? 'border-indigo-500/50 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-xs ring-1 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
                aria-label="Abrir gaveta de filtros"
              >
                <SlidersHorizontal size={14} className={activeFiltersCount > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                <span>Filtros</span>
                {activeFiltersCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </Tooltip>

            {/* Botão limpar todos os filtros se houver ativo */}
            {(activeFiltersCount > 0 || searchTerm) && (
              <Tooltip content="Limpar todos os filtros" position="bottom">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCompanyId('');
                    setSelectedDueDate('');
                    setSelectedCompetence('');
                    setSelectedSector('');
                    setSearchTerm('');
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all shrink-0 cursor-pointer"
                  aria-label="Limpar todos os filtros"
                >
                  <X size={14} />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Pílulas / Chips de Filtros Ativos para remoção rápida */}
        {activeFiltersCount > 0 && (
          <div className="px-3 sm:px-4 py-2 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
              <SlidersHorizontal size={11} /> Filtros:
            </span>

            {selectedCompanyId && selectedCompany && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 text-[11px] font-bold">
                <Building2 size={11} />
                <span className="max-w-[150px] truncate">{selectedCompany.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedCompanyId('')}
                  className="hover:bg-indigo-200/50 dark:hover:bg-indigo-900/60 rounded p-0.5 ml-0.5 cursor-pointer"
                  title="Remover filtro de empresa"
                >
                  <X size={10} className="stroke-[3]" />
                </button>
              </span>
            )}

            {selectedDueDate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 text-[11px] font-bold">
                <Clock size={11} />
                <span>{getDueDateButtonLabel()}</span>
                <button
                  type="button"
                  onClick={() => setSelectedDueDate('')}
                  className="hover:bg-amber-200/50 dark:hover:bg-amber-900/60 rounded p-0.5 ml-0.5 cursor-pointer"
                  title="Remover filtro de vencimento"
                >
                  <X size={10} className="stroke-[3]" />
                </button>
              </span>
            )}

            {selectedCompetence && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 text-[11px] font-bold">
                <Calendar size={11} />
                <span>{getShortCompetenceLabel(selectedCompetence)}</span>
                <button
                  type="button"
                  onClick={() => setSelectedCompetence('')}
                  className="hover:bg-indigo-200/50 dark:hover:bg-indigo-900/60 rounded p-0.5 ml-0.5 cursor-pointer"
                  title="Remover filtro de período"
                >
                  <X size={10} className="stroke-[3]" />
                </button>
              </span>
            )}

            {selectedSector && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 text-[11px] font-bold">
                <SlidersHorizontal size={11} />
                <span>{selectedSector}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSector('')}
                  className="hover:bg-purple-200/50 dark:hover:bg-purple-900/60 rounded p-0.5 ml-0.5 cursor-pointer"
                  title="Remover filtro de setor"
                >
                  <X size={10} className="stroke-[3]" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedCompanyId('');
                setSelectedDueDate('');
                setSelectedCompetence('');
                setSelectedSector('');
              }}
              className="text-[10px] font-black text-slate-400 hover:text-red-500 underline ml-1 cursor-pointer transition-colors"
            >
              Limpar todos
            </button>
          </div>
        )}

        {/* ── Lista de Documentos (Agrupada) ── */}
        <div className="rounded-b-2xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 size={28} className="animate-spin mb-3 text-indigo-500" />
              <span className="text-xs font-bold uppercase tracking-widest">Carregando documentos...</span>
            </div>
          ) : sortedGroups.length === 0 ? (
            <div className="py-20 text-center">
              <div className="inline-flex items-center justify-center p-6 bg-slate-100 dark:bg-slate-800 rounded-3xl text-slate-300 dark:text-slate-700 mb-5">
                <FileText size={40} />
              </div>
              <h3 className="text-slate-800 dark:text-white font-bold text-base mb-1">Nenhum documento encontrado</h3>
              <p className="text-slate-400 text-sm">Ajuste os filtros ou aguarde novos envios do escritório.</p>
            </div>
          ) : (
            sortedGroups.map(([groupKey, groupDocs]) => {
              const isCollapsed = !!collapsedGroups[groupKey];
              return (
                <div key={groupKey}>
                  {/* Cabeçalho do grupo */}
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200/50 dark:hover:bg-slate-800 border-y border-slate-200 dark:border-slate-800 transition-colors"
                  >
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                    />
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      {groupKey !== 'Sem Competência' ? formatCompetenceLabel(groupKey) : 'Sem Competência'}
                    </span>
                    <span className="ml-auto text-[10px] font-black text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                      {groupDocs.length}
                    </span>
                  </button>

                  {/* Documentos do grupo: Alternância entre Modo Lista e Modo Card */}
                  {!isCollapsed && (
                    viewMode === 'list' ? (
                      /* Modo Lista (Tabela Clássica) */
                      groupDocs.map((doc) => {
                        const sectorStyle = getSectorStyle(doc.sectors?.name);
                        const dueDateStatus = getDueDateStatus(doc.due_date);
                        const isUrgent = dueDateStatus && dueDateStatus.daysLeft <= 3;

                        return (
                          <div
                            key={doc.id}
                            className={`flex gap-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group border-b border-slate-100 dark:border-slate-800 last:border-b-0 ${isUrgent ? 'bg-red-50/30 dark:bg-red-500/5' : ''}`}
                          >
                            {/* Faixa lateral com Setor na Vertical (90º) */}
                            <div className={`w-8 shrink-0 flex items-center justify-center ${sectorStyle.bar} relative`}>
                              <span className="text-[9px] font-black uppercase tracking-widest text-white/90 [writing-mode:vertical-lr] rotate-180 whitespace-nowrap py-3 select-none">
                                {doc.sectors?.name || 'Geral'}
                              </span>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-stretch flex-1 min-w-0">
                              {/* Coluna 2: Nome da Tarefa e Empresa (centralizado verticalmente) */}
                              <div className="flex flex-col justify-center items-start min-w-0 shrink-0 sm:w-[16cm] p-3 sm:p-4 sm:border-r border-slate-100 dark:border-slate-800 gap-1.5">
                                <span className="inline-flex items-center w-full px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40 shadow-sm truncate">
                                  {doc.name}
                                </span>
                                {doc.type && (
                                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 pl-1 truncate w-full" title={doc.type}>
                                    <span className="text-indigo-500/80">📋</span> <span className="text-slate-400">Tarefa:</span> {doc.type}
                                  </span>
                                )}
                                {doc.clients && (
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 pl-1 truncate w-full" title={doc.clients.company_name}>
                                    <span className="text-indigo-500/80">🏢</span> {doc.clients.trade_name || doc.clients.company_name}
                                  </span>
                                )}
                              </div>

                              {/* Coluna 3: Vencimento (topo) / Competência (baixo) */}
                              <div className="flex flex-col justify-center gap-1 shrink-0 sm:w-44 px-3 sm:px-4 py-1.5 sm:py-3 sm:border-r border-slate-100 dark:border-slate-800">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${dueDateStatus ? dueDateStatus.className : 'text-slate-400 dark:text-slate-500'}`}>
                                  <Calendar size={10} />
                                  {dueDateStatus ? dueDateStatus.label : 'Sem vencimento'}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                                  {doc.competence_month ? formatCompetenceLabel(doc.competence_month) : 'Sem competência'}
                                </span>
                              </div>

                              {/* Coluna 4: Status Leitura / Status Pagamento / Alerta Urgência */}
                              <div className="flex flex-row sm:flex-col justify-start items-start gap-1 shrink-0 sm:w-28 px-3 sm:px-4 py-1.5 sm:py-3 flex-wrap">
                                {doc.status === 'Pendente' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500 text-white uppercase tracking-widest">
                                    NÃO LIDO
                                  </span>
                                )}
                                {doc.status === 'Lido' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-500 text-white uppercase tracking-widest">
                                    LIDO
                                  </span>
                                )}
                                {doc.is_paid && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-600 text-white uppercase tracking-widest shadow-sm">
                                    PAGO
                                  </span>
                                )}
                                {isUrgent && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black bg-red-500 text-white uppercase tracking-widest animate-pulse">
                                    <TriangleAlert size={8} /> URGENTE
                                  </span>
                                )}
                              </div>

                              {/* Botões de Ação */}
                              <div className="flex items-center gap-1.5 shrink-0 ml-auto px-3 sm:px-4 py-2 sm:py-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                                {doc.due_date && (
                                  <Tooltip content={doc.is_paid ? 'Marcar como não pago' : 'Marcar como pago'} position="top">
                                    <button
                                      onClick={() => handlePaymentToggle(doc)}
                                      className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all active:scale-95 cursor-pointer ${
                                        doc.is_paid
                                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                                          : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                                      }`}
                                    >
                                      <BanknoteArrowDown size={14} />
                                      <span className="hidden sm:inline">{doc.is_paid ? 'PAGO' : 'MARCAR PAGO'}</span>
                                    </button>
                                  </Tooltip>
                                )}
                                {doc.status === 'Lido' && (
                                  <button
                                    onClick={() => handleViewProtocol(doc)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/30 rounded-xl text-[11px] font-black transition-all active:scale-95 cursor-pointer"
                                  >
                                    <Eye size={13} />
                                    <span className="hidden sm:inline">Protocolo</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDownload(doc)}
                                  disabled={doc.status === 'Excluído'}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all active:scale-95 cursor-pointer ${
                                    doc.status === 'Excluído'
                                      ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20'
                                  }`}
                                >
                                  <Download size={14} />
                                  <span>Abrir</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      /* Modo Card (Grade Responsiva) */
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 p-3.5 sm:p-4 bg-slate-50/50 dark:bg-slate-950/20">
                        {groupDocs.map((doc) => {
                          const sectorStyle = getSectorStyle(doc.sectors?.name);
                          const dueDateStatus = getDueDateStatus(doc.due_date);
                          const isUrgent = dueDateStatus && dueDateStatus.daysLeft <= 3;

                          return (
                            <div
                              key={doc.id}
                              className={`relative flex flex-col justify-between rounded-2xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all group overflow-hidden ${
                                isUrgent 
                                  ? 'border-red-300/80 dark:border-red-900/60 ring-1 ring-red-400/20' 
                                  : 'border-slate-200/80 dark:border-slate-800 hover:border-indigo-400/50 dark:hover:border-indigo-500/50'
                              }`}
                            >
                              {/* Barra superior com a cor do setor */}
                              <div className={`h-1.5 w-full ${sectorStyle.bar}`} />

                              <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
                                {/* Header do Card */}
                                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${sectorStyle.badge}`}>
                                    {sectorStyle.icon}
                                    <span>{doc.sectors?.name || 'Geral'}</span>
                                  </span>

                                  <div className="flex items-center gap-1">
                                    {doc.status === 'Pendente' && (
                                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500 text-white uppercase tracking-wider">
                                        NÃO LIDO
                                      </span>
                                    )}
                                    {doc.status === 'Lido' && (
                                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-500 text-white uppercase tracking-wider">
                                        LIDO
                                      </span>
                                    )}
                                    {doc.is_paid && (
                                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-600 text-white uppercase tracking-wider shadow-sm">
                                        PAGO
                                      </span>
                                    )}
                                    {isUrgent && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black bg-red-500 text-white uppercase tracking-wider animate-pulse">
                                        <TriangleAlert size={8} /> URGENTE
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Informações do Documento */}
                                <div className="space-y-1.5">
                                  <h4 
                                    className="text-xs sm:text-sm font-black text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                                  >
                                    {doc.name}
                                  </h4>

                                  {doc.type && (
                                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate" title={doc.type}>
                                      <span className="text-indigo-500">📋</span> {doc.type}
                                    </p>
                                  )}

                                  {doc.clients && (
                                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 truncate" title={doc.clients.company_name}>
                                      <span className="text-indigo-500">🏢</span> {doc.clients.trade_name || doc.clients.company_name}
                                    </p>
                                  )}
                                </div>

                                {/* Vencimento e Competência */}
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold">
                                  <span className={`inline-flex items-center gap-1 ${dueDateStatus ? dueDateStatus.className : 'text-slate-400 dark:text-slate-500'}`}>
                                    <Calendar size={11} />
                                    <span>{dueDateStatus ? dueDateStatus.label : 'Sem vencimento'}</span>
                                  </span>

                                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {doc.competence_month || 'Geral'}
                                  </span>
                                </div>
                              </div>

                              {/* Rodapé de Ações Rápidas do Card */}
                              <div className="px-3 sm:px-4 py-2.5 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1">
                                  {doc.due_date && (
                                    <Tooltip content={doc.is_paid ? 'Marcar como não pago' : 'Marcar como pago'} position="top">
                                      <button
                                        onClick={() => handlePaymentToggle(doc)}
                                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                          doc.is_paid
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                            : 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 border-slate-200 dark:border-slate-700'
                                        }`}
                                      >
                                        <BanknoteArrowDown size={14} />
                                      </button>
                                    </Tooltip>
                                  )}

                                  {doc.status === 'Lido' && (
                                    <Tooltip content="Ver protocolo e histórico" position="top">
                                      <button
                                        onClick={() => handleViewProtocol(doc)}
                                        className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
                                      >
                                        <Eye size={14} />
                                      </button>
                                    </Tooltip>
                                  )}
                                </div>

                                <button
                                  onClick={() => handleDownload(doc)}
                                  disabled={doc.status === 'Excluído'}
                                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all active:scale-95 cursor-pointer ${
                                    doc.status === 'Excluído'
                                      ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20'
                                  }`}
                                >
                                  <Download size={13} />
                                  <span>Abrir</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── FAB Chat (mobile) ── */}
      <button
        onClick={onNavigateToChat}
        className="fixed bottom-6 right-6 md:hidden p-4 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-500/40 z-50 hover:bg-indigo-700 active:scale-90 transition-all"
        title="Abrir Chat"
      >
        <MessageSquare size={22} />
      </button>



      {/* ── Modal Protocolo de Leitura ── */}
      <Modal
        isOpen={protocolModalOpen}
        onClose={() => setProtocolModalOpen(false)}
        title="Protocolo de Leitura"
        size="md"
        footer={<Button onClick={() => setProtocolModalOpen(false)} variant="secondary" className="w-full">Fechar</Button>}
      >
        <div className="space-y-4">
          {/* Info do documento */}
          <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full shrink-0">
              <Eye size={18} />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{protocolDocName}</h4>
              <p className="text-xs text-slate-500">Histórico de visualizações deste arquivo</p>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {logsLoading ? (
              <div className="flex flex-col items-center justify-center p-10 text-slate-400">
                <Loader2 size={22} className="animate-spin mb-2 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Carregando protocolos...</span>
              </div>
            ) : selectedLogs.length > 0 ? (
              selectedLogs.map(log => (
                <div key={log.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {log.profiles?.full_name || 'Usuário'}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                        {new Date(log.read_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <span className="shrink-0 text-[9px] uppercase font-black tracking-wider text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
                      Visualizado
                    </span>
                  </div>
                  {log.user_agent && (
                    <div className="mt-2 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800 break-all leading-relaxed">
                      {log.user_agent}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-slate-500 text-sm">
                <Eye size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                Nenhum protocolo registrado ainda.
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Gaveta Lateral Deslizante de Filtros (Slide-over Drawer via Portal no Body) ── */}
      {typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop com blur suave - z-[9998] cobrindo 100% da viewport real */}
          <div 
            className={`fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[9998] transition-opacity duration-300 ${
              isFilterDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsFilterDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Painel da Gaveta Deslizante - z-[9999], top-0 bottom-0 h-screen sem restrição de container */}
          <div 
            className={`fixed top-0 bottom-0 right-0 h-screen w-full sm:w-[390px] md:w-[410px] max-w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl z-[9999] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25, 0.1, 0.25, 1)] border-l border-white/20 dark:border-slate-800/50 ${
              isFilterDrawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Filtros de documentos"
          >
            {/* Header Padronizado com os Demais Drawers */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-lg flex-shrink-0 shadow-sm">
                  <SlidersHorizontal size={18} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                      Filtros de Documentos
                    </h1>
                    {activeFiltersCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black">
                        {activeFiltersCount}
                      </span>
                    )}
                  </div>
                  <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
                </div>
              </div>
              <Tooltip content="Fechar (ESC)" position="bottom">
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-200 cursor-pointer"
                  aria-label="Fechar gaveta"
                >
                  <X size={20} />
                </button>
              </Tooltip>
            </div>

        {/* Barra de Atalhos Rápidos para Navegação das Seções */}
        <div className="px-4 sm:px-5 py-2 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 shrink-0">
            Ir para:
          </span>
          {availableCompanies.length > 0 && (
            <button
              type="button"
              onClick={() => {
                document.getElementById('drawer-section-company')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCompanyId
                  ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <Building2 size={12} className={selectedCompanyId ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
              <span>Empresa</span>
              {selectedCompanyId && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              document.getElementById('drawer-section-due-date')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedDueDate
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                : 'bg-white dark:bg-slate-900 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800'
            }`}
          >
            <Clock size={12} className={selectedDueDate ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'} />
            <span>Vencimento</span>
            {selectedDueDate && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
          </button>

          <button
            type="button"
            onClick={() => {
              document.getElementById('drawer-section-competence')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCompetence
                ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                : 'bg-white dark:bg-slate-900 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800'
            }`}
          >
            <Calendar size={12} className={selectedCompetence ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
            <span>Período</span>
            {selectedCompetence && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
          </button>
        </div>

        {/* Corpo com scroll vertical suave */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 scroll-smooth">
          {/* SEÇÃO 1: Empresa Vinculada */}
          {availableCompanies.length > 0 && (
            <div id="drawer-section-company" className="scroll-mt-3">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building2 size={14} className="text-indigo-500" />
                  Empresa Vinculada
                </label>
                {selectedCompanyId && (
                  <button
                    type="button"
                    onClick={() => setSelectedCompanyId('')}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Desmarcar
                  </button>
                )}
              </div>

              {/* Busca de empresa (se houver mais de 2 empresas) */}
              {availableCompanies.length > 2 && (
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou CNPJ..."
                    value={companySearchTerm}
                    onChange={e => setCompanySearchTerm(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                  />
                  {companySearchTerm && (
                    <button
                      type="button"
                      onClick={() => setCompanySearchTerm('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}

              {/* Lista de Empresas com visual limpo */}
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {/* Opção Todas as Empresas */}
                <button
                  type="button"
                  onClick={() => setSelectedCompanyId('')}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    !selectedCompanyId
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 shadow-xs'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold">Todas as Empresas</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {documents.length} docs
                    </span>
                    {!selectedCompanyId && <Check size={14} className="text-indigo-600 dark:text-indigo-400 stroke-[3]" />}
                  </div>
                </button>

                {filteredAvailableCompanies.map(c => {
                  const isSelected = selectedCompanyId === c.id;
                  const count = companyDocCounts[c.id] || 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCompanyId(c.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 shadow-xs'
                          : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2 flex-1">
                        <span className="text-xs font-bold block leading-snug break-words">{c.name}</span>
                        {c.document && (
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{c.document}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {count} {count === 1 ? 'doc' : 'docs'}
                        </span>
                        {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SEÇÃO 2: Data de Vencimento com Calendário Completo */}
          <div id="drawer-section-due-date" className="pt-4 border-t border-slate-100 dark:border-slate-800 scroll-mt-3">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock size={14} className="text-amber-500" />
                Data de Vencimento
              </label>
              {selectedDueDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDueDate('')}
                  className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Desmarcar
                </button>
              )}
            </div>

            {/* Atalhos Rápidos */}
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <button
                type="button"
                onClick={() => setSelectedDueDate(selectedDueDate === 'overdue' ? '' : 'overdue')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-center cursor-pointer ${
                  selectedDueDate === 'overdue'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/50 dark:border-red-800/40'
                }`}
              >
                Vencidos
              </button>
              <button
                type="button"
                onClick={() => setSelectedDueDate(selectedDueDate === 'due_today' ? '' : 'due_today')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-center cursor-pointer ${
                  selectedDueDate === 'due_today'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200/50 dark:border-amber-800/40'
                }`}
              >
                Vence Hoje
              </button>
              <button
                type="button"
                onClick={() => setSelectedDueDate(selectedDueDate === 'due_next_7' ? '' : 'due_next_7')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-center cursor-pointer ${
                  selectedDueDate === 'due_next_7'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/50 dark:border-indigo-800/40'
                }`}
              >
                Próx. 7 Dias
              </button>
            </div>

            {/* Calendário Mensal com Dots */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3">
              {/* Header do Mês */}
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setDueDatePickerMonth(prev => {
                      const newMonth = prev.month === 0 ? 11 : prev.month - 1;
                      const newYear = prev.month === 0 ? prev.year - 1 : prev.year;
                      return { month: newMonth, year: newYear };
                    });
                  }}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                  {new Date(dueDatePickerMonth.year, dueDatePickerMonth.month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDueDatePickerMonth(prev => {
                      const newMonth = prev.month === 11 ? 0 : prev.month + 1;
                      const newYear = prev.month === 11 ? prev.year + 1 : prev.year;
                      return { month: newMonth, year: newYear };
                    });
                  }}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Dias da semana */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                  <span key={i} className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase">{d}</span>
                ))}
              </div>

              {/* Grade dos Dias */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(({ day, dateStr, isCurrentMonth, isToday }) => {
                  const dotInfo = dueDateDotsMap.get(dateStr);
                  const isSelected = selectedDueDate === dateStr;
                  let dotColor = '';
                  if (dotInfo) {
                    if (dotInfo.overdueCount > 0) dotColor = 'bg-red-500 animate-pulse';
                    else if (dotInfo.pendingCount > 0) dotColor = 'bg-amber-500';
                    else if (dotInfo.paidCount > 0) dotColor = 'bg-emerald-500';
                    else dotColor = 'bg-indigo-500';
                  }

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedDueDate(isSelected ? '' : dateStr)}
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg text-[11px] font-bold transition-all relative cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 scale-105 z-10'
                          : isToday
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-400/50'
                          : isCurrentMonth
                          ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                          : 'text-slate-300 dark:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <span>{day}</span>
                      {dotInfo ? (
                        <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dotColor}`} />
                      ) : (
                        <span className="w-1.5 h-1.5 mt-0.5 opacity-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legenda de Dots */}
              <div className="flex items-center justify-center gap-3 pt-2 mt-2 border-t border-slate-200 dark:border-slate-800 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Vencido</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Pendente</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Pago</span>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: Período / Competência */}
          <div id="drawer-section-competence" className="pt-4 border-t border-slate-100 dark:border-slate-800 scroll-mt-3">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar size={14} className="text-indigo-500" />
                Período / Competência
              </label>
              {selectedCompetence && (
                <button
                  type="button"
                  onClick={() => setSelectedCompetence('')}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Desmarcar
                </button>
              )}
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3">
              {/* Seletor de Ano */}
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCalendarYear(prev => prev - 1)}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-black text-slate-700 dark:text-slate-200 tracking-wider">
                  {calendarYear}
                </span>
                <button
                  type="button"
                  onClick={() => setCalendarYear(prev => prev + 1)}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Grid dos Meses */}
              <div className="grid grid-cols-4 gap-1.5">
                {['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'].map((mLabel, idx) => {
                  const valueToCheck = `${(idx + 1).toString().padStart(2, '0')}/${calendarYear}`;
                  const isSelected = selectedCompetence === valueToCheck;

                  return (
                    <button
                      key={mLabel}
                      type="button"
                      onClick={() => setSelectedCompetence(isSelected ? '' : valueToCheck)}
                      className={`py-2 text-[10px] font-black rounded-lg transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800'
                      }`}
                    >
                      {mLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: Setor / Departamento */}
          {availableSectors.length > 0 && (
            <div id="drawer-section-sector" className="pt-4 border-t border-slate-100 dark:border-slate-800 scroll-mt-3">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <SlidersHorizontal size={14} className="text-indigo-500" />
                  Setor / Departamento
                </label>
                {selectedSector && (
                  <button
                    type="button"
                    onClick={() => setSelectedSector('')}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Desmarcar
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {/* Opção Todos os Setores */}
                <button
                  type="button"
                  onClick={() => setSelectedSector('')}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    !selectedSector
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 shadow-xs'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold">Todos os Setores</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {companyDocs.length} docs
                    </span>
                    {!selectedSector && <Check size={14} className="text-indigo-600 dark:text-indigo-400 stroke-[3]" />}
                  </div>
                </button>

                {availableSectors.map(sector => {
                  const isSelected = selectedSector === sector;
                  const count = sectorDocCounts[sector] || 0;
                  const style = getSectorStyle(sector);

                  return (
                    <button
                      key={sector}
                      type="button"
                      onClick={() => setSelectedSector(isSelected ? '' : sector)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 shadow-xs'
                          : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        <div className={`p-1.5 rounded-lg shrink-0 ${style.badge} border`}>
                          {style.icon}
                        </div>
                        <span className="text-xs font-bold block truncate">{sector}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {count} {count === 1 ? 'doc' : 'docs'}
                        </span>
                        {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Fixo da Gaveta */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center gap-2.5">
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedCompanyId('');
                setSelectedDueDate('');
                setSelectedCompetence('');
                setSelectedSector('');
              }}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all text-center cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsFilterDrawerOpen(false)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/25 transition-all text-center cursor-pointer active:scale-[0.98]"
          >
            Ver Resultados ({filteredDocs.length})
          </button>
        </div>
      </div>
    </>,
    document.body
  )}
</div>
  );
};
