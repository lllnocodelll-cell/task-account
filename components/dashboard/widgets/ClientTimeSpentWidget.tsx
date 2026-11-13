import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Timer,
  Filter,
  ArrowUpDown,
  Search,
  Layers,
  User,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Flame,
  Zap,
  BarChart2,
  List,
  Eye,
  EyeOff,
  X,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';
import { Tooltip } from '../../ui/Tooltip';
import { Input, Select } from '../../ui/Input';
import { formatSecondsToFriendly } from './CollaboratorPerformanceWidget';
import { TAX_REGIME_LABELS } from '../../../types';

interface Props {
  orgId: string;
  onRemove?: () => void;
}

interface RawTaskItem {
  id: string;
  taskName: string;
  sector?: string;
  responsible?: string;
  status: string;
  secondsSpent: number;
}

interface RawClientGroup {
  clientId: string;
  clientName: string;
  document?: string;
  taxRegime?: string;
  city?: string;
  state?: string;
  tasks: RawTaskItem[];
}

interface ClientTaskItem extends RawTaskItem {
  percentageOfClientTime: number;
}

interface ClientMetric {
  clientId: string;
  clientName: string;
  document?: string;
  taxRegime?: string;
  city?: string;
  state?: string;
  totalSecondsSpent: number;
  totalTasksCount: number;
  avgSecondsPerTask: number;
  criticalTasksCount: number;
  tasks: ClientTaskItem[];
}

interface SectorSlice {
  name: string;
  seconds: number;
  pct: number;
  colorClass: string;
  dotClass: string;
}

interface ChartClientRow {
  clientId: string;
  shortName: string;
  fullName: string;
  minutes: number;
  totalSeconds: number;
  avgSeconds: number;
  tasksCount: number;
}

type FilterMode = 'task' | 'client';
type SortKey = 'time' | 'avg' | 'critical' | 'name';
type ViewMode = 'list' | 'chart';

const STORAGE_KEY_SHOW_SUMMARY = 'widget_client_time_show_summary';

const TASK_THRESHOLD_OPTIONS = [
  { value: 1800, label: '≥ 30 min (Gargalos - Padrão)' },
  { value: 3600, label: '≥ 1 hora (Críticos)' },
  { value: 7200, label: '≥ 2 horas' },
  { value: 900, label: '≥ 15 min' },
  { value: -1800, label: '< 30 min (Alta Performance)' },
  { value: -900, label: '< 15 min (Super Rápidas)' },
  { value: 0, label: 'Todas as tarefas' },
];

const CLIENT_THRESHOLD_OPTIONS = [
  { value: 3600, label: '≥ 1 hora (Padrão)' },
  { value: 7200, label: '≥ 2 horas' },
  { value: 18000, label: '≥ 5 horas' },
  { value: 1800, label: '≥ 30 min' },
  { value: -1800, label: '< 30 min (Alta Performance)' },
  { value: -3600, label: '< 1 hora (Ágeis)' },
  { value: 0, label: 'Todos os clientes' },
];

const TASK_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'Concluída', label: 'Concluída' },
  { value: 'Iniciada', label: 'Em andamento (Iniciada)' },
  { value: 'Pendente', label: 'Pendente' },
  { value: 'Pausada', label: 'Pausada' },
  { value: 'Atrasada', label: 'Atrasada' },
];

const SECTOR_PALETTE = [
  { colorClass: 'bg-indigo-500', dotClass: 'bg-indigo-500' },
  { colorClass: 'bg-emerald-500', dotClass: 'bg-emerald-500' },
  { colorClass: 'bg-sky-500', dotClass: 'bg-sky-500' },
  { colorClass: 'bg-amber-500', dotClass: 'bg-amber-500' },
  { colorClass: 'bg-slate-400 dark:bg-slate-600', dotClass: 'bg-slate-400 dark:bg-slate-500' },
];

function truncateLabel(text: string, maxLen = 22): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartClientRow }>;
}

const CustomClientChartTooltip: React.FC<ChartTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-lg min-w-[200px] max-w-[260px]">
      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1.5 truncate">
        {item.fullName}
      </p>
      <div className="space-y-1 text-xs tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500 dark:text-slate-400">Tempo total</span>
          <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {formatSecondsToFriendly(item.totalSeconds)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500 dark:text-slate-400">Média / tarefa</span>
          <span className="font-semibold font-mono text-sky-600 dark:text-sky-400">
            {formatSecondsToFriendly(item.avgSeconds)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500 dark:text-slate-400">Tarefas</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {item.tasksCount}
          </span>
        </div>
      </div>
    </div>
  );
};

