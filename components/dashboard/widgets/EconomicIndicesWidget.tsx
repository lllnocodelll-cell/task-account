import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Globe,
  Coins,
  Percent,
  RefreshCw,
  Clock,
  TrendingUpDown,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';
import { Tooltip } from '../../ui/Tooltip';

interface EconomicIndex {
  id: string;
  name: string;
  code: string;
  value: number;
  unit: string;
  updated_at: string;
  last_sync: string;
}

interface SeriesPoint {
  date: string; // dd/MM/yyyy
  value: number;
}

type CategoryKey = 'exchange' | 'rates' | 'inflation' | 'other';
type CategoryFilter = 'all' | CategoryKey;

const SERIES_CACHE_KEY = 'taskaccount_economic_series_v1';
const MONTHLY_SERIES_CODES = new Set(['433', '189', '4390', '13522']);
const SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000;

const CATEGORY_META: Record<
  CategoryKey,
  {
    title: string;
    shortTitle: string;
    Icon: React.FC<{ size?: number; className?: string }>;
    iconClass: string;
    strokeColor: string;
  }
> = {
  exchange: {
    title: 'Câmbio',
    shortTitle: 'Câmbio',
    Icon: Globe,
    iconClass: 'text-blue-500 dark:text-blue-400',
    strokeColor: '#3b82f6'
  },
  rates: {
    title: 'Taxa Básica',
    shortTitle: 'Taxas',
    Icon: Coins,
    iconClass: 'text-amber-500 dark:text-amber-400',
    strokeColor: '#f59e0b'
  },
  inflation: {
    title: 'Inflação / Correção',
    shortTitle: 'Inflação',
    Icon: TrendingUp,
    iconClass: 'text-indigo-500 dark:text-indigo-400',
    strokeColor: '#6366f1'
  },
  other: {
    title: 'Outros',
    shortTitle: 'Outros',
    Icon: Percent,
    iconClass: 'text-slate-500 dark:text-slate-400',
    strokeColor: '#64748b'
  }
};

const CATEGORY_ORDER: CategoryKey[] = ['exchange', 'rates', 'inflation', 'other'];

const getCategoryForIndex = (index: EconomicIndex): CategoryKey => {
  const name = (index.name || '').toLowerCase();
  if (name.includes('dólar') || name.includes('dolar') || name.includes('euro') || ['1', '21619'].includes(index.code)) {
    return 'exchange';
  }
  if (name.includes('selic') || name.includes('cdi') || ['11', '12', '432', '4390', '4391'].includes(index.code)) {
    return 'rates';
  }
  if (name.includes('ipca') || name.includes('igp') || name.includes('inpc') || ['433', '189', '188', '13522'].includes(index.code)) {
    return 'inflation';
  }
  return 'other';
};

const formatIndexNumber = (value: number | null | undefined, unit: string): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  const decimals = unit === 'R$' ? 4 : 2;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

const formatIndexDisplay = (value: number | null | undefined, unit: string): string => {
  const formatted = formatIndexNumber(value, unit);
  if (formatted === '--') return '--';
  return unit === 'R$' ? `R$ ${formatted}` : `${formatted}%`;
};

