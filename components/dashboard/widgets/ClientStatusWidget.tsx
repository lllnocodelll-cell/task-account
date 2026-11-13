import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  UserCheck,
  UserMinus,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  RotateCcw,
  Eye,
  EyeOff,
  BarChart3,
  ChevronRight,
  Search,
  X,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';
import { Tooltip } from '../../ui/Tooltip';
import { Input } from '../../ui/Input';

interface Props {
  orgId: string;
  onRemove?: () => void;
}

interface ClientRecord {
  id: string;
  code: string | null;
  company_name: string | null;
  trade_name: string | null;
  document: string | null;
  status: string;
  entry_date: string | null;
  exit_date: string | null;
  created_at: string | null;
}

interface ChartPoint {
  competence: string;
  monthLabel: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

type PresetPeriod = '6m' | '12m' | 'ytd' | 'custom';
type ClientDetailView = 'ativos' | 'inativos' | 'entradas' | 'saidas' | 'saldo';

interface ClientModalItem {
  key: string;
  client: ClientRecord;
  movementType?: 'entrada' | 'saida';
  referenceDate: string | null;
  isCreatedFallback?: boolean;
}

const STORAGE_KEY_SHOW_CARDS = 'widget_client_status_show_cards';

const MONTH_NAMES_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const MONTH_NAMES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
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
  return `${MONTH_NAMES_FULL[mIdx] || month} de ${year}`;
}

function formatDateBR(val?: string | null): string {
  if (!val || val.length < 10 || !val.includes('-')) return '—';
  const [year, month, day] = val.substring(0, 10).split('-');
  if (!year || !month || !day) return '—';
  return `${day}/${month}/${year}`;
}

function getClientDisplayName(client: ClientRecord): string {
  return client.trade_name?.trim() || client.company_name?.trim() || 'Cliente sem nome';
}

function generateMonthSequence(startYM: string, endYM: string): string[] {
  if (!startYM || !endYM) return [];
  const [sYear, sMonth] = startYM.split('-').map(Number);
  const [eYear, eMonth] = endYM.split('-').map(Number);

  const list: string[] = [];
  const cur = new Date(sYear, sMonth - 1, 1);
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

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
  label?: string;
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const entradas = data.entradas || 0;
  const saidas = data.saidas || 0;
  const saldo = entradas - saidas;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-lg min-w-[175px]">
      <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
        <Calendar size={12} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
        <span>{formatFullMonthLabel(data.competence || label || '')}</span>
      </p>
      <div className="space-y-1.5 text-xs tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            Entradas
          </span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">+{entradas}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            Saídas
          </span>
          <span className="font-bold text-rose-600 dark:text-rose-400">-{saidas}</span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-100 dark:border-slate-800 font-bold">
          <span className="text-slate-700 dark:text-slate-200">Saldo líquido</span>
          <span
            className={
              saldo > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : saldo < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-500 dark:text-slate-400'
            }
          >
            {saldo > 0 ? `+${saldo}` : saldo}
          </span>
        </div>
      </div>
    </div>
  );
};

