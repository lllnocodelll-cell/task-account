import React, { useEffect, useState } from 'react';
import { Award, FileWarning } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

type CertificateItem = {
    id: string;
    clientName: string;
    model: string;
    expiresAt: string;
    signatory: string;
    situation: 'Vencido' | 'Vence em 30dd' | 'Válido';
    daysRemaining: number;
};

export const ClientCertificatesWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [data, setData] = useState<CertificateItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'criticos' | 'vencidos' | '30dd' | 'todos'>('criticos');
    const [counts, setCounts] = useState({ total: 0, vencidos: 0, trintaDias: 0, validos: 0 });

    const fetchCertificates = async () => {
        if (!orgId) return;
        setLoading(true);
        try {
            const { data: certs, error } = await supabase
                .from('client_certificates')
                .select('id, expires_at, model, signatory, clients!inner(id, org_id, company_name, trade_name)')
                .eq('clients.org_id', orgId);

            if (error) throw error;

            if (certs) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                let total = 0;
                let vencidos = 0;
                let trintaDias = 0;
                let validos = 0;

                const mapped: CertificateItem[] = certs.map((c: any) => {
                    total++;
                    let situation: 'Vencido' | 'Vence em 30dd' | 'Válido' = 'Válido';
                    let diffDays = 0;

                    if (c.expires_at) {
                        const expDate = new Date(c.expires_at + 'T00:00:00');
                        expDate.setHours(0, 0, 0, 0);
                        const diffTime = expDate.getTime() - today.getTime();
                        diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays < 0) {
                            situation = 'Vencido';
                            vencidos++;
                        } else if (diffDays <= 30) {
                            situation = 'Vence em 30dd';
                            trintaDias++;
                        } else {
                            situation = 'Válido';
                            validos++;
                        }
                    } else {
                        // Sem data de vencimento
                        situation = 'Vencido';
                        vencidos++;
                        diffDays = -9999;
                    }

                    return {
                        id: c.id,
                        clientName: c.clients?.trade_name || c.clients?.company_name || 'Desconhecido',
                        model: c.model || 'A1',
                        expiresAt: c.expires_at || 'Sem validade',
                        signatory: c.signatory || 'Não informado',
                        situation,
                        daysRemaining: diffDays
                    };
                });

                // Ordenar por criticidade (menor quantidade de dias para vencer no topo)
                mapped.sort((a, b) => a.daysRemaining - b.daysRemaining);

                setData(mapped);
                setCounts({ total, vencidos, trintaDias, validos });
            }
        } catch (err) {
            console.error('Error fetching certificates:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCertificates();

        if (!orgId) return;

        // Setup realtime subscription
        const channel = supabase
            .channel('public:client_certificates_widget')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'client_certificates'
            }, () => {
                fetchCertificates();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orgId]);

    const filteredData = data.filter(item => {
        if (filter === 'criticos') return item.situation === 'Vencido' || item.situation === 'Vence em 30dd';
        if (filter === 'vencidos') return item.situation === 'Vencido';
        if (filter === '30dd') return item.situation === 'Vence em 30dd';
        return true;
    });

    const getStatusStyle = (situation: 'Vencido' | 'Vence em 30dd' | 'Válido') => {
        if (situation === 'Vencido') {
            return 'bg-red-50 text-red-750 border-red-100/80 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
        }
        if (situation === 'Vence em 30dd') {
            return 'bg-amber-50 text-amber-700 border-amber-100/80 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
        }
        return 'bg-emerald-50 text-emerald-700 border-emerald-100/80 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
    };

    const headerActions = (
        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold" onMouseDown={e => e.stopPropagation()}>
            <button
                onClick={() => setFilter('criticos')}
                className={`px-2 py-1 rounded transition-colors ${filter === 'criticos' ? 'bg-white dark:bg-slate-700 text-indigo-650 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
                Críticos ({counts.vencidos + counts.trintaDias})
            </button>
            <button
                onClick={() => setFilter('vencidos')}
                className={`px-2 py-1 rounded transition-colors ${filter === 'vencidos' ? 'bg-white dark:bg-slate-700 text-indigo-650 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
                Vencidos
            </button>
            <button
                onClick={() => setFilter('30dd')}
                className={`px-2 py-1 rounded transition-colors ${filter === '30dd' ? 'bg-white dark:bg-slate-700 text-indigo-650 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
                30d
            </button>
            <button
                onClick={() => setFilter('todos')}
                className={`px-2 py-1 rounded transition-colors ${filter === 'todos' ? 'bg-white dark:bg-slate-700 text-indigo-650 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
                Todos ({counts.total})
            </button>
        </div>
    );

    return (
        <WidgetContainer title="Certificados Digitais" icon={<Award size={14} className="text-indigo-500" />} onRemove={onRemove} headerActions={headerActions}>
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col min-h-0">
                {loading ? (
                    <div className="animate-pulse space-y-3 flex-1">
                        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>)}
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                        <FileWarning size={32} className="mb-2 opacity-30 text-slate-400" />
                        <span className="font-semibold">Tudo em dia!</span>
                        <span>Nenhum certificado para o filtro selecionado.</span>
                    </div>
                ) : (
                    <ul className="space-y-2 pb-2">
                        {filteredData.map((item) => (
                            <li key={item.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all flex justify-between items-center group">
                                <div className="overflow-hidden min-w-0 pr-2">
                                    <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate" title={item.clientName}>
                                        {item.clientName}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                        <span className="bg-slate-200/60 dark:bg-slate-700 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">{item.model}</span>
                                        <span className="truncate">Signatário: {item.signatory}</span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 text-right flex flex-col items-end gap-1">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusStyle(item.situation)}`}>
                                        {item.situation === 'Vence em 30dd' 
                                            ? `${item.daysRemaining === 0 ? 'Expira hoje' : `Expira em ${item.daysRemaining}d`}`
                                            : item.situation}
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-slate-450 dark:text-slate-500">
                                        Venc: {item.expiresAt !== 'Sem validade' 
                                            ? new Date(item.expiresAt + 'T00:00:00').toLocaleDateString('pt-BR') 
                                            : 'Sem validade'}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                
                {/* Consolidado */}
                <div className="shrink-0 px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 rounded-xl flex items-center justify-between mt-auto text-[10px] font-bold">
                    <span className="text-slate-400">Total cadastrados: {counts.total}</span>
                    {counts.vencidos + counts.trintaDias === 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-450">✓ Certificados regulares</span>
                    ) : (
                        <span className="text-red-650 dark:text-red-400">
                            {counts.vencidos + counts.trintaDias} crítico(s)
                        </span>
                    )}
                </div>
            </div>
        </WidgetContainer>
    );
};
