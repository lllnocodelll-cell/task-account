import React, { useEffect, useState } from 'react';
import { ListOrdered } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

export const TopTasksWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [data, setData] = useState<{ name: string, count: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!orgId) return;
            try {
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);

                const { data: result, error } = await supabase
                    .from('tasks')
                    .select('task_name')
                    .eq('org_id', orgId)
                    .gte('created_at', startOfMonth.toISOString());

                if (error) throw error;

                if (result) {
                    const counts: Record<string, number> = {};
                    result.forEach(row => {
                        const name = row.task_name || 'Sem nome';
                        counts[name] = (counts[name] || 0) + 1;
                    });

                    const sorted = Object.entries(counts)
                        .map(([name, count]) => ({ name, count }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5); // top 5

                    setData(sorted);
                }
            } catch (err) {
                console.error('Error fetching top tasks:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [orgId]);

    return (
        <WidgetContainer title="RANKING TAREFAS" icon={<ListOrdered size={14} />} onRemove={onRemove}>
            <div className="flex-1 overflow-y-auto pr-2">
                {loading ? (
                    <div className="animate-pulse space-y-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded"></div>)}
                    </div>
                ) : data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                        Nenhuma tarefa cadastrada
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {data.map((item, idx) => (
                            <li key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {idx + 1}
                                    </span>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate" title={item.name}>
                                        {item.name}
                                    </span>
                                </div>
                                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                    {item.count}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </WidgetContainer>
    );
};