export const ClientStatusWidget: React.FC<Props> = ({ orgId, onRemove }) => {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [showCards, setShowCards] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHOW_CARDS);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [preset, setPreset] = useState<PresetPeriod>('6m');
  const [startMonth, setStartMonth] = useState<string>(() => getPastMonth(6));
  const [endMonth, setEndMonth] = useState<string>(getCurrentMonth);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const [showEntradas, setShowEntradas] = useState(true);
  const [showSaidas, setShowSaidas] = useState(true);

  // Modal de detalhamento ao clicar nos cards de métricas
  const [detailModalView, setDetailModalView] = useState<ClientDetailView | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [isModalExpanded, setIsModalExpanded] = useState(false);

  const openClientsModal = (view: ClientDetailView) => {
    setModalSearch('');
    setDetailModalView(view);
  };

  useEffect(() => {
    if (!detailModalView) {
      setIsModalExpanded(false);
      return;
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailModalView(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [detailModalView]);

  const toggleShowCards = () => {
    setShowCards((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_SHOW_CARDS, String(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  };

  const toggleSeries = (series: 'entradas' | 'saidas') => {
    if (series === 'entradas') {
      if (showEntradas && !showSaidas) return;
      setShowEntradas((prev) => !prev);
      return;
    }
    if (showSaidas && !showEntradas) return;
    setShowSaidas((prev) => !prev);
  };

  useEffect(() => {
    let active = true;

    const fetchClients = async () => {
      if (!orgId) return;
      setLoading(true);
      setFetchError(null);
      try {
        let query = supabase
          .from('clients')
          .select('id, code, company_name, trade_name, document, status, entry_date, exit_date, created_at');

        if (orgId !== 'demo-org') {
          query = query.eq('org_id', orgId);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (active) {
          setClients(data || []);
        }
      } catch (err) {
        console.error('Error fetching clients for status widget:', err);
        if (active) {
          setFetchError('Não foi possível carregar os clientes.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchClients();
    return () => {
      active = false;
    };
  }, [orgId]);

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

  // Métricas globais da carteira
  const baseStats = useMemo(() => {
    const total = clients.length;
    const ativos = clients.filter((c) => c.status === 'Ativo').length;
    const inativos = clients.filter((c) => c.status === 'Inativo').length;
    const outros = Math.max(0, total - ativos - inativos);

    const activeRate = total > 0 ? Math.round((ativos / total) * 100) : 0;
    const inactiveRate = total > 0 ? Math.round((inativos / total) * 100) : 0;
    const othersRate = total > 0 ? Math.max(0, 100 - activeRate - inactiveRate) : 0;

    return {
      total,
      ativos,
      inativos,
      outros,
      activeRate,
      inactiveRate,
      othersRate,
    };
  }, [clients]);

  // Dados do gráfico e métricas do período
  const { chartData, periodStats, effectiveStart, effectiveEnd, monthsSet } = useMemo(() => {
    let s = startMonth;
    let e = endMonth;
    if (s > e) {
      const temp = s;
      s = e;
      e = temp;
    }

    const monthsSeq = generateMonthSequence(s, e);
    const activeMonthsSet = new Set(monthsSeq);

    let totalEntradas = 0;
    let totalSaidas = 0;

    const data: ChartPoint[] = monthsSeq.map((ym) => {
      const entradasCount = clients.filter((c) => {
        const entryYM = getYearMonth(c.entry_date) || getYearMonth(c.created_at);
        return entryYM === ym;
      }).length;

      const saidasCount = clients.filter((c) => {
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
        saldo: entradasCount - saidasCount,
      };
    });

    const monthsCount = Math.max(1, monthsSeq.length);
    const saldoPeriodo = totalEntradas - totalSaidas;
    const avgEntradas = (totalEntradas / monthsCount).toFixed(1).replace('.', ',');
    const avgSaidas = (totalSaidas / monthsCount).toFixed(1).replace('.', ',');
    const churnRate =
      baseStats.total > 0
        ? ((totalSaidas / baseStats.total) * 100).toFixed(1).replace('.', ',')
        : '0,0';

    return {
      chartData: data,
      effectiveStart: s,
      effectiveEnd: e,
      monthsSet: activeMonthsSet,
      periodStats: {
        totalEntradas,
        totalSaidas,
        saldoPeriodo,
        monthsCount,
        avgEntradas,
        avgSaidas,
        churnRate,
      },
    };
  }, [clients, startMonth, endMonth, baseStats.total]);

  // Listas exatas de clientes por situação (espelhando os números dos cards)
  const categorizedClients = useMemo(() => {
    const sortByName = (a: ClientRecord, b: ClientRecord) =>
      getClientDisplayName(a).localeCompare(getClientDisplayName(b), 'pt-BR');

    const sortByDateDesc = (a: ClientModalItem, b: ClientModalItem) =>
      (b.referenceDate || '').localeCompare(a.referenceDate || '');

    const ativos: ClientModalItem[] = clients
      .filter((c) => c.status === 'Ativo')
      .sort(sortByName)
      .map((client) => ({
        key: `ativo-${client.id}`,
        client,
        referenceDate: client.entry_date || client.created_at,
        isCreatedFallback: !client.entry_date && !!client.created_at,
      }));

    const inativos: ClientModalItem[] = clients
      .filter((c) => c.status === 'Inativo')
      .sort(sortByName)
      .map((client) => ({
        key: `inativo-${client.id}`,
        client,
        referenceDate: client.exit_date || client.entry_date || client.created_at,
      }));

    const entradas: ClientModalItem[] = clients
      .filter((c) => {
        const entryYM = getYearMonth(c.entry_date) || getYearMonth(c.created_at);
        return entryYM ? monthsSet.has(entryYM) : false;
      })
      .map((client) => ({
        key: `entrada-${client.id}`,
        client,
        movementType: 'entrada' as const,
        referenceDate: client.entry_date || client.created_at,
        isCreatedFallback: !client.entry_date && !!client.created_at,
      }))
      .sort(sortByDateDesc);

    const saidas: ClientModalItem[] = clients
      .filter((c) => {
        const exitYM = getYearMonth(c.exit_date);
        return exitYM ? monthsSet.has(exitYM) : false;
      })
      .map((client) => ({
        key: `saida-${client.id}`,
        client,
        movementType: 'saida' as const,
        referenceDate: client.exit_date,
      }))
      .sort(sortByDateDesc);

    const saldo: ClientModalItem[] = [...entradas, ...saidas].sort(sortByDateDesc);

    return { ativos, inativos, entradas, saidas, saldo };
  }, [clients, monthsSet]);

  const activeModalItems = useMemo(() => {
    if (!detailModalView) return [];
    const list = categorizedClients[detailModalView] || [];
    const q = modalSearch.trim().toLowerCase();
    if (!q) return list;

    return list.filter(({ client }) => {
      const trade = (client.trade_name || '').toLowerCase();
      const company = (client.company_name || '').toLowerCase();
      const doc = (client.document || '').toLowerCase();
      const code = (client.code || '').toLowerCase();
      return trade.includes(q) || company.includes(q) || doc.includes(q) || code.includes(q);
    });
  }, [detailModalView, categorizedClients, modalSearch]);

  const hasMovements = periodStats.totalEntradas > 0 || periodStats.totalSaidas > 0;

  const headerActionsNode = (
    <div className="flex items-center gap-1.5 no-drag">
      <Tooltip
        content={showCards ? 'Ocultar resumo de métricas' : 'Exibir resumo de métricas'}
        position="top"
      >
        <button
          type="button"
          onClick={toggleShowCards}
          className={`h-6 w-6 flex items-center justify-center rounded-md transition-colors shrink-0 ${
            showCards
              ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          aria-label={showCards ? 'Ocultar métricas' : 'Exibir métricas'}
        >
          {showCards ? <Eye size={13} strokeWidth={2.2} /> : <EyeOff size={13} strokeWidth={2.2} />}
        </button>
      </Tooltip>

      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
        {(
          [
            { id: '6m', label: '6M' },
            { id: '12m', label: '12M' },
            { id: 'ytd', label: 'Ano' },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => applyPreset(opt.id)}
            className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
              preset === opt.id
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}

        <Tooltip
          content={isFilterExpanded ? 'Ocultar período personalizado' : 'Definir período personalizado'}
          position="top"
        >
          <button
            type="button"
            onClick={() => setIsFilterExpanded((prev) => !prev)}
            className={`p-1 rounded-md transition-all flex items-center justify-center ${
              isFilterExpanded || preset === 'custom'
                ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
            }`}
            aria-label="Definir período personalizado"
          >
            <Calendar size={12} />
          </button>
        </Tooltip>
      </div>
    </div>
  );

  const modalMeta: Record<
    ClientDetailView,
    { title: string; subtitle: string; emptyText: string }
  > = {
    entradas: {
      title: 'Entradas de Clientes',
      subtitle: `Período: ${formatMonthLabel(effectiveStart)} – ${formatMonthLabel(effectiveEnd)} (${periodStats.totalEntradas})`,
      emptyText: 'Nenhuma entrada de cliente registrada neste período.',
    },
    saidas: {
      title: 'Saídas de Clientes',
      subtitle: `Período: ${formatMonthLabel(effectiveStart)} – ${formatMonthLabel(effectiveEnd)} (${periodStats.totalSaidas})`,
      emptyText: 'Nenhuma saída de cliente registrada neste período.',
    },
    saldo: {
      title: 'Movimentações do Período',
      subtitle: `${formatMonthLabel(effectiveStart)} – ${formatMonthLabel(effectiveEnd)} · Saldo líquido: ${
        periodStats.saldoPeriodo > 0 ? `+${periodStats.saldoPeriodo}` : periodStats.saldoPeriodo
      }`,
      emptyText: 'Nenhuma entrada ou saída registrada neste período.',
    },
    ativos: {
      title: 'Clientes Ativos na Carteira',
      subtitle: `Base atual: ${baseStats.ativos} de ${baseStats.total} clientes (${baseStats.activeRate}%)`,
      emptyText: 'Nenhum cliente ativo encontrado.',
    },
    inativos: {
      title: 'Clientes Inativos na Carteira',
      subtitle: `Base atual: ${baseStats.inativos} de ${baseStats.total} clientes (${baseStats.inactiveRate}%)`,
      emptyText: 'Nenhum cliente inativo encontrado.',
    },
  };

  return (
    <WidgetContainer
      title="CARTEIRA DE CLIENTES"
      icon={<Users size={14} />}
      headerActions={headerActionsNode}
      onRemove={onRemove}
    >
      <div className="flex-1 flex flex-col min-h-0 space-y-2.5 overflow-y-auto custom-scrollbar">
        {/* Filtro de período personalizado com Inputs padronizados */}
        {isFilterExpanded && (
          <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase shrink-0">
                De:
              </span>
              <Input
                type="month"
                value={startMonth}
                onChange={(e) => {
                  setStartMonth(e.target.value);
                  setPreset('custom');
                }}
                containerClassName="flex-1 min-w-0"
                className="!h-8 !py-1 !text-xs font-semibold"
                aria-label="Mês inicial"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase shrink-0">
                Até:
              </span>
              <Input
                type="month"
                value={endMonth}
                onChange={(e) => {
                  setEndMonth(e.target.value);
                  setPreset('custom');
                }}
                containerClassName="flex-1 min-w-0"
                className="!h-8 !py-1 !text-xs font-semibold"
                aria-label="Mês final"
              />
            </div>
            <Tooltip content="Redefinir para últimos 6 meses" position="top">
              <button
                type="button"
                onClick={() => applyPreset('6m')}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                aria-label="Redefinir período"
              >
                <RotateCcw size={13} />
              </button>
            </Tooltip>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex flex-col justify-center animate-pulse space-y-2.5">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2">
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            </div>
            <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="flex-1 min-h-[150px] bg-slate-100 dark:bg-slate-800 rounded-xl" />
          </div>
        ) : fetchError ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{fetchError}</p>
          </div>
        ) : (
          <>
            {showCards && (
              <div className="space-y-2 animate-in fade-in duration-200">
                {/* Tremor KPI Cards Interativos */}
                <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2">
                  {/* Card 1: Ativos */}
                  <button
                    type="button"
                    onClick={() => openClientsModal('ativos')}
                    className="group text-left p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:shadow-sm rounded-xl flex flex-col justify-between min-w-0 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    aria-label={`Ver ${baseStats.ativos} clientes ativos`}
                  >
                    <div className="flex items-center justify-between gap-1.5 w-full">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                        <UserCheck size={12} className="text-emerald-500 shrink-0" />
                        Ativos
                      </span>
                      <Tooltip
                        content={`${baseStats.ativos} ativos e ${baseStats.inativos} inativos na base. Clique para listar`}
                        position="top"
                      >
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">
                          {baseStats.activeRate}%
                        </span>
                      </Tooltip>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-1.5 w-full">
                      <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
                        {baseStats.ativos}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate tabular-nums inline-flex items-center gap-0.5 transition-colors">
                        de {baseStats.total}
                        <ChevronRight size={10} className="opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </span>
                    </div>
                  </button>

                  {/* Card 2: Entradas */}
                  <button
                    type="button"
                    onClick={() => openClientsModal('entradas')}
                    className="group text-left p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:shadow-sm rounded-xl flex flex-col justify-between min-w-0 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    aria-label={`Ver ${periodStats.totalEntradas} entradas de clientes no período`}
                  >
                    <div className="flex items-center justify-between gap-1.5 w-full">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                        <UserPlus size={12} className="text-emerald-500 shrink-0" />
                        Entradas
                      </span>
                      <Tooltip
                        content={`Média de ${periodStats.avgEntradas} novos clientes/mês (${periodStats.monthsCount}m). Clique para ver quem entrou`}
                        position="top"
                      >
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                          ~{periodStats.avgEntradas}/mês
                        </span>
                      </Tooltip>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-1.5 w-full">
                      <span className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                        +{periodStats.totalEntradas}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate inline-flex items-center gap-0.5 transition-colors">
                        ver lista
                        <ChevronRight size={10} className="opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </span>
                    </div>
                  </button>

                  {/* Card 3: Saídas */}
                  <button
                    type="button"
                    onClick={() => openClientsModal('saidas')}
                    className="group text-left p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-500/50 hover:shadow-sm rounded-xl flex flex-col justify-between min-w-0 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    aria-label={`Ver ${periodStats.totalSaidas} saídas de clientes no período`}
                  >
                    <div className="flex items-center justify-between gap-1.5 w-full">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                        <UserMinus size={12} className="text-rose-500 shrink-0" />
                        Saídas
                      </span>
                      <Tooltip
                        content={`Impacto de ${periodStats.churnRate}% sobre a base total (~${periodStats.avgSaidas}/mês). Clique para ver quem saiu`}
                        position="top"
                      >
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 tabular-nums shrink-0">
                          {periodStats.churnRate}% base
                        </span>
                      </Tooltip>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-1.5 w-full">
                      <span className="text-lg sm:text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
                        -{periodStats.totalSaidas}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 group-hover:text-rose-600 dark:group-hover:text-rose-400 truncate inline-flex items-center gap-0.5 transition-colors">
                        ver lista
                        <ChevronRight size={10} className="opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </span>
                    </div>
                  </button>

                  {/* Card 4: Saldo Líquido */}
                  <button
                    type="button"
                    onClick={() => openClientsModal('saldo')}
                    className="group text-left p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-sm rounded-xl flex flex-col justify-between min-w-0 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    aria-label="Ver todas as entradas e saídas do período"
                  >
                    <div className="flex items-center justify-between gap-1.5 w-full">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                        Saldo
                      </span>
                      <Tooltip
                        content="Diferença entre entradas e saídas. Clique para ver toda a movimentação"
                        position="top"
                      >
                        <span
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${
                            periodStats.saldoPeriodo > 0
                              ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                              : periodStats.saldoPeriodo < 0
                              ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {periodStats.saldoPeriodo > 0 ? (
                            <>
                              <TrendingUp size={10} /> Alta
                            </>
                          ) : periodStats.saldoPeriodo < 0 ? (
                            <>
                              <TrendingDown size={10} /> Queda
                            </>
                          ) : (
                            <>
                              <Minus size={10} /> Estável
                            </>
                          )}
                        </span>
                      </Tooltip>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-1.5 w-full">
                      <span
                        className={`text-lg sm:text-xl font-bold tracking-tight tabular-nums ${
                          periodStats.saldoPeriodo > 0
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : periodStats.saldoPeriodo < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {periodStats.saldoPeriodo > 0
                          ? `+${periodStats.saldoPeriodo}`
                          : periodStats.saldoPeriodo}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate inline-flex items-center gap-0.5 transition-colors">
                        movimentações
                        <ChevronRight size={10} className="opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </span>
                    </div>
                  </button>
                </div>

                {/* Tremor CategoryBar: Saúde da Carteira */}
                <div className="p-2.5 sm:px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                      Saúde da Carteira
                    </span>
                    <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                      <button
                        type="button"
                        onClick={() => openClientsModal('ativos')}
                        className="flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        Ativos: <strong className="text-slate-800 dark:text-slate-200">{baseStats.ativos}</strong> ({baseStats.activeRate}%)
                      </button>
                      <button
                        type="button"
                        onClick={() => openClientsModal('inativos')}
                        className="flex items-center gap-1 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        Inativos: <strong className="text-slate-800 dark:text-slate-200">{baseStats.inativos}</strong> ({baseStats.inactiveRate}%)
                      </button>
                      {baseStats.outros > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                          Outros: <strong className="text-slate-800 dark:text-slate-200">{baseStats.outros}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {baseStats.total === 0 ? (
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
                  ) : (
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex gap-0.5">
                      {baseStats.ativos > 0 && (
                        <Tooltip
                          content={`Ativos: ${baseStats.ativos} (${baseStats.activeRate}%) — clique para listar`}
                          position="top"
                          style={{ width: `${(baseStats.ativos / baseStats.total) * 100}%` }}
                          className="h-full"
                        >
                          <button
                            type="button"
                            onClick={() => openClientsModal('ativos')}
                            className="h-full w-full block bg-emerald-500 hover:brightness-110 transition-all duration-300 cursor-pointer"
                            aria-label={`Listar ${baseStats.ativos} clientes ativos`}
                          />
                        </Tooltip>
                      )}
                      {baseStats.inativos > 0 && (
                        <Tooltip
                          content={`Inativos: ${baseStats.inativos} (${baseStats.inactiveRate}%) — clique para listar`}
                          position="top"
                          style={{ width: `${(baseStats.inativos / baseStats.total) * 100}%` }}
                          className="h-full"
                        >
                          <button
                            type="button"
                            onClick={() => openClientsModal('inativos')}
                            className="h-full w-full block bg-rose-500 hover:brightness-110 transition-all duration-300 cursor-pointer"
                            aria-label={`Listar ${baseStats.inativos} clientes inativos`}
                          />
                        </Tooltip>
                      )}
                      {baseStats.outros > 0 && (
                        <Tooltip
                          content={`Outros status: ${baseStats.outros} (${baseStats.othersRate}%)`}
                          position="top"
                          style={{ width: `${(baseStats.outros / baseStats.total) * 100}%` }}
                          className="h-full"
                        >
                          <div className="h-full w-full bg-amber-400 transition-all duration-300" />
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Gráfico de Barras: Entradas vs Saídas */}
            <div className="flex-1 flex flex-col min-h-[175px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 sm:p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <BarChart3 size={13} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Evolução Mensal
                  </span>
                </div>
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                  {formatMonthLabel(effectiveStart)} – {formatMonthLabel(effectiveEnd)} ({periodStats.monthsCount}m)
                </span>
              </div>

              <div className="flex-1 w-full min-h-[125px] flex flex-col">
                {!hasMovements ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-6 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800">
                    <BarChart3 size={20} className="text-slate-300 dark:text-slate-600 mb-1.5" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Sem movimentações entre {formatMonthLabel(effectiveStart)} e {formatMonthLabel(effectiveEnd)}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Nenhuma entrada ou saída foi registrada neste intervalo.
                    </p>
                    {preset !== '12m' && (
                      <button
                        type="button"
                        onClick={() => applyPreset('12m')}
                        className="mt-2.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors"
                      >
                        Ampliar para últimos 12 meses
                      </button>
                    )}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart
                      data={chartData}
                      margin={{ top: 6, right: 8, left: -22, bottom: 0 }}
                      barGap={4}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="currentColor"
                        className="text-slate-200 dark:text-slate-800"
                      />
                      <XAxis
                        dataKey="monthLabel"
                        tick={{ fontSize: 10, fill: 'currentColor' }}
                        stroke="currentColor"
                        className="text-slate-400 dark:text-slate-500"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: 'currentColor' }}
                        stroke="currentColor"
                        className="text-slate-400 dark:text-slate-500"
                        tickLine={false}
                        axisLine={false}
                      />
                      <RechartsTooltip
                        content={<CustomChartTooltip />}
                        cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                      />
                      {showEntradas && (
                        <Bar
                          dataKey="entradas"
                          name="Entradas"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={24}
                        />
                      )}
                      {showSaidas && (
                        <Bar
                          dataKey="saidas"
                          name="Saídas"
                          fill="#f43f5e"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={24}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Legenda interativa (Tremor Legend Pills) */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 mt-1 border-t border-slate-100 dark:border-slate-800">
                <Tooltip
                  content={
                    showEntradas && !showSaidas
                      ? 'Mantenha ao menos uma série visível'
                      : showEntradas
                      ? 'Clique para ocultar Entradas'
                      : 'Clique para exibir Entradas'
                  }
                  position="top"
                >
                  <button
                    type="button"
                    onClick={() => toggleSeries('entradas')}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all tabular-nums ${
                      showEntradas
                        ? 'bg-emerald-50/70 dark:bg-emerald-500/10 text-slate-700 dark:text-slate-200 hover:bg-emerald-100/70 dark:hover:bg-emerald-500/20'
                        : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 line-through opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Entradas (+{periodStats.totalEntradas})</span>
                  </button>
                </Tooltip>

                <Tooltip
                  content={
                    showSaidas && !showEntradas
                      ? 'Mantenha ao menos uma série visível'
                      : showSaidas
                      ? 'Clique para ocultar Saídas'
                      : 'Clique para exibir Saídas'
                  }
                  position="top"
                >
                  <button
                    type="button"
                    onClick={() => toggleSeries('saidas')}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all tabular-nums ${
                      showSaidas
                        ? 'bg-rose-50/70 dark:bg-rose-500/10 text-slate-700 dark:text-slate-200 hover:bg-rose-100/70 dark:hover:bg-rose-500/20'
                        : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 line-through opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span>Saídas (-{periodStats.totalSaidas})</span>
                  </button>
                </Tooltip>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quadro de Detalhamento de Clientes: contido nos limites do widget ou expandido via Portal */}
      {detailModalView && (() => {
        const detailOverlay = (
          <div
            className={`fixed inset-0 z-[9999] backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-150 ${
              isModalExpanded
                ? 'bg-slate-950/60 p-3 sm:p-6'
                : 'no-drag bg-slate-900/50 p-2 sm:p-3'
            }`}
            onClick={() => setDetailModalView(null)}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ${
                isModalExpanded
                  ? 'rounded-2xl max-w-2xl max-h-[85vh]'
                  : 'rounded-xl max-w-full max-h-full'
              }`}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Cabeçalho do Modal (alinhado à tipografia do WidgetContainer) */}
              <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-2.5 sm:space-y-3 shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shrink-0 shadow-sm text-slate-500 dark:text-slate-400 flex items-center mt-0.5">
                      <Users size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-col min-w-0">
                        <h4 className="text-[10px] sm:text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-[0.18em] sm:tracking-[0.25em] uppercase leading-none truncate">
                          {modalMeta[detailModalView].title}
                        </h4>
                        <div className="h-0.5 w-4 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1 rounded-full" />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1.5 tabular-nums">
                        {modalMeta[detailModalView].subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Tooltip
                      content={isModalExpanded ? 'Reduzir para o widget' : 'Expandir para tela maior'}
                      position="bottom"
                    >
                      <button
                        type="button"
                        onClick={() => setIsModalExpanded((prev) => !prev)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                        aria-label={isModalExpanded ? 'Reduzir para o widget' : 'Expandir para tela maior'}
                      >
                        {isModalExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                      </button>
                    </Tooltip>
                    <Tooltip content="Fechar (Esc)" position="left">
                      <button
                        type="button"
                        onClick={() => setDetailModalView(null)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                        aria-label="Fechar"
                      >
                        <X size={16} />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {/* Abas de Situação (alternar rapidamente entre Entradas, Saídas, Saldo, Ativos e Inativos) */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'entradas', label: `Entradas (+${categorizedClients.entradas.length})` },
                      { id: 'saidas', label: `Saídas (-${categorizedClients.saidas.length})` },
                      { id: 'saldo', label: `Movimentações (${categorizedClients.saldo.length})` },
                      { id: 'ativos', label: `Ativos (${categorizedClients.ativos.length})` },
                      { id: 'inativos', label: `Inativos (${categorizedClients.inativos.length})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDetailModalView(tab.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all tabular-nums ${
                        detailModalView === tab.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Busca rápida por nome, razão social, CNPJ/CPF ou código */}
                <div className="relative">
                  <Input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder="Buscar por nome, razão social, código ou CPF/CNPJ..."
                    icon={<Search size={14} />}
                    className="!h-9 !text-xs pr-8"
                  />
                  {modalSearch && (
                    <Tooltip content="Limpar busca" position="top">
                      <button
                        type="button"
                        onClick={() => setModalSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Limpar busca"
                      >
                        <X size={13} />
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Lista de Clientes */}
              <div className="p-3 sm:p-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar space-y-2">
                {activeModalItems.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                    <Building2 className="mx-auto mb-2 opacity-30" size={32} />
                    <p className="text-xs font-medium">
                      {modalSearch.trim()
                        ? 'Nenhum cliente corresponde ao termo buscado.'
                        : modalMeta[detailModalView].emptyText}
                    </p>
                  </div>
                ) : (
                  activeModalItems.map(({ key, client, movementType, referenceDate, isCreatedFallback }) => {
                    const displayName = getClientDisplayName(client);
                    const hasDifferentCompanyName =
                      client.trade_name?.trim() &&
                      client.company_name?.trim() &&
                      client.trade_name.trim() !== client.company_name.trim();

                    const isEntry =
                      movementType === 'entrada' ||
                      (detailModalView === 'ativos' && !movementType);
                    const isExit = movementType === 'saida' || detailModalView === 'inativos';

                    return (
                      <div
                        key={key}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div
                            className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                              movementType === 'entrada'
                                ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : movementType === 'saida'
                                ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                : client.status === 'Ativo'
                                ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {movementType === 'entrada' ? (
                              <ArrowUpRight size={15} />
                            ) : movementType === 'saida' ? (
                              <ArrowDownRight size={15} />
                            ) : (
                              <Building2 size={15} />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {client.code && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                                  #{client.code}
                                </span>
                              )}
                              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {displayName}
                              </h5>
                            </div>

                            {hasDifferentCompanyName && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {client.company_name}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                              {client.document && <span>{client.document}</span>}
                              {referenceDate && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar size={11} className="text-slate-400 shrink-0" />
                                  {movementType === 'entrada'
                                    ? isCreatedFallback
                                      ? `Cadastro: ${formatDateBR(referenceDate)}`
                                      : `Entrada: ${formatDateBR(referenceDate)}`
                                    : movementType === 'saida'
                                    ? `Saída: ${formatDateBR(referenceDate)}`
                                    : detailModalView === 'inativos' && client.exit_date
                                    ? `Saída: ${formatDateBR(client.exit_date)}`
                                    : client.entry_date
                                    ? `Entrada: ${formatDateBR(client.entry_date)}`
                                    : `Cadastro: ${formatDateBR(referenceDate)}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {movementType && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                movementType === 'entrada'
                                  ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                                  : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                              }`}
                            >
                              {movementType === 'entrada' ? 'Entrada' : 'Saída'}
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                              isEntry && !isExit && client.status === 'Ativo'
                                ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                                : client.status === 'Ativo'
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                            }`}
                          >
                            {client.status || 'Sem status'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Rodapé do Modal */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs shrink-0">
                <span className="text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                  {activeModalItems.length}{' '}
                  {activeModalItems.length === 1 ? 'registro exibido' : 'registros exibidos'}
                </span>
                <button
                  type="button"
                  onClick={() => setDetailModalView(null)}
                  className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-200 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
        return isModalExpanded && typeof document !== 'undefined'
          ? createPortal(detailOverlay, document.body)
          : detailOverlay;
      })()}
    </WidgetContainer>
  );
};
