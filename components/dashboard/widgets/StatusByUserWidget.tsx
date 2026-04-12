import React, { useEffect, useState, useCallback } from 'react';
import { BarChart2, Users, Calendar, ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertTriangle, Hourglass } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    'Pendente':  { color: '#f59e0b', label: 'Pendente',  icon: <Clock size={11} /> },
    'Iniciada':  { color: '#3b82f6', label: 'Iniciada',  icon: <Hourglass size={11} /> },
    'Atrasada':  { color: '#ef4444', label: 'Atrasada',  icon: <AlertTriangle size={11} /> },
    'Concluída': { color: '#10b981', label: 'Concluída', icon: <CheckCircle2 size={11} /> },
};

const STATUS_ORDER = ['Atrasada', 'Pendente', 'Iniciada', 'Concluída'];

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

export const StatusByUserWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const now = new Date();
    const defaultPeriod = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    const [data, setData] = useState<any[]>([]);
    const [totals, setTotals] = useState({ total: 0, pendente: 0, iniciada: 0, atrasada: 0, concluida: 0 });
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(defaultPeriod);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const navigatePeriod = (direction: 'prev' | 'next') => {
        const base = period || defaultPeriod;
        const [year, month] = base.split('-').map(Number);
        const date = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
        setPeriod(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
    };

    const resetToCurrentMonth = () => setPeriod(defaultPeriod);

    const fetchData = useCallback(async () => {
        if (!orgId) return;
        setLoading(true);
        setSelectedIndex(null);
        try {
            let query = (supabase as any)
                .from('tasks')
                .select('responsible, status')
                .eq('org_id', orgId);

            if (period) query = query.eq('competence', period);

            const { data: result, error } = await query;
            if (error) throw error;

            if (result) {
                const transformed: Record<string, any> = {};
                let totalAcc = 0, pendenteAcc = 0, iniciadaAcc = 0, atrasadaAcc = 0, concluidaAcc = 0;

                result.forEach((row: any) => {
                    const resp = row.responsible || 'Sem responsável';
                    if (!transformed[resp]) {
                        transformed[resp] = { name: resp, 'Concluída': 0, 'Iniciada': 0, 'Pendente': 0, 'Atrasada': 0, total: 0 };
                    }
                    transformed[resp][row.status] = (transformed[resp][row.status] || 0) + 1;
                    transformed[resp].total += 1;
                    totalAcc += 1;
                    if (row.status === 'Pendente') pendenteAcc += 1;
                    if (row.status === 'Iniciada') iniciadaAcc += 1;
                    if (row.status === 'Atrasada') atrasadaAcc += 1;
                    if (row.status === 'Concluída') concluidaAcc += 1;
                });

                const arr = Object.values(transformed).sort((a, b) => b.total - a.total);
                setData(arr);
                setTotals({ total: totalAcc, pendente: pendenteAcc, iniciada: iniciadaAcc, atrasada: atrasadaAcc, concluida: concluidaAcc });
            }
        } catch (err) {
            console.error('Error fetching status by user:', err);
        } finally {
            setLoading(false);
        }
    }, [orgId, period]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const selected = selectedIndex !== null ? data[selectedIndex] : null;
    const periodLabel = period ? `${period.split('-')[1]}/${period.split('-')[0]}` : 'Todos';

    return (
        <WidgetContainer
            title="MONITOR OPERAÇÃO"
            icon={<BarChart2 size={14} className="text-indigo-500" />}
            onRemove={onRemove}
            headerActions={
                <div className="flex items-center gap-0.5" onMouseDown={e => e.stopPropagation()}>
                    <button
                        onClick={() => navigatePeriod('prev')}
                        className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                        title="Mês anterior"
                    >
                        <ChevronLeft size={13} strokeWidth={2.5} />
                    </button>
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
                    <button
                        onClick={() => navigatePeriod('next')}
                        className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                        title="Próximo mês"
                    >
                        <ChevronRight size={13} strokeWidth={2.5} />
                    </button>
                    {period !== defaultPeriod && (
                        <button
                            onClick={resetToCurrentMonth}
                            className="h-6 px-1.5 flex items-center rounded text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                        >
                            Hoje
                        </button>
                    )}
                </div>
            }
        >
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-indigo-500 animate-spin" />
                    <div className="text-xs text-slate-400 font-medium animate-pulse">Carregando...</div>
                </div>
            ) : data.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                        <Users size={24} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <span className="text-xs">Nenhum dado para <strong>{periodLabel}</strong></span>
                </div>
            ) : (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-1.5 min-h-0">
                        {data.map((item, idx) => {
                            const isSelected = selectedIndex === idx;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedIndex(prev => prev === idx ? null : idx)}
                                    className={`w-full rounded-xl px-3 py-2.5 text-left transition-all duration-200 border ${
                                        isSelected
                                            ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'
                                            : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColor(item.name)} flex items-center justify-center shrink-0`}>
                                            <span className="text-[10px] font-black text-white">{getInitials(item.name)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
                                            <span className={`text-xs font-semibold truncate ${
                                                isSelected ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                                            }`}>
                                                {item.name}
                                            </span>
                                            <span className={`text-xs font-black shrink-0 tabular-nums ${
                                                isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                                            }`}>
                                                {item.total}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-px">
                                        {STATUS_ORDER.map(status => {
                                            const count = item[status] || 0;
                                            const pct = (count / item.total) * 100;
                                            if (!count) return null;
                                            return (
                                                <div
                                                    key={status}
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${pct}%`,
                                                        backgroundColor: STATUS_CONFIG[status].color,
                                                        opacity: isSelected || selectedIndex === null ? 1 : 0.4,
                                                    }}
                                                    title={`${status}: ${count}`}
                                                />
                                            );
                                        })}
                                    </div>
                                    {isSelected && (
                                        <div className="mt-2 flex items-center gap-2.5 flex-wrap">
                                            {STATUS_ORDER.map(status => {
                                                const count = item[status] || 0;
                                                if (!count) return null;
                                                const cfg = STATUS_CONFIG[status];
                                                return (
                                                    <div key={status} className="flex items-center gap-1">
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                                                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{cfg.label}:</span>
                                                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">{count}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="shrink-0 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 rounded-b-2xl">
                        {selected ? (
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarColor(selected.name)} flex items-center justify-center shrink-0`}>
                                        <span className="text-[9px] font-black text-white">{getInitials(selected.name)}</span>
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{selected.name}</span>
                                        <span className="text-[10px] text-slate-400">{selected.total} tarefas</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {STATUS_ORDER.map(status => {
                                        const count = selected[status] || 0;
                                        if (!count) return null;
                                        const cfg = STATUS_CONFIG[status];
                                        return (
                                            <div key={status} className="flex flex-col items-center gap-0.5">
                                                <span className="text-sm font-black" style={{ color: cfg.color }}>{count}</span>
                                                <span style={{ color: cfg.color }}>{cfg.icon}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Total Geral</span>
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">{totals.total} tarefas</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {[
                                        { count: totals.atrasada, color: '#ef4444', icon: <AlertTriangle size={10} /> },
                                        { count: totals.pendente, color: '#f59e0b', icon: <Clock size={10} /> },
                                        { count: totals.iniciada, color: '#3b82f6', icon: <Hourglass size={10} /> },
                                        { count: totals.concluida, color: '#10b981', icon: <CheckCircle2 size={10} /> },
                                    ].map(({ count, color, icon }, i) => (
                                        <div key={i} className="flex flex-col items-center gap-0.5">
                                            <span className="text-sm font-black leading-none" style={{ color }}>{count}</span>
                                            <span style={{ color }}>{icon}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </WidgetContainer>
    );
};
