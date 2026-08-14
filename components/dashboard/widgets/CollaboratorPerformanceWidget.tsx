import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Users, Calendar, ChevronLeft, ChevronRight, Zap, Clock, CheckCircle2, Award, TrendingUp, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';
import { Tooltip } from '../../ui/Tooltip';

interface Props {
  orgId: string;
  onRemove?: () => void;
}

interface CollaboratorMetric {
  name: string;
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  delayed: number;
  onTimeCompleted: number;
  avgCompletionHours: number | null; // Tempo médio do início/criação até a conclusão em horas
  avgDailyRate: number; // Média diária de conclusões no mês
  punctualityRate: number; // % de entregas no prazo
  completionRate: number; // % concluídas vs atribuídas
}

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

const AVATAR_COLORS = [
  'from-indigo-500 to-violet-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-cyan-500 to-blue-600',
  'from-purple-500 to-indigo-600',
];
const avatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

export const CollaboratorPerformanceWidget: React.FC<Props> = ({ orgId, onRemove }) => {
  const now = new Date();
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultPeriod = `${prevMonthDate.getFullYear()}-${(prevMonthDate.getMonth() + 1).toString().padStart(2, '0')}`;

  const [metrics, setMetrics] = useState<CollaboratorMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(defaultPeriod);
  const [sortBy, setSortBy] = useState<'completed' | 'speed' | 'punctuality'>('completed');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const base = period || defaultPeriod;
    const [year, month] = base.split('-').map(Number);
    const date = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
    setPeriod(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
  };

  const resetToDefaultPeriod = () => setPeriod(defaultPeriod);

  // Calcula dias úteis transcorridos no mês selecionado
  const getWorkingDaysInMonth = useCallback((periodStr: string) => {
    const [yearStr, monthStr] = periodStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // 0-indexed

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    const startDate = new Date(year, month, 1);
    const endDate = isCurrentMonth ? today : new Date(year, month + 1, 0);

    let workingDays = 0;
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dayOfWeek = cur.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Ignora sábado e domingo
        workingDays++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return Math.max(workingDays, 1);
  }, []);

  const fetchData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setSelectedIndex(null);

    try {
      let query = (supabase as any)
        .from('tasks')
        .select('responsible, status, due_date, created_at, started_at, completed_at')
        .eq('org_id', orgId);

      if (period) query = query.eq('competence', period);

      const { data: result, error } = await query;
      if (error) throw error;

      if (result) {
        const workingDays = getWorkingDaysInMonth(period);
        const grouped: Record<string, {
          total: number;
          completed: number;
          pending: number;
          inProgress: number;
          delayed: number;
          onTimeCompleted: number;
          durationsHours: number[];
        }> = {};

        result.forEach((row: any) => {
          const resp = row.responsible || 'Sem responsável';
          if (!grouped[resp]) {
            grouped[resp] = {
              total: 0,
              completed: 0,
              pending: 0,
              inProgress: 0,
              delayed: 0,
              onTimeCompleted: 0,
              durationsHours: []
            };
          }

          const item = grouped[resp];
          item.total += 1;

          if (row.status === 'Pendente') item.pending += 1;
          else if (row.status === 'Iniciada') item.inProgress += 1;
          else if (row.status === 'Atrasada') item.delayed += 1;
          else if (row.status === 'Concluída') {
            item.completed += 1;

            // Verifica se foi concluída no prazo (se due_date existir e completed_at <= due_date + 1 dia)
            const dueDate = row.due_date ? new Date(row.due_date) : null;
            const completedDate = row.completed_at ? new Date(row.completed_at) : null;

            if (!dueDate || !completedDate || completedDate <= new Date(dueDate.getTime() + 86400000)) {
              item.onTimeCompleted += 1;
            }

            // Calcula tempo de execução (usando started_at ou created_at até completed_at)
            const startTime = row.started_at
              ? new Date(row.started_at).getTime()
              : row.created_at
                ? new Date(row.created_at).getTime()
                : null;

            if (startTime && completedDate) {
              const diffMs = completedDate.getTime() - startTime;
              if (diffMs > 0) {
                const diffHours = diffMs / (1000 * 60 * 60);
                item.durationsHours.push(diffHours);
              }
            }
          }
        });

        const calculatedMetrics: CollaboratorMetric[] = Object.entries(grouped).map(([name, data]) => {
          const avgHours = data.durationsHours.length > 0
            ? data.durationsHours.reduce((acc, curr) => acc + curr, 0) / data.durationsHours.length
            : null;

          const avgDaily = data.completed / workingDays;
          const punctualityRate = data.completed > 0 ? (data.onTimeCompleted / data.completed) * 100 : 100;
          const completionRate = data.total > 0 ? (data.completed / data.total) * 100 : 0;

          return {
            name,
            total: data.total,
            completed: data.completed,
            pending: data.pending,
            inProgress: data.inProgress,
            delayed: data.delayed,
            onTimeCompleted: data.onTimeCompleted,
            avgCompletionHours: avgHours,
            avgDailyRate: avgDaily,
            punctualityRate,
            completionRate
          };
        });

        setMetrics(calculatedMetrics);
      }
    } catch (err) {
      console.error('Erro ao buscar métricas de colaboradores:', err);
    } finally {
      setLoading(false);
    }
  }, [orgId, period, getWorkingDaysInMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Ordenação dos colaboradores
  const sortedMetrics = useMemo(() => {
    return [...metrics].sort((a, b) => {
      if (sortBy === 'speed') {
        if (a.avgCompletionHours === null) return 1;
        if (b.avgCompletionHours === null) return -1;
        return a.avgCompletionHours - b.avgCompletionHours; // Menor tempo = mais rápido
      }
      if (sortBy === 'punctuality') {
        return b.punctualityRate - a.punctualityRate;
      }
      return b.completed - a.completed; // Padrão: mais concluídas
    });
  }, [metrics, sortBy]);

  // Resumo Geral da Equipe
  const teamTotals = useMemo(() => {
    let totalCompleted = 0;
    let totalAssigned = 0;
    let totalOnTime = 0;
    let sumHours = 0;
    let countHours = 0;

    metrics.forEach(m => {
      totalCompleted += m.completed;
      totalAssigned += m.total;
      totalOnTime += m.onTimeCompleted;
      if (m.avgCompletionHours !== null) {
        sumHours += m.avgCompletionHours;
        countHours += 1;
      }
    });

    const workingDays = getWorkingDaysInMonth(period);
    const avgDailyTeam = totalCompleted / workingDays;
    const avgTeamHours = countHours > 0 ? sumHours / countHours : null;
    const teamPunctuality = totalCompleted > 0 ? (totalOnTime / totalCompleted) * 100 : 100;

    return {
      totalCompleted,
      totalAssigned,
      avgDailyTeam,
      avgTeamHours,
      teamPunctuality
    };
  }, [metrics, period, getWorkingDaysInMonth]);

  const periodLabel = period ? `${period.split('-')[1]}/${period.split('-')[0]}` : 'Todos';

  const formatHoursOrDays = (hours: number | null) => {
    if (hours === null || isNaN(hours)) return 'N/A';
    if (hours < 24) return `${hours.toFixed(1)}h`;
    const days = hours / 24;
    return `${days.toFixed(1)}d`;
  };

  return (
    <WidgetContainer
      title="DESEMPENHO POR COLABORADOR"
      icon={<TrendingUp size={14} className="text-indigo-500" />}
      onRemove={onRemove}
      headerActions={
        <div className="flex items-center gap-1" onMouseDown={e => e.stopPropagation()}>
          <Tooltip content="Alternar critério de ordenação" position="top">
            <button
              onClick={() => {
                setSortBy(prev => prev === 'completed' ? 'speed' : prev === 'speed' ? 'punctuality' : 'completed');
              }}
              className="h-6 px-1.5 flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              <ArrowUpDown size={10} />
              <span>
                {sortBy === 'completed' ? 'Entregas' : sortBy === 'speed' ? 'Velocidade' : 'Pontualidade'}
              </span>
            </button>
          </Tooltip>
          <span className="text-[9px] text-slate-300 dark:text-slate-600 font-medium px-0.5">|</span>
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
          <div className="text-xs text-slate-400 font-medium animate-pulse">Carregando métricas da equipe...</div>
        </div>
      ) : sortedMetrics.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-3">
          <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
            <Users size={24} className="text-slate-300 dark:text-slate-600" />
          </div>
          <span className="text-xs">Nenhuma métrica encontrada para <strong>{periodLabel}</strong></span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header KPI Cards */}
          <div className="grid grid-cols-4 gap-2 px-3 pt-3 pb-1 shrink-0">
            <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-2 flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <CheckCircle2 size={10} /> Entregas
              </span>
              <span className="text-base font-black text-slate-800 dark:text-white leading-tight mt-0.5">
                {teamTotals.totalCompleted} <span className="text-[10px] font-normal text-slate-400">/ {teamTotals.totalAssigned}</span>
              </span>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-2 flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Zap size={10} /> Média Diária
              </span>
              <span className="text-base font-black text-slate-800 dark:text-white leading-tight mt-0.5">
                {teamTotals.avgDailyTeam.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">/dia</span>
              </span>
            </div>

            <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 rounded-xl p-2 flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1">
                <Clock size={10} /> Tempo Médio
              </span>
              <span className="text-base font-black text-slate-800 dark:text-white leading-tight mt-0.5">
                {formatHoursOrDays(teamTotals.avgTeamHours)}
              </span>
            </div>

            <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-xl p-2 flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Award size={10} /> Pontualidade
              </span>
              <span className="text-base font-black text-slate-800 dark:text-white leading-tight mt-0.5">
                {teamTotals.teamPunctuality.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Lista de Colaboradores */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-2 min-h-0">
            {sortedMetrics.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              const isPunctual = item.punctualityRate >= 90;
              const isWarning = item.delayed > 0 || item.punctualityRate < 75;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedIndex(prev => prev === idx ? null : idx)}
                  className={`w-full rounded-xl p-3 border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-slate-800 border-indigo-300 dark:border-indigo-700 shadow-md ring-1 ring-indigo-400/30'
                      : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(item.name)} flex items-center justify-center shrink-0 shadow-sm`}>
                        <span className="text-xs font-black text-white">{getInitials(item.name)}</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {item.name}
                          </span>
                          {idx === 0 && sortBy === 'completed' && item.completed > 0 && (
                            <span className="px-1.5 py-0.2 text-[8px] font-black rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              🏆 1º Lugar
                            </span>
                          )}
                          {isWarning && (
                            <span className="px-1 py-0.2 text-[8px] font-bold rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                              ⚠️ {item.delayed} atraso(s)
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {item.completed} de {item.total} concluídas ({item.completionRate.toFixed(0)}%)
                        </span>
                      </div>
                    </div>

                    {/* Métricas do Colaborador */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-slate-400 uppercase font-semibold">Média Diária</span>
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                          {item.avgDailyRate.toFixed(1)}/dia
                        </span>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-slate-400 uppercase font-semibold">Tempo Médio</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                          {formatHoursOrDays(item.avgCompletionHours)}
                        </span>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-slate-400 uppercase font-semibold">Prazo</span>
                        <span className={`text-xs font-black ${
                          isPunctual ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {item.punctualityRate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso de Conclusão */}
                  <div className="mt-2.5 h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(item.completionRate, 100)}%` }}
                    />
                  </div>

                  {/* Detalhes Expandidos ao Clicar */}
                  {isSelected && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-4 gap-2 text-center text-[10px] animate-in fade-in zoom-in-95 duration-150">
                      <div className="bg-slate-100/60 dark:bg-slate-800/60 p-1.5 rounded-lg">
                        <span className="text-slate-400 block font-medium">Pendentes</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{item.pending}</span>
                      </div>
                      <div className="bg-slate-100/60 dark:bg-slate-800/60 p-1.5 rounded-lg">
                        <span className="text-slate-400 block font-medium">Em Andamento</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{item.inProgress}</span>
                      </div>
                      <div className="bg-slate-100/60 dark:bg-slate-800/60 p-1.5 rounded-lg">
                        <span className="text-slate-400 block font-medium">Atrasadas</span>
                        <span className="font-bold text-red-600 dark:text-red-400">{item.delayed}</span>
                      </div>
                      <div className="bg-slate-100/60 dark:bg-slate-800/60 p-1.5 rounded-lg">
                        <span className="text-slate-400 block font-medium">No Prazo</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.onTimeCompleted}</span>
                      </div>
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
