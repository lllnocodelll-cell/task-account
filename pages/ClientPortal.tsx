import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '../components/ui/Card';
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
    return { bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800', icon: <FileText size={11} /> };
  }
  if (name.includes('contábil') || name.includes('contabil')) {
    return { bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800', icon: <Calculator size={11} /> };
  }
  if (name.includes('dp') || name.includes('pessoal') || name.includes('rh')) {
    return { bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800', icon: <Users size={11} /> };
  }
  if (name.includes('societário') || name.includes('societario') || name.includes('legalização') || name.includes('legalizacao')) {
    return { bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800', icon: <Briefcase size={11} /> };
  }
  return { bar: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', icon: <File size={11} /> };
};

const getDueDateStatus = (dueDateStr: string | null | undefined): { label: string; className: string; daysLeft: number } | null => {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr + 'T23:59:59');
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { label: `Vencido há ${Math.abs(daysLeft)}d`, className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400', daysLeft };
  if (daysLeft === 0) return { label: 'Vence hoje!', className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400', daysLeft };
  if (daysLeft <= 3) return { label: `Vence em ${daysLeft}d`, className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400', daysLeft };
  if (daysLeft <= 7) return { label: `Vence em ${daysLeft}d`, className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', daysLeft };
  return { label: `Vence em ${daysLeft}d`, className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', daysLeft };
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
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [sectors, setSectors] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Modal Protocolos
  const [protocolModalOpen, setProtocolModalOpen] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [protocolDocName, setProtocolDocName] = useState('');

  // Collapsible groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Upload Form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSector, setUploadSector] = useState('');
  const [uploadCompetence, setUploadCompetence] = useState(() => {
    const d = new Date();
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  });

  const allMonths = COMPETENCE_MONTHS();

  // Índice do mês selecionado no array de meses
  const periodIndex = selectedCompetence
    ? allMonths.findIndex(m => m.value === selectedCompetence)
    : -1;

  useEffect(() => {
    fetchDocuments();
    fetchSectors();
  }, [userProfile?.client_id]);

  const fetchDocuments = async () => {
    if (!userProfile?.client_id) return;
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('client_documents')
        .select(`*, sectors(name)`)
        .eq('client_id', userProfile.client_id)
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

  const fetchSectors = async () => {
    try {
      const { data } = await supabase.from('sectors').select('*');
      setSectors(data || []);
    } catch (error) {
      console.error('Error fetching sectors:', error);
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

  // Drag-and-drop real
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setUploadFile(file);
  }, []);

  const handleUpload = async () => {
    if (!uploadFile) return addToast('warning', 'Atenção', 'Selecione um arquivo');
    if (!uploadSector) return addToast('warning', 'Atenção', 'Selecione um setor');

    try {
      setIsUploading(true);
      const filePath = `client-uploads/${userProfile.client_id}/${Date.now()}-${uploadFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await (supabase as any).from('client_documents').insert({
        org_id: userProfile.org_id,
        client_id: userProfile.client_id,
        name: uploadFile.name,
        storage_path: filePath,
        sector_id: uploadSector,
        competence_month: uploadCompetence,
        type: 'Enviado pelo Cliente',
        status: 'Lido',
        uploaded_by_role: 'cliente'
      });

      if (dbError) throw dbError;

      addToast('success', 'Sucesso', 'Arquivo enviado com sucesso!');
      setUploadModalOpen(false);
      setUploadFile(null);
      fetchDocuments();
    } catch (error: any) {
      addToast('error', 'Erro', 'Erro ao enviar arquivo: ' + error.message);
    } finally {
      setIsUploading(false);
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

  // Próximo vencimento
  const nextDueDoc = documents
    .filter(d => d.due_date && d.status !== 'Excluído')
    .map(d => ({ ...d, _daysLeft: getDueDateStatus(d.due_date)?.daysLeft ?? 9999 }))
    .filter(d => d._daysLeft >= 0)
    .sort((a, b) => a._daysLeft - b._daysLeft)[0];

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
        <Button
          onClick={() => setUploadModalOpen(true)}
          variant="primary"
          icon={<Upload size={16} />}
          className="shrink-0 shadow-xl shadow-indigo-500/20 text-xs sm:text-sm"
        >
          Enviar Documento
        </Button>
      </header>

      {/* ── Banner de Alerta (aparece só quando há pendentes) ── */}
      {pendingDocs.length > 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-xl shrink-0">
            <Zap size={16} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
              {pendingDocs.length === 1
                ? '1 documento aguardando sua confirmação'
                : `${pendingDocs.length} documentos aguardando sua confirmação`}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Abra e leia para protocolar automaticamente.</p>
          </div>
          <button
            onClick={() => setActiveTab('pending')}
            className="shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-all active:scale-95"
          >
            Ver
          </button>
        </div>
      )}

      {/* ── Dashboard Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card Hero: Total + Progresso */}
        <div className="col-span-2 lg:col-span-2 p-4 bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-900 rounded-2xl shadow-lg shadow-indigo-500/20 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Total de Guias</p>
              <span className="text-4xl font-black text-white leading-none tracking-tighter">{documents.length}</span>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl">
              <LayoutList size={20} className="text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-indigo-200">Progresso de Leitura</span>
              <span className="text-[10px] font-black text-white">{readPercent}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-700 ease-out"
                style={{ width: `${readPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-indigo-200 mt-1.5">
              {readDocs.length} protocolados · {pendingDocs.length} pendentes
            </p>
          </div>
        </div>

        {/* Card Pendentes */}
        <div
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between hover:border-amber-400/50 dark:hover:border-amber-500/30 transition-all shadow-sm cursor-pointer group"
          onClick={() => setActiveTab('pending')}
        >
          <div className="flex justify-between items-start">
            <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
              <Clock size={16} className="text-amber-600 dark:text-amber-400" />
            </div>
            {pendingDocs.length > 0 && (
              <span className="flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
            )}
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{pendingDocs.length}</span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">Pendentes</p>
          </div>
        </div>

        {/* Card Protocolados */}
        <div
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between hover:border-emerald-400/50 dark:hover:border-emerald-500/30 transition-all shadow-sm cursor-pointer"
          onClick={() => setActiveTab('read')}
        >
          <div className="flex justify-between items-start">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
              <BadgeCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{readDocs.length}</span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">Protocolados</p>
          </div>
        </div>

        {/* Card Próximo Vencimento — full width em mobile, 4 colunas no desktop */}
        {nextDueDoc ? (
          <div className="col-span-2 lg:col-span-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-rose-400/40 dark:hover:border-rose-500/30 transition-all">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                (getDueDateStatus(nextDueDoc.due_date)?.daysLeft ?? 99) <= 3
                  ? 'bg-red-50 dark:bg-red-500/10'
                  : 'bg-amber-50 dark:bg-amber-500/10'
              }`}>
                <AlertCircle size={18} className={
                  (getDueDateStatus(nextDueDoc.due_date)?.daysLeft ?? 99) <= 3
                    ? 'text-red-500'
                    : 'text-amber-500'
                } />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Próximo Vencimento</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight truncate max-w-[200px] sm:max-w-none">
                  {nextDueDoc.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {nextDueDoc.sectors?.name || 'Geral'} · Comp. {nextDueDoc.competence_month}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-black ${getDueDateStatus(nextDueDoc.due_date)?.className}`}>
                {getDueDateStatus(nextDueDoc.due_date)?.label}
              </span>
              <button
                onClick={() => handleDownload(nextDueDoc)}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all active:scale-95 shadow-md shadow-indigo-500/20"
              >
                <Download size={14} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Toolbar de Filtros Compacta ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
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
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 rounded-xl p-1 shrink-0">
              <button
                onClick={() => navigatePeriod('prev')}
                disabled={periodIndex >= allMonths.length - 1}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={14} />
              </button>
              <select
                value={selectedCompetence}
                onChange={e => setSelectedCompetence(e.target.value)}
                className="bg-transparent text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider outline-none cursor-pointer px-1 max-w-[90px] sm:max-w-[100px]"
              >
                <option value="">TODOS</option>
                {allMonths.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <button
                onClick={() => navigatePeriod('next')}
                disabled={periodIndex === -1}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronRight size={14} />
              </button>
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
        <div>
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
                    className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-y border-slate-100 dark:border-slate-800 transition-colors"
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
                        {/* Barra lateral colorida */}
                        <div className={`w-1 shrink-0 ${sectorStyle.bar} rounded-none first:rounded-tl-none`} />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 flex-1 min-w-0">
                          {/* Info do documento */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Ícone de status — apenas md+ */}
                            <div className={`hidden md:flex shrink-0 p-3 rounded-xl transition-all group-hover:scale-105 ${
                              doc.status === 'Pendente'
                                ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : doc.status === 'Excluído'
                                  ? 'bg-red-50 dark:bg-red-500/10 text-red-500'
                                  : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {doc.status === 'Pendente' ? (
                                <div className="relative">
                                  <FileText size={22} />
                                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                                  </span>
                                </div>
                              ) : doc.status === 'Excluído' ? (
                                <Trash2 size={22} />
                              ) : (
                                <CheckCircle2 size={22} />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              {/* Nome + badges */}
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                  {doc.name}
                                </h4>
                                {doc.status === 'Pendente' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-500 text-white uppercase tracking-tighter shrink-0">
                                    NÃO LIDO
                                  </span>
                                )}
                                {doc.status === 'Lido' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-500 text-white uppercase tracking-tighter shrink-0">
                                    LIDO
                                  </span>
                                )}
                                {doc.is_paid && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-600 text-white uppercase tracking-tighter shrink-0 shadow-sm">
                                    PAGO
                                  </span>
                                )}
                                {isUrgent && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-red-500 text-white uppercase tracking-tighter shrink-0 animate-pulse">
                                    <TriangleAlert size={9} /> URGENTE
                                  </span>
                                )}
                              </div>

                              {/* Metadata */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${sectorStyle.badge}`}>
                                  {sectorStyle.icon}
                                  {doc.sectors?.name || 'Geral'}
                                </span>
                                {dueDateStatus && (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${dueDateStatus.className}`}>
                                    <Calendar size={10} />
                                    {dueDateStatus.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Botões de ação */}
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                            {/* Toggle pago (discreto) */}
                            <button
                              onClick={() => handlePaymentToggle(doc)}
                              title={doc.is_paid ? 'Marcar como não pago' : 'Marcar como pago'}
                              className={`p-2 rounded-xl border transition-all active:scale-95 ${
                                doc.is_paid
                                  ? 'bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200'
                                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              <DollarSign size={14} />
                            </button>

                            {/* Protocolo (só se lido) */}
                            {doc.status === 'Lido' && (
                              <button
                                onClick={() => handleViewProtocol(doc)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/30 rounded-xl text-[11px] font-black transition-all active:scale-95"
                              >
                                <Eye size={13} />
                                <span className="hidden sm:inline">Protocolo</span>
                              </button>
                            )}

                            {/* Botão principal: Abrir */}
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

      {/* ── Modal Upload ── */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => { setUploadModalOpen(false); setUploadFile(null); setIsDragging(false); }}
        title="Enviar Novo Documento"
        size="md"
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="secondary" onClick={() => { setUploadModalOpen(false); setUploadFile(null); }} className="flex-1">
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleUpload}
              disabled={isUploading}
              className="flex-1"
              icon={isUploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            >
              {isUploading ? 'Enviando...' : 'Confirmar Envio'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Área de upload drag-and-drop */}
          <div
            ref={dropRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 scale-[1.01]'
                : uploadFile
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-indigo-400'
            }`}
          >
            <div className={`p-4 rounded-full transition-all ${isDragging ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-500' : uploadFile ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
              {uploadFile ? <CheckCircle2 size={28} /> : <Upload size={28} />}
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {uploadFile ? uploadFile.name : isDragging ? 'Solte o arquivo aqui!' : 'Arraste ou clique para selecionar'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {uploadFile
                  ? `${(uploadFile.size / 1024 / 1024).toFixed(2)} MB`
                  : 'PDF, JPG, PNG ou DOCX — máx. 10MB'
                }
              </p>
            </div>
            {uploadFile && (
              <button
                onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors"
              >
                <X size={12} /> Remover arquivo
              </button>
            )}
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Setor</label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                value={uploadSector}
                onChange={(e) => setUploadSector(e.target.value)}
              >
                <option value="">Selecione o setor</option>
                {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Competência</label>
              <input
                type="text"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                placeholder="MM/AAAA"
                value={uploadCompetence}
                onChange={(e) => setUploadCompetence(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Modal>

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
