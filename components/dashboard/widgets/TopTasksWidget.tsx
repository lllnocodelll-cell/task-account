import React, { useEffect, useState, useCallback } from 'react';
import { ListOrdered, Calendar, ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';
import { Tooltip } from '../../ui/Tooltip';

interface Props {
  orgId: string;
  onRemove?: () => void;
}

interface TaskRankItem {
  name: string;
  count: number;
  completed: number;
  pending: number;
}

export const TopTasksWidget: React.FC<Props> = ({ orgId, onRemove }) => {
  const now = new Date();
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultPeriod = `${prevMonthDate.getFullYear()}-${(prevMonthDate.getMonth() + 1).toString().padStart(2, '0')}`;

  const [data, setData] = useState<TaskRankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(defaultPeriod);

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
        .select('task_name, status, competence')
        .eq('org_id', orgId);

      if (period) {
        query = query.eq('competence', period);
      }

      const { data: result, error } = await query;
      if (error) throw error;

      if (result) {
        const counts: Record<string, { total: number; completed: number; pending: number }> = {};

        result.forEach((row: any) => {
          const rawName = (row.task_name || 'Sem nome').trim();
          if (!counts[rawName]) {
            counts[rawName] = { total: 0, completed: 0, pending: 0 };
          }
          counts[rawName].total += 1;
          if (row.status === 'Concluída') {
            counts[rawName].completed += 1;
          } else {
            counts[rawName].pending += 1;
          }
        });

        const sorted: TaskRankItem[] = Object.entries(counts)
          .map(([name, stats]) => ({
            name,
            count: stats.total,
            completed: stats.completed,
            pending: stats.pending,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10); // exibe top 10

        setData(sorted);
      }
    } catch (err) {
      console.error('Error fetching top tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [orgId, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const periodLabel = period ? `${period.split('-')[1]}/${period.split('-')[0]}` : 'Todos';

  return (
    <WidgetContainer
      title="RANKING TAREFAS"
      icon={<ListOrdered size={14} className="text-indigo-500" />}
      onRemove={onRemove}
      headerActions={
        <div className="flex items-center gap-1" onMouseDown={e => e.stopPropagation()}>
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
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {loading ? (
          <div className="animate-pulse space-y-2.5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-11 bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
            <span>Nenhuma tarefa encontrada para <strong>{periodLabel}</strong></span>
          </div>
        ) : (
          <ul className="space-y-2">
            {data.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      idx === 0
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        : idx === 1
                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        : idx === 2
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={item.name}>
                      {item.name}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                      <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={10} /> {item.completed} concluídas
                      </span>
                      {item.pending > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                          <Clock size={10} /> {item.pending} pendentes
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 ml-2">
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {item.count}
                  </span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">
                    {item.count === 1 ? 'tarefa' : 'tarefas'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </WidgetContainer>
  );
};
