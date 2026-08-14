import React, { useEffect, useState } from 'react';
import { Landmark, Briefcase, FileText, CheckCircle2, ShieldOff, AlertCircle, User } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';
import { TAX_REGIME_LABELS } from '../../../types';

interface Props {
  orgId: string;
  onRemove?: () => void;
}

// Estilos de cores e ícones flexíveis baseados na categoria/nome do regime
const getRegimeStyle = (regimeLabel: string) => {
  const lower = regimeLabel.toLowerCase();

  if (lower.includes('simples')) {
    return { color: 'text-emerald-500', bg: 'bg-emerald-500', icon: Briefcase };
  }
  if (lower.includes('presumido')) {
    return { color: 'text-indigo-500', bg: 'bg-indigo-500', icon: FileText };
  }
  if (lower.includes('real')) {
    return { color: 'text-amber-500', bg: 'bg-amber-500', icon: CheckCircle2 };
  }
  if (lower.includes('arbitrado')) {
    return { color: 'text-purple-500', bg: 'bg-purple-500', icon: Landmark };
  }
  if (lower.includes('mei') || lower.includes('microempreendedor') || lower.includes('nano')) {
    return { color: 'text-violet-500', bg: 'bg-violet-500', icon: AlertCircle };
  }
  if (lower.includes('irpf')) {
    return { color: 'text-cyan-500', bg: 'bg-cyan-500', icon: User };
  }
  if (lower.includes('isento') || lower.includes('imune')) {
    return { color: 'text-slate-400', bg: 'bg-slate-400', icon: ShieldOff };
  }
  return { color: 'text-rose-500', bg: 'bg-rose-500', icon: Landmark };
};

export const TaxRegimesWidget: React.FC<Props> = ({ orgId, onRemove }) => {
  const [data, setData] = useState<{ regime: string; count: number; percent: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTaxRegimes = async () => {
      if (!orgId) return;
      try {
        // Busca todos os clientes ativos com seu regime atual
        const { data: clientsData, error } = await supabase
          .from('clients')
          .select(`
            id,
            client_tax_regime_history(regime, end_date)
          `)
          .eq('org_id', orgId)
          .eq('status', 'Ativo');

        if (error) throw error;

        if (clientsData) {
          const counts: Record<string, number> = {};
          let totalValids = 0;

          clientsData.forEach((client: any) => {
            const historyList = client.client_tax_regime_history || [];
            // Encontra a entrada ativa (end_date é null ou indefinido)
            const activeRegimeEntry = Array.isArray(historyList)
              ? historyList.find((h: any) => !h.end_date)
              : (!historyList.end_date ? historyList : null);

            const rawRegime = activeRegimeEntry?.regime;

            if (rawRegime) {
              const regimeName = TAX_REGIME_LABELS[rawRegime] || TAX_REGIME_LABELS[rawRegime.toLowerCase()] || rawRegime;
              counts[regimeName] = (counts[regimeName] || 0) + 1;
              totalValids++;
            }
          });

          const result = Object.keys(counts).map(regime => ({
            regime,
            count: counts[regime],
            percent: totalValids > 0 ? (counts[regime] / totalValids) * 100 : 0
          }));

          result.sort((a, b) => b.count - a.count);
          setData(result);
        }
      } catch (err) {
        console.error('Error fetching tax regimes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTaxRegimes();
  }, [orgId]);

  return (
    <WidgetContainer title="MONITOR REGIMES" icon={<Landmark size={14} className="text-indigo-500" />} onRemove={onRemove}>
      <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto w-full custom-scrollbar">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-indigo-500 animate-spin"></div>
            <div className="text-sm text-slate-400 font-medium animate-pulse">Carregando regimes...</div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-3">
            <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
              <Landmark size={24} className="text-slate-300 dark:text-slate-600" />
            </div>
            <span className="font-medium text-slate-500">Nenhum regime registrado</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {data.map((item, index) => {
              const style = getRegimeStyle(item.regime);
              const Icon = style.icon;

              return (
                <div key={index} className="flex flex-col p-3 rounded-xl bg-slate-50 hover:bg-white dark:bg-slate-800/40 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 ${style.color} shrink-0`}>
                        <Icon size={14} />
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate" title={item.regime}>
                        {item.regime}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 shrink-0 ml-2">
                      <span className="font-bold text-slate-800 dark:text-white text-base tabular-nums">
                        {item.count}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                        ({item.percent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full bg-slate-200/60 dark:bg-slate-700/50 rounded-full overflow-hidden shrink-0 mt-1">
                    <div
                      className={`h-full ${style.bg} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WidgetContainer>
  );
};
