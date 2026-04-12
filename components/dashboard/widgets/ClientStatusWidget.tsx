import React, { useEffect, useState } from 'react';
import { Users, UserCheck, UserMinus } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

export const ClientStatusWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [stats, setStats] = useState({ total: 0, ativos: 0, inativos: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClientsStatus = async () => {
            if (!orgId) return;
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .select('status')
                    .eq('org_id', orgId);

                if (error) throw error;

                if (data) {
                    const ativos = data.filter(c => c.status === 'Ativo').length;
                    const inativos = data.filter(c => c.status === 'Inativo').length;

                    setStats({
                        total: data.length,
                        ativos,
                        inativos
                    });
                }
            } catch (err) {
                console.error('Error fetching clients status:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchClientsStatus();
    }, [orgId]);

    return (
        <WidgetContainer title="STATUS DE CLIENTES" icon={<Users size={14} />} onRemove={onRemove}>
            <div className="flex-1 flex flex-col justify-center p-2 space-y-6">
                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 w-full">
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-md">
                                    <Users size={18} />
                                </div>
                                <span className="font-medium text-sm text-slate-700 dark:text-slate-300">Total</span>
                            </div>
                            <span className="text-lg font-bold text-slate-900 dark:text-white">{stats.total}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100/50 dark:border-emerald-800/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-md">
                                    <UserCheck size={18} />
                                </div>
                                <span className="font-medium text-sm text-emerald-700 dark:text-emerald-400">Ativos</span>
                            </div>
                            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{stats.ativos}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100/50 dark:border-rose-800/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-md">
                                    <UserMinus size={18} />
                                </div>
                                <span className="font-medium text-sm text-rose-700 dark:text-rose-400">Inativos</span>
                            </div>
                            <span className="text-lg font-bold text-rose-700 dark:text-rose-400">{stats.inativos}</span>
                        </div>
                    </div>
                )}
            </div>
        </WidgetContainer>
    );
};
