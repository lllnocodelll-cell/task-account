import React, { useState, useEffect, useRef } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { supabase } from '../../utils/supabaseClient';
import { Settings2 } from 'lucide-react';

// Import Widgets
import { StatusByUserWidget } from './widgets/StatusByUserWidget';
import { TopSegmentsWidget } from './widgets/TopSegmentsWidget';
import { UpcomingDeadlinesWidget } from './widgets/UpcomingDeadlinesWidget';
import { TopTasksWidget } from './widgets/TopTasksWidget';
import { DocumentAlertsWidget } from './widgets/DocumentAlertsWidget';
import { ClientStatusWidget } from './widgets/ClientStatusWidget';
import { TaxRegimesWidget } from './widgets/TaxRegimesWidget';
import { LoggedUsersWidget } from './widgets/LoggedUsersWidget';
import { NotifiedExclusionWidget } from './widgets/NotifiedExclusionWidget';
import { CollaboratorsByDeptWidget } from './widgets/CollaboratorsByDeptWidget';
import { UncompletedTasksWidget } from './widgets/UncompletedTasksWidget';
import { MonthlyEvolutionWidget } from './widgets/MonthlyEvolutionWidget';
import { EconomicIndicesWidget } from './widgets/EconomicIndicesWidget';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Registro de todos os widgets disponíveis
export const WIDGET_REGISTRY: Record<string, { name: string, component: React.FC<any>, defaultLayout: any }> = {
    topSegments: {
        name: 'RANKING SEGMENTOS',
        component: TopSegmentsWidget,
        defaultLayout: { i: 'topSegments', x: 0, y: 0, w: 4, h: 9, minW: 3, minH: 6 }
    },
    statusByUser: {
        name: 'MONITOR OPERAÇÃO',
        component: StatusByUserWidget,
        defaultLayout: { i: 'statusByUser', x: 4, y: 0, w: 5, h: 9, minW: 4, minH: 6 }
    },
    upcomingDeadlines: {
        name: 'PRÓXIMOS VENCIMENTOS',
        component: UpcomingDeadlinesWidget,
        defaultLayout: { i: 'upcomingDeadlines', x: 0, y: 9, w: 4, h: 7, minW: 3, minH: 5 }
    },
    topTasks: {
        name: 'RANKING TAREFAS',
        component: TopTasksWidget,
        defaultLayout: { i: 'topTasks', x: 4, y: 9, w: 4, h: 7, minW: 3, minH: 5 }
    },
    documentAlerts: {
        name: 'ALERTAS DE DOCUMENTOS',
        component: DocumentAlertsWidget,
        defaultLayout: { i: 'documentAlerts', x: 8, y: 9, w: 4, h: 7, minW: 3, minH: 4 }
    },
    clientStatus: {
        name: 'STATUS DE CLIENTES',
        component: ClientStatusWidget,
        defaultLayout: { i: 'clientStatus', x: 0, y: 16, w: 3, h: 7, minW: 2, minH: 5 }
    },
    taxRegimes: {
        name: 'MONITOR REGIMES',
        component: TaxRegimesWidget,
        defaultLayout: { i: 'taxRegimes', x: 3, y: 16, w: 4, h: 7, minW: 3, minH: 4 }
    },
    loggedUsers: {
        name: 'USUÁRIOS ONLINE',
        component: LoggedUsersWidget,
        defaultLayout: { i: 'loggedUsers', x: 7, y: 16, w: 5, h: 7, minW: 3, minH: 4 }
    },
    notifiedExclusion: {
        name: 'EXCLUSÃO SIMPLES',
        component: NotifiedExclusionWidget,
        defaultLayout: { i: 'notifiedExclusion', x: 0, y: 23, w: 4, h: 6, minW: 3, minH: 4 }
    },
    collaboratorsByDept: {
        name: 'COLABORADOR POR SETOR',
        component: CollaboratorsByDeptWidget,
        defaultLayout: { i: 'collaboratorsByDept', x: 4, y: 23, w: 4, h: 6, minW: 3, minH: 4 }
    },
    uncompletedTasks: {
        name: 'TAREFAS PENDENTES',
        component: UncompletedTasksWidget,
        defaultLayout: { i: 'uncompletedTasks', x: 8, y: 23, w: 4, h: 7, minW: 3, minH: 5 }
    },
    monthlyEvolution: {
        name: 'EVOLUÇÃO MENSAL',
        component: MonthlyEvolutionWidget,
        defaultLayout: { i: 'monthlyEvolution', x: 0, y: 30, w: 12, h: 9, minW: 4, minH: 6 }
    },
    economicIndices: {
        name: 'ÍNDICES ECONÔMICOS',
        component: EconomicIndicesWidget,
        defaultLayout: { i: 'economicIndices', x: 0, y: 39, w: 6, h: 7, minW: 4, minH: 5 }
    }
};

const DEFAULT_ACTIVE_WIDGETS = [
    'topSegments', 'statusByUser', 'monthlyEvolution',
    'upcomingDeadlines', 'topTasks', 'documentAlerts',
    'clientStatus', 'taxRegimes', 'loggedUsers',
    'notifiedExclusion', 'collaboratorsByDept', 'uncompletedTasks', 'economicIndices'
];

