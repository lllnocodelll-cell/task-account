import React, { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

export const UpcomingDeadlinesWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!orgId) return;
            try {
                const today = new Date();
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);

                const { data: result, error } = await supabase
                    .from('tasks')
                    .select('id, task_name, client_name, due_date')
                    .eq('org_id', orgId)
                    .neq('status', 'Concluída')
                    .gte('due_date', today.toISOString().split('T')[0])
                    .lte('due_date', nextWeek.toISOString().split('T')[0])
                    .order('due_date', { ascending: true })
                    .limit(10);

                if (error) throw error;
                if (result) setData(result);
            } catch (err) {
                console.error('Error fetching deadlines:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [orgId]);

    return (
        <WidgetContainer title="PRÓXIMOS VENCIMENTOS" icon={<CalendarClock size={14} />} onRemove={onRemove}>
            <div className="flex-1 overflow-y-auto pr-2">
                {loading ? (
                    <div className="animate-pulse space-y-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded"></div>)}
                    </div>
                ) : data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                        Nenhum vencimento futuro próximo
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {data.map((item) => {
                            const dueObj = new Date(item.due_date + 'T00:00:00');
                            const isToday = dueObj.toDateString() === new Date().toDateString();
                            const formattedDate = dueObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

                            return (
                                <li key={item.id} className="p-2 sm:p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 sm:gap-2 group">
                                    <div className="overflow-hidden min-w-0 w-full sm:w-auto">
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={item.task_name}>{item.task_name}</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={item.client_name}>{item.client_name}</p>
                                    </div>
                                    <div className={`flex-shrink-0 self-end sm:self-auto text-[11px] font-bold px-2 py-0.5 rounded-md ${isToday ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                                        {isToday ? 'Hoje' : formattedDate}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </WidgetContainer>
    );
};
