import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { supabase } from '../../utils/supabaseClient';
import { Settings2, LayoutGrid, X, GripVertical, FolderHeart, ChevronDown, Plus, Trash2, Edit3 } from 'lucide-react';

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
import { OperationsCalendarWidget } from './widgets/OperationsCalendarWidget';
import { ClientCertificatesWidget } from './widgets/ClientCertificatesWidget';
import { ClientLicensesWidget } from './widgets/ClientLicensesWidget';

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
    },
    operationsCalendar: {
        name: 'CALENDÁRIO OPERACIONAL',
        component: OperationsCalendarWidget,
        defaultLayout: { i: 'operationsCalendar', x: 0, y: 46, w: 3, h: 10, minW: 3, minH: 7 }
    },
    clientCertificates: {
        name: 'VENCIMENTO CERTIFICADOS',
        component: ClientCertificatesWidget,
        defaultLayout: { i: 'clientCertificates', x: 0, y: 56, w: 6, h: 7, minW: 3, minH: 5 }
    },
    clientLicenses: {
        name: 'VENCIMENTO LICENÇAS',
        component: ClientLicensesWidget,
        defaultLayout: { i: 'clientLicenses', x: 6, y: 56, w: 6, h: 7, minW: 3, minH: 5 }
    }
};

const DEFAULT_ACTIVE_WIDGETS = [
    'topSegments', 'statusByUser', 'monthlyEvolution',
    'upcomingDeadlines', 'topTasks', 'documentAlerts',
    'clientStatus', 'taxRegimes', 'loggedUsers',
    'notifiedExclusion', 'collaboratorsByDept', 'uncompletedTasks', 'economicIndices', 'operationsCalendar',
    'clientCertificates', 'clientLicenses'
];

