import React, { useEffect, useState } from 'react';
import { Landmark } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

export const TaxRegimesWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [data, setData] = useState<{ regime: string, count: number, percent: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTaxRegimes = async () => {
            if (!orgId) return;
            try {
                // Busca todos os clientes ativos com seu regime atual (onde end_date é nulo)
                const { data: clientsData, error } = await supabase
                    .from('clients')
                    .select(`
                        id,
                        client_tax_regime_history!inner(regime, end_date)
                    `)
                    .eq('org_id', orgId)
                    .eq('status', 'Ativo')
                    .is('client_tax_regime_history.end_date', null);

                if (error) throw error;

                if (clientsData) {
                    const counts: Record<string, number> = {};
                    let totalValids = 0;

                    // Mapeamento de nomes completos dos regimes
                    const REGIME_NAMES: Record<string, string> = {
                        'simples': 'Simples Nacional',
                        'lp': 'Lucro Presumido',
                        'lr': 'Lucro Real',
                        'isento': 'Isento',
                        'imune': 'Imune',
                        'mei': 'Microempreendedor Individual (MEI)'
                    };

                    clientsData.forEach(client => {
                        // supabase inner join retorna array, pegamos o primeiro regime válido
                        const history = Array.isArray(client.client_tax_regime_history)
                            ? client.client_tax_regime_history[0]
                            : client.client_tax_regime_history;

                        if (history && history.regime) {
                            const rawRegime = history.regime;
                            // Normaliza a checagem colocando tudo em minúsculo
                            const regimeName = REGIME_NAMES[rawRegime.toLowerCase()] || rawRegime;

                            counts[regimeName] = (counts[regimeName] || 0) + 1;
                            totalValids++;
                        }
                    });

                    // Converter map para array e ordenar
                    let result = Object.keys(counts).map(regime => ({
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

    // Função para renderizar as barras visuais de forma minimalista
    return (
        <WidgetContainer title="Regimes Tributários (Ativos)" icon={<Landmark size={18} />} onRemove={onRemove}>
            <div className="flex-1 flex flex-col p-2 space-y-4 overflow-y-auto w-full">
                {loading ? (
                    <div className="animate-pulse space-y-4 w-full">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-1/2 mb-1"></div>
                        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                        <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-1/3 mb-1 mt-3"></div>
                        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-4/5"></div>
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm h-full pb-6">
                        Nenhum regime registrado
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {data.map((item, index) => (
                            <div key={index} className="flex flex-col gap-1.5 group">
                                <div className="flex justify-between items-end text-sm">
                                    <span className="font-semibold text-slate-700 dark:text-slate-200 truncate pr-2">
                                        {item.regime}
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                                        {item.count} <span className="text-xs">({item.percent.toFixed(1)}%)</span>
                                    </span>
                                </div>
                                {/* Barra de progresso visual */}
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-500 ease-out group-hover:bg-indigo-600 dark:group-hover:bg-indigo-300"
                                        style={{ width: `${item.percent}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </WidgetContainer>
    );
};
