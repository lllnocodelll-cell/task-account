import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface LoggedUser {
    id: string;
    full_name: string;
    role: string;
    avatar_url: string | null;
    current_session_start: string | null;
    last_active_at: string | null;
}

interface Props {
    orgId?: string; // Opting for optional as orgId might be used for filtering later
    onRemove?: () => void;
}

export const LoggedUsersWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [users, setUsers] = useState<LoggedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const fetchLoggedUsers = async () => {
            try {
                // Consider online if active in the last 15 minutes
                const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

                let query = supabase
                    .from('profiles')
                    .select('id, full_name, role, avatar_url, current_session_start, last_active_at')
                    .not('current_session_start', 'is', null)
                    .gte('last_active_at', fifteenMinutesAgo)
                    .order('last_active_at', { ascending: false });

                if (orgId) {
                    query = query.eq('org_id', orgId);
                }

                const { data, error } = await query;

                if (error) throw error;

                if (data) {
                    setUsers(data as LoggedUser[]);
                }
            } catch (err) {
                console.error('Error fetching logged users:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLoggedUsers();

        // Refresh completely every minute to check who went offline
        const intervalId = setInterval(fetchLoggedUsers, 60000);
        return () => clearInterval(intervalId);
    }, [orgId]);

    // Fast ticker to update the specific "duration" time label
    useEffect(() => {
        const intervalId = setInterval(() => setCurrentTime(Date.now()), 10000); // updates string every 10s
        return () => clearInterval(intervalId);
    }, []);

    const formatDuration = (sessionStartStr: string | null) => {
        if (!sessionStartStr) return 'Recém logado';

        const start = new Date(sessionStartStr).getTime();
        const diffMs = currentTime - start;

        if (diffMs < 0) return 'Recém logado';

        const diffMins = Math.floor(diffMs / (1000 * 60));

        if (diffMins < 60) {
            return `${diffMins} min`;
        }

        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;

        return `${diffHours}h ${remainingMins}m`;
    };

    return (
        <WidgetContainer title="Usuários Online" icon={<Users size={18} />} onRemove={onRemove}>
            <div className="flex-1 flex flex-col p-2 space-y-3 overflow-y-auto w-full">
                {loading ? (
                    <div className="animate-pulse space-y-4 w-full h-full p-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                                <div className="flex-1">
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-1/2 mb-1.5"></div>
                                    <div className="h-3 bg-slate-200 dark:bg-slate-700/30 rounded w-1/3"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm h-full pb-6">
                        Nenhum usuário online agora
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {users.map((user) => (
                            <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="relative">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt={user.full_name || 'Usuário'} className="w-10 h-10 rounded-full object-cover border-2 border-slate-100 dark:border-slate-800" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm border-2 border-slate-100 dark:border-slate-800">
                                            {(user.full_name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                            {user.full_name || 'Usuário Indefinido'}
                                        </p>
                                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full whitespace-nowrap ml-2">
                                            {formatDuration(user.current_session_start)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate">
                                        {user.role === 'gestor' ? 'Gestor' : 'Colaborador'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </WidgetContainer>
    );
};
