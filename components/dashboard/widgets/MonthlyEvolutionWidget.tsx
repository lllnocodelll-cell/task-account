import React, { useEffect, useState, useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Calendar, AlertCircle, ChevronDown, Info } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
  orgId: string;
  onRemove?: () => void;
}

interface MonthlyData {
  competence: string;
  month: string;
  fullMonth: string;
  tasks: number;
  completed: number;
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
  '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <Calendar size={10} /> {data.fullMonth}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Criado:</span>
            <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{payload[0].value}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Concluído:</span>
            <span className="text-xs font-black text-emerald-500 dark:text-emerald-400 tabular-nums">{payload[1].value}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const MonthlyEvolutionWidget: React.FC<Props> = ({ orgId, onRemove }) => {
  const [rawData, setRawData] = useState<any[]>([]);
  const [range, setRange] = useState(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!orgId) return;
      setLoading(true);
      setError(null);

      try {
        const { data: tasks, error: fetchError } = await (supabase as any)
          .from('tasks')
          .select('competence, status')
          .eq('org_id', orgId);

        if (fetchError) throw fetchError;
        setRawData(tasks || []);
      } catch (err: any) {
        console.error('Error fetching evolution data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId]);

  // Process data with Option 1: Period vs Previous Period
  const { processedChartData, stats } = useMemo(() => {
    if (rawData.length === 0) return { processedChartData: [], stats: { currentSum: 0, trend: 0, isUp: true } };
    
    // 1. Encontrar a última competência no dado REAL ou usar hoje se preferir
    // Para consistência com os dados do usuário (que podem ser futuros ou passados), vamos usar a maior competência encontrada.
    const sortedRawCompetences = rawData
      .map(t => t.competence)
      .filter(Boolean)
      .sort();
    
    if (sortedRawCompetences.length === 0) return { processedChartData: [], stats: { currentSum: 0, trend: 0, isUp: true } };
    
    const latestComp = sortedRawCompetences[sortedRawCompetences.length - 1];
    const [latestYear, latestMonth] = latestComp.split('-').map(Number);
    
    // 2. Gerar timeline de 2 * range meses (Período Atual + Período Anterior)
    const timeline: string[] = [];
    for (let i = (range * 2) - 1; i >= 0; i--) {
        const d = new Date(latestYear, latestMonth - 1 - i, 1);
        const comp = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        timeline.push(comp);
    }

    // 3. Agrupar dados
    const grouped: Record<string, { tasks: number, completed: number }> = {};
    rawData.forEach((task: any) => {
      if (!task.competence) return;
      if (!grouped[task.competence]) {
        grouped[task.competence] = { tasks: 0, completed: 0 };
      }
      grouped[task.competence].tasks += 1;
      if (task.status === 'Concluída') {
        grouped[task.competence].completed += 1;
      }
    });

    // 4. Mapear timeline e preencher lacunas
    const fullTimelineData: MonthlyData[] = timeline.map(comp => {
      const [year, month] = comp.split('-');
      return {
        competence: comp,
        month: MONTH_NAMES[month] || month,
        fullMonth: `${MONTH_NAMES[month] || month} ${year}`,
        tasks: grouped[comp]?.tasks || 0,
        completed: grouped[comp]?.completed || 0
      };
    });

    // 5. Dividir em Período Atual vs Anterior
    const currentPeriod = fullTimelineData.slice(-range);
    const previousPeriod = fullTimelineData.slice(0, range);

    // 6. Calcular Totais para a Opção 1
    const currentSum = currentPeriod.reduce((acc, curr) => acc + curr.tasks, 0);
    const previousSum = previousPeriod.reduce((acc, curr) => acc + curr.tasks, 0);
    
    // Tendência baseada na soma total do período vs soma total do período anterior
    const trend = previousSum === 0 
        ? (currentSum > 0 ? 100 : 0) 
        : ((currentSum - previousSum) / previousSum) * 100;

    return { 
        processedChartData: currentPeriod, 
        stats: { currentSum, trend, isUp: trend >= 0 } 
    };
  }, [rawData, range]);

  return (
    <WidgetContainer 
        title="EVOLUÇÃO MENSAL" 
        icon={<Activity size={14} className="text-indigo-500" />} 
        onRemove={onRemove}
        headerActions={
          <div className="flex items-center gap-1.5 mr-1" onMouseDown={e => e.stopPropagation()}>
            <div className="relative group">
              <select 
                value={range}
                onChange={(e) => setRange(Number(e.target.value))}
                className="appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 pl-2 pr-6 py-1 rounded-lg cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-900 transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={3} className="dark:bg-slate-900">3 Meses</option>
                <option value={6} className="dark:bg-slate-900">6 Meses</option>
                <option value={12} className="dark:bg-slate-900">12 Meses</option>
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
            </div>
          </div>
        }
    >
      <div className="flex-1 flex flex-col p-4 w-full h-full overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-indigo-500 animate-spin" />
            <span className="text-xs text-slate-400 font-medium animate-pulse">Consultando dados...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-rose-500 gap-2">
            <AlertCircle size={24} />
            <span className="text-xs font-bold">Erro de conexão</span>
          </div>
        ) : processedChartData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
              <Activity size={20} className="text-slate-300" />
            </div>
            <span className="text-xs font-medium">Sem dados no período</span>
          </div>
        ) : (
          <>
            {/* Header Indicators with Option 1 Highlight */}
            <div className="flex items-start justify-between mb-8 shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    Somatória do Período
                    <div className="group relative">
                        <Info size={11} className="text-slate-300" />
                        <div className="absolute left-0 top-4 w-48 p-2 bg-slate-800 text-[9px] text-white rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                            Total de tarefas criadas nos {range} meses exibidos no gráfico.
                        </div>
                    </div>
                </span>
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                  {stats.currentSum}
                </span>
              </div>
              
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 text-right">Variação do Período</span>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                  stats.isUp 
                    ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-rose-50/50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400'
                }`}>
                  {stats.isUp ? <TrendingUp size={14} strokeWidth={3} /> : <TrendingDown size={14} strokeWidth={3} />}
                  <span className="text-sm font-black tabular-nums tracking-tight">
                    {stats.isUp ? '+' : ''}{stats.trend.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Chart Container */}
            <div className="flex-1 min-h-0 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={processedChartData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorTasksFinal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCompletedFinal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    vertical={false} 
                    stroke="#e2e8f0" 
                    className="dark:stroke-slate-800/30" 
                  />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }}
                    dy={12}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1 }} />
                  <Area 
                    type="monotone" 
                    dataKey="tasks" 
                    stroke="#6366f1" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorTasksFinal)" 
                    animationDuration={1500}
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={1} 
                    fill="url(#colorCompletedFinal)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-8 mt-6 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-500/10" />
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Abertas</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Concluídas</span>
              </div>
            </div>
          </>
        )}
      </div>
    </WidgetContainer>
  );
};
