import React, { useEffect, useState, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { PieChart as PieChartIcon, Users, TrendingUp } from 'lucide-react';
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
    '#f97316', // Orange
];

// Setor ativo renderizado com destaque e rótulo externo
const renderActiveShape = (props: any) => {
    const {
        cx, cy, innerRadius, outerRadius,
        startAngle, endAngle, fill, payload, percent
    } = props;

    return (
        <g>
            {/* Fatia expandida */}
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 10}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                opacity={1}
            />
            {/* Anel externo sutil */}
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={outerRadius + 14}
                outerRadius={outerRadius + 18}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                opacity={0.4}
            />
        </g>
    );
};

export const TopSegmentsWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [data, setData] = useState<{ name: string; value: number; percent: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

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
                    const totalClients = result.reduce((acc, curr) => acc + curr.value, 0);
                    const sorted = result.sort((a, b) => b.value - a.value).slice(0, 8);
                    const percentualData = sorted.map(item => ({
                        name: item.name,
                        value: item.value,
                        percent: totalClients > 0 ? (item.value / totalClients) * 100 : 0,
                    }));
                    setData(percentualData);
                    // Seleciona o maior segmento por padrão
                    if (percentualData.length > 0) setActiveIndex(0);
                }
            } catch (err) {
                console.error('Error fetching segment distribution:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [orgId]);

    const totalValue = data.reduce((acc, curr) => acc + curr.value, 0);
    const selectedItem = activeIndex !== null ? data[activeIndex] : null;

    const onPieClick = useCallback((_: any, index: number) => {
        setActiveIndex(prev => (prev === index ? null : index));
    }, []);

    const onPieEnter = useCallback((_: any, index: number) => {
        if (activeIndex === null) setActiveIndex(index);
    }, [activeIndex]);

    return (
        <WidgetContainer
            title="RANKING SEGMENTOS"
            icon={<PieChartIcon size={14} className="text-indigo-500" />}
            onRemove={onRemove}
        >
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-indigo-500 animate-spin" />
                    <div className="text-xs text-slate-400 font-medium animate-pulse">Carregando segmentos...</div>
                </div>
            ) : data.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                        <PieChartIcon size={24} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <span>Nenhum segmento encontrado</span>
                </div>
            ) : (
                <div className="flex-1 flex flex-col h-full w-full overflow-hidden">

                    {/* Conteúdo principal: gráfico + lista */}
                    <div className="flex-1 flex flex-col md:flex-row items-start gap-4 p-3 overflow-hidden min-h-0">

                        {/* --- Gráfico de Pizza --- */}
                        <div className="relative w-full md:w-[200px] h-[160px] md:h-full shrink-0 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="55%"
                                        outerRadius="80%"
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="none"
                                        {...({
                                            activeIndex: activeIndex ?? undefined,
                                            activeShape: renderActiveShape,
                                        } as any)}
                                        onClick={onPieClick}
                                        style={{ cursor: 'pointer', outline: 'none' }}
                                    >
                                        {data.map((_, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                                opacity={activeIndex === null || activeIndex === index ? 1 : 0.3}
                                                style={{ transition: 'opacity 0.2s ease' }}
                                            />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Centro do donut */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                                {selectedItem ? (
                                    <>
                                        <span
                                            className="text-2xl font-black leading-none transition-all duration-300"
                                            style={{ color: COLORS[activeIndex! % COLORS.length] }}
                                        >
                                            {selectedItem.percent.toFixed(0)}%
                                        </span>
                                        <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">
                                            do total
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">
                                            {totalValue}
                                        </span>
                                        <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">
                                            clientes
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* --- Lista de segmentos --- */}
                        <div className="flex-1 w-full flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
                            {data.map((item, index) => {
                                const isActive = activeIndex === index;
                                const color = COLORS[index % COLORS.length];
                                return (
                                    <button
                                        key={index}
                                        onClick={() => setActiveIndex(prev => prev === index ? null : index)}
                                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-left group ${
                                            isActive
                                                ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent'
                                        }`}
                                    >
                                        {/* Bolinha colorida */}
                                        <div
                                            className="shrink-0 rounded-full transition-all duration-200"
                                            style={{
                                                backgroundColor: color,
                                                width: isActive ? '10px' : '8px',
                                                height: isActive ? '10px' : '8px',
                                                opacity: activeIndex === null || isActive ? 1 : 0.35,
                                            }}
                                        />

                                        {/* Nome */}
                                        <span className={`flex-1 text-xs font-medium truncate transition-colors ${
                                            isActive
                                                ? 'text-slate-800 dark:text-white font-semibold'
                                                : 'text-slate-500 dark:text-slate-400'
                                        }`}>
                                            {item.name}
                                        </span>

                                        {/* Contagem */}
                                        <span className={`text-xs font-bold shrink-0 transition-colors ${
                                            isActive
                                                ? 'text-slate-700 dark:text-slate-200'
                                                : 'text-slate-400 dark:text-slate-500'
                                        }`}>
                                            {item.value}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* --- Rodapé dinâmico --- */}
                    <div className={`shrink-0 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl transition-all duration-300 ${
                        selectedItem ? 'opacity-100' : 'opacity-60'
                    }`}>
                        {selectedItem ? (
                            <div className="flex items-center justify-between gap-3">
                                {/* Indicador colorido + nome */}
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: COLORS[activeIndex! % COLORS.length] }}
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                                            {selectedItem.name}
                                        </span>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                            <Users size={9} />
                                            <span>{selectedItem.value} cliente{selectedItem.value !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Percentual + barra */}
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span
                                        className="text-lg font-black leading-none"
                                        style={{ color: COLORS[activeIndex! % COLORS.length] }}
                                    >
                                        {selectedItem.percent.toFixed(1)}%
                                    </span>
                                    {/* Mini barra de progresso */}
                                    <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${selectedItem.percent}%`,
                                                backgroundColor: COLORS[activeIndex! % COLORS.length],
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <TrendingUp size={12} />
                                    <span>Clique em um segmento para ver detalhes</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs">
                                    <Users size={11} className="text-slate-400" />
                                    <span className="font-bold text-slate-600 dark:text-slate-300">{totalValue}</span>
                                    <span className="text-slate-400">total</span>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </WidgetContainer>
    );
};