interface DashboardGridProps {
    userId: string;
    role: string;
    orgId?: string;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({ userId, role, orgId }) => {
    // Cenários de widgets
    const [scenarios, setScenarios] = useState<Record<string, { widgets: string[], layout: { [key: string]: any[] } }>>({
        "Principal": { widgets: [], layout: { lg: [] } }
    });
    const [activeScenario, setActiveScenario] = useState<string>("Principal");
    
    // UI control
    const [loading, setLoading] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showNewScenarioModal, setShowNewScenarioModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [newScenarioName, setNewScenarioName] = useState("");
    const [renameScenarioName, setRenameScenarioName] = useState("");

    const scenarioDropdownRef = useRef<HTMLDivElement>(null);

    const OPERACIONAL_ALLOWED_WIDGETS = [
        'upcomingDeadlines', 'documentAlerts', 'taxRegimes', 
        'topTasks', 'uncompletedTasks', 'clientStatus', 
        'notifiedExclusion', 'topSegments', 'monthlyEvolution', 'economicIndices', 'operationsCalendar',
        'clientCertificates', 'clientLicenses'
    ];

    const allWidgets = Object.keys(WIDGET_REGISTRY).filter(id => 
        role === 'gestor' || OPERACIONAL_ALLOWED_WIDGETS.includes(id)
    );

    const defaultWidgetsForRole = role === 'gestor' 
        ? DEFAULT_ACTIVE_WIDGETS 
        : DEFAULT_ACTIVE_WIDGETS.filter(id => OPERACIONAL_ALLOWED_WIDGETS.includes(id));

    // Computar activeWidgets e layouts do cenário ativo atual
    const currentScenario = scenarios[activeScenario] || { widgets: [], layout: { lg: [] } };
    const activeWidgets = currentScenario.widgets;
    const layouts = currentScenario.layout;

    // Fechar dropdown de cenários ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (scenarioDropdownRef.current && !scenarioDropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Carregar configurações do Supabase
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
                    
                    let loadedScenarios: Record<string, { widgets: string[], layout: { [key: string]: any[] } }> = {};
                    let loadedActiveScenario = "Principal";

                    if (data.layout) {
                        const rawLayout = data.layout as any;
                        if (rawLayout.activeScenario && rawLayout.scenarios) {
                            // Formato novo de múltiplos cenários
                            loadedActiveScenario = rawLayout.activeScenario;
                            Object.keys(rawLayout.scenarios).forEach(name => {
                                const sc = rawLayout.scenarios[name];
                                const scWidgets = (sc.widgets as string[] || []).filter(id => 
                                    role === 'gestor' || OPERACIONAL_ALLOWED_WIDGETS.includes(id)
                                );
                                
                                const scLayout: { [key: string]: any[] } = {};
                                if (sc.layout && typeof sc.layout === 'object' && !Array.isArray(sc.layout)) {
                                    Object.keys(sc.layout).forEach(bp => {
                                        if (Array.isArray(sc.layout[bp])) {
                                            scLayout[bp] = sc.layout[bp].filter(l => scWidgets.includes(l.i));
                                        }
                                    });
                                } else if (Array.isArray(sc.layout)) {
                                    scLayout.lg = sc.layout.filter(l => scWidgets.includes(l.i));
                                }

                                loadedScenarios[name] = {
                                    widgets: scWidgets,
                                    layout: scLayout
                                };
                            });
                        } else {
                            // Formato antigo: converter para cenário "Principal"
                            let loadedLayouts: { [key: string]: any[] } = { lg: [] };
                            if (Array.isArray(rawLayout)) {
                                const validLg = rawLayout.filter((l: any) => validWidgets.includes(l.i));
                                loadedLayouts = { lg: validLg };
                            } else if (typeof rawLayout === 'object') {
                                Object.keys(rawLayout).forEach(breakpoint => {
                                    if (Array.isArray(rawLayout[breakpoint])) {
                                        loadedLayouts[breakpoint] = rawLayout[breakpoint].filter((l: any) => 
                                            validWidgets.includes(l.i)
                                        );
                                    }
                                });
                            }
                            
                            loadedScenarios = {
                                "Principal": {
                                    widgets: validWidgets,
                                    layout: loadedLayouts
                                }
                            };
                            loadedActiveScenario = "Principal";
                        }
                    } else {
                        // Sem layout salvo no banco
                        const defaultLgLayout = defaultWidgetsForRole.map(id => WIDGET_REGISTRY[id].defaultLayout);
                        loadedScenarios = {
                            "Principal": {
                                widgets: defaultWidgetsForRole,
                                layout: { lg: defaultLgLayout }
                            }
                        };
                        loadedActiveScenario = "Principal";
                    }

                    if (Object.keys(loadedScenarios).length === 0) {
                        const defaultLgLayout = defaultWidgetsForRole.map(id => WIDGET_REGISTRY[id].defaultLayout);
                        loadedScenarios = {
                            "Principal": {
                                widgets: defaultWidgetsForRole,
                                layout: { lg: defaultLgLayout }
                            }
                        };
                        loadedActiveScenario = "Principal";
                    }

                    setScenarios(loadedScenarios);
                    setActiveScenario(loadedActiveScenario);
                } else {
                    // Sem dados salvos
                    const defaultLgLayout = defaultWidgetsForRole.map(id => WIDGET_REGISTRY[id].defaultLayout);
                    const initialScenarios = {
                        "Principal": {
                            widgets: defaultWidgetsForRole,
                            layout: { lg: defaultLgLayout }
                        }
                    };
                    setScenarios(initialScenarios);
                    setActiveScenario("Principal");

                    // Salva padrão assincronamente
                    await supabase.from('user_dashboard_configs').insert({
                        user_id: userId,
                        layout: { activeScenario: "Principal", scenarios: initialScenarios } as any,
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

    const saveScenarios = async (
        allScenarios: Record<string, { widgets: string[], layout: { [key: string]: any[] } }>,
        activeName: string
    ) => {
        try {
            await supabase
                .from('user_dashboard_configs')
                .upsert({
                    user_id: userId,
                    layout: { activeScenario: activeName, scenarios: allScenarios } as any,
                    widgets: allScenarios[activeName]?.widgets || [],
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
        } catch (err) {
            console.error("Erro ao salvar cenários:", err);
        }
    };

    const onLayoutChange = (currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
        const updatedScenarios = {
            ...scenarios,
            [activeScenario]: {
                ...scenarios[activeScenario],
                layout: allLayouts
            }
        };
        setScenarios(updatedScenarios);
        saveScenarios(updatedScenarios, activeScenario);
    };

    const toggleWidget = (id: string) => {
        const currentScenario = scenarios[activeScenario];
        let newWidgets;
        let newLayouts = { ...currentScenario.layout };

        if (currentScenario.widgets.includes(id)) {
            newWidgets = currentScenario.widgets.filter(w => w !== id);
            // Remover o widget de todos os breakpoints
            Object.keys(newLayouts).forEach(bp => {
                if (Array.isArray(newLayouts[bp])) {
                    newLayouts[bp] = newLayouts[bp].filter(l => l.i !== id);
                }
            });
        } else {
            newWidgets = [...currentScenario.widgets, id];
            const defaultLayout = WIDGET_REGISTRY[id].defaultLayout;
            
            // Garantir que o breakpoint lg exista
            if (!newLayouts.lg) {
                newLayouts.lg = [];
            }
            
            // Adicionar o widget a todos os breakpoints existentes no estado
            Object.keys(newLayouts).forEach(bp => {
                if (Array.isArray(newLayouts[bp])) {
                    let maxY = 0;
                    newLayouts[bp].forEach(l => {
                        if (l.y + l.h > maxY) maxY = l.y + l.h;
                    });
                    
                    // Ajustar largura para breakpoints menores se necessário
                    const bpCols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }[bp as 'lg'|'md'|'sm'|'xs'|'xxs'] || 12;
                    const w = Math.min(defaultLayout.w, bpCols);
                    
                    newLayouts[bp] = [...newLayouts[bp], { ...defaultLayout, w, y: maxY }];
                }
            });
        }

        const updatedScenarios = {
            ...scenarios,
            [activeScenario]: {
                widgets: newWidgets,
                layout: newLayouts
            }
        };
        setScenarios(updatedScenarios);
        saveScenarios(updatedScenarios, activeScenario);
    };

    const handleCreateScenario = () => {
        const name = newScenarioName.trim();
        if (!name || scenarios[name]) return;

        const updatedScenarios = {
            ...scenarios,
            [name]: {
                widgets: [...scenarios[activeScenario].widgets],
                layout: JSON.parse(JSON.stringify(scenarios[activeScenario].layout))
            }
        };

        setScenarios(updatedScenarios);
        setActiveScenario(name);
        setShowNewScenarioModal(false);
        saveScenarios(updatedScenarios, name);
    };

    const handleRenameScenario = () => {
        const newName = renameScenarioName.trim();
        if (!newName || newName === activeScenario || scenarios[newName]) {
            if (newName === activeScenario) setShowRenameModal(false);
            return;
        }

        const updatedScenarios = { ...scenarios };
        updatedScenarios[newName] = updatedScenarios[activeScenario];
        delete updatedScenarios[activeScenario];

        setScenarios(updatedScenarios);
        setActiveScenario(newName);
        setShowRenameModal(false);
        saveScenarios(updatedScenarios, newName);
    };

    const handleDeleteScenario = (nameToDelete: string) => {
        if (Object.keys(scenarios).length <= 1) return;

        const updatedScenarios = { ...scenarios };
        delete updatedScenarios[nameToDelete];

        let nextActive = activeScenario;
        if (activeScenario === nameToDelete) {
            nextActive = Object.keys(updatedScenarios)[0];
        }

        setScenarios(updatedScenarios);
        setActiveScenario(nextActive);
        saveScenarios(updatedScenarios, nextActive);
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
            <div className="flex items-center justify-end gap-2 mb-4">
                {/* Seletor de Cenários */}
                <div className="relative" ref={scenarioDropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900 transition-all focus:outline-none"
                    >
                        <FolderHeart size={16} className="text-indigo-500" />
                        <span>Cenário: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{activeScenario}</strong></span>
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Cenários Disponíveis
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                {Object.keys(scenarios).map(name => (
                                    <div
                                        key={name}
                                        className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                                            name === activeScenario
                                                ? 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                                        }`}
                                        onClick={() => {
                                            setActiveScenario(name);
                                            setIsDropdownOpen(false);
                                            saveScenarios(scenarios, name);
                                        }}
                                    >
                                        <span className="truncate pr-2">{name}</span>
                                        {Object.keys(scenarios).length > 1 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteScenario(name);
                                                }}
                                                className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                title="Excluir cenário"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-1 mt-1">
                                <button
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        setShowRenameModal(true);
                                        setRenameScenarioName(activeScenario);
                                    }}
                                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                                >
                                    <Edit3 size={14} className="text-slate-400" />
                                    Renomear Cenário
                                </button>
                                <button
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        setShowNewScenarioModal(true);
                                        setNewScenarioName("");
                                    }}
                                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 font-semibold transition-colors"
                                >
                                    <Plus size={14} />
                                    Novo Cenário
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setShowMenu(true)}
                    className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900 transition-all focus:outline-none"
                    title="Configurar Widgets"
                >
                    <Settings2 size={20} />
                </button>
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

            {/* Modal para criar novo cenário */}
            {showNewScenarioModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
                        <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 tracking-[0.2em] uppercase mb-4">
                            Criar Novo Cenário
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                            O novo cenário será criado como uma cópia das posições e widgets ativos do cenário atual ("{activeScenario}").
                        </p>
                        <input
                            type="text"
                            value={newScenarioName}
                            onChange={(e) => setNewScenarioName(e.target.value)}
                            placeholder="Nome do cenário (ex: Operação)"
                            className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-800 dark:text-slate-200 mb-6"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 text-xs font-semibold">
                            <button
                                onClick={() => setShowNewScenarioModal(false)}
                                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateScenario}
                                disabled={!newScenarioName.trim() || !!scenarios[newScenarioName.trim()]}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Criar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para renomear cenário */}
            {showRenameModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
                        <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 tracking-[0.2em] uppercase mb-4">
                            Renomear Cenário
                        </h3>
                        <input
                            type="text"
                            value={renameScenarioName}
                            onChange={(e) => setRenameScenarioName(e.target.value)}
                            placeholder="Novo nome do cenário"
                            className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-800 dark:text-slate-200 mb-6"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 text-xs font-semibold">
                            <button
                                onClick={() => setShowRenameModal(false)}
                                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-slate-650 dark:text-slate-400 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRenameScenario}
                                disabled={!renameScenarioName.trim() || (renameScenarioName.trim() !== activeScenario && !!scenarios[renameScenarioName.trim()])}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <WidgetManagerDrawer
                isOpen={showMenu}
                onClose={() => setShowMenu(false)}
                allWidgets={allWidgets}
                activeWidgets={activeWidgets}
                toggleWidget={toggleWidget}
            />
        </div>
    );
};

interface WidgetManagerDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    allWidgets: string[];
    activeWidgets: string[];
    toggleWidget: (id: string) => void;
}

const WidgetManagerDrawer: React.FC<WidgetManagerDrawerProps> = ({
    isOpen,
    onClose,
    allWidgets,
    activeWidgets,
    toggleWidget
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    // Estado para a ordem dos widgets
    const [widgetsOrder, setWidgetsOrder] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('widget_manager_drawer_order');
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error("Erro ao carregar ordem dos widgets no drawer:", e);
        }
        return allWidgets;
    });

    const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
    const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);
    const [draggableWidgetId, setDraggableWidgetId] = useState<string | null>(null);

    // Sincronizar widgetsOrder se novos widgets forem incluídos
    useEffect(() => {
        if (allWidgets.length > 0) {
            setWidgetsOrder(prev => {
                const missing = allWidgets.filter(w => !prev.includes(w));
                if (missing.length > 0) {
                    const newOrder = [...prev, ...missing];
                    localStorage.setItem('widget_manager_drawer_order', JSON.stringify(newOrder));
                    return newOrder;
                }
                return prev;
            });
        }
    }, [allWidgets]);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            const timer = setTimeout(() => setIsVisible(true), 10);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    const handleTransitionEnd = () => {
        if (!isVisible) setShouldRender(false);
    };

    const getDragProps = (widgetId: string) => {
        return {
            draggable: draggableWidgetId === widgetId,
            onDragStart: (e: React.DragEvent) => {
                setDraggedWidgetId(widgetId);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', widgetId);
            },
            onDragEnd: () => {
                setDraggedWidgetId(null);
                setDragOverWidgetId(null);
                setDraggableWidgetId(null);
            },
            onDragOver: (e: React.DragEvent) => {
                e.preventDefault();
                if (draggedWidgetId && draggedWidgetId !== widgetId) {
                    setDragOverWidgetId(widgetId);
                }
            },
            onDragLeave: () => {
                if (dragOverWidgetId === widgetId) {
                    setDragOverWidgetId(null);
                }
            },
            onDrop: () => {
                if (draggedWidgetId && draggedWidgetId !== widgetId) {
                    const currentOrder = [...widgetsOrder];
                    // Garantir que todos de allWidgets estão incluídos antes de calcular indexes
                    allWidgets.forEach(w => {
                        if (!currentOrder.includes(w)) {
                            currentOrder.push(w);
                        }
                    });
                    const fromIndex = currentOrder.indexOf(draggedWidgetId);
                    const toIndex = currentOrder.indexOf(widgetId);
                    const newOrder = [...currentOrder];
                    newOrder.splice(fromIndex, 1);
                    newOrder.splice(toIndex, 0, draggedWidgetId);
                    setWidgetsOrder(newOrder);
                    localStorage.setItem('widget_manager_drawer_order', JSON.stringify(newOrder));
                }
                setDraggedWidgetId(null);
                setDragOverWidgetId(null);
                setDraggableWidgetId(null);
            }
        };
    };

    const getWidgetWrapperClass = (widgetId: string, isActive: boolean) => {
        const isDragged = draggedWidgetId === widgetId;
        const isDragOver = dragOverWidgetId === widgetId;
        return `w-full flex items-start justify-between p-4 rounded-xl border transition-all duration-200 select-none ${
            isDragged ? 'opacity-35 border-dashed border-indigo-500 scale-[0.98]' :
            isDragOver ? 'border-indigo-500 scale-[1.01] shadow-md bg-indigo-50/5 dark:bg-indigo-500/5' :
            isActive 
                ? 'bg-indigo-50/10 dark:bg-indigo-950/10 border-indigo-100/80 dark:border-indigo-950/60 hover:bg-indigo-50/20' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50/50 hover:border-slate-300'
        }`;
    };

    const renderDragHandle = (widgetId: string) => (
        <div
            className="cursor-grab active:cursor-grabbing p-1.5 text-slate-400 hover:text-indigo-500 rounded transition-colors mr-2 shrink-0 self-center"
            onMouseDown={() => setDraggableWidgetId(widgetId)}
            onMouseUp={() => setDraggableWidgetId(null)}
        >
            <GripVertical size={14} />
        </div>
    );

    if (!shouldRender) return null;

    // Ordenar allWidgets com base no widgetsOrder
    const sortedWidgets = [...allWidgets].sort((a, b) => {
        const indexA = widgetsOrder.indexOf(a);
        const indexB = widgetsOrder.indexOf(b);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    return createPortal(
        <>
            {/* Backdrop */}
            <div 
                className={`fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[9998] transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />
            
            {/* Drawer */}
            <div 
                onTransitionEnd={handleTransitionEnd}
                className={`fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl z-[9999] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25, 0.1, 0.25, 1)] border-l border-slate-200 dark:border-slate-800 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
                            <LayoutGrid size={18} className="text-slate-500 dark:text-slate-400" />
                        </div>
                        <div className="flex flex-col text-left">
                            <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                                Gerenciar Widgets
                            </h1>
                            <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850 rounded-full transition-all duration-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-1">
                        Selecione quais cartões e relatórios deseja visualizar em sua área de trabalho. Arraste-os pelo ícone de grip para reordenar suas posições de exibição nesta listagem.
                    </p>
                    <div className="space-y-3">
                        {sortedWidgets.map(id => {
                            const isActive = activeWidgets.includes(id);
                            
                            // Descrição em português para cada widget
                            const getWidgetDescription = (widgetId: string) => {
                                switch (widgetId) {
                                    case 'topSegments': return 'Gráfico dos segmentos industriais e de serviços com maior representatividade.';
                                    case 'statusByUser': return 'Monitor em tempo real de tarefas concluídas, pendentes e em andamento.';
                                    case 'upcomingDeadlines': return 'Listagem ordenada com os prazos de obrigações fiscais prestes a vencer.';
                                    case 'topTasks': return 'Classificação e progresso de tarefas concluídas por colaborador.';
                                    case 'documentAlerts': return 'Central de notificações de documentos pendentes, aceitos ou rejeitados.';
                                    case 'clientStatus': return 'Gráfico consolidado de clientes Ativos, Suspensos e Inativos.';
                                    case 'taxRegimes': return 'Distribuição tributária entre Simples Nacional, Lucro Presumido e Real.';
                                    case 'loggedUsers': return 'Painel de monitoramento de colaboradores conectados no momento.';
                                    case 'notifiedExclusion': return 'Alertas críticos de exclusão de regime tributário detectados pelo sistema.';
                                    case 'collaboratorsByDept': return 'Distribuição dos membros operacionais por setores contábeis.';
                                    case 'uncompletedTasks': return 'Métricas e contadores de tarefas em atraso ou não finalizadas.';
                                    case 'monthlyEvolution': return 'Evolução e histórico das guias emitidas e finalizadas mês a mês.';
                                    case 'economicIndices': return 'Índices econômicos e financeiros vigentes (IPCA, SELIC, INCC, etc.).';
                                    case 'operationsCalendar': return 'Visão em formato de calendário de obrigações operacionais agendadas.';
                                    default: return 'Painel informativo customizável.';
                                }
                            };

                            return (
                                <div
                                    key={id}
                                    {...getDragProps(id)}
                                    className={getWidgetWrapperClass(id, isActive)}
                                >
                                    {renderDragHandle(id)}
                                    <div 
                                        className="flex-1 flex items-start justify-between cursor-pointer"
                                        onClick={() => toggleWidget(id)}
                                    >
                                        <div className="flex flex-col text-left pr-4">
                                            <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                                {WIDGET_REGISTRY[id].name}
                                            </span>
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                                                {getWidgetDescription(id)}
                                            </span>
                                        </div>
                                        <div className={`w-10 h-5.5 rounded-full flex items-center transition-colors p-1 shrink-0 mt-0.5 ${isActive ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${isActive ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};
