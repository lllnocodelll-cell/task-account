import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

export const TopSegmentsWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [data, setData] = useState<{ name: string, value: number, percent: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!orgId) return;
            try {
                // Fetch segments data
                const { data: result, error } = await supabase
                    .from('vw_segment_distribution')
                    .select('*')
                    .eq('org_id', orgId);

                if (error) throw error;

                // Em uma aplicação real, seria melhor buscar o COUNT(*) total de clients que tem segmento != null
                // Mas podemos calcular o total com a soma da própria view para fins visuais percentuais
                if (result) {
                    const totalClients = result.reduce((acc, curr) => acc + curr.value, 0);

                    // Sort and take top 8
                    const sorted = result.sort((a, b) => b.value - a.value).slice(0, 8);

                    const percentualData = sorted.map(item => ({
                        name: item.name,
                        value: item.value,
                        percent: totalClients > 0 ? (item.value / totalClients) * 100 : 0
                    }));

                    setData(percentualData);
                }
            } catch (err) {
                console.error('Error fetching segment distribution:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [orgId]);

    // Custom Tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 text-sm">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{data.name}</p>
                    <div className="flex justify-between gap-4 text-slate-600 dark:text-slate-400">
                        <span>Percentual do Total:</span>
                        <span className="font-medium">{data.percent.toFixed(1)}%</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <WidgetContainer title="Top 8 Segmentos Ativos" icon={<PieChartIcon size={18} />} onRemove={onRemove}>
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : data.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                    Nenhum dado encontrado
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center h-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={110}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}
        </WidgetContainer>
    );
};
