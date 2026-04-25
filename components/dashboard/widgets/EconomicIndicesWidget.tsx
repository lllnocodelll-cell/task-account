import React, { useState, useEffect } from 'react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';
import { TrendingUp, Globe, Coins, Percent, RefreshCw, Clock, TrendingUpDown } from 'lucide-react';
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

export const EconomicIndicesWidget: React.FC<{ onRemove?: () => void; orgId?: string }> = ({ onRemove }) => {
    const [indices, setIndices] = useState<EconomicIndex[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const fetchFromSupabase = async () => {
        const { data, error } = await (supabase as any)
            .from('economic_indices')
            .select('*')
            .order('name');
        
        if (!error && data) {
            setIndices(data as EconomicIndex[]);
            return data as EconomicIndex[];
        }
        return [];
    };

    const syncWithBCB = async (currentIndices: EconomicIndex[]) => {
        if (syncing) return;
        setSyncing(true);
        try {
            const updated = await Promise.all(currentIndices.map(async (index) => {
                try {
                    // Busca os 2 últimos para garantir que pegamos o mês fechado se o atual for parcial
                    const response = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${index.code}/dados/ultimos/2?formato=json`);
                    const data = await response.json();
                    
                    if (data && data.length > 0) {
                        let selectedData = data[data.length - 1];
                        
                        // Para índices mensais, se o último for o mês atual, pegamos o anterior (mês fechado)
                        if (['433', '189', '4390'].includes(index.code)) {
                            const today = new Date();
                            const currentMonthStart = `01/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
                            if (selectedData.data === currentMonthStart && data.length > 1) {
                                selectedData = data[data.length - 2];
                            }
                        }

                        const newValue = parseFloat(selectedData.valor);
                        const rawDate = selectedData.data; // Format dd/MM/yyyy
                        const formattedDate = rawDate.split('/').reverse().join('-'); // YYYY-MM-DD

                        await (supabase as any)
                            .from('economic_indices')
                            .update({
                                value: newValue,
                                updated_at: formattedDate,
                                last_sync: new Date().toISOString()
                            })
                            .eq('id', index.id);
                        
                        return { ...index, value: newValue, updated_at: formattedDate, last_sync: new Date().toISOString() };
                    }
                } catch (e) {
                    console.error(`Error syncing ${index.name}:`, e);
                }
                return index;
            }));
            setIndices(updated);
        } catch (err) {
            console.error("Erro geral na sincronização:", err);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await fetchFromSupabase();
            
            const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
            const needsSync = (data as EconomicIndex[]).some(idx => !idx.last_sync || new Date(idx.last_sync) < twelveHoursAgo);
            
            if (needsSync && (data as EconomicIndex[]).length > 0) {
                await syncWithBCB(data as EconomicIndex[]);
            } else {
                setLoading(false);
            }
        };
        load();
    }, []);

    const getIcon = (name: string) => {
        if (name.includes('IPCA')) return <TrendingUp className="text-indigo-500" size={14} />;
        if (name.includes('IGP-M')) return <Percent className="text-emerald-500" size={14} />;
        if (name.includes('Dólar')) return <Globe className="text-blue-500" size={14} />;
        if (name.includes('SELIC')) return <Coins className="text-amber-500" size={14} />;
        return <TrendingUp className="text-slate-500" size={14} />;
    };

    return (
        <WidgetContainer 
            title="ÍNDICES ECONÔMICOS" 
            icon={<TrendingUpDown size={14} />}
            onRemove={onRemove}
            headerActions={
                <Tooltip content="Sincronizar com BCB" position="top">
                    <button 
                        onClick={() => syncWithBCB(indices)} 
                        disabled={syncing}
                        className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                    >
                        <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                    </button>
                </Tooltip>
            }
        >
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {loading && !syncing ? (
                        <div className="grid grid-cols-1 gap-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {indices.map((index) => (
                                <div 
                                    key={index.id} 
                                    className="p-2.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/50 rounded-xl flex items-center justify-between gap-3 hover:bg-white dark:hover:bg-slate-800 transition-all group"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 group-hover:scale-105 transition-transform">
                                            {getIcon(index.name)}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                                                {index.name}
                                            </span>
                                            <div className="flex items-center gap-1 text-[8px] text-slate-400 mt-0.5">
                                                <Clock size={8} className="shrink-0" />
                                                <span className="truncate">
                                                    Ref: {index.updated_at ? index.updated_at.split('-').reverse().slice(0, 2).join('/') : '--'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-100 tabular-nums">
                                            {index.unit === 'R$' ? `R$ ${index.value?.toFixed(4)}` : `${index.value?.toFixed(4)}%`}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <p className="text-[8px] text-slate-400 italic">
                        Fonte: Banco Central (SGS)
                    </p>
                    {syncing && <span className="text-[8px] font-bold text-indigo-500 animate-pulse uppercase tracking-tighter">Sincronizando...</span>}
                </div>
            </div>
        </WidgetContainer>
    );
};
