import React, { useEffect, useState } from 'react';
import { AlertOctagon, AlertTriangle } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

interface ExclusionData {
    clientId: string;
    clientName: string;
    competence: string;
    taskName: string;
}

export const NotifiedExclusionWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [data, setData] = useState<ExclusionData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchExclusions = async () => {
            if (!orgId) return;
            try {
                // Buscamos tarefas ativas que estejam marcadas com exclusão notificada
                const { data: tasksData, error } = await supabase
                    .from('tasks')
                    .select(`
                        id,
                        client_id,
                        client_name,
                        task_name,
                        competence
                    `)
                    .eq('org_id', orgId)
                    .eq('notified_exclusion', true)
                    .neq('status', 'Concluída')
                    .order('competence', { ascending: true });

                if (error) throw error;

                if (tasksData) {
                    // Mapeamento e deduplicação básica caso houvessem múltiplas tarefas pro mesmo cliente + competência
                    const uniqueEntries = new Map<string, ExclusionData>();

                    tasksData.forEach((task: any) => {
                        const key = `${task.client_name}-${task.competence}`;
                        if (!uniqueEntries.has(key)) {
                            uniqueEntries.set(key, {
                                clientId: task.client_id,
                                clientName: task.client_name,
                                competence: task.competence,
                                taskName: task.task_name,
                            });
                        }
                    });

                    setData(Array.from(uniqueEntries.values()));
                }
            } catch (err) {
                console.error('Error fetching notified exclusions:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchExclusions();
    }, [orgId]);

    return (
        <WidgetContainer title="Exclusão Notificada" icon={<AlertOctagon size={18} className="text-rose-500" />} onRemove={onRemove}>
            <div className="flex-1 flex flex-col p-2 space-y-4 overflow-y-auto w-full custom-scrollbar">
                {loading ? (
                    <div className="animate-pulse space-y-3 w-full">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-3">
                                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded w-3/4"></div>
                                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-slate-400 text-sm h-full pb-6 gap-2">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center">
                            <AlertTriangle size={24} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="font-medium text-slate-500">Nenhuma exclusão notificada</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {data.map((item, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100/50 dark:border-rose-800/30 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors group">
                                <div className="mt-0.5 w-8 h-8 shrink-0 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                                    <AlertOctagon size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate pr-2">
                                        {item.clientName}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                                            Competência: {item.competence}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </WidgetContainer>
    );
};
