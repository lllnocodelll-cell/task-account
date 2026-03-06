import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

const COLORS = [
    '#6366f1', // Indigo
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#8b5cf6', // Violet
    '#ef4444', // Red
    '#f97316'  // Orange
];

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

    // Calcular o total para exibir no centro do gráfico
    const totalValue = data.reduce((acc, curr) => acc + curr.value, 0);

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
        <WidgetContainer title="Top 8 Segmentos Ativos" icon={<PieChartIcon size={18} className="text-indigo-500" />} onRemove={onRemove}>
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <div className="w-24 h-24 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-indigo-500 animate-spin"></div>
                    <div className="text-sm text-slate-400 font-medium animate-pulse">Carregando dados...</div>
                </div>
            ) : data.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                        <PieChartIcon size={24} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <span>Nenhum segmento encontrado</span>
                </div>
            ) : (
                <div className="flex-1 flex flex-col md:flex-row items-center justify-center h-full w-full gap-4 md:gap-8 p-4">
                    {/* Gráfico */}
                    <div className="relative w-[180px] h-[180px] md:w-[220px] md:h-[220px] shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="65%"
                                    outerRadius="95%"
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {data.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                            className="hover:opacity-80 transition-opacity duration-300 cursor-pointer drop-shadow-sm"
                                        />
                                    ))}
                                </Pie>
                                <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Info */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-bold text-slate-800 dark:text-white drop-shadow-sm">{totalValue}</span>
                            <span className="text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Clientes</span>
                        </div>
                    </div>

                    {/* Legenda Customizada (Lista) */}
                    <div className="flex-1 w-full flex flex-col gap-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                        {data.map((item, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-white dark:bg-slate-800/40 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div
                                        className="w-3 h-3 rounded-full shadow-sm shrink-0 transition-transform group-hover:scale-125 duration-300"
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    />
                                    <div className="flex flex-col truncate">
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate pr-2">
                                            {item.name}
                                        </span>
                                        <div className="hidden group-hover:flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                            <TrendingUp size={10} /> {item.value} cliente{item.value > 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-1 shrink-0 bg-slate-100 dark:bg-slate-900/50 px-2 py-1 rounded-lg">
                                    <span className="text-sm font-bold text-slate-800 dark:text-white">
                                        {item.percent.toFixed(1)}
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-500">%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </WidgetContainer>
    );
};
