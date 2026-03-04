import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

export const TopSegmentsWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [data, setData] = useState<{ name: string, value: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!orgId) return;
            try {
                const { data: result, error } = await supabase
                    .from('vw_segment_distribution')
                    .select('*')
                    .eq('org_id', orgId);

                if (error) throw error;

                if (result) {
                    // Sort and take top 8
                    const sorted = result.sort((a, b) => b.value - a.value).slice(0, 8);
                    setData(sorted);
                }
            } catch (err) {
                console.error('Error fetching segment distribution:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [orgId]);

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
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number) => [value, 'Clientes']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            )}
        </WidgetContainer>
    );
};
