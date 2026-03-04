import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Layout } from 'react-grid-layout';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { supabase } from '../../utils/supabaseClient';
import { Plus } from 'lucide-react';

// Import Widgets
import { MonthlyVolumeWidget } from './widgets/MonthlyVolumeWidget';
import { TopSegmentsWidget } from './widgets/TopSegmentsWidget';
import { StatusByUserWidget } from './widgets/StatusByUserWidget';
import { MonthlyEvolutionWidget } from './widgets/MonthlyEvolutionWidget';
import { DailyProductivityWidget } from './widgets/DailyProductivityWidget';
import { UpcomingDeadlinesWidget } from './widgets/UpcomingDeadlinesWidget';
import { TopTasksWidget } from './widgets/TopTasksWidget';
import { DocumentAlertsWidget } from './widgets/DocumentAlertsWidget';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Registro de todos os widgets disponíveis
export const WIDGET_REGISTRY: Record<string, { name: string, component: React.FC<any>, defaultLayout: Layout }> = {
    monthlyVolume: {
        name: 'Volume Mensal',
        component: MonthlyVolumeWidget,
        defaultLayout: { i: 'monthlyVolume', x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 3 }
    },
    topSegments: {
        name: 'Top Segmentos',
        component: TopSegmentsWidget,
        defaultLayout: { i: 'topSegments', x: 3, y: 0, w: 4, h: 9, minW: 3, minH: 6 }
    },
    statusByUser: {
        name: 'Status por Colaborador',
        component: StatusByUserWidget,
        defaultLayout: { i: 'statusByUser', x: 7, y: 0, w: 5, h: 9, minW: 4, minH: 6 }
    },
    monthlyEvolution: {
        name: 'Evolução Mensal',
        component: MonthlyEvolutionWidget,
        defaultLayout: { i: 'monthlyEvolution', x: 0, y: 4, w: 7, h: 8, minW: 4, minH: 6 }
    },
    dailyProductivity: {
        name: 'Produtividade Diária',
        component: DailyProductivityWidget,
        defaultLayout: { i: 'dailyProductivity', x: 7, y: 9, w: 5, h: 8, minW: 3, minH: 6 }
    },
    upcomingDeadlines: {
        name: 'Próximos Vencimentos',
        component: UpcomingDeadlinesWidget,
        defaultLayout: { i: 'upcomingDeadlines', x: 0, y: 12, w: 4, h: 7, minW: 3, minH: 5 }
    },
    topTasks: {
        name: 'Ranking de Tarefas',
        component: TopTasksWidget,
        defaultLayout: { i: 'topTasks', x: 4, y: 12, w: 4, h: 7, minW: 3, minH: 5 }
    },
    documentAlerts: {
        name: 'Alertas de Documentos',
        component: DocumentAlertsWidget,
        defaultLayout: { i: 'documentAlerts', x: 8, y: 17, w: 4, h: 7, minW: 3, minH: 4 }
    }
};

const DEFAULT_ACTIVE_WIDGETS = [
    'monthlyVolume', 'topSegments', 'statusByUser',
    'monthlyEvolution', 'dailyProductivity',
    'upcomingDeadlines', 'topTasks', 'documentAlerts'
];

interface DashboardGridProps {
    userId: string;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({ userId }) => {
    const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({ lg: [] });
    const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const availableWidgets = Object.keys(WIDGET_REGISTRY).filter(id => !activeWidgets.includes(id));

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
                    setLayouts({ lg: data.layout || [] });
                    setActiveWidgets(data.widgets || DEFAULT_ACTIVE_WIDGETS);
                } else {
                    // Initialize with defaults if none exist
                    const defaultLgLayout = DEFAULT_ACTIVE_WIDGETS.map(id => WIDGET_REGISTRY[id].defaultLayout);
                    setLayouts({ lg: defaultLgLayout });
                    setActiveWidgets(DEFAULT_ACTIVE_WIDGETS);

                    // Save default async
                    await supabase.from('user_dashboard_configs').insert({
                        user_id: userId,
                        layout: defaultLgLayout,
                        widgets: DEFAULT_ACTIVE_WIDGETS
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
    }, [userId]);

    const saveLayout = async (currentLayout: Layout[]) => {
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

    const onLayoutChange = (currentLayout: Layout[]) => {
        setLayouts({ lg: currentLayout });
        saveLayout(currentLayout);
    };

    const removeWidget = (id: string) => {
        const newWidgets = activeWidgets.filter(w => w !== id);
        const newLayout = layouts.lg.filter(l => l.i !== id);

        setActiveWidgets(newWidgets);
        setLayouts({ lg: newLayout });

        // Save state
        supabase.from('user_dashboard_configs').upsert({
            user_id: userId,
            layout: newLayout,
            widgets: newWidgets,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    };

    const addWidget = (id: string) => {
        const layout = WIDGET_REGISTRY[id].defaultLayout;
        const newWidgets = [...activeWidgets, id];
        const newLayout = [...layouts.lg, layout];

        setActiveWidgets(newWidgets);
        setLayouts({ lg: newLayout });

        // Save state
        supabase.from('user_dashboard_configs').upsert({
            user_id: userId,
            layout: newLayout,
            widgets: newWidgets,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

        setShowMenu(false);
    };

    if (loading) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-slate-200 rounded w-3/4"></div></div></div>;

    return (
        <div className="w-full">
            <style>{`
                /* Hide handles by default, show on hover */
                .react-grid-item .react-resizable-handle {
                    opacity: 0;
                    transition: opacity 0.2s ease-in-out;
                }
                .react-grid-item:hover .react-resizable-handle {
                    opacity: 1;
                }
                /* Custom SE indicator (bottom-right edge) */
                .react-grid-item .react-resizable-handle-se {
                    background-image: none !important; /* Remove legacy icon */
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
                    border-right: 2px solid #94a3b8; /* slate-400 */
                    border-bottom: 2px solid #94a3b8;
                    border-bottom-right-radius: 2px;
                }
                .dark .react-grid-item .react-resizable-handle-se::after {
                    border-right-color: #64748b; /* slate-500 */
                    border-bottom-color: #64748b;
                }
            `}</style>
            <div className="flex justify-end mb-4 relative" ref={menuRef}>
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
                >
                    <Plus size={18} />
                    Adicionar Widget
                </button>
                {showMenu && (
                    <div className="absolute top-12 right-0 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 py-2">
                        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Widgets Disponíveis</h3>
                        </div>
                        <div className="max-h-64 overflow-y-auto p-2">
                            {availableWidgets.length === 0 ? (
                                <p className="px-2 py-3 text-sm text-slate-500 text-center">Todos os widgets já estão ativos.</p>
                            ) : (
                                availableWidgets.map(id => (
                                    <button
                                        key={id}
                                        onClick={() => addWidget(id)}
                                        className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md transition-colors"
                                    >
                                        {WIDGET_REGISTRY[id].name}
                                    </button>
                                ))
                            )}
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
                            <WidgetComponent onRemove={() => removeWidget(widgetId)} orgId={userId} />
                        </div>
                    );
                })}
            </ResponsiveGridLayout>
        </div>
    );
};
