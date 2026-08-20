import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  AlertTriangle, 
  Layers, 
  User, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  CheckCircle2, 
  Flame,
  Zap,
  PieChart,
  BarChart2
} from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';
import { Tooltip } from '../../ui/Tooltip';
import { formatSecondsToFriendly } from './CollaboratorPerformanceWidget';
import { TAX_REGIME_LABELS } from '../../../types';

interface Props {
  orgId: string;
  onRemove?: () => void;
}

interface ClientTaskItem {
  id: string;
  taskName: string;
  sector?: string;
  responsible?: string;
  status: string;
  secondsSpent: number;
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
  avgSecondsPerTask: number; // Média de tempo por tarefa deste cliente
  criticalTasksCount: number; // Tarefas que cumprem o limiar selecionado
  tasks: ClientTaskItem[];
}

type FilterMode = 'task' | 'client';

const TASK_THRESHOLD_OPTIONS = [
  // Gargalos / Demoradas
  { value: 1800, label: '🔥 ≥ 30 min (Gargalos - Padrão)' },
  { value: 3600, label: '🔥 ≥ 1 hora (Críticos)' },
  { value: 7200, label: '🔥 ≥ 2 horas' },
  { value: 900, label: '🔥 ≥ 15 min' },
  // Alta Performance / Rápidas
  { value: -1800, label: '⚡ < 30 min (Alta Performance)' },
  { value: -900, label: '⚡ < 15 min (Super Rápidas)' },
  // Todas
  { value: 0, label: 'Todas as tarefas' },
];

const CLIENT_THRESHOLD_OPTIONS = [
  // Maior Consumo
  { value: 3600, label: '⏱️ ≥ 1 hora (Padrão)' },
  { value: 7200, label: '⏱️ ≥ 2 horas' },
  { value: 18000, label: '⏱️ ≥ 5 horas' },
  { value: 1800, label: '⏱️ ≥ 30 min' },
  // Baixo Consumo / Alta Performance
  { value: -1800, label: '⚡ < 30 min (Alta Performance)' },
  { value: -3600, label: '⚡ < 1 hora (Ágeis)' },
  // Todos
  { value: 0, label: 'Todos os clientes' },
];

