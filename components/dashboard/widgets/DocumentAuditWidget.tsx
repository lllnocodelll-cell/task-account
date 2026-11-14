import React, { useEffect, useState, useMemo, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import {
  motion,
  AnimatePresence,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  Trash2,
  User,
  AlertTriangle,
  Calendar,
  Search,
  X,
  RotateCcw,
  Filter,
  ChevronDown,
  ListOrdered,
  BarChart3,
  Clock,
  FileText,
  Layers,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';
import { Tooltip } from '../../ui/Tooltip';
import { Input, Select } from '../../ui/Input';

interface Props {
  orgId: string;
  onRemove?: () => void;
}

interface DeletionLogItem {
  id: string;
  client_id: string | null;
  client_name: string;
  document_name: string;
  document_type: string | null;
  competence_month: string | null;
  due_date: string | null;
  deletion_source: string;
  task_title: string | null;
  deleted_by_name: string;
  deleted_by_role: string | null;
  was_read_by_client: boolean;
  first_read_at: string | null;
  reason: string | null;
  created_at: string;
}

type PeriodFilter = 'today' | '7d' | '30d' | 'all';
type ReadFilter = 'all' | 'pre_read' | 'unread';
type SourceFilter = 'all' | 'reopen_task' | 'manual';
type ViewMode = 'timeline' | 'ranking';
type RankingGroupBy = 'operator' | 'client';

interface RankingEntry {
  key: string;
  label: string;
  totalCount: number;
  preReadCount: number;
  reopenCount: number;
}

const STORAGE_KEY_SHOW_CARDS = 'widget_document_audit_show_cards';

const PERIOD_OPTIONS: { id: PeriodFilter; label: string }[] = [
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: 'all', label: 'Geral' },
];

function formatDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDateBR(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatDueDateBR(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr.length < 10) return '—';
  const [y, m, day] = dateStr.substring(0, 10).split('-');
  if (!y || !m || !day) return dateStr;
  return `${day}/${m}/${y}`;
}

function formatRoleLabel(role: string | null | undefined): string {
  if (!role) return 'Operador';
  const norm = role.trim().toLowerCase();
  if (norm === 'gestor') return 'Gestor';
  if (norm === 'operacional' || norm === 'colaborador') return 'Colaborador';
  return role;
}

/**
 * Contador numérico animado estilo Motion Primitives (spring interpolation).
 */
const AnimatedNumber: React.FC<{ value: number; className?: string }> = ({
  value,
  className = '',
}) => {
  const spring = useSpring(value, { stiffness: 260, damping: 28, mass: 0.8 });
  const display = useTransform(spring, (latest) => Math.round(latest).toLocaleString('pt-BR'));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span className={className}>{display}</motion.span>;
};

/**
 * Grupo de abas com indicador deslizante via Framer Motion layoutId.
 */
interface SlidingTabOption<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

function SlidingTabGroup<T extends string>({
  options,
  value,
  onChange,
  activeTextClass = 'text-amber-600 dark:text-amber-400',
}: {
  options: readonly SlidingTabOption<NoInfer<T>>[];
  value: T;
  onChange: (next: NoInfer<T>) => void;
  activeTextClass?: string;
}) {
  const groupId = useId();

  return (
    <div className="inline-flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
      {options.map((opt) => {
        const isActive = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`relative px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 select-none ${
              isActive
                ? activeTextClass
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={`pill-${groupId}`}
                transition={{ type: 'spring', stiffness: 440, damping: 34 }}
                className="absolute inset-0 rounded-md bg-white dark:bg-slate-900 shadow-xs"
              />
            )}
            <span className="relative z-10 flex items-center gap-1 whitespace-nowrap">
              {opt.icon}
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export const DocumentAuditWidget: React.FC<Props> = ({ orgId, onRemove }) => {
  const [logs, setLogs] = useState<DeletionLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filtros
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  // Visão & Expansão
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [rankingBy, setRankingBy] = useState<RankingGroupBy>('operator');
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});
  const [isFullscreenModal, setIsFullscreenModal] = useState(false);
  const [showCards, setShowCards] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHOW_CARDS);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleShowCards = () => {
    setShowCards((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_SHOW_CARDS, String(next));
      } catch {
        // Ignora falha de cota
      }
      return next;
    });
  };

  const fetchAuditLogs = useCallback(
    async (silent = false) => {
      if (!orgId) return;
      if (!silent) setLoading(true);
      else setIsRefreshing(true);
      setFetchError(null);

      try {
        const { data, error } = await (
          supabase.from('client_document_deletion_logs' as any) as any
        )
          .select('*')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(200);

        if (error) throw error;

        const items: DeletionLogItem[] = (data || []).map((row: any) => ({
          id: row.id,
          client_id: row.client_id,
          client_name: row.client_name || 'Cliente',
          document_name: row.document_name || 'Documento',
          document_type: row.document_type || null,
          competence_month: row.competence_month || null,
          due_date: row.due_date || null,
          deletion_source: row.deletion_source || 'manual',
          task_title: row.task_title || null,
          deleted_by_name: row.deleted_by_name || 'Operador',
          deleted_by_role: row.deleted_by_role || null,
          was_read_by_client: !!row.was_read_by_client,
          first_read_at: row.first_read_at || null,
          reason: row.reason || null,
          created_at: row.created_at || new Date().toISOString(),
        }));

        setLogs(items);
      } catch (err) {
        console.error('Erro ao buscar logs de auditoria de exclusão:', err);
        setFetchError('Não foi possível carregar os logs de auditoria.');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [orgId]
  );

  useEffect(() => {
    fetchAuditLogs(false);
  }, [fetchAuditLogs]);

  // Fechar modo expandido com Esc
  useEffect(() => {
    if (!isFullscreenModal) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreenModal(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreenModal]);

  const userOptions = useMemo(() => {
    const userSet = new Set<string>();
    logs.forEach((l) => {
      if (l.deleted_by_name) userSet.add(l.deleted_by_name);
    });
    return [
      { value: 'all', label: 'Todos usuários' },
      ...Array.from(userSet)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .map((u) => ({ value: u, label: u })),
    ];
  }, [logs]);

  // Base filtrada por período, busca e operador (usada pelos KPIs e CategoryBar antes dos sub-filtros de risco/origem)
  const baseScopedLogs = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysThreshold = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysThreshold = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    const q = clientSearch.toLowerCase().trim();

    return logs.filter((log) => {
      if (period !== 'all') {
        const logDate = new Date(log.created_at).getTime();
        if (period === 'today' && logDate < startOfToday) return false;
        if (period === '7d' && logDate < sevenDaysThreshold) return false;
        if (period === '30d' && logDate < thirtyDaysThreshold) return false;
      }

      if (q) {
        const clientMatch = log.client_name.toLowerCase().includes(q);
        const docMatch = log.document_name.toLowerCase().includes(q);
        const taskMatch = (log.task_title || '').toLowerCase().includes(q);
        const reasonMatch = (log.reason || '').toLowerCase().includes(q);
        if (!clientMatch && !docMatch && !taskMatch && !reasonMatch) return false;
      }

      if (selectedUser !== 'all' && log.deleted_by_name !== selectedUser) {
        return false;
      }

      return true;
    });
  }, [logs, period, clientSearch, selectedUser]);

  // Logs finais com filtros de leitura prévia e origem aplicados
  const filteredLogs = useMemo(() => {
    return baseScopedLogs.filter((log) => {
      if (readFilter === 'pre_read' && !log.was_read_by_client) return false;
      if (readFilter === 'unread' && log.was_read_by_client) return false;
      if (sourceFilter === 'reopen_task' && log.deletion_source !== 'reopen_task') return false;
      if (sourceFilter === 'manual' && log.deletion_source === 'reopen_task') return false;
      return true;
    });
  }, [baseScopedLogs, readFilter, sourceFilter]);

  const metrics = useMemo(() => {
    const total = baseScopedLogs.length;
    const preRead = baseScopedLogs.filter((l) => l.was_read_by_client).length;
    const unread = total - preRead;
    const reopen = baseScopedLogs.filter((l) => l.deletion_source === 'reopen_task').length;

    const preReadPct = total > 0 ? Math.round((preRead / total) * 100) : 0;
    const unreadPct = total > 0 ? 100 - preReadPct : 0;
    const reopenPct = total > 0 ? Math.round((reopen / total) * 100) : 0;

    return {
      total,
      preRead,
      unread,
      reopen,
      preReadPct,
      unreadPct,
      reopenPct,
    };
  }, [baseScopedLogs]);

  // Dados agrupados para visão Ranking (Tremor BarList)
  const rankingEntries = useMemo<RankingEntry[]>(() => {
    const map = new Map<string, RankingEntry>();

    filteredLogs.forEach((log) => {
      const key =
        rankingBy === 'operator' ? log.deleted_by_name : log.client_name;
      const existing = map.get(key) || {
        key,
        label: key,
        totalCount: 0,
        preReadCount: 0,
        reopenCount: 0,
      };
      existing.totalCount += 1;
      if (log.was_read_by_client) existing.preReadCount += 1;
      if (log.deletion_source === 'reopen_task') existing.reopenCount += 1;
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      return b.preReadCount - a.preReadCount;
    });
  }, [filteredLogs, rankingBy]);

  const maxRankingCount = useMemo(
    () => Math.max(...rankingEntries.map((r) => r.totalCount), 1),
    [rankingEntries]
  );

  const hasActiveFilters =
    period !== '30d' ||
    clientSearch.trim() !== '' ||
    selectedUser !== 'all' ||
    readFilter !== 'all' ||
    sourceFilter !== 'all';

  const handleResetFilters = () => {
    setPeriod('30d');
    setClientSearch('');
    setSelectedUser('all');
    setReadFilter('all');
    setSourceFilter('all');
  };

  const toggleLogExpand = (id: string) => {
    setExpandedLogIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectRankingRow = (entry: RankingEntry) => {
    if (rankingBy === 'operator') {
      setSelectedUser(entry.label);
    } else {
      setClientSearch(entry.label);
    }
    setViewMode('timeline');
  };

  const periodLabel =
    period === 'today'
      ? 'Hoje'
      : period === '7d'
      ? 'Últimos 7 Dias'
      : period === '30d'
      ? 'Últimos 30 Dias'
      : 'Todo o Histórico';

  const headerActionsNode = (
    <div className="flex items-center gap-1.5 no-drag">
      <Tooltip content="Atualizar registros" position="top">
        <button
          type="button"
          onClick={() => fetchAuditLogs(true)}
          disabled={isRefreshing}
          className="h-6 w-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-50"
          aria-label="Atualizar auditoria"
        >
          <RefreshCw size={12} strokeWidth={2.2} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </Tooltip>

      <Tooltip
        content={showCards ? 'Ocultar cards de resumo' : 'Exibir cards de resumo'}
        position="top"
      >
        <button
          type="button"
          onClick={toggleShowCards}
          className={`h-6 w-6 flex items-center justify-center rounded-md transition-colors shrink-0 ${
            showCards
              ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          aria-label={showCards ? 'Ocultar resumo' : 'Exibir resumo'}
        >
          {showCards ? <Eye size={13} strokeWidth={2.2} /> : <EyeOff size={13} strokeWidth={2.2} />}
        </button>
      </Tooltip>

      <Tooltip content="Expandir auditoria para tela maior" position="top">
        <button
          type="button"
          onClick={() => setIsFullscreenModal(true)}
          className="h-6 w-6 flex items-center justify-center rounded-md text-slate-400 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          aria-label="Expandir auditoria"
        >
          <Maximize2 size={12} strokeWidth={2.2} />
        </button>
      </Tooltip>
    </div>
  );

  const renderAuditBody = (isModalView = false) => (
    <div
      className={`flex-1 flex flex-col min-h-0 space-y-2.5 overflow-y-auto custom-scrollbar pr-0.5 ${
        isModalView ? 'p-4' : ''
      }`}
    >
      {/* Barra Superior: Período (SlidingTabGroup) + Alternador de Visão */}
      <div className="flex items-center justify-between gap-2 flex-wrap shrink-0 pb-1.5 border-b border-slate-100 dark:border-slate-800 no-drag">
        <div className="flex items-center gap-1.5">
          <Calendar size={12} className="text-amber-500 shrink-0" />
          <SlidingTabGroup
            options={PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
            activeTextClass="text-amber-600 dark:text-amber-400"
          />
        </div>

        <SlidingTabGroup
          options={[
            { id: 'timeline', label: 'Registros', icon: <ListOrdered size={11} /> },
            { id: 'ranking', label: 'Ranking', icon: <BarChart3 size={11} /> },
          ]}
          value={viewMode}
          onChange={setViewMode}
          activeTextClass="text-indigo-600 dark:text-indigo-400"
        />
      </div>

      {/* Filtros Padronizados: Busca (<Input>) + Operador (<Select>) + Reset */}
      <div className="flex items-center gap-1.5 shrink-0 no-drag flex-wrap sm:flex-nowrap">
        <div className="relative flex-1 min-w-[140px]">
          <Input
            type="text"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="Buscar cliente, documento, tarefa..."
            icon={<Search size={12} />}
            className="!h-8 !text-xs pr-7"
          />
          {clientSearch && (
            <Tooltip content="Limpar busca" position="top">
              <button
                type="button"
                onClick={() => setClientSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                aria-label="Limpar busca"
              >
                <X size={12} />
              </button>
            </Tooltip>
          )}
        </div>

        <div className="w-[150px] shrink-0">
          <Select
            options={userOptions}
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="!h-8 !py-1 !px-2.5 !text-xs"
            aria-label="Filtrar por operador"
          />
        </div>

        {hasActiveFilters && (
          <Tooltip content="Limpar todos os filtros" position="top">
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors shrink-0"
              aria-label="Limpar filtros"
            >
              <RotateCcw size={12} />
            </button>
          </Tooltip>
        )}
      </div>

      {/* Tremor KPI Cards + BorderBeam + CategoryBar */}
      {showCards && (
        <div className="space-y-2 shrink-0 animate-in fade-in duration-200 no-drag">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(108px,1fr))] gap-2">
            {/* Card 1: Total de Exclusões */}
            <button
              type="button"
              onClick={() => {
                setReadFilter('all');
                setSourceFilter('all');
              }}
              className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                readFilter === 'all' && sourceFilter === 'all'
                  ? 'bg-slate-50 dark:bg-slate-800/70 border-slate-300 dark:border-slate-700 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                  <Trash2 size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                  Exclusões
                </span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={periodLabel}
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.15 }}
                    className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[72px]"
                  >
                    {period === 'all' ? 'Geral' : period === 'today' ? 'Hoje' : period}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-1">
                <AnimatedNumber
                  value={metrics.total}
                  className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  registros
                </span>
              </div>
            </button>

            {/* Card 2: Lidos Pré-exclusão */}
            <button
              type="button"
              onClick={() =>
                setReadFilter((prev) => (prev === 'pre_read' ? 'all' : 'pre_read'))
              }
              className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                readFilter === 'pre_read'
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 dark:border-amber-500/60 shadow-xs'
                  : metrics.preRead > 0
                  ? 'bg-amber-50/40 dark:bg-amber-950/25 border-amber-200 dark:border-amber-500/35 hover:border-amber-300 dark:hover:border-amber-500/50'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1 truncate">
                  <AlertTriangle size={11} className="shrink-0" />
                  Lidos Antes
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 tabular-nums shrink-0">
                  {metrics.preReadPct}%
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-1">
                <AnimatedNumber
                  value={metrics.preRead}
                  className="text-lg font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums"
                />
                <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 truncate">
                  protocolo
                </span>
              </div>
            </button>

            {/* Card 3: Via Reabertura de Tarefa */}
            <button
              type="button"
              onClick={() =>
                setSourceFilter((prev) => (prev === 'reopen_task' ? 'all' : 'reopen_task'))
              }
              className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                sourceFilter === 'reopen_task'
                  ? 'bg-indigo-50/80 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/50 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/40'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                  <Layers size={11} className="text-indigo-500 shrink-0" />
                  Reabertura
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 tabular-nums shrink-0">
                  {metrics.reopenPct}%
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-1">
                <AnimatedNumber
                  value={metrics.reopen}
                  className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  tarefas
                </span>
              </div>
            </button>
          </div>

          {/* Tremor CategoryBar de Risco de Leitura Prévia */}
          {metrics.total > 0 && (
            <div className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="font-medium text-slate-500 dark:text-slate-400">
                  Risco de Leitura Prévia
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                  {metrics.preRead} lidos · {metrics.unread} não lidos
                </span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex gap-0.5">
                {metrics.preRead > 0 && (
                  <Tooltip
                    content={`Lidos pelo cliente antes da exclusão: ${metrics.preRead} (${metrics.preReadPct}%) — clique para filtrar`}
                    position="top"
                    className="h-full"
                    style={{ width: `${metrics.preReadPct}%` }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setReadFilter((prev) => (prev === 'pre_read' ? 'all' : 'pre_read'))
                      }
                      className="w-full h-full bg-amber-500 hover:opacity-85 transition-opacity cursor-pointer"
                      aria-label="Filtrar lidos antes da exclusão"
                    />
                  </Tooltip>
                )}
                {metrics.unread > 0 && (
                  <Tooltip
                    content={`Não lidos antes da exclusão: ${metrics.unread} (${metrics.unreadPct}%) — clique para filtrar`}
                    position="top"
                    className="h-full"
                    style={{ width: `${metrics.unreadPct}%` }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setReadFilter((prev) => (prev === 'unread' ? 'all' : 'unread'))
                      }
                      className="w-full h-full bg-slate-300 dark:bg-slate-700 hover:opacity-85 transition-opacity cursor-pointer"
                      aria-label="Filtrar não lidos antes da exclusão"
                    />
                  </Tooltip>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-filtros ativos (badges de leitura/origem) */}
      {(readFilter !== 'all' || sourceFilter !== 'all') && (
        <div className="flex flex-wrap items-center gap-1.5 shrink-0 no-drag">
          {readFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setReadFilter('all')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/25 transition-colors"
            >
              <span>{readFilter === 'pre_read' ? 'Filtro: Lidos antes' : 'Filtro: Não lidos'}</span>
              <X size={10} />
            </button>
          )}
          {sourceFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setSourceFilter('all')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors"
            >
              <span>
                {sourceFilter === 'reopen_task'
                  ? 'Filtro: Reabertura de Tarefa'
                  : 'Filtro: Exclusão Manual'}
              </span>
              <X size={10} />
            </button>
          )}
        </div>
      )}

      {/* Área Principal: Timeline (Acordeão Animate UI) ou Ranking (BarList Tremor) */}
      <div className="flex-1 min-h-[160px] overflow-y-auto custom-scrollbar pr-0.5">
        {loading ? (
          <div className="animate-pulse space-y-2 py-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 space-y-2"
              >
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                <div className="h-2.5 bg-slate-200 dark:bg-slate-700/60 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{fetchError}</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          hasActiveFilters ? (
            <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-center p-4">
              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-2">
                <Filter size={17} />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Nenhum resultado para os filtros
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-[230px]">
                Nenhuma exclusão corresponde aos critérios selecionados.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2.5 px-3 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/25 transition-colors flex items-center gap-1"
              >
                <RotateCcw size={11} />
                Limpar Filtros
              </button>
            </div>
          ) : (
            <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-center p-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                <ShieldCheck size={20} />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Nenhuma exclusão registrada
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-[220px]">
                Todos os documentos enviados à área do cliente permanecem íntegros no portal.
              </p>
            </div>
          )
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === 'ranking' ? (
              <motion.div
                key="ranking-view"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                className="space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2 px-0.5 no-drag">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Concentração de Exclusões
                  </span>
                  <SlidingTabGroup
                    options={[
                      { id: 'operator', label: 'Por Operador' },
                      { id: 'client', label: 'Por Cliente' },
                    ]}
                    value={rankingBy}
                    onChange={setRankingBy}
                    activeTextClass="text-indigo-600 dark:text-indigo-400"
                  />
                </div>

                {/* Tremor BarList */}
                <div className="space-y-1.5">
                  {rankingEntries.map((entry, idx) => {
                    const widthPct = Math.max(8, (entry.totalCount / maxRankingCount) * 100);
                    return (
                      <Tooltip
                        key={entry.key}
                        content={`Clique para filtrar registros de ${entry.label}`}
                        position="top"
                        className="block w-full"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectRankingRow(entry)}
                          className="w-full relative overflow-hidden p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/40 text-left transition-colors cursor-pointer group"
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${widthPct}%` }}
                            transition={{
                              duration: 0.35,
                              delay: Math.min(idx * 0.03, 0.2),
                              ease: 'easeOut',
                            }}
                            className={`absolute inset-y-0 left-0 ${
                              entry.preReadCount > 0
                                ? 'bg-amber-50 dark:bg-amber-500/10'
                                : 'bg-indigo-50/70 dark:bg-indigo-500/10'
                            }`}
                          />
                          <div className="relative z-10 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 tabular-nums">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {entry.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                              {entry.preReadCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                  {entry.preReadCount} lido{entry.preReadCount > 1 ? 's' : ''}
                                </span>
                              )}
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {entry.totalCount}
                              </span>
                            </div>
                          </div>
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="timeline-view"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                className="space-y-1.5"
              >
                {filteredLogs.map((log, idx) => {
                  const isExpanded = !!expandedLogIds[log.id];
                  const isReopen = log.deletion_source === 'reopen_task';

                  return (
                    <motion.div
                      key={log.id}
                      initial={idx < 12 ? { opacity: 0, y: 8 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.18,
                        delay: idx < 12 ? idx * 0.025 : 0,
                      }}
                      className={`rounded-xl border transition-colors overflow-hidden ${
                        log.was_read_by_client
                          ? 'bg-white dark:bg-slate-900 border-amber-200/80 dark:border-amber-500/30 hover:border-amber-300 dark:hover:border-amber-500/50'
                          : 'bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Cabeçalho clicável do Acordeão (Animate UI) */}
                      <button
                        type="button"
                        onClick={() => toggleLogExpand(log.id)}
                        className="w-full p-2.5 text-left flex items-start justify-between gap-2 cursor-pointer focus:outline-none hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <div
                            className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                              log.was_read_by_client
                                ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-rose-50 dark:bg-rose-500/15 text-rose-500 dark:text-rose-400'
                            }`}
                          >
                            <Trash2 size={12} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <Tooltip content={log.document_name} position="top" className="block max-w-full">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">
                                {log.document_name}
                              </span>
                            </Tooltip>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                                {log.client_name}
                              </span>
                              <span>·</span>
                              <span className="truncate">{log.deleted_by_name}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {log.was_read_by_client ? (
                            <Tooltip
                              content={
                                log.first_read_at
                                  ? `Visualizado pelo cliente em ${formatDateTimeBR(log.first_read_at)}`
                                  : 'Cliente já havia visualizado antes da exclusão'
                              }
                              position="left"
                            >
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                                <Eye size={10} />
                                Lido
                              </span>
                            </Tooltip>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              Não lido
                            </span>
                          )}

                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                            {formatShortDateBR(log.created_at)}
                          </span>

                          <ChevronDown
                            size={14}
                            className={`text-slate-400 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-indigo-500' : ''
                            }`}
                          />
                        </div>
                      </button>

                      {/* Trilha Detalhada Expansível */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-2 text-[11px]">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                  <User size={11} className="text-slate-400 shrink-0" />
                                  <span className="truncate">
                                    <strong>Por:</strong> {log.deleted_by_name} (
                                    {formatRoleLabel(log.deleted_by_role)})
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 tabular-nums">
                                  <Clock size={11} className="text-slate-400 shrink-0" />
                                  <span className="truncate">
                                    <strong>Excluído em:</strong> {formatDateTimeBR(log.created_at)}
                                  </span>
                                </div>

                                {log.competence_month && (
                                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 tabular-nums">
                                    <Calendar size={11} className="text-slate-400 shrink-0" />
                                    <span>
                                      <strong>Competência:</strong> {log.competence_month}
                                    </span>
                                  </div>
                                )}

                                {(log.document_type || log.due_date) && (
                                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 tabular-nums">
                                    <FileText size={11} className="text-slate-400 shrink-0" />
                                    <span className="truncate">
                                      {log.document_type ? (
                                        <>
                                          <strong>Tipo:</strong> {log.document_type}
                                        </>
                                      ) : null}
                                      {log.document_type && log.due_date ? ' · ' : ''}
                                      {log.due_date ? `Venc: ${formatDueDateBR(log.due_date)}` : ''}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {log.was_read_by_client && (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 tabular-nums">
                                  <Eye size={11} className="shrink-0" />
                                  <span>
                                    <strong>Protocolo de leitura:</strong>{' '}
                                    {log.first_read_at
                                      ? `Cliente visualizou em ${formatDateTimeBR(log.first_read_at)}`
                                      : 'Confirmado antes da exclusão'}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                    isReopen
                                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                                      : 'bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  {isReopen
                                    ? `Origem: Reabertura${log.task_title ? ` (${log.task_title})` : ''}`
                                    : 'Origem: Exclusão Manual no Cliente'}
                                </span>
                              </div>

                              {log.reason && (
                                <div className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                                  <strong>Motivo:</strong> {log.reason}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );

  return (
    <WidgetContainer
      title="AUDITORIA DE DOCUMENTOS"
      icon={<ShieldAlert size={14} className="text-amber-500" />}
      headerActions={headerActionsNode}
      onRemove={onRemove}
    >
      {renderAuditBody(false)}

      {/* Modal Expandido em Tela Maior (Animate UI + Portal) */}
      {isFullscreenModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
            onClick={() => setIsFullscreenModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabeçalho alinhado ao padrão WidgetContainer */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-start justify-between gap-3 shrink-0">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shrink-0 shadow-sm text-amber-500 flex items-center mt-0.5">
                    <ShieldAlert size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-col min-w-0">
                      <h4 className="text-[10px] sm:text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-[0.18em] sm:tracking-[0.25em] uppercase leading-none truncate">
                        AUDITORIA DE DOCUMENTOS · TRILHA COMPLETA
                      </h4>
                      <div className="h-0.5 w-4 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1 rounded-full" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1.5 tabular-nums">
                      {filteredLogs.length}{' '}
                      {filteredLogs.length === 1 ? 'registro exibido' : 'registros exibidos'} ·{' '}
                      {periodLabel}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Tooltip content="Reduzir para o widget" position="bottom">
                    <button
                      type="button"
                      onClick={() => setIsFullscreenModal(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                      aria-label="Reduzir para o widget"
                    >
                      <Minimize2 size={15} />
                    </button>
                  </Tooltip>
                  <Tooltip content="Fechar (Esc)" position="left">
                    <button
                      type="button"
                      onClick={() => setIsFullscreenModal(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                      aria-label="Fechar"
                    >
                      <X size={16} />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {renderAuditBody(true)}

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs shrink-0">
                <span className="text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                  {filteredLogs.length}{' '}
                  {filteredLogs.length === 1 ? 'exclusão listada' : 'exclusões listadas'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsFullscreenModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-200 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
    </WidgetContainer>
  );
};
