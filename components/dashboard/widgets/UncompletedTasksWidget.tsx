import React, { useEffect, useState } from 'react';
import { ClipboardList, Calendar, AlertTriangle, Clock, Hourglass, ChevronLeft, ChevronRight } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

const getMonthOffset = (offset: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthLabel = (ym: string) => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    return `${m}/${y}`;
};

const navigateMonth = (ym: string, direction: 'prev' | 'next') => {
    const [year, month] = ym.split('-').map(Number);
    const d = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const UncompletedTasksWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [startMonth, setStartMonth] = useState(getMonthOffset(3));
    const [endMonth, setEndMonth] = useState(getMonthOffset(1));
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, pendente: 0, iniciada: 0, atrasada: 0 });

    useEffect(() => {
        const fetchTasks = async () => {
            if (!orgId) return;
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('tasks')
                    .select('status')
                    .eq('org_id', orgId)
                    .gte('competence', startMonth)
                    .lte('competence', endMonth)
                    .in('status', ['Pendente', 'Iniciada', 'Atrasada']);

                if (error) throw error;

                if (data) {
                    const pendente = data.filter(t => t.status === 'Pendente').length;
                    const iniciada = data.filter(t => t.status === 'Iniciada').length;
                    const atrasada = data.filter(t => t.status === 'Atrasada').length;
                    setStats({ total: data.length, pendente, iniciada, atrasada });
                }
            } catch (err) {
                console.error('Error fetching uncompleted tasks:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, [orgId, startMonth, endMonth]);

    const maxCount = Math.max(stats.pendente, stats.iniciada, stats.atrasada, 1);

    const STATUS_ITEMS = [
        {
            label: 'Atrasadas',
            count: stats.atrasada,
            color: '#ef4444',
            bg: 'bg-red-50 dark:bg-red-500/10',
            border: 'border-red-100 dark:border-red-500/20',
            text: 'text-red-600 dark:text-red-400',
            bar: 'bg-red-500',
            icon: <AlertTriangle size={13} />,
        },
        {
            label: 'Pendentes',
            count: stats.pendente,
            color: '#f59e0b',
            bg: 'bg-amber-50 dark:bg-amber-500/10',
            border: 'border-amber-100 dark:border-amber-500/20',
            text: 'text-amber-600 dark:text-amber-400',
            bar: 'bg-amber-500',
            icon: <Clock size={13} />,
        },
        {
            label: 'Iniciadas',
            count: stats.iniciada,
            color: '#3b82f6',
            bg: 'bg-blue-50 dark:bg-blue-500/10',
            border: 'border-blue-100 dark:border-blue-500/20',
            text: 'text-blue-600 dark:text-blue-400',
            bar: 'bg-blue-500',
            icon: <Hourglass size={13} />,
        },
    ];

    return (
        <WidgetContainer
            title="TAREFAS PENDENTES"
            icon={<ClipboardList size={14} className="text-rose-500" />}
            onRemove={onRemove}
            headerActions={
                <div className="flex items-center gap-0.5" onMouseDown={e => e.stopPropagation()}>
                    <button
                        onClick={() => setStartMonth(prev => navigateMonth(prev, 'prev'))}
                        className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        title="Início anterior"
                    >
                        <ChevronLeft size={13} strokeWidth={2.5} />
                    </button>
                    <div className="relative flex items-center h-6 rounded px-2 gap-1 cursor-pointer text-rose-600 dark:text-rose-400">
                        <Calendar size={11} className="shrink-0 pointer-events-none" />
                        <input
                            type="month"
                            value={startMonth}
                            onChange={e => setStartMonth(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            style={{ colorScheme: 'light dark' }}
                        />
                        <span className="text-[11px] font-bold pointer-events-none whitespace-nowrap">
                            {formatMonthLabel(startMonth)}
                        </span>
                    </div>
                    <button
                        onClick={() => setStartMonth(prev => navigateMonth(prev, 'next'))}
                        className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        title="Início próximo"
                    >
                        <ChevronRight size={13} strokeWidth={2.5} />
                    </button>
                    <span className="text-[9px] text-slate-300 dark:text-slate-600 font-medium px-0.5">|</span>
                    <button
                        onClick={() => setEndMonth(prev => navigateMonth(prev, 'prev'))}
                        className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        title="Fim anterior"
                    >
                        <ChevronLeft size={13} strokeWidth={2.5} />
                    </button>
                    <div className="relative flex items-center h-6 rounded px-2 gap-1 cursor-pointer text-rose-600 dark:text-rose-400">
                        <input
                            type="month"
                            value={endMonth}
                            min={startMonth}
                            onChange={e => setEndMonth(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            style={{ colorScheme: 'light dark' }}
                        />
                        <span className="text-[11px] font-bold pointer-events-none whitespace-nowrap">
                            {formatMonthLabel(endMonth)}
                        </span>
                    </div>
                    <button
                        onClick={() => setEndMonth(prev => navigateMonth(prev, 'next'))}
                        className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        title="Fim próximo"
                    >
                        <ChevronRight size={13} strokeWidth={2.5} />
                    </button>
                </div>
            }
        >
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-rose-500 animate-spin" />
                    <div className="text-xs text-slate-400 animate-pulse">Buscando pendências...</div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="flex-1 flex flex-col items-center justify-center py-4 gap-1 min-h-0">
                        <div className="relative flex items-center justify-center">
                            <div className={`absolute w-20 h-20 rounded-full blur-2xl opacity-20 transition-all duration-500 ${
                                stats.atrasada > 0 ? 'bg-red-500' : stats.pendente > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                            <span className={`relative text-4xl font-black leading-none tabular-nums ${
                                stats.atrasada > 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : stats.pendente > 0
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                                {stats.total}
                            </span>
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                            não concluídas
                        </span>
                    </div>

                    <div className="flex flex-col gap-2 px-3 pb-3 overflow-y-auto custom-scrollbar">
                        {STATUS_ITEMS.map(item => (
                            <div
                                key={item.label}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${item.bg} ${item.border}`}
                            >
                                <div className={`shrink-0 ${item.text}`}>{item.icon}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-[11px] font-semibold ${item.text}`}>{item.label}</span>
                                        <span className={`text-sm font-black tabular-nums ${item.text}`}>{item.count}</span>
                                    </div>
                                    <div className="h-1 w-full bg-white/60 dark:bg-slate-900/30 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${item.bar} rounded-full transition-all duration-700`}
                                            style={{ width: `${(item.count / maxCount) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="shrink-0 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl flex items-center justify-between mt-auto">
                        <span className="text-[10px] text-slate-400">Meses anteriores</span>
                        {stats.total === 0 ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ Tudo em dia</span>
                        ) : (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                {stats.atrasada} crítica{stats.atrasada !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </WidgetContainer>
    );
};
