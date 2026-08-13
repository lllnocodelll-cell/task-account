import React, { useEffect, useState } from 'react';
import { ClipboardList, Calendar, AlertTriangle, Clock, Hourglass, ChevronLeft, ChevronRight, Search, X, ChevronDown, CheckCircle2, Building2 } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';
import { Tooltip } from '../../ui/Tooltip';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

interface TaskDetailItem {
    id: string;
    task_name: string;
    client_name: string;
    due_date: string | null;
    status: string;
    sector: string | null;
    priority: string;
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
    const [rawTasks, setRawTasks] = useState<TaskDetailItem[]>([]);

    // Estados do Modal de Drilldown
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
    const [modalSearchQuery, setModalSearchQuery] = useState('');

    useEffect(() => {
        const fetchTasks = async () => {
            if (!orgId) return;
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('tasks')
                    .select('id, task_name, client_name, due_date, status, sector, priority')
                    .eq('org_id', orgId)
                    .gte('competence', startMonth)
                    .lte('competence', endMonth)
                    .in('status', ['Pendente', 'Iniciada', 'Atrasada']);

                if (error) throw error;

                if (data) {
                    const mapped = data as TaskDetailItem[];
                    setRawTasks(mapped);

                    const pendente = mapped.filter(t => t.status === 'Pendente').length;
                    const iniciada = mapped.filter(t => t.status === 'Iniciada').length;
                    const atrasada = mapped.filter(t => t.status === 'Atrasada').length;
                    setStats({ total: mapped.length, pendente, iniciada, atrasada });
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
            statusKey: 'Atrasada',
            label: 'Atrasadas',
            count: stats.atrasada,
            color: '#ef4444',
            bg: 'bg-red-50 hover:bg-red-100/80 dark:bg-red-500/10 dark:hover:bg-red-500/20',
            border: 'border-red-100 dark:border-red-500/20',
            text: 'text-red-600 dark:text-red-400',
            bar: 'bg-red-500',
            icon: <AlertTriangle size={13} />,
        },
        {
            statusKey: 'Pendente',
            label: 'Pendentes',
            count: stats.pendente,
            color: '#f59e0b',
            bg: 'bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-500/10 dark:hover:bg-amber-500/20',
            border: 'border-amber-100 dark:border-amber-500/20',
            text: 'text-amber-600 dark:text-amber-400',
            bar: 'bg-amber-500',
            icon: <Clock size={13} />,
        },
        {
            statusKey: 'Iniciada',
            label: 'Iniciadas',
            count: stats.iniciada,
            color: '#3b82f6',
            bg: 'bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-500/10 dark:hover:bg-blue-500/20',
            border: 'border-blue-100 dark:border-blue-500/20',
            text: 'text-blue-600 dark:text-blue-400',
            bar: 'bg-blue-500',
            icon: <Hourglass size={13} />,
        },
    ];

    const openDrilldown = (statusKey: string) => {
        setSelectedStatusFilter(statusKey);
        setModalSearchQuery('');
    };

    const modalFilteredTasks = selectedStatusFilter
        ? rawTasks.filter(t => {
            const matchesStatus = t.status === selectedStatusFilter;
            const matchesQuery = !modalSearchQuery ||
                t.task_name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                t.client_name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                (t.sector && t.sector.toLowerCase().includes(modalSearchQuery.toLowerCase()));
            return matchesStatus && matchesQuery;
        })
        : [];

    return (
        <WidgetContainer
            title="TAREFAS PENDENTES"
            icon={<ClipboardList size={14} className="text-rose-500" />}
            onRemove={onRemove}
            headerActions={
                <div className="flex items-center gap-0.5" onMouseDown={e => e.stopPropagation()}>
                    <Tooltip content="Mês inicial anterior" position="top">
                        <button
                            onClick={() => setStartMonth(prev => navigateMonth(prev, 'prev'))}
                            className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        >
                            <ChevronLeft size={13} strokeWidth={2.5} />
                        </button>
                    </Tooltip>
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
                    <Tooltip content="Próximo mês inicial" position="top">
                        <button
                            onClick={() => setStartMonth(prev => navigateMonth(prev, 'next'))}
                            className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        >
                            <ChevronRight size={13} strokeWidth={2.5} />
                        </button>
                    </Tooltip>
                    <span className="text-[9px] text-slate-300 dark:text-slate-600 font-medium px-0.5">|</span>
                    <Tooltip content="Mês final anterior" position="top">
                        <button
                            onClick={() => setEndMonth(prev => navigateMonth(prev, 'prev'))}
                            className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        >
                            <ChevronLeft size={13} strokeWidth={2.5} />
                        </button>
                    </Tooltip>
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
                    <Tooltip content="Próximo mês final" position="top">
                        <button
                            onClick={() => setEndMonth(prev => navigateMonth(prev, 'next'))}
                            className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        >
                            <ChevronRight size={13} strokeWidth={2.5} />
                        </button>
                    </Tooltip>
                </div>
            }
        >
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-rose-500 animate-spin" />
                    <div className="text-xs text-slate-400 animate-pulse">Buscando pendências...</div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col h-full overflow-hidden p-2 gap-2">
                    {/* Layout em 2 Colunas: Não Concluídas | Status */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2.5 min-h-0 items-stretch">
                        
                        {/* Coluna Esquerda: Não Concluídas com Donut Chart */}
                        <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 text-center relative overflow-hidden">
                            {/* Glow de Fundo */}
                            <div className={`absolute w-24 h-24 rounded-full blur-2xl opacity-15 pointer-events-none ${
                                stats.atrasada > 0 ? 'bg-red-500' : stats.pendente > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />

                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                                Não Concluídas
                            </span>

                            {/* Gráfico Donut SVG */}
                            <div className="relative w-24 h-24 flex items-center justify-center shrink-0 my-1">
                                {stats.total === 0 ? (
                                    <>
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                            <circle
                                                cx="18"
                                                cy="18"
                                                r="15.9155"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3.5"
                                                className="text-emerald-200 dark:text-emerald-950/60"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                            <CheckCircle2 size={20} className="text-emerald-500 mb-0.5" />
                                            <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Zero</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                            <circle
                                                cx="18"
                                                cy="18"
                                                r="15.9155"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3.5"
                                                className="text-slate-100 dark:text-slate-800/60"
                                            />
                                            {(() => {
                                                const total = stats.total;
                                                const segments = [
                                                    { count: stats.atrasada, color: '#ef4444' },
                                                    { count: stats.pendente, color: '#f59e0b' },
                                                    { count: stats.iniciada, color: '#3b82f6' },
                                                ];
                                                let accumulatedPct = 0;
                                                return segments.map((seg, i) => {
                                                    if (seg.count <= 0) return null;
                                                    const pct = (seg.count / total) * 100;
                                                    const dash = `${pct} ${100 - pct}`;
                                                    const offset = 100 - accumulatedPct;
                                                    accumulatedPct += pct;
                                                    return (
                                                        <circle
                                                            key={i}
                                                            cx="18"
                                                            cy="18"
                                                            r="15.9155"
                                                            fill="none"
                                                            stroke={seg.color}
                                                            strokeWidth="3.5"
                                                            strokeDasharray={dash}
                                                            strokeDashoffset={offset}
                                                            strokeLinecap="round"
                                                            className="transition-all duration-700"
                                                        />
                                                    );
                                                });
                                            })()}
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                            <span className={`text-2xl font-black leading-none tabular-nums ${
                                                stats.atrasada > 0 ? 'text-red-600 dark:text-red-400' :
                                                stats.pendente > 0 ? 'text-amber-600 dark:text-amber-400' :
                                                'text-blue-600 dark:text-blue-400'
                                            }`}>
                                                {stats.total}
                                            </span>
                                            <span className="text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                                                Obrigações
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                                {stats.atrasada > 0 ? (
                                    <span className="text-red-600 dark:text-red-400">⚠️ {stats.atrasada} com prazo vencido</span>
                                ) : stats.pendente > 0 ? (
                                    <span className="text-amber-600 dark:text-amber-400">⏳ {stats.pendente} aguardando início</span>
                                ) : stats.total > 0 ? (
                                    <span className="text-blue-600 dark:text-blue-400">✓ {stats.iniciada} em andamento</span>
                                ) : (
                                    <span className="text-emerald-600 dark:text-emerald-400">✓ Nenhuma pendência</span>
                                )}
                            </div>
                        </div>

                        {/* Coluna Direita: Status da Operação */}
                        <div className="sm:col-span-7 flex flex-col justify-center gap-2 overflow-y-auto custom-scrollbar">
                            {STATUS_ITEMS.map(item => (
                                <Tooltip key={item.label} content={`Clique para detalhar tarefas ${item.label.toLowerCase()}`} position="top" className="w-full">
                                    <div
                                        onClick={() => openDrilldown(item.statusKey)}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${item.bg} ${item.border} cursor-pointer transition-all hover:scale-[1.01] group w-full`}
                                    >
                                        <div className={`shrink-0 ${item.text}`}>{item.icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-[11px] font-bold ${item.text} flex items-center gap-1`}>
                                                    {item.label}
                                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">→</span>
                                                </span>
                                                <span className={`text-sm font-black tabular-nums ${item.text}`}>{item.count}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/60 dark:bg-slate-900/30 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${item.bar} rounded-full transition-all duration-700`}
                                                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Tooltip>
                            ))}
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="shrink-0 px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl flex items-center justify-between mt-auto">
                        <span className="text-[10px] text-slate-400 font-medium">Período selecionado</span>
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

            {/* Modal Drilldown de Tarefas */}
            {selectedStatusFilter && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                        {/* Header do Modal */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className={`p-2 rounded-lg ${
                                    selectedStatusFilter === 'Atrasada' ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' :
                                    selectedStatusFilter === 'Pendente' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' :
                                    'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                                }`}>
                                    {selectedStatusFilter === 'Atrasada' && <AlertTriangle size={16} />}
                                    {selectedStatusFilter === 'Pendente' && <Clock size={16} />}
                                    {selectedStatusFilter === 'Iniciada' && <Hourglass size={16} />}
                                </span>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                                        Tarefas {selectedStatusFilter === 'Atrasada' ? 'Atrasadas' : selectedStatusFilter === 'Pendente' ? 'Pendentes' : 'Iniciadas'}
                                    </h4>
                                    <p className="text-xs text-slate-400">
                                        {modalFilteredTasks.length} {modalFilteredTasks.length === 1 ? 'tarefa encontrada' : 'tarefas encontradas'} ({formatMonthLabel(startMonth)} a {formatMonthLabel(endMonth)})
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedStatusFilter(null)}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Barra de Pesquisa */}
                        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por tarefa, cliente ou setor..."
                                    value={modalSearchQuery}
                                    onChange={e => setModalSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-8 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-rose-500 transition-colors"
                                />
                                {modalSearchQuery && (
                                    <button onClick={() => setModalSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Lista de Tarefas */}
                        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-2">
                            {modalFilteredTasks.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <ClipboardList className="mx-auto mb-2 opacity-20" size={36} />
                                    <p className="text-xs font-medium">Nenhuma tarefa encontrada para este filtro.</p>
                                </div>
                            ) : (
                                modalFilteredTasks.map(t => (
                                    <div
                                        key={t.id}
                                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-3 text-xs"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 dark:text-slate-100 truncate" title={t.task_name}>
                                                    {t.task_name}
                                                </span>
                                                {t.sector && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                                                        {t.sector}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                                <Building2 size={12} className="shrink-0 text-slate-400" />
                                                <span className="truncate">{t.client_name}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                                                t.status === 'Atrasada' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400' :
                                                t.status === 'Pendente' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400' :
                                                'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400'
                                            }`}>
                                                {t.status}
                                            </span>
                                            {t.due_date && (
                                                <span className="text-[10px] font-mono text-slate-400">
                                                    Venc: {new Date(t.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium">
                                Total: {modalFilteredTasks.length} tarefas
                            </span>
                            <button
                                onClick={() => setSelectedStatusFilter(null)}
                                className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-200 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </WidgetContainer>
    );
};