export const ClientTimeSpentWidget: React.FC<Props> = ({ orgId, onRemove }) => {
  const now = new Date();
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultPeriod = `${prevMonthDate.getFullYear()}-${(prevMonthDate.getMonth() + 1)
    .toString()
    .padStart(2, '0')}`;

  const [rawClients, setRawClients] = useState<RawClientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [period, setPeriod] = useState(defaultPeriod);
  const [filterMode, setFilterMode] = useState<FilterMode>('task');
  const [taskThreshold, setTaskThreshold] = useState<number>(1800);
  const [clientThreshold, setClientThreshold] = useState<number>(3600);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('time');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  // Filtros avançados em memória (instantâneos)
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedRegime, setSelectedRegime] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [showSummary, setShowSummary] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHOW_SUMMARY);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const monthInputRef = useRef<HTMLInputElement>(null);

  const toggleShowSummary = () => {
    setShowSummary((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_SHOW_SUMMARY, String(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const base = period || defaultPeriod;
    const [year, month] = base.split('-').map(Number);
    const date = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
    setPeriod(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
  };

  const resetToDefaultPeriod = () => setPeriod(defaultPeriod);

  const openMonthPicker = () => {
    const el = monthInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch {
        // Fallback below
      }
    }
    el.click();
  };

  const fetchData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setFetchError(null);

    try {
      let query = (supabase as any)
        .from('tasks')
        .select(`
          id,
          task_name,
          client_id,
          client_name,
          sector,
          responsible,
          status,
          competence,
          tax_regime,
          created_at,
          started_at,
          completed_at,
          total_time_spent_seconds,
          timer_started_at,
          clients (
            id,
            company_name,
            trade_name,
            document,
            city,
            state
          )
        `)
        .eq('org_id', orgId);

      if (period) query = query.eq('competence', period);

      const { data: result, error } = await query;
      if (error) throw error;

      if (result) {
        const nowMs = Date.now();
        const clientMap: Record<string, RawClientGroup> = {};

        result.forEach((row: any) => {
          const clientKey = row.client_id || row.client_name || 'Sem cliente';
          const clientDisplayName =
            row.clients?.company_name ||
            row.clients?.trade_name ||
            row.client_name ||
            'Cliente Não Identificado';

          if (!clientMap[clientKey]) {
            clientMap[clientKey] = {
              clientId: clientKey,
              clientName: clientDisplayName,
              document: row.clients?.document,
              taxRegime: row.tax_regime,
              city: row.clients?.city,
              state: row.clients?.state,
              tasks: [],
            };
          }

          let taskSeconds = row.total_time_spent_seconds || 0;

          if (row.status === 'Iniciada' && row.timer_started_at) {
            const startMs = new Date(row.timer_started_at).getTime();
            const currentLiveSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
            taskSeconds += currentLiveSec;
          }

          if (taskSeconds === 0 && row.status === 'Concluída') {
            const startFallback = row.started_at
              ? new Date(row.started_at).getTime()
              : row.created_at
              ? new Date(row.created_at).getTime()
              : null;
            const completedFallback = row.completed_at
              ? new Date(row.completed_at).getTime()
              : null;
            if (startFallback && completedFallback && completedFallback > startFallback) {
              taskSeconds = Math.floor((completedFallback - startFallback) / 1000);
            }
          }

          clientMap[clientKey].tasks.push({
            id: row.id,
            taskName: row.task_name || 'Tarefa',
            sector: row.sector,
            responsible: row.responsible,
            status: row.status,
            secondsSpent: taskSeconds,
          });
        });

        setRawClients(Object.values(clientMap));
      }
    } catch (err) {
      console.error('Erro ao buscar tempo por cliente:', err);
      setFetchError('Não foi possível carregar o tempo por cliente e tarefa.');
    } finally {
      setLoading(false);
    }
  }, [orgId, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Opções dinâmicas de Setor e Regime Tributário para o mês carregado
  const { sectorOptions, regimeOptions } = useMemo(() => {
    const sectors = new Set<string>();
    const regimes = new Set<string>();

    rawClients.forEach((c) => {
      if (c.taxRegime) regimes.add(c.taxRegime);
      c.tasks.forEach((t) => {
        if (t.sector?.trim()) sectors.add(t.sector.trim());
      });
    });

    const sortedSectors = Array.from(sectors)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((s) => ({ value: s, label: s }));

    const sortedRegimes = Array.from(regimes)
      .sort((a, b) =>
        (TAX_REGIME_LABELS[a] || a).localeCompare(TAX_REGIME_LABELS[b] || b, 'pt-BR')
      )
      .map((r) => ({ value: r, label: TAX_REGIME_LABELS[r] || r }));

    return {
      sectorOptions: [{ value: 'all', label: 'Todos os setores' }, ...sortedSectors],
      regimeOptions: [{ value: 'all', label: 'Todos os regimes' }, ...sortedRegimes],
    };
  }, [rawClients]);

  const isTaskLessThan = taskThreshold < 0;
  const absTaskThreshold = Math.abs(taskThreshold);
  const isClientLessThan = clientThreshold < 0;
  const absClientThreshold = Math.abs(clientThreshold);

  const activeAdvancedFilterCount =
    (selectedSector !== 'all' ? 1 : 0) +
    (selectedRegime !== 'all' ? 1 : 0) +
    (selectedStatus !== 'all' ? 1 : 0);

  const clearAdvancedFilters = () => {
    setSelectedSector('all');
    setSelectedRegime('all');
    setSelectedStatus('all');
  };

  // Constrói métricas recalculadas em memória considerando filtros de status, regime e setor
  const buildMetrics = useCallback(
    (applySectorFilter: boolean): ClientMetric[] => {
      return rawClients
        .filter((c) => {
          if (selectedRegime !== 'all' && c.taxRegime !== selectedRegime) return false;
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          return (
            c.clientName.toLowerCase().includes(q) ||
            (c.document && c.document.toLowerCase().includes(q)) ||
            (c.city && c.city.toLowerCase().includes(q))
          );
        })
        .map((c) => {
          const scopedTasks = c.tasks.filter((t) => {
            if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
            if (applySectorFilter && selectedSector !== 'all') {
              const taskSec = t.sector?.trim() || 'Sem setor';
              if (taskSec !== selectedSector) return false;
            }
            return true;
          });

          const totalSecondsSpent = scopedTasks.reduce((acc, t) => acc + t.secondsSpent, 0);

          const processedTasks: ClientTaskItem[] = scopedTasks
            .map((t) => ({
              ...t,
              percentageOfClientTime:
                totalSecondsSpent > 0 ? Math.round((t.secondsSpent / totalSecondsSpent) * 100) : 0,
            }))
            .sort((a, b) => b.secondsSpent - a.secondsSpent);

          const matchingCount = processedTasks.filter((t) => {
            if (taskThreshold === 0) return true;
            if (isTaskLessThan) return t.secondsSpent > 0 && t.secondsSpent < absTaskThreshold;
            return t.secondsSpent >= taskThreshold;
          }).length;

          const avgSecondsPerTask =
            processedTasks.length > 0 ? Math.round(totalSecondsSpent / processedTasks.length) : 0;

          return {
            clientId: c.clientId,
            clientName: c.clientName,
            document: c.document,
            taxRegime: c.taxRegime,
            city: c.city,
            state: c.state,
            totalSecondsSpent,
            totalTasksCount: processedTasks.length,
            avgSecondsPerTask,
            criticalTasksCount: matchingCount,
            tasks: processedTasks,
          };
        })
        .filter((m) => {
          if (m.totalTasksCount === 0) return false;
          if (filterMode === 'task') {
            if (taskThreshold !== 0 && m.criticalTasksCount === 0) return false;
          } else {
            if (clientThreshold > 0 && m.totalSecondsSpent < clientThreshold) return false;
            if (
              clientThreshold < 0 &&
              (m.totalSecondsSpent === 0 || m.totalSecondsSpent >= absClientThreshold)
            ) {
              return false;
            }
          }
          return true;
        });
    },
    [
      rawClients,
      selectedRegime,
      selectedStatus,
      selectedSector,
      searchQuery,
      taskThreshold,
      isTaskLessThan,
      absTaskThreshold,
      filterMode,
      clientThreshold,
      absClientThreshold,
    ]
  );

  // Métricas sem filtro de setor (para manter todas as opções clicáveis na barra de distribuição por setor)
  const metricsBeforeSector = useMemo(() => buildMetrics(false), [buildMetrics]);

  const filteredAndSortedMetrics = useMemo(() => {
    const list = selectedSector === 'all' ? metricsBeforeSector : buildMetrics(true);
    return [...list].sort((a, b) => {
      if (sortBy === 'time') return b.totalSecondsSpent - a.totalSecondsSpent;
      if (sortBy === 'avg') return b.avgSecondsPerTask - a.avgSecondsPerTask;
      if (sortBy === 'critical') return b.criticalTasksCount - a.criticalTasksCount;
      return a.clientName.localeCompare(b.clientName, 'pt-BR');
    });
  }, [metricsBeforeSector, selectedSector, buildMetrics, sortBy]);

  const totals = useMemo(() => {
    let sumSeconds = 0;
    let sumTasks = 0;
    let sumCriticalTasks = 0;
    let totalClientsWithTime = 0;

    filteredAndSortedMetrics.forEach((m) => {
      sumSeconds += m.totalSecondsSpent;
      sumTasks += m.totalTasksCount;
      sumCriticalTasks += m.criticalTasksCount;
      if (m.totalSecondsSpent > 0) totalClientsWithTime += 1;
    });

    const avgSecondsPerClient =
      totalClientsWithTime > 0 ? Math.round(sumSeconds / totalClientsWithTime) : 0;
    const avgSecondsOverallTask = sumTasks > 0 ? Math.round(sumSeconds / sumTasks) : 0;
    const attendedPct =
      rawClients.length > 0 ? Math.round((totalClientsWithTime / rawClients.length) * 100) : 0;
    const criticalTaskPct =
      sumTasks > 0 ? Math.round((sumCriticalTasks / sumTasks) * 100) : 0;

    return {
      totalClients: rawClients.length,
      totalClientsWithTime,
      attendedPct,
      sumSeconds,
      sumTasks,
      avgSecondsPerClient,
      avgSecondsOverallTask,
      sumCriticalTasks,
      criticalTaskPct,
    };
  }, [rawClients.length, filteredAndSortedMetrics]);

  // Distribuição de horas por setor (Tremor CategoryBar clicável)
  const { sectorDistribution, totalSectorBaseSeconds } = useMemo(() => {
    const sectorTotals: Record<string, number> = {};
    let totalSec = 0;

    metricsBeforeSector.forEach((client) => {
      client.tasks.forEach((t) => {
        if (t.secondsSpent <= 0) return;
        const sec = t.sector?.trim() || 'Sem setor';
        sectorTotals[sec] = (sectorTotals[sec] || 0) + t.secondsSpent;
        totalSec += t.secondsSpent;
      });
    });

    if (totalSec === 0) {
      return { sectorDistribution: [] as SectorSlice[], totalSectorBaseSeconds: 0 };
    }

    const sorted = Object.entries(sectorTotals).sort((a, b) => b[1] - a[1]);
    const topFour = sorted.slice(0, 4);
    const othersSeconds = sorted.slice(4).reduce((acc, [, sec]) => acc + sec, 0);

    const combined =
      othersSeconds > 0 ? [...topFour, ['Outros', othersSeconds] as [string, number]] : topFour;

    const slices: SectorSlice[] = combined.map(([name, seconds], idx) => ({
      name,
      seconds,
      pct: Math.round((seconds / totalSec) * 100),
      colorClass: SECTOR_PALETTE[idx]?.colorClass || SECTOR_PALETTE[4].colorClass,
      dotClass: SECTOR_PALETTE[idx]?.dotClass || SECTOR_PALETTE[4].dotClass,
    }));

    return { sectorDistribution: slices, totalSectorBaseSeconds: totalSec };
  }, [metricsBeforeSector]);

  // Dados para visão gráfica (Top 10 clientes por tempo)
  const chartRows = useMemo<ChartClientRow[]>(() => {
    return filteredAndSortedMetrics
      .filter((c) => c.totalSecondsSpent > 0)
      .slice(0, 10)
      .map((c) => ({
        clientId: c.clientId,
        shortName: truncateLabel(c.clientName, 20),
        fullName: c.clientName,
        minutes: Math.max(1, Math.round(c.totalSecondsSpent / 60)),
        totalSeconds: c.totalSecondsSpent,
        avgSeconds: c.avgSecondsPerTask,
        tasksCount: c.totalTasksCount,
      }));
  }, [filteredAndSortedMetrics]);

  const maxFilteredSeconds = useMemo(() => {
    if (filteredAndSortedMetrics.length === 0) return 1;
    return Math.max(...filteredAndSortedMetrics.map((m) => m.totalSecondsSpent), 1);
  }, [filteredAndSortedMetrics]);

  const periodLabel = period ? `${period.split('-')[1]}/${period.split('-')[0]}` : 'Todos';

  const sortLabel =
    sortBy === 'time'
      ? 'Tempo Total'
      : sortBy === 'avg'
      ? 'Média/Tarefa'
      : sortBy === 'critical'
      ? isTaskLessThan
        ? 'Mais Rápidas'
        : 'Mais Demoradas'
      : 'Nome A-Z';

  const nextSort = () => {
    setSortBy((prev) =>
      prev === 'time' ? 'avg' : prev === 'avg' ? 'critical' : prev === 'critical' ? 'name' : 'time'
    );
  };

  const activeThresholdOptions =
    filterMode === 'task' ? TASK_THRESHOLD_OPTIONS : CLIENT_THRESHOLD_OPTIONS;
  const activeThresholdValue = filterMode === 'task' ? taskThreshold : clientThreshold;

  const isFastFocus =
    (filterMode === 'task' && isTaskLessThan) || (filterMode === 'client' && isClientLessThan);
  const isBottleneckFocus = filterMode === 'task' && taskThreshold > 0;

  return (
    <WidgetContainer
      title="TEMPO POR CLIENTE E TAREFA"
      icon={<Building2 size={14} />}
      onRemove={onRemove}
      compactThreshold={980}
      headerActions={
        <div className="flex flex-wrap items-center gap-1.5 no-drag">
          {/* Ocultar/Exibir KPIs */}
          <Tooltip
            content={showSummary ? 'Ocultar resumo de métricas' : 'Exibir resumo de métricas'}
            position="top"
          >
            <button
              type="button"
              onClick={toggleShowSummary}
              className={`h-6 w-6 flex items-center justify-center rounded-md transition-colors shrink-0 ${
                showSummary
                  ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              aria-label={showSummary ? 'Ocultar métricas' : 'Exibir métricas'}
            >
              {showSummary ? <Eye size={13} strokeWidth={2.2} /> : <EyeOff size={13} strokeWidth={2.2} />}
            </button>
          </Tooltip>

          {/* Alternador Lista vs Gráfico */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
            <Tooltip content="Visualizar em lista detalhada" position="top">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`h-5 px-1.5 flex items-center gap-1 rounded-md text-[10px] font-bold transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                aria-label="Visualização em lista"
              >
                <List size={11} />
                <span>Lista</span>
              </button>
            </Tooltip>
            <Tooltip content="Visualizar gráfico Top Clientes" position="top">
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`h-5 px-1.5 flex items-center gap-1 rounded-md text-[10px] font-bold transition-all ${
                  viewMode === 'chart'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                aria-label="Visualização em gráfico"
              >
                <BarChart2 size={11} />
                <span>Gráfico</span>
              </button>
            </Tooltip>
          </div>

          {/* Modo de Filtro (Por Tarefa vs Por Total Cliente) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setFilterMode('task')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                filterMode === 'task'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Por Tarefa
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('client')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                filterMode === 'client'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Por Total Cliente
            </button>
          </div>

          {/* Select Padronizado de Limiar (Portal) */}
          <div className="flex items-center gap-1 shrink-0 w-[168px] sm:w-[185px]">
            <Select
              value={activeThresholdValue}
              onChange={(e) => {
                const nextVal = Number(e.target.value);
                if (filterMode === 'task') {
                  setTaskThreshold(nextVal);
                } else {
                  setClientThreshold(nextVal);
                }
              }}
              options={activeThresholdOptions}
              className="!h-7 !py-0.5 !px-2 !text-[10px] font-bold !rounded-md"
              aria-label="Filtro de tempo"
            />
          </div>

          {/* Ordenação */}
          <Tooltip content={`Ordenação atual: ${sortLabel}. Clique para alternar`} position="top">
            <button
              type="button"
              onClick={nextSort}
              className="h-7 px-2 flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
            >
              <ArrowUpDown size={11} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
              <span>{sortLabel}</span>
            </button>
          </Tooltip>

          {/* Navegação de Competência */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
            <Tooltip content="Mês anterior" position="top">
              <button
                type="button"
                onClick={() => navigatePeriod('prev')}
                className="h-6 w-6 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={13} strokeWidth={2.3} />
              </button>
            </Tooltip>

            <Tooltip content="Selecionar competência" position="top">
              <button
                type="button"
                onClick={openMonthPicker}
                className={`relative h-6 px-2 rounded-md flex items-center gap-1 text-[11px] font-bold transition-colors tabular-nums ${
                  period === defaultPeriod
                    ? 'text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-700'
                    : 'text-amber-600 dark:text-amber-400 hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                <Calendar size={11} className="shrink-0" />
                <span className="whitespace-nowrap">{periodLabel}</span>
                <input
                  ref={monthInputRef}
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  tabIndex={-1}
                  title=""
                  aria-hidden="true"
                  className="sr-only"
                />
              </button>
            </Tooltip>

            <Tooltip content="Próximo mês" position="top">
              <button
                type="button"
                onClick={() => navigatePeriod('next')}
                className="h-6 w-6 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors"
                aria-label="Próximo mês"
              >
                <ChevronRight size={13} strokeWidth={2.3} />
              </button>
            </Tooltip>

            {period !== defaultPeriod && (
              <Tooltip content="Voltar ao mês padrão" position="top">
                <button
                  type="button"
                  onClick={resetToDefaultPeriod}
                  className="h-6 px-1.5 flex items-center rounded-md text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/15 transition-colors"
                >
                  Padrão
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 space-y-2.5 overflow-y-auto custom-scrollbar pr-0.5">
        {loading ? (
          <div className="flex-1 flex flex-col animate-pulse space-y-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            </div>
            <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            </div>
          </div>
        ) : fetchError ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{fetchError}</p>
          </div>
        ) : (
          <>
            {/* Resumo Tremor (KPI Cards + CategoryBar por Setor) */}
            {showSummary && (
              <div className="space-y-2 shrink-0 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* KPI 1: Clientes Atendidos */}
                  <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                        <Building2 size={12} className="text-indigo-500 shrink-0" />
                        Clientes
                      </span>
                      <Tooltip
                        content={`${totals.totalClientsWithTime} de ${totals.totalClients} clientes com tempo registrado no critério`}
                        position="top"
                      >
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 tabular-nums shrink-0">
                          {totals.attendedPct}%
                        </span>
                      </Tooltip>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-1.5">
                      <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
                        {totals.totalClientsWithTime}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate tabular-nums">
                        de {totals.totalClients} no mês
                      </span>
                    </div>
                  </div>

                  {/* KPI 2: Horas Totais */}
                  <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                        <Clock size={12} className="text-emerald-500 shrink-0" />
                        Horas Totais
                      </span>
                      <Tooltip
                        content={`Soma de ${totals.sumTasks} tarefas dos clientes listados`}
                        position="top"
                      >
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                          {totals.sumTasks} tar.
                        </span>
                      </Tooltip>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-1.5">
                      <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono tabular-nums truncate">
                        {formatSecondsToFriendly(totals.sumSeconds)}
                      </span>
                    </div>
                  </div>

                  {/* KPI 3: Média por Cliente */}
                  <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                        <Timer size={12} className="text-sky-500 shrink-0" />
                        Média / Cliente
                      </span>
                      <Tooltip
                        content={`Média geral por tarefa: ${formatSecondsToFriendly(totals.avgSecondsOverallTask)}`}
                        position="top"
                      >
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 font-mono tabular-nums shrink-0">
                          ~{formatSecondsToFriendly(totals.avgSecondsOverallTask)}/t
                        </span>
                      </Tooltip>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-1.5">
                      <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono tabular-nums truncate">
                        {formatSecondsToFriendly(totals.avgSecondsPerClient)}
                      </span>
                    </div>
                  </div>

                  {/* KPI 4: Critério Ativo */}
                  <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                        {isFastFocus ? (
                          <Zap size={12} className="text-emerald-500 shrink-0" />
                        ) : isBottleneckFocus ? (
                          <Flame size={12} className="text-rose-500 shrink-0" />
                        ) : (
                          <Filter size={12} className="text-indigo-500 shrink-0" />
                        )}
                        <span className="truncate">
                          {filterMode === 'task'
                            ? taskThreshold < 0
                              ? `Ágeis (<${Math.round(absTaskThreshold / 60)}m)`
                              : taskThreshold > 0
                              ? `Gargalos (≥${Math.round(taskThreshold / 60)}m)`
                              : 'Tarefas Totais'
                            : clientThreshold < 0
                            ? `Ágeis (<${formatSecondsToFriendly(absClientThreshold)})`
                            : clientThreshold > 0
                            ? `Clientes (≥${formatSecondsToFriendly(clientThreshold)})`
                            : 'Total Filtrado'}
                        </span>
                      </span>
                      {filterMode === 'task' && totals.sumTasks > 0 && (
                        <Tooltip
                          content={`${totals.criticalTaskPct}% das tarefas listadas atendem ao critério`}
                          position="top"
                        >
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold tabular-nums shrink-0 ${
                              isFastFocus
                                ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                : isBottleneckFocus
                                ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {totals.criticalTaskPct}%
                          </span>
                        </Tooltip>
                      )}
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-1.5">
                      <span
                        className={`text-base sm:text-lg font-bold tracking-tight tabular-nums ${
                          isFastFocus
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isBottleneckFocus
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-indigo-600 dark:text-indigo-400'
                        }`}
                      >
                        {filterMode === 'task'
                          ? totals.sumCriticalTasks
                          : filteredAndSortedMetrics.length}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        {filterMode === 'task' ? 'tarefas' : 'clientes'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tremor CategoryBar: Distribuição de Horas por Setor (clicável para filtrar) */}
                {sectorDistribution.length > 0 && (
                  <div className="p-2.5 sm:px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                        Distribuição por Setor
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium tabular-nums">
                        {sectorDistribution.map((slice) => {
                          const canToggle = slice.name !== 'Outros';
                          const isSelected = selectedSector === slice.name;
                          const isDimmed =
                            selectedSector !== 'all' && !isSelected;

                          return (
                            <Tooltip
                              key={slice.name}
                              content={
                                canToggle
                                  ? isSelected
                                    ? `Clique para remover filtro de ${slice.name}`
                                    : `Clique para filtrar apenas ${slice.name}`
                                  : `${slice.name}: ${formatSecondsToFriendly(slice.seconds)}`
                              }
                              position="top"
                            >
                              <button
                                type="button"
                                disabled={!canToggle}
                                onClick={() => {
                                  if (!canToggle) return;
                                  setSelectedSector((prev) =>
                                    prev === slice.name ? 'all' : slice.name
                                  );
                                }}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all ${
                                  isSelected
                                    ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-500/40'
                                    : isDimmed
                                    ? 'text-slate-400 dark:text-slate-500 opacity-55 hover:opacity-100'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                } ${canToggle ? 'cursor-pointer' : 'cursor-default'}`}
                              >
                                <span className={`w-2 h-2 rounded-full shrink-0 ${slice.dotClass}`} />
                                <span className="truncate max-w-[100px]">{slice.name}:</span>
                                <strong className="text-slate-800 dark:text-slate-200 font-mono">
                                  {formatSecondsToFriendly(slice.seconds)}
                                </strong>
                                <span>({slice.pct}%)</span>
                              </button>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex gap-0.5">
                      {sectorDistribution.map((slice) => {
                        const canToggle = slice.name !== 'Outros';
                        const isSelected = selectedSector === slice.name;
                        const isDimmed = selectedSector !== 'all' && !isSelected;

                        return (
                          <Tooltip
                            key={slice.name}
                            content={`${slice.name}: ${formatSecondsToFriendly(slice.seconds)} (${slice.pct}%)`}
                            position="top"
                            style={{
                              width: `${Math.max(2, (slice.seconds / totalSectorBaseSeconds) * 100)}%`,
                            }}
                            className="h-full"
                          >
                            <button
                              type="button"
                              disabled={!canToggle}
                              onClick={() => {
                                if (!canToggle) return;
                                setSelectedSector((prev) =>
                                  prev === slice.name ? 'all' : slice.name
                                );
                              }}
                              className={`h-full w-full block transition-all duration-300 ${
                                slice.colorClass
                              } ${isDimmed ? 'opacity-30 hover:opacity-75' : 'hover:brightness-110'} ${
                                canToggle ? 'cursor-pointer' : 'cursor-default'
                              }`}
                              aria-label={`Filtrar setor ${slice.name}`}
                            />
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Barra de Busca + Botão de Filtros Avançados */}
            <div className="space-y-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <Input
                    type="text"
                    placeholder="Filtrar por nome do cliente, CNPJ ou cidade..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={<Search size={14} />}
                    className="!h-9 !text-xs pr-8"
                  />
                  {searchQuery && (
                    <Tooltip content="Limpar busca" position="top">
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Limpar busca"
                      >
                        <X size={13} />
                      </button>
                    </Tooltip>
                  )}
                </div>

                <Tooltip
                  content={
                    isAdvancedFilterOpen
                      ? 'Ocultar filtros por setor, regime e status'
                      : 'Filtrar por setor, regime tributário ou status'
                  }
                  position="top"
                >
                  <button
                    type="button"
                    onClick={() => setIsAdvancedFilterOpen((prev) => !prev)}
                    className={`h-9 px-2.5 rounded-lg border flex items-center gap-1.5 text-xs font-semibold transition-all shrink-0 ${
                      isAdvancedFilterOpen || activeAdvancedFilterCount > 0
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <SlidersHorizontal size={13} />
                    <span className="hidden sm:inline">Filtros</span>
                    {activeAdvancedFilterCount > 0 && (
                      <span className="min-w-[16px] h-4 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                        {activeAdvancedFilterCount}
                      </span>
                    )}
                  </button>
                </Tooltip>
              </div>

              {/* Painel Expansível de Filtros Extras (Setor, Regime Tributário e Status) */}
              {isAdvancedFilterOpen && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-150">
                  <Select
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                    options={sectorOptions}
                    className="!h-8 !py-1 !text-xs"
                    aria-label="Filtrar por setor"
                  />
                  <Select
                    value={selectedRegime}
                    onChange={(e) => setSelectedRegime(e.target.value)}
                    options={regimeOptions}
                    className="!h-8 !py-1 !text-xs"
                    aria-label="Filtrar por regime tributário"
                  />
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 min-w-0">
                      <Select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        options={TASK_STATUS_OPTIONS}
                        className="!h-8 !py-1 !text-xs"
                        aria-label="Filtrar por status da tarefa"
                      />
                    </div>
                    {activeAdvancedFilterCount > 0 && (
                      <Tooltip content="Limpar filtros avançados" position="top">
                        <button
                          type="button"
                          onClick={clearAdvancedFilters}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                          aria-label="Limpar filtros avançados"
                        >
                          <RotateCcw size={13} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Área Principal: Estado Vazio, Lista BarList ou Gráfico Top Clientes */}
            {filteredAndSortedMetrics.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm gap-3 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Building2 size={22} className="text-slate-400 dark:text-slate-500" />
                </div>
                <div className="text-center max-w-sm space-y-1">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Nenhum cliente encontrado para os filtros aplicados em {periodLabel}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Critério de tempo:{' '}
                    {filterMode === 'task'
                      ? taskThreshold === 0
                        ? 'Todas as tarefas'
                        : isTaskLessThan
                        ? `Tarefas < ${Math.round(absTaskThreshold / 60)} min`
                        : `Tarefas ≥ ${Math.round(taskThreshold / 60)} min`
                      : clientThreshold === 0
                      ? 'Todos os clientes'
                      : isClientLessThan
                      ? `Total Cliente < ${formatSecondsToFriendly(absClientThreshold)}`
                      : `Total Cliente ≥ ${formatSecondsToFriendly(clientThreshold)}`}
                  </p>
                </div>
                {(searchQuery.trim() ||
                  activeThresholdValue !== 0 ||
                  activeAdvancedFilterCount > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      clearAdvancedFilters();
                      if (filterMode === 'task') setTaskThreshold(0);
                      else setClientThreshold(0);
                    }}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors"
                  >
                    Limpar filtros e exibir todos do mês
                  </button>
                )}
              </div>
            ) : viewMode === 'chart' ? (
              <div className="flex-1 flex flex-col min-h-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 sm:p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <BarChart2 size={13} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
                    Top {chartRows.length} Clientes por Tempo Consumido (min)
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                    Clique na barra para detalhar tarefas
                  </span>
                </div>

                {chartRows.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                    Nenhum cliente com tempo registrado neste filtro.
                  </div>
                ) : (
                  <div className="flex-1 w-full min-h-[170px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart
                        data={chartRows}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 6, bottom: 4 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                          stroke="currentColor"
                          className="text-slate-200 dark:text-slate-800"
                        />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          tick={{ fontSize: 10, fill: 'currentColor' }}
                          stroke="currentColor"
                          className="text-slate-400 dark:text-slate-500"
                          tickLine={false}
                          axisLine={false}
                          unit="m"
                        />
                        <YAxis
                          type="category"
                          dataKey="shortName"
                          width={125}
                          tick={{ fontSize: 10, fill: 'currentColor' }}
                          stroke="currentColor"
                          className="text-slate-600 dark:text-slate-300"
                          tickLine={false}
                          axisLine={false}
                        />
                        <RechartsTooltip
                          content={<CustomClientChartTooltip />}
                          cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                        />
                        <Bar
                          dataKey="minutes"
                          fill={isFastFocus ? '#10b981' : '#6366f1'}
                          radius={[0, 4, 4, 0]}
                          maxBarSize={20}
                          className="cursor-pointer"
                          onClick={(barData: any) => {
                            const cid = barData?.clientId;
                            if (cid) {
                              setExpandedClientId(cid);
                              setViewMode('list');
                            }
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 min-h-[180px] pr-0.5">
                {filteredAndSortedMetrics.map((client) => {
                  const isExpanded = expandedClientId === client.clientId;
                  const relativePercent = Math.min(
                    100,
                    Math.round((client.totalSecondsSpent / maxFilteredSeconds) * 100)
                  );
                  const shareOfTotalPct =
                    totals.sumSeconds > 0
                      ? Math.round((client.totalSecondsSpent / totals.sumSeconds) * 100)
                      : 0;

                  const visibleTasks = client.tasks.filter((t) => {
                    if (filterMode === 'client') return true;
                    if (taskThreshold === 0) return true;
                    if (isTaskLessThan) {
                      return t.secondsSpent > 0 && t.secondsSpent < absTaskThreshold;
                    }
                    return t.secondsSpent >= taskThreshold;
                  });

                  const barTintClass = isFastFocus
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15'
                    : isBottleneckFocus
                    ? 'bg-rose-500/10 dark:bg-rose-500/15'
                    : 'bg-indigo-500/10 dark:bg-indigo-500/15';

                  return (
                    <div
                      key={client.clientId}
                      className={`w-full rounded-xl border transition-all duration-200 overflow-hidden ${
                        isExpanded
                          ? 'bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-500/60 shadow-sm ring-1 ring-indigo-500/15'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Cabeçalho do Card no padrão Tremor BarList */}
                      <button
                        type="button"
                        onClick={() => setExpandedClientId(isExpanded ? null : client.clientId)}
                        className="relative w-full text-left p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 select-none overflow-hidden cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Barra proporcional ao fundo (BarList) */}
                        <div
                          className={`absolute inset-y-0 left-0 pointer-events-none transition-all duration-500 ${barTintClass}`}
                          style={{ width: `${relativePercent}%` }}
                        />

                        <div className="relative flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                            <Building2 size={15} />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {client.clientName}
                              </span>
                              {client.taxRegime && (
                                <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                                  {TAX_REGIME_LABELS[client.taxRegime] || client.taxRegime}
                                </span>
                              )}
                              {filterMode === 'task' && client.criticalTasksCount > 0 && (
                                <span
                                  className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full border flex items-center gap-0.5 shrink-0 tabular-nums ${
                                    isTaskLessThan
                                      ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                                      : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                                  }`}
                                >
                                  {isTaskLessThan ? (
                                    <>
                                      <Zap size={9} className="fill-current" />{' '}
                                      {client.criticalTasksCount} rápida(s)
                                    </>
                                  ) : (
                                    <>
                                      <Flame size={9} className="fill-current" />{' '}
                                      {client.criticalTasksCount} demorada(s)
                                    </>
                                  )}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium flex-wrap tabular-nums">
                              {client.document && <span>CNPJ: {client.document}</span>}
                              {client.city && (
                                <span>
                                  • {client.city}
                                  {client.state ? `/${client.state}` : ''}
                                </span>
                              )}
                              <span>• {client.totalTasksCount} tarefa(s)</span>
                              {totals.sumSeconds > 0 && (
                                <span className="text-slate-400 dark:text-slate-500">
                                  • {shareOfTotalPct}% do total
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Métricas à direita */}
                        <div className="relative flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-slate-100 dark:border-slate-800 sm:border-t-0 shrink-0">
                          <div className="flex items-center gap-3.5 tabular-nums">
                            <div className="flex flex-col items-start sm:items-end">
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold">
                                Média / Tarefa
                              </span>
                              <span className="text-xs font-bold text-sky-600 dark:text-sky-400 font-mono">
                                {formatSecondsToFriendly(client.avgSecondsPerTask)}
                              </span>
                            </div>

                            <div className="flex flex-col items-start sm:items-end">
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold">
                                Tempo Total
                              </span>
                              <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                                {formatSecondsToFriendly(client.totalSecondsSpent)}
                              </span>
                            </div>
                          </div>

                          <div className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 dark:text-slate-500 shrink-0">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </button>

                      {/* Lista Expandida de Tarefas (também em Tremor BarList) */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-2.5 sm:p-3 animate-in fade-in duration-150">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1">
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              {filterMode === 'client' ? (
                                <>
                                  <Clock size={11} className="text-indigo-500" /> Todas as Tarefas do
                                  Cliente
                                </>
                              ) : isTaskLessThan ? (
                                <>
                                  <Zap size={11} className="text-emerald-500" /> Tarefas de Alta
                                  Performance (&lt; {Math.round(absTaskThreshold / 60)} min)
                                </>
                              ) : (
                                <>
                                  <Clock size={11} className="text-indigo-500" /> Tarefas{' '}
                                  {taskThreshold > 0
                                    ? `Mais Demoradas (≥ ${Math.round(taskThreshold / 60)} min)`
                                    : 'do Cliente'}
                                </>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                              {visibleTasks.length}{' '}
                              {filterMode === 'task' ? `de ${client.tasks.length}` : ''} tarefa(s) •
                              Média: {formatSecondsToFriendly(client.avgSecondsPerTask)}
                            </span>
                          </div>

                          {visibleTasks.length === 0 ? (
                            <div className="py-3 text-center text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5 bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                              <CheckCircle2 size={13} className="text-emerald-500" />
                              <span>
                                {filterMode === 'client'
                                  ? 'Nenhuma tarefa vinculada a este cliente neste período'
                                  : isTaskLessThan
                                  ? `Nenhuma tarefa deste cliente levou menos de ${Math.round(absTaskThreshold / 60)} min`
                                  : `Todas as tarefas deste cliente foram rápidas (< ${Math.round(taskThreshold / 60)} min)`}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {visibleTasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="relative bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs overflow-hidden"
                                >
                                  {/* Mini barra proporcional do peso da tarefa no cliente */}
                                  <div
                                    className={`absolute inset-y-0 left-0 pointer-events-none transition-all duration-300 ${
                                      isFastFocus
                                        ? 'bg-emerald-500/10 dark:bg-emerald-500/15'
                                        : 'bg-indigo-500/10 dark:bg-indigo-500/15'
                                    }`}
                                    style={{ width: `${task.percentageOfClientTime}%` }}
                                  />

                                  <div className="relative flex items-center gap-2 min-w-0 flex-1">
                                    <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                                      <Layers size={12} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                                        {task.taskName}
                                      </span>
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                        {task.responsible && (
                                          <span className="inline-flex items-center gap-0.5">
                                            <User size={10} /> {task.responsible}
                                          </span>
                                        )}
                                        {task.sector && <span>• {task.sector}</span>}
                                        <span>• Status: {task.status}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="relative flex items-center gap-2 shrink-0 self-end sm:self-center tabular-nums">
                                    <span
                                      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md border ${
                                        isFastFocus
                                          ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                                          : 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30'
                                      }`}
                                    >
                                      {task.percentageOfClientTime}% do cliente
                                    </span>
                                    <div className="text-right font-mono font-bold text-slate-900 dark:text-slate-100 text-xs min-w-[54px]">
                                      {formatSecondsToFriendly(task.secondsSpent)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </WidgetContainer>
  );
};
