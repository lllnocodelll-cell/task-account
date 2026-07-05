import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Filter,
  SlidersHorizontal,
  LayoutList,
  Building2
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';

interface ClientPortalProps {
  userProfile: any;
  onNavigateToChat?: () => void;
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

  if (daysLeft < 0) return { label: `Vencido em ${formattedDate}`, className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400', daysLeft };
  if (daysLeft === 0) return { label: `Vence hoje (${formattedDate})`, className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400', daysLeft };
  if (daysLeft <= 3) return { label: `Vence em ${formattedDate}`, className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400', daysLeft };
  if (daysLeft <= 7) return { label: `Vence em ${formattedDate}`, className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', daysLeft };
  return { label: `Vence em ${formattedDate}`, className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', daysLeft };
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

export const ClientPortal: React.FC<ClientPortalProps> = ({ userProfile, onNavigateToChat }) => {
  const { addToast } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'read'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompetence, setSelectedCompetence] = useState('');
  const [selectedSector, setSelectedSector] = useState('');

  // Estados para o novo filtro de calendário por período
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => {
    if (selectedCompetence) {
      const [, year] = selectedCompetence.split('/');
      return parseInt(year);
    }
    return new Date().getFullYear();
  });
  const calendarRef = useRef<HTMLDivElement>(null);

  // Efeito para fechar o popover ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
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

  useEffect(() => {
    fetchDocuments();
  }, [userProfile?.client_ids]);

  const fetchDocuments = async () => {
    if (!userProfile?.client_ids || userProfile.client_ids.length === 0) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('client_documents')
        .select(`*, sectors(name), clients(company_name, trade_name)`)
        .in('client_id', userProfile.client_ids)
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

      if (doc.status === 'Pendente') {
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

  const pendingDocs = documents.filter(d => d.status === 'Pendente');
  const readDocs = documents.filter(d => d.status === 'Lido');
  const readPercent = documents.length > 0 ? Math.round((readDocs.length / documents.length) * 100) : 0;

  // Setor disponíveis no conjunto atual de documentos
  const availableSectors = Array.from(
    new Set(documents.map(d => d.sectors?.name).filter(Boolean))
  ) as string[];

  // Documentos filtrados
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || (activeTab === 'pending' ? doc.status === 'Pendente' : doc.status === 'Lido');
    const matchesCompetence = !selectedCompetence || doc.competence_month === selectedCompetence;
    const matchesSector = !selectedSector || doc.sectors?.name === selectedSector;
    return matchesSearch && matchesTab && matchesCompetence && matchesSector;
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
      <header className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
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
          {/* Tabs de status */}
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

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Seletor de Período compacto */}
            {/* Novo Seletor de Período via Popover Calendário (Mês/Ano) */}
            <div className="relative shrink-0" ref={calendarRef}>
              <div className={`flex items-center gap-1 bg-slate-100 dark:bg-slate-950 border rounded-xl p-1 transition-all ${
                selectedCompetence ? 'border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-transparent'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className={`flex items-center gap-2 px-2 py-1 text-[11px] font-black uppercase tracking-wider transition-all ${
                    selectedCompetence 
                      ? 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300' 
                      : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Calendar size={13} className={selectedCompetence ? 'text-indigo-500' : 'text-slate-400'} />
                  <span>{selectedCompetence ? getShortCompetenceLabel(selectedCompetence) : 'PERÍODO'}</span>
                  <ChevronDown size={12} className={`text-slate-400 transition-transform ${isCalendarOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {selectedCompetence && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCompetence('');
                    }}
                    className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-lg transition-all"
                    title="Limpar período"
                  >
                    <X size={12} className="stroke-[3px]" />
                  </button>
                )}
              </div>

              {isCalendarOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-3 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Seletor de Ano */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCalendarYear(prev => prev - 1)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-all active:scale-95"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 tracking-wider">
                      {calendarYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCalendarYear(prev => prev + 1)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-all active:scale-95"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Grid de Meses */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'].map((mLabel, idx) => {
                      const valueToCheck = `${(idx + 1).toString().padStart(2, '0')}/${calendarYear}`;
                      const isSelected = selectedCompetence === valueToCheck;

                      return (
                        <button
                          key={mLabel}
                          type="button"
                          onClick={() => {
                            setSelectedCompetence(valueToCheck);
                            setIsCalendarOpen(false);
                          }}
                          className={`py-2 text-[10px] font-black rounded-lg transition-all text-center ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                              : 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {mLabel}
                        </button>
                      );
                    })}
                  </div>

                  {/* Botão limpar / Ver Todos estilizado e notável no rodapé */}
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCompetence('');
                        setIsCalendarOpen(false);
                      }}
                      className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] text-center"
                    >
                      Limpar Filtro / Ver Todos
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Filtro por Setor */}
            {availableSectors.length > 0 && (
              <div className="relative shrink-0">
                <SlidersHorizontal size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={selectedSector}
                  onChange={e => setSelectedSector(e.target.value)}
                  className="pl-7 pr-2 py-2 bg-slate-100 dark:bg-slate-950 border border-transparent text-[11px] font-bold text-slate-600 dark:text-slate-300 rounded-xl outline-none cursor-pointer appearance-none hover:border-slate-300 dark:hover:border-slate-700 transition-all max-w-[120px] truncate"
                >
                  <option value="">Setor</option>
                  {availableSectors.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}

            {/* Busca */}
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

            {/* Botão limpar filtros */}
            {(selectedCompetence || selectedSector || searchTerm || activeTab !== 'all') && (
              <button
                onClick={() => { setSelectedCompetence(''); setSelectedSector(''); setSearchTerm(''); setActiveTab('all'); }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shrink-0"
                title="Limpar filtros"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

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

                  {/* Documentos do grupo */}
                  {!isCollapsed && groupDocs.map((doc) => {
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
                          <div className="flex flex-col justify-center items-start min-w-0 sm:w-[12cm] p-3 sm:p-4 sm:border-r border-slate-100 dark:border-slate-800 gap-1.5">
                            <span className="inline-flex items-center w-full px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40 shadow-sm truncate">
                              {doc.name}
                            </span>
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
                            <button
                              onClick={() => handlePaymentToggle(doc)}
                              title={doc.is_paid ? 'Marcar como não pago' : 'Marcar como pago'}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all active:scale-95 ${
                                doc.is_paid
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                              }`}
                            >
                              <DollarSign size={14} />
                              <span>{doc.is_paid ? 'PAGO' : 'MARCAR PAGO'}</span>
                            </button>
                            {doc.status === 'Lido' && (
                              <button
                                onClick={() => handleViewProtocol(doc)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/30 rounded-xl text-[11px] font-black transition-all active:scale-95"
                              >
                                <Eye size={13} />
                                <span className="hidden sm:inline">Protocolo</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDownload(doc)}
                              disabled={doc.status === 'Excluído'}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all active:scale-95 ${
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
                  })}
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
    </div>
  );
};
