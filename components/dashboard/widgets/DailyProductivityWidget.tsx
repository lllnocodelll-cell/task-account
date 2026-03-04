import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

export const DailyProductivityWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!orgId) return;
            try {
                const { data: result, error } = await supabase
                    .from('vw_daily_productivity')
                    .select('*')
                    .eq('org_id', orgId)
                    .order('date', { ascending: true });

                if (error) throw error;

                if (result) {
                    const formatted = result.map(item => {
                        const [y, m, d] = item.date.split('-');
                        const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                        return {
                            name: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                            Concluídas: parseInt(item.completed_count)
                        };
                    });
                    setData(formatted);
                }
            } catch (err) {
                console.error('Error fetching daily productivity:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [orgId]);

    return (
        <WidgetContainer title="Produtividade Diária (Concluídas)" icon={<Activity size={18} />} onRemove={onRemove}>
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : data.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                    Nenhum dado encontrado nos últimos 14 dias
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        />
                        <Bar dataKey="Concluídas" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </WidgetContainer>
    );
};
