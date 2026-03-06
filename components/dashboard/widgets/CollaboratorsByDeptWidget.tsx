import React, { useEffect, useState } from 'react';
import { UsersRound, Briefcase, Code, Megaphone, Headset, Calculator, FileText, ChevronRight, Scale, BookOpen } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

// Mapa de estilos e ícones para setores comuns
const DEPT_STYLES: Record<string, { color: string, bg: string, icon: any }> = {
    'Desenvolvimento': { color: 'text-indigo-500', bg: 'bg-indigo-500', icon: Code },
    'Marketing': { color: 'text-pink-500', bg: 'bg-pink-500', icon: Megaphone },
    'Vendas': { color: 'text-emerald-500', bg: 'bg-emerald-500', icon: Briefcase },
    'Atendimento': { color: 'text-sky-500', bg: 'bg-sky-500', icon: Headset },
    'Contabilidade': { color: 'text-amber-500', bg: 'bg-amber-500', icon: Calculator },
    'Administrativo': { color: 'text-slate-500', bg: 'bg-slate-500', icon: FileText },
    'Financeiro': { color: 'text-teal-500', bg: 'bg-teal-500', icon: Scale },
    'Recursos Humanos': { color: 'text-violet-500', bg: 'bg-violet-500', icon: UsersRound },
    'Sem Setor': { color: 'text-slate-400', bg: 'bg-slate-400', icon: BookOpen },
    'Outros': { color: 'text-primary-500', bg: 'bg-primary-500', icon: ChevronRight }
};

export const CollaboratorsByDeptWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [data, setData] = useState<{ sectorName: string, count: number, percent: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCollaboratorsByDept = async () => {
            if (!orgId) return;
            try {
                // Busca os membros da organização e faz o join na tabela sectors
                const { data: membersData, error } = await supabase
                    .from('members')
                    .select(`
                        id,
                        status,
                        sectors (
                            name
                        )
                    `)
                    .eq('org_id', orgId);

                if (error) throw error;

                if (membersData) {
                    const counts: Record<string, number> = {};
                    let totalValids = 0;

                    membersData.forEach((member: any) => {
                        // Considera todos os membros (ativos ou inativos)
                        let sectorName = 'Sem Setor';
                        if (member.sectors?.name) {
                            sectorName = member.sectors.name;
                        }

                        counts[sectorName] = (counts[sectorName] || 0) + 1;
                        totalValids++;
                    });

                    // Converter map para array e ordenar pelo número de colaboradores
                    let result = Object.keys(counts).map(sector => ({
                        sectorName: sector,
                        count: counts[sector],
                        percent: totalValids > 0 ? (counts[sector] / totalValids) * 100 : 0
                    }));

                    result.sort((a, b) => b.count - a.count);

                    setData(result);
                }
            } catch (err) {
                console.error('Error fetching collaborators by department:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCollaboratorsByDept();
    }, [orgId]);

    return (
        <WidgetContainer title="Colaboradores por Setor" icon={<UsersRound size={18} className="text-indigo-500" />} onRemove={onRemove}>
            <div className="flex-1 w-full h-full p-2 lg:p-4">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 h-full">
                        <div className="w-16 h-16 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-indigo-500 animate-spin"></div>
                        <div className="text-sm text-slate-400 font-medium animate-pulse">Buscando equipe...</div>
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-3 h-full">
                        <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                            <UsersRound size={24} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <span className="font-medium text-slate-500">Nenhum membro cadastrado na equipe</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {data.map((item, index) => {
                            // Encontrar o estilo, caso não ache, pega uma cor baseada no index ou "Outros"
                            const styleKeys = Object.keys(DEPT_STYLES);
                            let style = DEPT_STYLES[item.sectorName];

                            // Fallback dinâmico para setores não mapeados
                            if (!style) {
                                const fallbackIndex = index % (styleKeys.length - 2); // Exclui Sem Setor e Outros da rotação
                                style = DEPT_STYLES[styleKeys[fallbackIndex]] || DEPT_STYLES['Outros'];
                            }

                            const Icon = style.icon;

                            return (
                                <div key={index} className="flex flex-col p-3 rounded-xl bg-slate-50 hover:bg-white dark:bg-slate-800/40 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 ${style.color}`}>
                                                <Icon size={14} />
                                            </div>
                                            <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                                                {item.sectorName}
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="font-bold text-slate-800 dark:text-white text-base">
                                                {item.count}
                                            </span>
                                            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                                                ({item.percent.toFixed(1)}%)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Barra de progresso visual */}
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
