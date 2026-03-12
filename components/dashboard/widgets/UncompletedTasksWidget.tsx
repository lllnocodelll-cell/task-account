import React, { useEffect, useState } from 'react';
import { ClipboardList, Calendar } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';
import { TaskStatus } from '../../../types';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

export const UncompletedTasksWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    // Calcula o mês atual e subtrai os meses necessários
    const getMonthOffset = (offset: number) => {
        const d = new Date();
        d.setMonth(d.getMonth() - offset);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    // Padrão: Últimos 3 meses de fechamento (ex: se atual = Março, start = Dezembro, end = Fevereiro)
    const [startMonth, setStartMonth] = useState(getMonthOffset(3));
    const [endMonth, setEndMonth] = useState(getMonthOffset(1));
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        pendente: 0,
        iniciada: 0,
        atrasada: 0
    });

    useEffect(() => {
        const fetchTasks = async () => {
            if (!orgId) return;
            setLoading(true);

            try {
                // Busca as tarefas no intervalo de competência
                // A competência no banco está no formato YYYY-MM
                const { data, error } = await supabase
                    .from('tasks')
                    .select('status')
                    .eq('org_id', orgId)
                    .gte('competence', startMonth)
                    .lte('competence', endMonth)
                    .in('status', ['Pendente', 'Iniciada', 'Atrasada']);

                if (error) throw error;

                if (data) {
                    let totalAcumulado = 0;
                    let pendenteAcumulado = 0;
                    let iniciadaAcumulado = 0;
                    let atrasadaAcumulado = 0;

                    data.forEach(task => {
                        totalAcumulado++;
                        if (task.status === 'Pendente') pendenteAcumulado++;
                        if (task.status === 'Iniciada') iniciadaAcumulado++;
                        if (task.status === 'Atrasada') atrasadaAcumulado++;
                    });

                    setStats({
                        total: totalAcumulado,
                        pendente: pendenteAcumulado,
                        iniciada: iniciadaAcumulado,
                        atrasada: atrasadaAcumulado
                    });
                }
            } catch (err) {
                console.error('Error fetching uncompleted tasks:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, [orgId, startMonth, endMonth]);

    return (
        <WidgetContainer title="Tarefas Pendentes Meses Anteriores" icon={<ClipboardList size={18} className="text-rose-500" />} onRemove={onRemove}>
            <div className="flex flex-col h-full w-full">
                {/* Filtro de Competência */}
                <div className="mb-4">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                        <Calendar size={12} />
                        Período (Competência)
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="month"
                            value={startMonth}
                            onChange={(e) => setStartMonth(e.target.value)}
                            className="w-full text-sm font-medium px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-shadow"
                        />
                        <span className="text-slate-400 text-xs font-medium">até</span>
                        <input
                            type="month"
                            value={endMonth}
                            onChange={(e) => setEndMonth(e.target.value)}
                            min={startMonth}
                            className="w-full text-sm font-medium px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-shadow"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-rose-500 animate-spin"></div>
                        <div className="text-xs text-slate-400 font-medium animate-pulse">Buscando pendências...</div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full">
                        {/* Indicador Principal */}
                        <div className="w-full flex flex-col items-center justify-center py-5 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30 shadow-sm">
                            <span className="text-5xl font-black text-rose-600 dark:text-rose-400 mb-1 leading-none">{stats.total}</span>
                            <span className="text-xs font-bold text-rose-600/70 dark:text-rose-400/80 uppercase tracking-widest text-center px-4 mt-1">
                                Não Concluídas
                            </span>
                        </div>

                        {/* Detalhamento */}
                        <div className="w-full grid grid-cols-3 gap-2">
                            <div className="flex flex-col items-center justify-center py-3 px-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/20 shadow-sm transition-transform hover:scale-[1.02]">
                                <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-bold uppercase tracking-wider mb-1">Pendentes</span>
                                <span className="text-xl font-black text-amber-600 dark:text-amber-500 leading-none">{stats.pendente}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center py-3 px-2 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/20 shadow-sm transition-transform hover:scale-[1.02]">
                                <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 font-bold uppercase tracking-wider mb-1">Iniciadas</span>
                                <span className="text-xl font-black text-blue-600 dark:text-blue-500 leading-none">{stats.iniciada}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center py-3 px-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100/50 dark:border-red-900/20 shadow-sm transition-transform hover:scale-[1.02]">
                                <span className="text-[10px] text-red-600/80 dark:text-red-400/80 font-bold uppercase tracking-wider mb-1">Atrasadas</span>
                                <span className="text-xl font-black text-red-600 dark:text-red-500 leading-none">{stats.atrasada}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </WidgetContainer>
    );
};
