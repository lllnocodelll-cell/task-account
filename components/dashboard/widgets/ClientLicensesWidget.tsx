import React, { useEffect, useState } from 'react';
import { ShieldCheck, FileWarning, Search, X, Download } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';
import { Tooltip } from '../../ui/Tooltip';
import { exportToCSV } from '../../../utils/exportUtils';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

type LicenseItem = {
    id: string;
    clientName: string;
    licenseName: string;
    licenseNumber: string;
    expiryDate: string;
    situation: 'Vencido' | 'Vence em 30dd' | 'Válido';
    daysRemaining: number;
};

export const ClientLicensesWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [data, setData] = useState<LicenseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'criticos' | 'vencidos' | '30dd' | 'todos'>('criticos');
    const [searchQuery, setSearchQuery] = useState('');
    const [counts, setCounts] = useState({ total: 0, vencidos: 0, trintaDias: 0, validos: 0 });

    const fetchLicenses = async () => {
        if (!orgId) return;
        setLoading(true);
        try {
            const { data: licenses, error } = await supabase
                .from('client_licenses')
                .select('id, license_name, license_number, expiry_date, clients!inner(id, org_id, company_name, trade_name)')
                .eq('clients.org_id', orgId);

            if (error) throw error;

            if (licenses) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                let total = 0;
                let vencidos = 0;
                let trintaDias = 0;
                let validos = 0;

                const mapped: LicenseItem[] = licenses.map((l: any) => {
                    total++;
                    let situation: 'Vencido' | 'Vence em 30dd' | 'Válido' = 'Válido';
                    let diffDays = 0;

                    if (l.expiry_date) {
                        const expDate = new Date(l.expiry_date + 'T00:00:00');
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
                        situation = 'Vencido';
                        vencidos++;
                        diffDays = -9999;
                    }

                    return {
                        id: l.id,
                        clientName: l.clients?.trade_name || l.clients?.company_name || 'Desconhecido',
                        licenseName: l.license_name || 'Alvará/Licença',
                        licenseNumber: l.license_number || 'Sem número',
                        expiryDate: l.expiry_date || 'Sem validade',
                        situation,
                        daysRemaining: diffDays
                    };
                });

                mapped.sort((a, b) => a.daysRemaining - b.daysRemaining);

                setData(mapped);
                setCounts({ total, vencidos, trintaDias, validos });
            }
        } catch (err) {
            console.error('Error fetching licenses:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLicenses();

        if (!orgId) return;

        const channel = supabase
            .channel('public:client_licenses_widget')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'client_licenses'
            }, () => {
                fetchLicenses();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orgId]);

    const filteredData = data.filter(item => {
        const matchesFilter = 
            filter === 'todos' ? true :
            filter === 'vencidos' ? item.situation === 'Vencido' :
            filter === '30dd' ? item.situation === 'Vence em 30dd' :
            (item.situation === 'Vencido' || item.situation === 'Vence em 30dd');

        const matchesQuery = !searchQuery || 
            item.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.licenseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesFilter && matchesQuery;
    });

    const getStatusStyle = (situation: 'Vencido' | 'Vence em 30dd' | 'Válido') => {
        if (situation === 'Vencido') {
            return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30 font-bold';
        }
        if (situation === 'Vence em 30dd') {
            return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30 font-bold';
        }
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 font-medium';
    };

    const formatBadgeText = (item: LicenseItem) => {
        if (item.daysRemaining === -9999) return 'Sem validade';
        if (item.daysRemaining < 0) return `Vencido há ${Math.abs(item.daysRemaining)}d`;
        if (item.daysRemaining === 0) return 'Validade hoje!';
        if (item.daysRemaining <= 30) return `Vence em ${item.daysRemaining}d`;
        return `Válido (${item.daysRemaining}d)`;
    };

    const handleExportExcel = () => {
        const headers = ['Cliente', 'Nome da Licença', 'Número / Registro', 'Data de Vencimento', 'Situação'];
        const rows = filteredData.map(item => {
            const formattedDate = item.expiryDate !== 'Sem validade' 
                ? new Date(item.expiryDate + 'T00:00:00').toLocaleDateString('pt-BR') 
                : 'Sem validade';
            return [
                item.clientName,
                item.licenseName,
                item.licenseNumber || 'N/A',
                formattedDate,
                formatBadgeText(item)
            ];
        });
        const todayStr = new Date().toISOString().slice(0, 10);
        exportToCSV(`Licencas_e_Alvaras_${todayStr}.csv`, headers, rows);
    };

    const headerActions = (
        <div className="flex items-center gap-1">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold" onMouseDown={e => e.stopPropagation()}>
                <button
                    onClick={() => setFilter('criticos')}
                    className={`px-2 py-1 rounded transition-colors ${filter === 'criticos' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                    Críticos ({counts.vencidos + counts.trintaDias})
                </button>
                <button
                    onClick={() => setFilter('vencidos')}
                    className={`px-2 py-1 rounded transition-colors ${filter === 'vencidos' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                    Vencidos ({counts.vencidos})
                </button>
                <button
                    onClick={() => setFilter('30dd')}
                    className={`px-2 py-1 rounded transition-colors ${filter === '30dd' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                    30d ({counts.trintaDias})
                </button>
                <button
                    onClick={() => setFilter('todos')}
                    className={`px-2 py-1 rounded transition-colors ${filter === 'todos' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                    Todos ({counts.total})
                </button>
            </div>
            <Tooltip content="Exportar para Excel (.csv)" position="top">
                <button
                    onClick={handleExportExcel}
                    disabled={filteredData.length === 0}
                    className="h-6 w-6 flex items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 disabled:opacity-30 transition-all shrink-0"
                >
                    <Download size={12} />
                </button>
            </Tooltip>
        </div>
    );

    return (
        <WidgetContainer title="Licenças e Alvarás" icon={<ShieldCheck size={14} className="text-emerald-500" />} onRemove={onRemove} headerActions={headerActions}>
            <div className="flex-1 flex flex-col min-h-0">
                {/* Campo de Busca Rápida */}
                <div className="mb-2.5 relative shrink-0">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, licença ou número..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500 transition-colors"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* Lista de Licenças */}
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
                    {loading ? (
                        <div className="animate-pulse space-y-2 flex-1">
                            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>)}
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                            <FileWarning size={28} className="mb-1.5 opacity-30 text-slate-400" />
                            <span className="font-semibold text-slate-600 dark:text-slate-300">Nenhuma licença encontrada</span>
                            <span className="text-[11px]">Tente ajustar a busca ou o filtro selecionado.</span>
                        </div>
                    ) : (
                        <ul className="space-y-2 pb-2">
                            {filteredData.map((item) => (
                                <li key={item.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all flex justify-between items-center group">
                                    <div className="overflow-hidden min-w-0 pr-2">
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate" title={item.clientName}>
                                            {item.clientName}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                            <span className="bg-slate-200/70 dark:bg-slate-700 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate max-w-[120px]" title={item.licenseName}>{item.licenseName}</span>
                                            <span className="truncate">Nº: {item.licenseNumber}</span>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 text-right flex flex-col items-end gap-1">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] border uppercase tracking-wider ${getStatusStyle(item.situation)}`}>
                                            {formatBadgeText(item)}
                                        </span>
                                        <span className="text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500">
                                            {item.expiryDate !== 'Sem validade' 
                                                ? new Date(item.expiryDate + 'T00:00:00').toLocaleDateString('pt-BR') 
                                                : 'Sem validade'}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                
                {/* Consolidado */}
                <div className="shrink-0 px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl flex items-center justify-between mt-1 text-[10px] font-bold">
                    <span className="text-slate-400">Total: {counts.total}</span>
                    {counts.vencidos + counts.trintaDias === 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">✓ Todas vigentes</span>
                    ) : (
                        <span className="text-red-600 dark:text-red-400">
                            {counts.vencidos + counts.trintaDias} crítico(s)
                        </span>
                    )}
                </div>
            </div>
        </WidgetContainer>
    );
};

