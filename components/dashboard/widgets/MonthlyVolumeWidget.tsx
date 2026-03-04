import React, { useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

export const MonthlyVolumeWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [volume, setVolume] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVolume = async () => {
            if (!orgId) return;
            try {
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);

                const { count, error } = await supabase
                    .from('tasks')
                    .select('*', { count: 'exact', head: true })
                    .eq('org_id', orgId)
                    .gte('created_at', startOfMonth.toISOString());

                if (error) throw error;
                if (count !== null) setVolume(count);
            } catch (err) {
                console.error('Error fetching monthly volume:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchVolume();
    }, [orgId]);

    return (
        <WidgetContainer title="Volume Mensal Criado" icon={<Target size={18} />} onRemove={onRemove}>
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                {loading ? (
                    <div className="animate-pulse h-12 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                ) : (
                    <div className="text-5xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                        {volume}
                    </div>
                )}
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center font-medium">
                    Total de Tarefas Criadas<br />no mês atual
                </p>
            </div>
        </WidgetContainer>
    );
};