export const ClientTimeSpentWidget: React.FC<Props> = ({ orgId, onRemove }) => {
  const now = new Date();
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultPeriod = `${prevMonthDate.getFullYear()}-${(prevMonthDate.getMonth() + 1).toString().padStart(2, '0')}`;

  const [metrics, setMetrics] = useState<ClientMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(defaultPeriod);
  const [filterMode, setFilterMode] = useState<FilterMode>('task');
  const [taskThreshold, setTaskThreshold] = useState<number>(1800); // 30 min padrão para tarefa
  const [clientThreshold, setClientThreshold] = useState<number>(3600); // 1h padrão para cliente
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'time' | 'avg' | 'critical' | 'name'>('time');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const base = period || defaultPeriod;
    const [year, month] = base.split('-').map(Number);
    const date = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
    setPeriod(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
  };

  const resetToDefaultPeriod = () => setPeriod(defaultPeriod);

  const fetchData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);

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
        const clientMap: Record<string, {
          clientId: string;
          clientName: string;
          document?: string;
          taxRegime?: string;
          city?: string;
          state?: string;
          totalSeconds: number;
          tasks: {
            id: string;
            taskName: string;
            sector?: string;
            responsible?: string;
            status: string;
            secondsSpent: number;
          }[];
        }> = {};

        result.forEach((row: any) => {
          const clientKey = row.client_id || row.client_name || 'Sem cliente';
          const clientDisplayName = row.clients?.company_name || row.clients?.trade_name || row.client_name || 'Cliente Não Identificado';

          if (!clientMap[clientKey]) {
            clientMap[clientKey] = {
              clientId: clientKey,
              clientName: clientDisplayName,
              document: row.clients?.document,
              taxRegime: row.tax_regime,
              city: row.clients?.city,
              state: row.clients?.state,
              totalSeconds: 0,
              tasks: []
            };
          }

          // Segundos trabalhados na tarefa
          let taskSeconds = row.total_time_spent_seconds || 0;

          // Se estiver com cronômetro em execução neste instante
          if (row.status === 'Iniciada' && row.timer_started_at) {
            const startMs = new Date(row.timer_started_at).getTime();
            const currentLiveSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
            taskSeconds += currentLiveSec;
          }

          // Fallback para tarefas concluídas sem cronômetro ativo
          if (taskSeconds === 0 && row.status === 'Concluída') {
            const startFallback = row.started_at
              ? new Date(row.started_at).getTime()
              : row.created_at
                ? new Date(row.created_at).getTime()
                : null;
            const completedFallback = row.completed_at ? new Date(row.completed_at).getTime() : null;
            if (startFallback && completedFallback && completedFallback > startFallback) {
              taskSeconds = Math.floor((completedFallback - startFallback) / 1000);
            }
          }

          clientMap[clientKey].totalSeconds += taskSeconds;
          clientMap[clientKey].tasks.push({
            id: row.id,
            taskName: row.task_name || 'Tarefa',
            sector: row.sector,
            responsible: row.responsible,
            status: row.status,
            secondsSpent: taskSeconds
          });
        });

        const isTaskLessThan = taskThreshold < 0;
        const absTaskThreshold = Math.abs(taskThreshold);

        // Calcula métricas e porcentagens
        const calculated: ClientMetric[] = Object.values(clientMap).map(c => {
          const clientTotalSec = c.totalSeconds;

          const processedTasks: ClientTaskItem[] = c.tasks
            .map(t => ({
              ...t,
              percentageOfClientTime: clientTotalSec > 0 
                ? Math.round((t.secondsSpent / clientTotalSec) * 100) 
                : 0
            }))
            .sort((a, b) => b.secondsSpent - a.secondsSpent);

          const matchingCount = processedTasks.filter(t => {
            if (taskThreshold === 0) return true;
            if (isTaskLessThan) return t.secondsSpent > 0 && t.secondsSpent < absTaskThreshold;
            return t.secondsSpent >= taskThreshold;
          }).length;

          const avgSec = processedTasks.length > 0 ? Math.round(clientTotalSec / processedTasks.length) : 0;

          return {
            clientId: c.clientId,
            clientName: c.clientName,
            document: c.document,
            taxRegime: c.taxRegime,
            city: c.city,
            state: c.state,
            totalSecondsSpent: clientTotalSec,
            totalTasksCount: processedTasks.length,
            avgSecondsPerTask: avgSec,
            criticalTasksCount: matchingCount,
            tasks: processedTasks
          };
        });

        setMetrics(calculated);
      }
    } catch (err) {
      console.error('Erro ao buscar tempo por cliente:', err);
    } finally {
      setLoading(false);
    }
  }, [orgId, period, taskThreshold]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtro e ordenação dos clientes conforme o modo selecionado
  const filteredAndSortedMetrics = useMemo(() => {
    const isClientLessThan = clientThreshold < 0;
    const absClientThreshold = Math.abs(clientThreshold);

    return metrics
      .filter(m => {
        // Modo 1: Filtrar por tarefas individuais (gargalos >= X min OU alta performance < X min)
        if (filterMode === 'task') {
          if (taskThreshold !== 0 && m.criticalTasksCount === 0) {
            return false;
          }
        } 
        // Modo 2: Filtrar pelo tempo total acumulado do cliente
        else if (filterMode === 'client') {
          if (clientThreshold > 0 && m.totalSecondsSpent < clientThreshold) {
            return false;
          }
          if (clientThreshold < 0 && (m.totalSecondsSpent === 0 || m.totalSecondsSpent >= absClientThreshold)) {
            return false;
          }
        }

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          m.clientName.toLowerCase().includes(q) ||
          (m.document && m.document.toLowerCase().includes(q)) ||
          (m.city && m.city.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'time') {
          return b.totalSecondsSpent - a.totalSecondsSpent; // Mais tempo total
        }
        if (sortBy === 'avg') {
          return b.avgSecondsPerTask - a.avgSecondsPerTask; // Maior média por tarefa
        }
        if (sortBy === 'critical') {
          return b.criticalTasksCount - a.criticalTasksCount; // Mais tarefas no critério
        }
        return a.clientName.localeCompare(b.clientName); // Alfabética
      });
  }, [metrics, searchQuery, sortBy, filterMode, taskThreshold, clientThreshold]);

  // Totais Gerais recalculados com base no filtro ativo
  const totals = useMemo(() => {
    let sumSeconds = 0;
    let sumTasks = 0;
    let sumCriticalTasks = 0;
    let totalClientsWithTime = 0;

    filteredAndSortedMetrics.forEach(m => {
      sumSeconds += m.totalSecondsSpent;
      sumTasks += m.totalTasksCount;
      sumCriticalTasks += m.criticalTasksCount;
      if (m.totalSecondsSpent > 0) totalClientsWithTime += 1;
    });

    const avgSecondsPerClient = totalClientsWithTime > 0 ? sumSeconds / totalClientsWithTime : 0;
    const avgSecondsOverallTask = sumTasks > 0 ? sumSeconds / sumTasks : 0;

    return {
      totalClients: metrics.length,
      totalClientsWithTime,
      sumSeconds,
      sumTasks,
      avgSecondsPerClient,
      avgSecondsOverallTask,
      sumCriticalTasks
    };
  }, [metrics, filteredAndSortedMetrics]);

  const periodLabel = period ? `${period.split('-')[1]}/${period.split('-')[0]}` : 'Todos';

  // Maior tempo entre clientes para base da barra proporcional
  const maxClientSeconds = useMemo(() => {
    if (metrics.length === 0) return 1;
    return Math.max(...metrics.map(m => m.totalSecondsSpent), 1);
  }, [metrics]);

  const isTaskLessThan = taskThreshold < 0;
  const absTaskThreshold = Math.abs(taskThreshold);
  const isClientLessThan = clientThreshold < 0;
  const absClientThreshold = Math.abs(clientThreshold);

  return (
    <WidgetContainer
      title="TEMPO POR CLIENTE E TAREFA"
      icon={<Building2 size={14} className="text-indigo-500" />}
      onRemove={onRemove}
      headerActions={
        <div className="flex items-center gap-1.5 flex-wrap" onMouseDown={e => e.stopPropagation()}>
          {/* Alternador de Modo de Filtro (Por Tarefa vs Por Total do Cliente) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded p-0.5 border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setFilterMode('task')}
              className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition-all cursor-pointer ${
                filterMode === 'task'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Por Tarefa
            </button>
            <button
              onClick={() => setFilterMode('client')}
              className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition-all cursor-pointer ${
                filterMode === 'client'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Por Total Cliente
            </button>
          </div>

          {/* Seletor de Limiar Dinâmico conforme o Modo */}
          <Tooltip 
            content={filterMode === 'task' ? "Filtra tarefas e clientes pelo tempo de execução" : "Filtra clientes pelo tempo total acumulado"} 
            position="top"
          >
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
              <Filter size={10} className="text-indigo-500 shrink-0" />
              {filterMode === 'task' ? (
                <select
                  value={taskThreshold}
                  onChange={(e) => setTaskThreshold(Number(e.target.value))}
                  className="bg-transparent border-none outline-none text-[10px] font-bold cursor-pointer pr-1 text-slate-700 dark:text-slate-200"
                >
                  {TASK_THRESHOLD_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={clientThreshold}
                  onChange={(e) => setClientThreshold(Number(e.target.value))}
                  className="bg-transparent border-none outline-none text-[10px] font-bold cursor-pointer pr-1 text-slate-700 dark:text-slate-200"
                >
                  {CLIENT_THRESHOLD_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </Tooltip>

          <span className="text-[9px] text-slate-300 dark:text-slate-600 font-medium px-0.5">|</span>

          {/* Ordenação */}
          <Tooltip content="Alternar critério de ordenação" position="top">
            <button
              onClick={() => {
                setSortBy(prev => 
                  prev === 'time' ? 'avg' : 
                  prev === 'avg' ? 'critical' : 
                  prev === 'critical' ? 'name' : 'time'
                );
              }}
              className="h-6 px-1.5 flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              <ArrowUpDown size={10} />
              <span>
                {sortBy === 'time' ? 'Tempo Total' : 
                 sortBy === 'avg' ? 'Média/Tarefa' : 
                 sortBy === 'critical' ? (isTaskLessThan ? 'Mais Rápidas' : 'Mais Demoradas') : 'Nome A-Z'}
              </span>
            </button>
          </Tooltip>

          <span className="text-[9px] text-slate-300 dark:text-slate-600 font-medium px-0.5">|</span>

          {/* Navegação de Mês */}
          <Tooltip content="Mês anterior" position="top">
            <button
              onClick={() => navigatePeriod('prev')}
              className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
            >
              <ChevronLeft size={13} strokeWidth={2.5} />
            </button>
          </Tooltip>
          <div className={`relative flex items-center h-6 rounded px-2 gap-1 cursor-pointer transition-all ${
            period === defaultPeriod ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'
          }`}>
            <Calendar size={11} className="shrink-0 pointer-events-none" />
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              style={{ colorScheme: 'light dark' }}
            />
            <span className="text-[11px] font-bold pointer-events-none whitespace-nowrap">{periodLabel}</span>
          </div>
          <Tooltip content="Próximo mês" position="top">
            <button
              onClick={() => navigatePeriod('next')}
              className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
            >
              <ChevronRight size={13} strokeWidth={2.5} />
            </button>
          </Tooltip>
          {period !== defaultPeriod && (
            <Tooltip content="Voltar ao mês padrão" position="top">
              <button
                onClick={resetToDefaultPeriod}
                className="h-6 px-1.5 flex items-center rounded text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                Padrão
              </button>
            </Tooltip>
          )}
        </div>
      }
    >
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-indigo-500 animate-spin" />
          <div className="text-xs text-slate-400 font-medium animate-pulse">Calculando tempo por cliente e médias...</div>
        </div>
      ) : filteredAndSortedMetrics.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-3">
          <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
            <Building2 size={24} className="text-slate-300 dark:text-slate-600" />
          </div>
          <span className="text-xs text-center px-4">
            Nenhum cliente encontrado para o filtro ({
              filterMode === 'task' 
                ? (taskThreshold === 0 
                    ? 'Todas as tarefas' 
                    : isTaskLessThan 
                      ? `Tarefas < ${Math.round(absTaskThreshold / 60)} min` 
                      : `Tarefas ≥ ${Math.round(taskThreshold / 60)} min`)
                : (clientThreshold === 0 
                    ? 'Todos os clientes' 
                    : isClientLessThan 
                      ? `Total Cliente < ${formatSecondsToFriendly(absClientThreshold)}` 
                      : `Total Cliente ≥ ${formatSecondsToFriendly(clientThreshold)}`)
            }) em <strong>{periodLabel}</strong>
          </span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-4 gap-2 px-3 pt-3 pb-1 shrink-0">
            <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-2 flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Building2 size={10} /> Clientes Atendidos
              </span>
              <span className="text-base font-black text-slate-800 dark:text-white leading-tight mt-0.5">
                {totals.totalClientsWithTime} <span className="text-[10px] font-normal text-slate-400">/ {totals.totalClients}</span>
              </span>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-2 flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Clock size={10} /> Horas Totais
              </span>
              <span className="text-base font-black text-slate-800 dark:text-white leading-tight mt-0.5 font-mono">
                {formatSecondsToFriendly(totals.sumSeconds)}
              </span>
            </div>

            <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 rounded-xl p-2 flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1">
                <Timer size={10} /> Média Geral / Cliente
              </span>
              <span className="text-base font-black text-slate-800 dark:text-white leading-tight mt-0.5 font-mono">
                {formatSecondsToFriendly(totals.avgSecondsPerClient)}
              </span>
            </div>

            <div className={`border rounded-xl p-2 flex flex-col transition-all ${
              filterMode === 'task'
                ? (taskThreshold < 0 
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40' 
                    : taskThreshold > 0 
                      ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/40'
                      : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700')
                : (clientThreshold < 0 
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40' 
                    : clientThreshold > 0 
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/40'
                      : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700')
            }`}>
              <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                filterMode === 'task'
                  ? (taskThreshold < 0 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : taskThreshold > 0 
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-600 dark:text-slate-400')
                  : (clientThreshold < 0 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : clientThreshold > 0 
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-600 dark:text-slate-400')
              }`}>
                {filterMode === 'task' ? (
                  taskThreshold < 0 ? (
                    <>
                      <Zap size={10} /> Alta Performance (&lt;{Math.round(absTaskThreshold/60)}m)
                    </>
                  ) : taskThreshold > 0 ? (
                    <>
                      <Flame size={10} /> Gargalos (≥{Math.round(taskThreshold/60)}m)
                    </>
                  ) : (
                    <>
                      <Clock size={10} /> Tarefas Totais
                    </>
                  )
                ) : (
                  clientThreshold < 0 ? (
                    <>
                      <Zap size={10} /> Alta Performance (&lt;{formatSecondsToFriendly(absClientThreshold)})
                    </>
                  ) : clientThreshold > 0 ? (
                    <>
                      <Clock size={10} /> Total Cliente (≥{formatSecondsToFriendly(clientThreshold)})
                    </>
                  ) : (
                    <>
                      <Building2 size={10} /> Todos os Clientes
                    </>
                  )
                )}
              </span>
              <span className="text-base font-black text-slate-800 dark:text-white leading-tight mt-0.5">
                {filterMode === 'task' ? (
                  <>
                    {totals.sumCriticalTasks} <span className="text-[10px] font-normal text-slate-400">tarefas</span>
                  </>
                ) : (
                  <>
                    {filteredAndSortedMetrics.length} <span className="text-[10px] font-normal text-slate-400">clientes</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Barra de Busca Rápida */}
          <div className="px-3 pt-2 pb-1 shrink-0">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrar por nome do cliente ou CNPJ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all"
              />
            </div>
          </div>

          {/* Lista de Clientes e suas Tarefas */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-2.5 min-h-0">
            {filteredAndSortedMetrics.map((client) => {
              const isExpanded = expandedClientId === client.clientId;
              const relativePercent = Math.min(100, Math.round((client.totalSecondsSpent / maxClientSeconds) * 100));
              
              // No modo 'client', exibe todas as tarefas do cliente. No modo 'task', filtra pelo limiar
              const visibleTasks = client.tasks.filter(t => {
                if (filterMode === 'client') return true;
                if (taskThreshold === 0) return true;
                if (isTaskLessThan) return t.secondsSpent > 0 && t.secondsSpent < absTaskThreshold;
                return t.secondsSpent >= taskThreshold;
              });

              return (
                <div
                  key={client.clientId}
                  className={`w-full rounded-xl border transition-all duration-200 overflow-hidden ${
                    isExpanded 
                      ? 'bg-white dark:bg-slate-800/90 border-indigo-300 dark:border-indigo-700 shadow-md ring-1 ring-indigo-400/20' 
                      : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Header do Card do Cliente */}
                  <div
                    onClick={() => setExpandedClientId(isExpanded ? null : client.clientId)}
                    className="p-3 cursor-pointer flex items-center justify-between gap-3 select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                        <Building2 size={16} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {client.clientName}
                          </span>
                          {client.taxRegime && (
                            <span className="px-1.5 py-0.2 text-[8.5px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              {TAX_REGIME_LABELS[client.taxRegime] || client.taxRegime}
                            </span>
                          )}
                          {filterMode === 'task' && client.criticalTasksCount > 0 && (
                            <span className={`px-1.5 py-0.2 text-[8.5px] font-black rounded-full border flex items-center gap-0.5 ${
                              isTaskLessThan 
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/40'
                            }`}>
                              {isTaskLessThan ? (
                                <>
                                  <Zap size={8} className="fill-current" /> {client.criticalTasksCount} rápida(s)
                                </>
                              ) : (
                                <>
                                  <Flame size={8} className="fill-current" /> {client.criticalTasksCount} demorada(s)
                                </>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-medium flex-wrap">
                          {client.document && <span>CNPJ: {client.document}</span>}
                          {client.city && <span>• {client.city}{client.state ? `/${client.state}` : ''}</span>}
                          <span>• {client.totalTasksCount} tarefa(s)</span>
                        </div>
                      </div>
                    </div>

                    {/* Lado Direito: Média por Tarefa + Tempo Total + Ação */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Métrica de Média por Tarefa neste Cliente */}
                      <div className="flex flex-col items-end hidden sm:flex">
                        <span className="text-[9px] text-slate-400 uppercase font-semibold">Média / Tarefa</span>
                        <span className="text-xs font-black text-sky-600 dark:text-sky-400 font-mono">
                          {formatSecondsToFriendly(client.avgSecondsPerTask)}
                        </span>
                      </div>

                      {/* Tempo Total Gasto no Cliente */}
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-slate-400 uppercase font-semibold">Tempo Total</span>
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                          {formatSecondsToFriendly(client.totalSecondsSpent)}
                        </span>
                      </div>

                      <div className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Barra de Proporção de Tempo Gasto */}
                  <div className="px-3 pb-2">
                    <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (filterMode === 'task' && isTaskLessThan) || (filterMode === 'client' && isClientLessThan)
                            ? 'bg-gradient-to-r from-emerald-500 to-sky-500' 
                            : 'bg-gradient-to-r from-indigo-500 to-rose-500'
                        }`}
                        style={{ width: `${relativePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Detalhes / Tarefas (Visível quando expandido) */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          {filterMode === 'client' ? (
                            <>
                              <Clock size={11} className="text-indigo-500" /> Todas as Tarefas do Cliente
                            </>
                          ) : isTaskLessThan ? (
                            <>
                              <Zap size={11} className="text-emerald-500" /> Tarefas de Alta Performance (&lt; {Math.round(absTaskThreshold / 60)} min)
                            </>
                          ) : (
                            <>
                              <Clock size={11} className="text-indigo-500" /> Tarefas {taskThreshold > 0 ? `Mais Demoradas (≥ ${Math.round(taskThreshold / 60)} min)` : 'do Cliente'}
                            </>
                          )}
                        </span>
                        <span className="text-[9.5px] text-slate-400 font-medium">
                          {visibleTasks.length} {filterMode === 'task' ? `de ${client.tasks.length}` : ''} tarefa(s) • Média do cliente: {formatSecondsToFriendly(client.avgSecondsPerTask)}
                        </span>
                      </div>

                      {visibleTasks.length === 0 ? (
                        <div className="py-3 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5 bg-white/40 dark:bg-slate-800/40 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
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
                              className="bg-white dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs shadow-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="p-1 rounded bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 shrink-0">
                                  <Layers size={12} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-slate-700 dark:text-slate-200 truncate">
                                    {task.taskName}
                                  </span>
                                  <div className="flex items-center gap-2 text-[9.5px] text-slate-400">
                                    {task.responsible && (
                                      <span className="flex items-center gap-0.5">
                                        <User size={9} /> {task.responsible}
                                      </span>
                                    )}
                                    {task.sector && <span>• {task.sector}</span>}
                                    <span>• Status: {task.status}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Tempo da Tarefa e % do Cliente */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${
                                  (filterMode === 'task' && isTaskLessThan) || (filterMode === 'client' && isClientLessThan)
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/30'
                                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/30'
                                }`}>
                                  {task.percentageOfClientTime}% do cliente
                                </span>
                                <div className="text-right font-mono font-black text-slate-800 dark:text-slate-100 text-xs">
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
        </div>
      )}
    </WidgetContainer>
  );
};

