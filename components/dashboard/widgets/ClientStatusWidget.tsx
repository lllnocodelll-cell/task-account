import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  UserMinus, 
  UserPlus, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  RotateCcw,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer
} from 'recharts';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';
import { Tooltip } from '../../ui/Tooltip';

interface Props {
  orgId: string;
  onRemove?: () => void;
}

interface ClientRecord {
  id: string;
  status: string;
  entry_date: string | null;
  exit_date: string | null;
  created_at: string | null;
}

type PresetPeriod = '6m' | '12m' | 'ytd' | 'custom';

const MONTH_NAMES_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

function getYearMonth(val?: string | null): string | null {
  if (!val) return null;
  if (val.length >= 7 && val.includes('-')) {
    return val.substring(0, 7);
  }
  return null;
}

function getCurrentMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getPastMonth(monthsAgo: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatMonthLabel(ym: string): string {
  if (!ym || !ym.includes('-')) return ym;
  const [year, month] = ym.split('-');
  const mIdx = parseInt(month, 10) - 1;
  const shortName = MONTH_NAMES_SHORT[mIdx] || month;
  return `${shortName}/${year.slice(-2)}`;
}

function formatFullMonthLabel(ym: string): string {
  if (!ym || !ym.includes('-')) return ym;
  const [year, month] = ym.split('-');
  const mIdx = parseInt(month, 10) - 1;
  const fullNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${fullNames[mIdx] || month} de ${year}`;
}

function generateMonthSequence(startYM: string, endYM: string): string[] {
  if (!startYM || !endYM) return [];
  const [sYear, sMonth] = startYM.split('-').map(Number);
  const [eYear, eMonth] = endYM.split('-').map(Number);
  
  const list: string[] = [];
  let cur = new Date(sYear, sMonth - 1, 1);
  const target = new Date(eYear, eMonth - 1, 1);

  let count = 0;
  while (cur <= target && count < 60) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    list.push(`${y}-${m}`);
    cur.setMonth(cur.getMonth() + 1);
    count++;
  }
  return list;
}

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const entradas = data.entradas || 0;
    const saidas = data.saidas || 0;
    const saldo = entradas - saidas;

    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150 min-w-[160px]">
        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
          <Calendar size={11} className="text-indigo-500" />
          {formatFullMonthLabel(data.competence || label)}
        </p>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Entradas:
            </span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">+{entradas}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Saídas:
            </span>
            <span className="font-bold text-rose-700 dark:text-rose-300">-{saidas}</span>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-slate-100 dark:border-slate-800 font-bold">
            <span className="text-slate-600 dark:text-slate-300">Saldo Líquido:</span>
            <span className={saldo > 0 ? 'text-emerald-600 dark:text-emerald-400' : saldo < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}>
              {saldo > 0 ? `+${saldo}` : saldo}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const ClientStatusWidget: React.FC<Props> = ({ orgId, onRemove }) => {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Toggle for cards visibility
  const [showCards, setShowCards] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('widget_client_status_show_cards');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleShowCards = () => {
    setShowCards(prev => {
      const next = !prev;
      try {
        localStorage.setItem('widget_client_status_show_cards', String(next));
      } catch {}
      return next;
    });
  };

  // Period state
  const [preset, setPreset] = useState<PresetPeriod>('6m');
  const [startMonth, setStartMonth] = useState<string>(() => getPastMonth(6));
  const [endMonth, setEndMonth] = useState<string>(getCurrentMonth);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      if (!orgId) return;
      setLoading(true);
      try {
        let query = supabase
          .from('clients')
          .select('id, status, entry_date, exit_date, created_at');

        if (orgId !== 'demo-org') {
          query = query.eq('org_id', orgId);
        }

        const { data, error } = await query;
        if (error) throw error;
        setClients(data || []);
      } catch (err) {
        console.error('Error fetching clients for status widget:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [orgId]);

  // Handle Preset changes
  const applyPreset = (newPreset: PresetPeriod) => {
    setPreset(newPreset);
    const now = getCurrentMonth();
    setEndMonth(now);

    if (newPreset === '6m') {
      setStartMonth(getPastMonth(6));
      setIsFilterExpanded(false);
    } else if (newPreset === '12m') {
      setStartMonth(getPastMonth(12));
      setIsFilterExpanded(false);
    } else if (newPreset === 'ytd') {
      const year = new Date().getFullYear();
      setStartMonth(`${year}-01`);
      setIsFilterExpanded(false);
    } else {
      setIsFilterExpanded(true);
    }
  };

  // Base metrics (global)
  const baseStats = useMemo(() => {
    const total = clients.length;
    const ativos = clients.filter(c => c.status === 'Ativo').length;
    const inativos = clients.filter(c => c.status === 'Inativo').length;
    return { total, ativos, inativos };
  }, [clients]);

  // Chart data and period metrics
  const { chartData, periodStats } = useMemo(() => {
    let s = startMonth;
    let e = endMonth;
    if (s > e) {
      const temp = s;
      s = e;
      e = temp;
    }

    const monthsSeq = generateMonthSequence(s, e);

    let totalEntradas = 0;
    let totalSaidas = 0;

    const data = monthsSeq.map(ym => {
      const entradasCount = clients.filter(c => {
        const entryYM = getYearMonth(c.entry_date) || getYearMonth(c.created_at);
        return entryYM === ym;
      }).length;

      const saidasCount = clients.filter(c => {
        const exitYM = getYearMonth(c.exit_date);
        return exitYM === ym;
      }).length;

      totalEntradas += entradasCount;
      totalSaidas += saidasCount;

      return {
        competence: ym,
        monthLabel: formatMonthLabel(ym),
        entradas: entradasCount,
        saidas: saidasCount,
        saldo: entradasCount - saidasCount
      };
    });

    const saldoPeriodo = totalEntradas - totalSaidas;

    return {
      chartData: data,
      periodStats: {
        totalEntradas,
        totalSaidas,
        saldoPeriodo
      }
    };
  }, [clients, startMonth, endMonth]);

  const headerActionsNode = (
    <div className="flex items-center gap-1.5">
      {/* Botão de Ocultar/Mostrar Cards com ícone de olho */}
      <Tooltip content={showCards ? "Ocultar resumo de métricas" : "Exibir resumo de métricas"} position="top">
        <button
          type="button"
          onClick={toggleShowCards}
          className={`h-6 w-6 flex items-center justify-center rounded transition-colors shrink-0 ${
            showCards
              ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 dark:text-indigo-300'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          aria-label={showCards ? "Ocultar métricas" : "Exibir métricas"}
        >
          {showCards ? <Eye size={12} strokeWidth={2.4} /> : <EyeOff size={12} strokeWidth={2.4} />}
        </button>
      </Tooltip>

      {/* Seletor de Períodos e Presets */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
        <button
          type="button"
          onClick={() => applyPreset('6m')}
          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
            preset === '6m'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          6M
        </button>
        <button
          type="button"
          onClick={() => applyPreset('12m')}
          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
            preset === '12m'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          12M
        </button>
        <button
          type="button"
          onClick={() => applyPreset('ytd')}
          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
            preset === 'ytd'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          Ano
        </button>

        {/* Botão de Alternar Seletor de Mês */}
        <Tooltip content={isFilterExpanded ? "Ocultar seletor do mês" : "Mostrar seletor do mês"} position="top">
          <button
            type="button"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className={`p-1 rounded-md transition-all flex items-center justify-center ${
              isFilterExpanded || preset === 'custom'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-bold'
                : 'text-slate-600 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/60'
            }`}
            aria-label="Mostrar seletor do mês"
          >
            <Calendar size={13} className="text-current" />
          </button>
        </Tooltip>
      </div>
    </div>
  );

  return (
    <WidgetContainer 
      title="STATUS & MOVIMENTAÇÃO DE CLIENTES" 
      icon={<Users size={14} />} 
      headerActions={headerActionsNode}
      onRemove={onRemove}
    >
      <div className="flex-1 flex flex-col min-h-0 p-3 space-y-2.5 overflow-y-auto custom-scrollbar">
        {/* Painel expansível de filtro personalizado */}
        {isFilterExpanded && (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200 text-xs">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase shrink-0">De:</span>
              <input 
                type="month" 
                value={startMonth}
                onChange={(e) => {
                  setStartMonth(e.target.value);
                  setPreset('custom');
                }}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-800 dark:text-slate-100 dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full min-w-0"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase shrink-0">Até:</span>
              <input 
                type="month" 
                value={endMonth}
                onChange={(e) => {
                  setEndMonth(e.target.value);
                  setPreset('custom');
                }}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-800 dark:text-slate-100 dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full min-w-0"
              />
            </div>
            <Tooltip content="Redefinir para últimos 6 meses" position="top">
              <button
                type="button"
                onClick={() => applyPreset('6m')}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                aria-label="Redefinir período"
              >
                <RotateCcw size={13} />
              </button>
            </Tooltip>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex flex-col justify-center animate-pulse space-y-3">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(125px,1fr))] gap-2">
              <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
              <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
              <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
              <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
            <div className="flex-1 min-h-[140px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          </div>
        ) : (
          <>
            {/* Cards de Métricas Principais (com quebra responsiva automática ao redimensionar) */}
            {showCards && (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(125px,1fr))] gap-2 animate-in fade-in duration-200">
                {/* Base Atual Ativa */}
                <div className="p-2 sm:p-2.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl flex items-center justify-between min-w-0 overflow-hidden">
                  <div className="min-w-0 flex-1 pr-1.5">
                    <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider truncate">
                      Ativos
                    </span>
                    <span className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300 block truncate leading-tight">
                      {baseStats.ativos}
                    </span>
                    <span className="block text-[8px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      de {baseStats.total} clientes
                    </span>
                  </div>
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                    <UserCheck size={16} />
                  </div>
                </div>

                {/* Entradas no Período */}
                <div className="p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-center justify-between min-w-0 overflow-hidden">
                  <div className="min-w-0 flex-1 pr-1.5">
                    <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                      Entradas
                    </span>
                    <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 block truncate leading-tight">
                      +{periodStats.totalEntradas}
                    </span>
                    <span className="block text-[8px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      no período
                    </span>
                  </div>
                  <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                    <UserPlus size={16} />
                  </div>
                </div>

                {/* Saídas no Período */}
                <div className="p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-center justify-between min-w-0 overflow-hidden">
                  <div className="min-w-0 flex-1 pr-1.5">
                    <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                      Saídas
                    </span>
                    <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 block truncate leading-tight">
                      -{periodStats.totalSaidas}
                    </span>
                    <span className="block text-[8px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      no período
                    </span>
                  </div>
                  <div className="p-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
                    <UserMinus size={16} />
                  </div>
                </div>

                {/* Saldo Líquido do Período */}
                <div className={`p-2 sm:p-2.5 rounded-xl border flex items-center justify-between min-w-0 overflow-hidden ${
                  periodStats.saldoPeriodo >= 0
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-200/60 dark:border-indigo-800/40'
                    : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/40'
                }`}>
                  <div className="min-w-0 flex-1 pr-1.5">
                    <span className={`block text-[9px] font-bold uppercase tracking-wider truncate ${
                      periodStats.saldoPeriodo >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      Saldo
                    </span>
                    <span className={`text-base sm:text-lg font-black block truncate leading-tight ${
                      periodStats.saldoPeriodo > 0 
                        ? 'text-indigo-700 dark:text-indigo-300' 
                        : periodStats.saldoPeriodo < 0 
                        ? 'text-rose-700 dark:text-rose-300' 
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {periodStats.saldoPeriodo > 0 ? `+${periodStats.saldoPeriodo}` : periodStats.saldoPeriodo}
                    </span>
                    <span className="block text-[8px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      variação líquida
                    </span>
                  </div>
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    periodStats.saldoPeriodo >= 0
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                      : 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'
                  }`}>
                    {periodStats.saldoPeriodo >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </div>
                </div>
              </div>
            )}

            {/* Gráfico de Barras: Entradas vs Saídas */}
            <div className="flex-1 flex flex-col min-h-[160px] bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 rounded-xl p-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={11} className="text-indigo-500" />
                  Evolução Mensal (Entradas vs. Saídas)
                </span>
                <span className="text-[9px] text-slate-400 font-medium">
                  {formatMonthLabel(startMonth)} até {formatMonthLabel(endMonth)}
                </span>
              </div>

              <div className="flex-1 w-full min-h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={chartData} 
                    margin={{ top: 8, right: 10, left: -22, bottom: 0 }}
                    barGap={3}
                  >
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      vertical={false} 
                      stroke="currentColor" 
                      className="text-slate-200 dark:text-slate-700/50" 
                    />
                    <XAxis 
                      dataKey="monthLabel" 
                      tick={{ fontSize: 9, fill: 'currentColor' }} 
                      stroke="currentColor"
                      className="text-slate-400 dark:text-slate-500" 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      allowDecimals={false} 
                      tick={{ fontSize: 9, fill: 'currentColor' }} 
                      stroke="currentColor"
                      className="text-slate-400 dark:text-slate-500" 
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip content={<CustomChartTooltip />} />
                    <Bar 
                      dataKey="entradas" 
                      name="Entradas" 
                      fill="#10b981" 
                      radius={[3, 3, 0, 0]} 
                      maxBarSize={22}
                    />
                    <Bar 
                      dataKey="saidas" 
                      name="Saídas" 
                      fill="#f43f5e" 
                      radius={[3, 3, 0, 0]} 
                      maxBarSize={22}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legenda customizada compacta */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 text-[10px] font-semibold">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                  Entradas (+{periodStats.totalEntradas})
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                  Saídas (-{periodStats.totalSaidas})
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
                  Total da Base: {baseStats.total}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </WidgetContainer>
  );
};