const formatReferenceDate = (isoDate?: string): string => {
  if (!isoDate) return '--';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const formatShortRefDate = (isoDate?: string): string => {
  if (!isoDate) return '--';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
};

const formatSyncTimestamp = (isoTs?: string | null): string => {
  if (!isoTs) return 'Aguardando';
  const date = new Date(isoTs);
  if (Number.isNaN(date.getTime())) return 'Hoje';

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Hoje às ${timeStr}`;

  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${dateStr} às ${timeStr}`;
};

const loadCachedSeries = (): Record<string, SeriesPoint[]> => {
  try {
    const raw = localStorage.getItem(SERIES_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const saveCachedSeries = (series: Record<string, SeriesPoint[]>) => {
  try {
    localStorage.setItem(SERIES_CACHE_KEY, JSON.stringify(series));
  } catch {
    // Ignore storage quota errors
  }
};

export const EconomicIndicesWidget: React.FC<{ onRemove?: () => void; orgId?: string }> = ({ onRemove }) => {
  const [indices, setIndices] = useState<EconomicIndex[]>([]);
  const [seriesMap, setSeriesMap] = useState<Record<string, SeriesPoint[]>>(() => loadCachedSeries());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncWarning, setSyncWarning] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchFromSupabase = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('economic_indices')
      .select('*')
      .order('name');

    if (!error && data) {
      const typed = data as EconomicIndex[];
      setIndices(typed);
      return typed;
    }
    return [];
  }, []);

  const syncWithBCB = useCallback(async (currentIndices: EconomicIndex[]) => {
    if (syncing || !currentIndices || currentIndices.length === 0) return;
    setSyncing(true);
    setSyncWarning(false);

    let failedCount = 0;
    const nextSeriesMap: Record<string, SeriesPoint[]> = { ...loadCachedSeries() };

    try {
      const updated = await Promise.all(
        currentIndices.map(async index => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          try {
            const response = await fetch(
              `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${index.code}/dados/ultimos/15?formato=json`,
              { signal: controller.signal }
            );
            clearTimeout(timeoutId);

            if (!response.ok) {
              failedCount++;
              return index;
            }

            const rawData = await response.json();
            if (!Array.isArray(rawData) || rawData.length === 0) {
              failedCount++;
              return index;
            }

            let points: SeriesPoint[] = rawData
              .map((item: { data: string; valor: string }) => ({
                date: item.data,
                value: parseFloat(item.valor)
              }))
              .filter(p => !Number.isNaN(p.value));

            if (points.length === 0) {
              failedCount++;
              return index;
            }

            // Para índices mensais, descarta mês corrente parcial se existir
            if (MONTHLY_SERIES_CODES.has(index.code) && points.length > 1) {
              const today = new Date();
              const currentMonthStart = `01/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
              if (points[points.length - 1].date === currentMonthStart) {
                points = points.slice(0, -1);
              }
            }

            nextSeriesMap[index.code] = points;

            const latest = points[points.length - 1];
            const formattedDate = latest.date.split('/').reverse().join('-');
            const syncIso = new Date().toISOString();

            await (supabase as any)
              .from('economic_indices')
              .update({
                value: latest.value,
                updated_at: formattedDate,
                last_sync: syncIso
              })
              .eq('id', index.id);

            return {
              ...index,
              value: latest.value,
              updated_at: formattedDate,
              last_sync: syncIso
            };
          } catch {
            clearTimeout(timeoutId);
            failedCount++;
            return index;
          }
        })
      );

      setIndices(updated);
      setSeriesMap(nextSeriesMap);
      saveCachedSeries(nextSeriesMap);

      if (failedCount === currentIndices.length) {
        setSyncWarning(true);
      }
    } catch {
      setSyncWarning(true);
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      const data = await fetchFromSupabase();

      if (isMounted) {
        setLoading(false);
      }

      if (data.length === 0) return;

      const twelveHoursAgo = new Date(Date.now() - SYNC_INTERVAL_MS);
      const cached = loadCachedSeries();
      const needsSync = data.some(
        idx => !idx.last_sync || new Date(idx.last_sync) < twelveHoursAgo
      );
      const missingSeries = data.some(
        idx => !cached[idx.code] || cached[idx.code].length < 2
      );

      if (needsSync || missingSeries) {
        syncWithBCB(data);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [fetchFromSupabase]);

  const handleCopyValue = async (index: EconomicIndex) => {
    const textToCopy = formatIndexNumber(index.value, index.unit);
    if (textToCopy === '--') return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(index.id);
      setTimeout(() => {
        setCopiedId(prev => (prev === index.id ? null : prev));
      }, 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const categorizedGroups = useMemo(() => {
    const grouped: Record<CategoryKey, EconomicIndex[]> = {
      exchange: [],
      rates: [],
      inflation: [],
      other: []
    };

    indices.forEach(idx => {
      grouped[getCategoryForIndex(idx)].push(idx);
    });

    return CATEGORY_ORDER.map(key => ({
      key,
      ...CATEGORY_META[key],
      items: grouped[key]
    })).filter(group => group.items.length > 0);
  }, [indices]);

  const visibleGroups = useMemo(
    () =>
      activeCategory === 'all'
        ? categorizedGroups
        : categorizedGroups.filter(g => g.key === activeCategory),
    [categorizedGroups, activeCategory]
  );

  const latestSyncIso = useMemo(() => {
    const timestamps = indices
      .map(i => (i.last_sync ? new Date(i.last_sync).getTime() : 0))
      .filter(t => t > 0);
    if (timestamps.length === 0) return null;
    return new Date(Math.max(...timestamps)).toISOString();
  }, [indices]);

  return (
    <WidgetContainer
      title="ÍNDICES ECONÔMICOS"
      icon={<TrendingUpDown size={14} />}
      onRemove={onRemove}
      keepHeaderActionsInline={true}
      headerActions={
        <Tooltip content="Sincronizar com Banco Central (SGS)" position="top">
          <button
            type="button"
            onClick={() => syncWithBCB(indices)}
            onPointerDown={e => e.stopPropagation()}
            disabled={syncing || indices.length === 0}
            className="h-6 w-6 flex items-center justify-center rounded-md bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Sincronizar índices com BCB"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin text-indigo-500 dark:text-indigo-400' : ''} />
          </button>
        </Tooltip>
      }
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Pills de Filtro Rápido por Categoria */}
        {!loading && categorizedGroups.length > 1 && (
          <div className="flex flex-wrap items-center gap-1 bg-slate-100/80 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200/70 dark:border-slate-800 mb-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                activeCategory === 'all'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/70 dark:border-slate-700'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
            >
              Todos ({indices.length})
            </button>
            {categorizedGroups.map(cat => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                  activeCategory === cat.key
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/70 dark:border-slate-700'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                }`}
              >
                {cat.shortTitle}
              </button>
            ))}
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {loading ? (
            <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(210px,1fr))] items-start">
              {[1, 2, 3].map(section => (
                <div
                  key={section}
                  className="flex flex-col gap-2.5 p-3 bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/70 dark:border-slate-800 rounded-2xl"
                >
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <div className="h-6 w-6 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-md" />
                    <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                  </div>
                  <div className="flex flex-col gap-2">
                    {[1, 2].map(i => (
                      <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800/80 animate-pulse rounded-xl" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : indices.length === 0 ? (
            <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40">
              <TrendingUpDown size={22} className="text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Nenhum índice econômico cadastrado
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Cadastre séries do SGS na tabela de índices para acompanhar cotações e taxas.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(210px,1fr))] items-start">
              {visibleGroups.map(category => {
                const CatIcon = category.Icon;
                return (
                  <div
                    key={category.key}
                    className="flex flex-col gap-2.5 p-3 bg-slate-50/80 dark:bg-slate-800/30 border border-slate-200/70 dark:border-slate-800 rounded-2xl"
                  >
                    {/* Header da Categoria */}
                    <div className="flex items-center justify-between gap-2 px-0.5 border-b border-slate-200/70 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1 bg-white dark:bg-slate-900 rounded-md shadow-xs border border-slate-200/70 dark:border-slate-700 shrink-0">
                          <CatIcon size={13} className={category.iconClass} />
                        </div>
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider truncate">
                          {category.title}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                        {category.items.length}
                      </span>
                    </div>

                    {/* Cards KPI Estilo Tremor */}
                    <div className="flex flex-col gap-2">
                      {category.items.map(index => {
                        const points = seriesMap[index.code] || [];
                        const hasSeries = points.length >= 2;
                        const prevPoint = hasSeries ? points[points.length - 2] : null;
                        const currPoint = hasSeries ? points[points.length - 1] : null;

                        let deltaLabel = '';
                        let deltaDirection: 'up' | 'down' | 'flat' = 'flat';
                        let deltaTooltip = '';

                        if (prevPoint && currPoint) {
                          if (index.unit === 'R$' && prevPoint.value !== 0) {
                            const pctDiff = ((currPoint.value - prevPoint.value) / Math.abs(prevPoint.value)) * 100;
                            if (Math.abs(pctDiff) >= 0.005) {
                              deltaDirection = pctDiff > 0 ? 'up' : 'down';
                              deltaLabel = `${pctDiff > 0 ? '+' : ''}${new Intl.NumberFormat('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }).format(pctDiff)}%`;
                            } else {
                              deltaLabel = '0,00%';
                            }
                          } else {
                            const ppDiff = currPoint.value - prevPoint.value;
                            if (Math.abs(ppDiff) >= 0.005) {
                              deltaDirection = ppDiff > 0 ? 'up' : 'down';
                              deltaLabel = `${ppDiff > 0 ? '+' : ''}${new Intl.NumberFormat('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }).format(ppDiff)} p.p.`;
                            } else {
                              deltaLabel = '0,00 p.p.';
                            }
                          }
                          deltaTooltip = `Anterior (${prevPoint.date}): ${formatIndexDisplay(prevPoint.value, index.unit)} → Atual (${currPoint.date}): ${formatIndexDisplay(currPoint.value, index.unit)}`;
                        }

                        const deltaBadgeClass =
                          deltaDirection === 'up'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/25'
                            : deltaDirection === 'down'
                              ? 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/25'
                              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';

                        const sparkColor =
                          deltaDirection === 'up'
                            ? '#10b981'
                            : deltaDirection === 'down'
                              ? '#f43f5e'
                              : category.strokeColor;

                        const gradientId = `spark-${index.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
                        const isCopied = copiedId === index.id;

                        return (
                          <div
                            key={index.id}
                            className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl flex flex-col gap-2 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-sm transition-all group"
                          >
                            {/* Linha 1: Nome + Data de Referência sempre visível */}
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <Tooltip
                                content={`${index.name} · Série BCB SGS #${index.code} · Ref: ${formatReferenceDate(index.updated_at)}`}
                                position="top"
                                className="min-w-0 flex-1"
                              >
                                <span className="block text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider truncate">
                                  {index.name}
                                </span>
                              </Tooltip>

                              <Tooltip
                                content={`Data de referência: ${formatReferenceDate(index.updated_at)}`}
                                position="top"
                              >
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                                  <Clock size={9} />
                                  {formatShortRefDate(index.updated_at)}
                                </span>
                              </Tooltip>
                            </div>

                            {/* Linha 2: Valor KPI + Badge Delta + Copiar */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-base font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                                  {formatIndexDisplay(index.value, index.unit)}
                                </span>
                                <Tooltip content={isCopied ? 'Copiado!' : 'Copiar valor'} position="top">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyValue(index)}
                                    className={`p-1 rounded-md transition-all ${
                                      isCopied
                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 opacity-100'
                                        : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100'
                                    }`}
                                    aria-label={`Copiar valor de ${index.name}`}
                                  >
                                    {isCopied ? <Check size={11} /> : <Copy size={11} />}
                                  </button>
                                </Tooltip>
                              </div>

                              {hasSeries && deltaLabel && (
                                <Tooltip content={deltaTooltip} position="top">
                                  <span
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold border tabular-nums shrink-0 ${deltaBadgeClass}`}
                                  >
                                    {deltaDirection === 'up' && <TrendingUp size={9} />}
                                    {deltaDirection === 'down' && <TrendingDown size={9} />}
                                    {deltaDirection === 'flat' && <Minus size={9} />}
                                    {deltaLabel}
                                  </span>
                                </Tooltip>
                              )}
                            </div>

                            {/* Linha 3: Mini Sparkline (Recharts) */}
                            {hasSeries && (
                              <div className="h-8 w-full min-w-0 pt-0.5">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                  <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={sparkColor} stopOpacity={0.28} />
                                        <stop offset="95%" stopColor={sparkColor} stopOpacity={0} />
                                      </linearGradient>
                                    </defs>
                                    <YAxis domain={['dataMin', 'dataMax']} hide />
                                    <Area
                                      type="monotone"
                                      dataKey="value"
                                      stroke={sparkColor}
                                      strokeWidth={1.75}
                                      fill={`url(#${gradientId})`}
                                      isAnimationActive={false}
                                      dot={false}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé com Fonte + Status Real de Sincronização */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2 shrink-0 text-[9.5px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="italic truncate">Fonte: Banco Central (SGS)</span>
            {syncWarning && (
              <Tooltip
                content="Não foi possível conectar ao BCB agora; exibindo os valores salvos em cache."
                position="top"
              >
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
                  <AlertCircle size={9} /> Cache
                </span>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-1.5 font-medium shrink-0 tabular-nums">
            {syncing ? (
              <span className="font-bold text-indigo-500 dark:text-indigo-400 animate-pulse uppercase tracking-tighter">
                Sincronizando...
              </span>
            ) : (
              <span>Última sinc: {formatSyncTimestamp(latestSyncIso)}</span>
            )}
          </div>
        </div>
      </div>
    </WidgetContainer>
  );
};
