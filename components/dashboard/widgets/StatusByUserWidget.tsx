import React, { useEffect, useState } from 'react';
import { BarChart as BarChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

export const StatusByUserWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!orgId) return;
            try {
                const { data: result, error } = await supabase
                    .from('vw_status_by_user')
                    .select('*')
                    .eq('org_id', orgId);

                if (error) throw error;

                if (result) {
                    const transformed: Record<string, any> = {};
                    result.forEach(row => {
                        if (!transformed[row.responsible]) {
                            transformed[row.responsible] = {
                                responsible: row.responsible,
                                name: row.responsible,
                                Concluída: 0,
                                Iniciada: 0,
                                Pendente: 0,
                                Atrasada: 0,
                                total: 0
                            };
                        }
                        transformed[row.responsible][row.status] = row.count;
                        transformed[row.responsible].total += row.count;
                    });

                    // Convert object to array
                    const dataArray = Object.values(transformed);

                    // Sort descending by total
                    dataArray.sort((a, b) => b.total - a.total);

                    // Update the label 'name' to include the total
                    dataArray.forEach(item => {
                        item.name = `${item.responsible} (${item.total})`;
                    });

                    setData(dataArray);
                }
            } catch (err) {
                console.error('Error fetching status by user:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [orgId]);

    return (
        <WidgetContainer title="Tarefas por Colaborador" icon={<BarChartIcon size={18} />} onRemove={onRemove}>
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : data.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                    Nenhum dado encontrado
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={data}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="Pendente" stackId="a" fill="#f59e0b" name="Pendente" />
                        <Bar dataKey="Iniciada" stackId="a" fill="#3b82f6" name="Iniciada" />
                        <Bar dataKey="Atrasada" stackId="a" fill="#ef4444" name="Atrasada" />
                        <Bar dataKey="Concluída" stackId="a" fill="#10b981" name="Concluída" />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </WidgetContainer>
    );
};
