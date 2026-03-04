import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

export const MonthlyEvolutionWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!orgId) return;
            try {
                const { data: result, error } = await supabase
                    .from('vw_monthly_evolution')
                    .select('*')
                    .eq('org_id', orgId)
                    .order('month', { ascending: true });

                if (error) throw error;

                if (result) {
                    const formatted = result.map(item => {
                        const [y, m] = item.month.split('-');
                        const date = new Date(parseInt(y), parseInt(m) - 1, 1);
                        const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                        return {
                            name: monthName,
                            Concluídas: parseInt(item.concluded),
                            Pendentes: parseInt(item.pending)
                        };
                    });
                    setData(formatted);
                }
            } catch (err) {
                console.error('Error fetching monthly evolution:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [orgId]);

    return (
        <WidgetContainer title="Evolução Mensal" icon={<TrendingUp size={18} />} onRemove={onRemove}>
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
                    <LineChart
                        data={data}
                        margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Line type="monotone" dataKey="Concluídas" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="Pendentes" stroke="#ef4444" strokeWidth={3} />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </WidgetContainer>
    );
};
