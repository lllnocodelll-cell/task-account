import React, { useEffect, useState } from 'react';
import { BarChart as BarChartIcon, Users } from 'lucide-react';
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
                                'Concluída': 0,
                                'Iniciada': 0,
                                'Pendente': 0,
                                'Atrasada': 0,
                                total: 0
                            };
                        }
                        transformed[row.responsible][row.status] = row.count;
                        transformed[row.responsible].total += row.count;
                    });

                    const dataArray = Object.values(transformed);
                    dataArray.sort((a, b) => b.total - a.total);

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

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const total = payload[0].payload.total;
            return (
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
                        <Users size={16} className="text-indigo-500" />
                        <p className="font-bold text-slate-800 dark:text-slate-100">{label}</p>
                        <span className="ml-auto bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs py-0.5 px-2 rounded-full font-bold">
                            Total: {total}
                        </span>
                    </div>
                    <div className="flex flex-col gap-2">
                        {payload.map((entry: any, index: number) => {
                            if (entry.value === 0) return null;
                            return (
                                <div key={index} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                                        <span className="text-slate-600 dark:text-slate-300 font-medium">{entry.name}</span>
                                    </div>
                                    <span className="font-bold text-slate-800 dark:text-slate-100">{entry.value}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <WidgetContainer title="Tarefas por Colaborador" icon={<BarChartIcon size={18} className="text-indigo-500" />} onRemove={onRemove}>
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <div className="w-24 h-24 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-indigo-500 animate-spin"></div>
                    <div className="text-sm text-slate-400 font-medium animate-pulse">Carregando métricas...</div>
                </div>
            ) : data.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                        <Users size={24} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <span>Nenhum colaborador com tarefas</span>
                </div>
            ) : (
                <div className="flex-1 w-full h-full p-2 lg:p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            layout="vertical"
                            data={data}
                            margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                            barSize={32}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" opacity={0.5} />

                            <XAxis
                                type="number"
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                            />

                            <YAxis
                                type="category"
                                dataKey="name"
                                tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
                                width={110}
                                axisLine={false}
                                tickLine={false}
                            />

                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                            />

                            <Legend
                                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                                iconType="circle"
                            />

                            <Bar dataKey="Pendente" stackId="a" fill="#f59e0b" name="Pendente" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="Iniciada" stackId="a" fill="#3b82f6" name="Iniciada" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="Atrasada" stackId="a" fill="#ef4444" name="Atrasada" radius={[0, 0, 0, 0]} />
                            {/* The last bar in the stack gets rounded corners on the right */}
                            <Bar dataKey="Concluída" stackId="a" fill="#10b981" name="Concluída" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </WidgetContainer>
    );
};