interface DashboardGridProps {
    userId: string;
    role: string;
    orgId?: string;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({ userId, role, orgId }) => {
    const [layouts, setLayouts] = useState<{ [key: string]: any[] }>({ lg: [] });
    const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const OPERACIONAL_ALLOWED_WIDGETS = [
        'upcomingDeadlines', 'documentAlerts', 'taxRegimes', 
        'topTasks', 'uncompletedTasks', 'clientStatus', 
        'notifiedExclusion', 'topSegments', 'monthlyEvolution', 'economicIndices'
    ];

    const allWidgets = Object.keys(WIDGET_REGISTRY).filter(id => 
        role === 'gestor' || OPERACIONAL_ALLOWED_WIDGETS.includes(id)
    );

    const defaultWidgetsForRole = role === 'gestor' 
        ? DEFAULT_ACTIVE_WIDGETS 
        : DEFAULT_ACTIVE_WIDGETS.filter(id => OPERACIONAL_ALLOWED_WIDGETS.includes(id));

    // Fechar menu ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Carregar configurações
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const { data, error } = await supabase
                    .from('user_dashboard_configs')
                    .select('layout, widgets')
                    .eq('user_id', userId)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    const validWidgets = ((data.widgets as string[]) || defaultWidgetsForRole).filter((id: string) => 
                        role === 'gestor' || OPERACIONAL_ALLOWED_WIDGETS.includes(id)
                    );
                    const validLayout = ((data.layout as any[]) || []).filter((l: any) => validWidgets.includes(l.i));
                    setLayouts({ lg: validLayout });
                    setActiveWidgets(validWidgets);
                } else {
                    const defaultLgLayout = defaultWidgetsForRole.map(id => WIDGET_REGISTRY[id].defaultLayout);
                    setLayouts({ lg: defaultLgLayout });
                    setActiveWidgets(defaultWidgetsForRole);

                    // Save default async
                    await supabase.from('user_dashboard_configs').insert({
                        user_id: userId,
                        layout: defaultLgLayout,
                        widgets: defaultWidgetsForRole
                    });
                }
            } catch (err) {
                console.error("Erro ao carregar configs do dash:", err);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            loadConfig();
        }
    }, [userId, role]);

    const saveLayout = async (currentLayout: any[]) => {
        try {
            await supabase
                .from('user_dashboard_configs')
                .upsert({
                    user_id: userId,
                    layout: currentLayout,
                    widgets: activeWidgets,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
        } catch (err) {
            console.error("Erro ao salvar layout:", err);
        }
    };

    const onLayoutChange = (currentLayout: any[]) => {
        setLayouts({ lg: currentLayout });
        saveLayout(currentLayout);
    };

    const toggleWidget = (id: string) => {
        let newWidgets;
        let newLayout = [...layouts.lg];

        if (activeWidgets.includes(id)) {
            newWidgets = activeWidgets.filter(w => w !== id);
            newLayout = newLayout.filter(l => l.i !== id);
        } else {
            newWidgets = [...activeWidgets, id];
            const defaultLayout = WIDGET_REGISTRY[id].defaultLayout;
            let maxY = 0;
            newLayout.forEach(l => {
                if (l.y + l.h > maxY) maxY = l.y + l.h;
            });
            newLayout.push({ ...defaultLayout, y: maxY });
        }

        setActiveWidgets(newWidgets);
        setLayouts({ lg: newLayout });

        supabase.from('user_dashboard_configs').upsert({
            user_id: userId,
            layout: newLayout,
            widgets: newWidgets,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    };

    if (loading) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-slate-200 rounded w-3/4"></div></div></div>;

    return (
        <div className="w-full">
            <style>{`
                .react-grid-item .react-resizable-handle {
                    opacity: 0;
                    transition: opacity 0.2s ease-in-out;
                }
                .react-grid-item:hover .react-resizable-handle {
                    opacity: 1;
                }
                .react-grid-item .react-resizable-handle-se {
                    background-image: none !important;
                    display: flex;
                    align-items: flex-end;
                    justify-content: flex-end;
                    padding-right: 6px;
                    padding-bottom: 6px;
                }
                .react-grid-item .react-resizable-handle-se::after {
                    content: '';
                    width: 10px;
                    height: 10px;
                    border-right: 2px solid #94a3b8;
                    border-bottom: 2px solid #94a3b8;
                    border-bottom-right-radius: 2px;
                }
                .dark .react-grid-item .react-resizable-handle-se::after {
                    border-right-color: #64748b;
                    border-bottom-color: #64748b;
                }
            `}</style>
            <div className="flex justify-end mb-4 relative" ref={menuRef}>
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900 transition-all focus:outline-none"
                    title="Configurar Widgets"
                >
                    <Settings2 size={20} />
                </button>
                {showMenu && (
                    <div className="absolute top-12 right-0 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-2">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Gerenciar Widgets</h3>
                            <p className="text-xs text-slate-500 mt-1">Selecione o que deseja ver no dashboard.</p>
                        </div>
                        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                            {allWidgets.map(id => {
                                const isActive = activeWidgets.includes(id);
                                return (
                                    <button
                                        key={id}
                                        onClick={() => toggleWidget(id)}
                                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                                    >
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                            {WIDGET_REGISTRY[id].name}
                                        </span>
                                        <div className={`w-10 h-5.5 rounded-full flex items-center transition-colors p-1 ${isActive ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${isActive ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <ResponsiveGridLayout
                className="layout"
                layouts={layouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={30}
                onLayoutChange={onLayoutChange}
                draggableHandle=".drag-handle"
                resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']}
                margin={[16, 16]}
            >
                {activeWidgets.map(widgetId => {
                    const widgetConfig = WIDGET_REGISTRY[widgetId];
                    if (!widgetConfig) return null;

                    const WidgetComponent = widgetConfig.component;
                    return (
                        <div key={widgetId}>
                            <WidgetComponent onRemove={() => toggleWidget(widgetId)} orgId={orgId || userId} />
                        </div>
                    );
                })}
            </ResponsiveGridLayout>
        </div>
    );
};
