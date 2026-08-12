import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, Info, CheckCircle2, AlertCircle, Award, FileText, Search, X, Layers, ListFilter, ChevronDown, ChevronUp } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

interface CalendarEvent {
    id: string;
    title: string;
    subtitle?: string;
    date: string;
    type: 'task' | 'license' | 'certificate' | 'holiday';
    status?: string;
}

interface GroupedEvent {
    key: string;
    title: string;
    type: 'task' | 'license' | 'certificate' | 'holiday';
    events: CalendarEvent[];
    totalCount: number;
    completedCount: number;
    pendingCount: number;
    progressPercentage: number;
}

export const OperationsCalendarWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [filterType, setFilterType] = useState<string>('all');

    // Estados do Modal de Detalhes
    const [modalSearchQuery, setModalSearchQuery] = useState('');
    const [modalViewMode, setModalViewMode] = useState<'grouped' | 'individual'>('grouped');
    const [modalFilterType, setModalFilterType] = useState<string>('all');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchEvents();
    }, [currentDate, orgId]);

    const fetchEvents = async () => {
        if (!orgId) return;
        setLoading(true);
        try {
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            const startDateStr = startOfMonth.toISOString().split('T')[0];
            const endDateStr = endOfMonth.toISOString().split('T')[0];

            // Fetch Tasks
            const { data: tasks } = await supabase
                .from('tasks')
                .select('id, task_name, client_name, due_date, status')
                .eq('org_id', orgId)
                .gte('due_date', startDateStr)
                .lte('due_date', endDateStr);

            // Fetch Licenses
            const { data: licenses } = await supabase
                .from('client_licenses')
                .select('id, license_name, expiry_date, client_id, clients(company_name)')
                .gte('expiry_date', startDateStr)
                .lte('expiry_date', endDateStr);

            // Fetch Certificates
            const { data: certificates } = await supabase
                .from('client_certificates')
                .select('id, model, expires_at, client_id, clients(company_name)')
                .gte('expires_at', startDateStr)
                .lte('expires_at', endDateStr);

            // Fetch Holidays
            const { data: holidays } = await supabase
                .from('holidays')
                .select('id, name, date')
                .eq('org_id', orgId)
                .gte('date', startDateStr)
                .lte('date', endDateStr);

            const allEvents: CalendarEvent[] = [
                ...(tasks?.map(t => ({
                    id: t.id,
                    title: t.task_name,
                    subtitle: t.client_name,
                    date: t.due_date,
                    type: 'task' as const,
                    status: t.status
                })) || []),
                ...(licenses?.map(l => ({
                    id: l.id,
                    title: l.license_name,
                    subtitle: (l.clients as any)?.company_name || 'Cliente desconhecido',
                    date: l.expiry_date,
                    type: 'license' as const
                })) || []),
                ...(certificates?.map(c => ({
                    id: c.id,
                    title: `Certificado ${c.model}`,
                    subtitle: (c.clients as any)?.company_name || 'Cliente desconhecido',
                    date: c.expires_at,
                    type: 'certificate' as const
                })) || []),
                ...(holidays?.map(h => ({
                    id: h.id,
                    title: h.name,
                    date: h.date,
                    type: 'holiday' as const
                })) || [])
            ];

            setEvents(allEvents);
        } catch (error) {
            console.error('Error fetching calendar events:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });
    const year = currentDate.getFullYear();

    const getEventsForDay = (day: number) => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter(e => {
            const matchesDate = e.date === dateStr;
            const matchesFilter = filterType === 'all' || e.type === filterType;
            return matchesDate && matchesFilter;
        });
    };

    const handleDayClick = (day: number) => {
        setSelectedDay(day);
        setModalSearchQuery('');
        setModalViewMode('grouped');
        setModalFilterType('all');
        setExpandedGroups({});
        setShowDetailModal(true);
    };

    const rawSelectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

    const filteredSelectedEvents = rawSelectedEvents.filter(e => {
        const matchesFilter = modalFilterType === 'all' || e.type === modalFilterType;
        const matchesQuery = !modalSearchQuery || 
            e.title.toLowerCase().includes(modalSearchQuery.toLowerCase()) || 
            (e.subtitle && e.subtitle.toLowerCase().includes(modalSearchQuery.toLowerCase()));
        return matchesFilter && matchesQuery;
    });

    // Lógica de agrupamento por tipo + título para a visão consolidada
    const groupedEventsMap: Record<string, GroupedEvent> = {};
    filteredSelectedEvents.forEach(event => {
        const groupKey = `${event.type}_${event.title}`;
        if (!groupedEventsMap[groupKey]) {
            groupedEventsMap[groupKey] = {
                key: groupKey,
                title: event.title,
                type: event.type,
                events: [],
                totalCount: 0,
                completedCount: 0,
                pendingCount: 0,
                progressPercentage: 0
            };
        }
        groupedEventsMap[groupKey].events.push(event);
        groupedEventsMap[groupKey].totalCount++;
        if (event.status === 'Concluída') {
            groupedEventsMap[groupKey].completedCount++;
        } else {
            groupedEventsMap[groupKey].pendingCount++;
        }
    });

    const groupedEventsList = Object.values(groupedEventsMap).map(group => ({
        ...group,
        progressPercentage: group.totalCount > 0 ? Math.round((group.completedCount / group.totalCount) * 100) : 0
    }));

    const toggleGroupExpand = (key: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    return (
        <WidgetContainer 
            title="CALENDÁRIO OPERACIONAL" 
            icon={<CalendarIcon size={14} />} 
            onRemove={onRemove}
        >
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar pr-1">
                {/* Header do Calendário */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                        <button onClick={prevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                            <ChevronLeft size={16} />
                        </button>
                        <h3 className="text-xs font-bold capitalize text-slate-700 dark:text-slate-200 min-w-[100px] text-center">
                            {monthName} {year}
                        </h3>
                        <button onClick={nextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <select 
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="text-[10px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 outline-none font-medium"
                        >
                            <option value="all">Todos</option>
                            <option value="task">Tarefas</option>
                            <option value="license">Licenças</option>
                            <option value="certificate">Certificados</option>
                            <option value="holiday">Feriados</option>
                        </select>
                    </div>
                </div>

                {/* Dias da Semana */}
                <div className="grid grid-cols-7 mb-1">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                        <div key={d} className="text-[9px] font-bold text-slate-400 text-center uppercase">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Grid do Calendário */}
                <div className="grid grid-cols-7 gap-1 flex-1">
                    {blanks.map(b => <div key={`blank-${b}`} className="aspect-square"></div>)}
                    {days.map(day => {
                        const dayEvents = getEventsForDay(day);
                        const isToday = day === new Date().getDate() && 
                                        currentDate.getMonth() === new Date().getMonth() && 
                                        currentDate.getFullYear() === new Date().getFullYear();
                        
                        return (
                            <button
                                key={day}
                                onClick={() => handleDayClick(day)}
                                className={`relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all border
                                    ${isToday 
                                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'}
                                    ${dayEvents.length > 0 ? 'cursor-pointer' : 'cursor-default'}
                                `}
                            >
                                <span className={`text-xs font-semibold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {day}
                                </span>
                                
                                <div className="flex gap-0.5 mt-1">
                                    {Array.from(new Set(dayEvents.map(e => e.type))).slice(0, 3).map(type => (
                                        <div 
                                            key={type}
                                            className={`w-1.5 h-1.5 rounded-full ${
                                                type === 'task' ? 'bg-blue-500' :
                                                type === 'license' ? 'bg-amber-500' :
                                                type === 'certificate' ? 'bg-emerald-500' :
                                                'bg-slate-400'
                                            }`}
                                        />
                                    ))}
                                    {dayEvents.length > 3 && <span className="text-[8px] text-slate-400">+</span>}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Legenda */}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        <span className="text-[9px] text-slate-500">Tarefas</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                        <span className="text-[9px] text-slate-500">Licenças</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span className="text-[9px] text-slate-500">Certificados</span>
                    </div>
                </div>
            </div>

            {/* Modal de Detalhes Reformulado */}
            {showDetailModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                                        <CalendarIcon size={16} />
                                    </span>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                                        Eventos do dia {selectedDay} de {monthName}
                                    </h4>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5 ml-8">
                                    {rawSelectedEvents.length} {rawSelectedEvents.length === 1 ? 'registro encontrado' : 'registros encontrados'}
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowDetailModal(false)}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Sub-Header Controles: Busca + Alternador de Visão + Filtros */}
                        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 flex flex-col gap-2.5">
                            <div className="flex items-center gap-2">
                                {/* Input de Busca */}
                                <div className="relative flex-1">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por obrigação ou cliente..."
                                        value={modalSearchQuery}
                                        onChange={(e) => setModalSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500 transition-colors"
                                    />
                                    {modalSearchQuery && (
                                        <button onClick={() => setModalSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>

                                {/* Alternador de Visão */}
                                <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                                    <button
                                        onClick={() => setModalViewMode('grouped')}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                                            modalViewMode === 'grouped' 
                                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                        }`}
                                        title="Visão Agrupada por Obrigação"
                                    >
                                        <Layers size={12} />
                                        <span>Agrupado</span>
                                    </button>
                                    <button
                                        onClick={() => setModalViewMode('individual')}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                                            modalViewMode === 'individual' 
                                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                        }`}
                                        title="Visão Lista Individual por Cliente"
                                    >
                                        <ListFilter size={12} />
                                        <span>Individual</span>
                                    </button>
                                </div>
                            </div>

                            {/* Filtro Rápido por Tipo */}
                            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5 text-[11px]">
                                {[
                                    { id: 'all', label: 'Todos' },
                                    { id: 'task', label: 'Tarefas' },
                                    { id: 'license', label: 'Licenças' },
                                    { id: 'certificate', label: 'Certificados' },
                                    { id: 'holiday', label: 'Feriados' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setModalFilterType(tab.id)}
                                        className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                                            modalFilterType === tab.id
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Conteúdo Principal do Modal */}
                        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-3">
                            {filteredSelectedEvents.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <Info className="mx-auto mb-2 opacity-20" size={36} />
                                    <p className="text-xs font-medium">Nenhum evento encontrado para os filtros selecionados.</p>
                                </div>
                            ) : modalViewMode === 'grouped' ? (
                                /* VISÃO AGRUPADA POR TAREFA / OBRIGAÇÃO */
                                <div className="space-y-2.5">
                                    {groupedEventsList.map((group) => {
                                        const isExpanded = !!expandedGroups[group.key];
                                        return (
                                            <div 
                                                key={group.key} 
                                                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm transition-all"
                                            >
                                                {/* Cabeçalho do Grupo (Accordion Header) */}
                                                <div 
                                                    onClick={() => toggleGroupExpand(group.key)}
                                                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors select-none"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                                                        <div className={`p-2 rounded-lg shrink-0 ${
                                                            group.type === 'task' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' :
                                                            group.type === 'license' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' :
                                                            group.type === 'certificate' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' :
                                                            'bg-slate-200 text-slate-600 dark:bg-slate-800'
                                                        }`}>
                                                            {group.type === 'task' && <CheckCircle2 size={16} />}
                                                            {group.type === 'license' && <FileText size={16} />}
                                                            {group.type === 'certificate' && <Award size={16} />}
                                                            {group.type === 'holiday' && <Info size={16} />}
                                                        </div>
                                                        
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                                                    {group.title}
                                                                </h5>
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                                                                    {group.totalCount} {group.totalCount === 1 ? 'cliente' : 'clientes'}
                                                                </span>
                                                            </div>

                                                            {/* Barra de Progresso do Grupo (se for tarefa) */}
                                                            {group.type === 'task' && (
                                                                <div className="flex items-center gap-2 mt-1.5 max-w-xs">
                                                                    <div className="h-1.5 flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                        <div 
                                                                            className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                                                                            style={{ width: `${group.progressPercentage}%` }} 
                                                                        />
                                                                    </div>
                                                                    <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                                                                        {group.completedCount}/{group.totalCount} ({group.progressPercentage}%)
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                                                            {isExpanded ? 'Ocultar' : 'Ver empresas'}
                                                        </span>
                                                        {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                                    </div>
                                                </div>

                                                {/* Sub-lista Expandida de Clientes */}
                                                {isExpanded && (
                                                    <div className="p-3 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 space-y-1.5">
                                                        {group.events.map((evt) => (
                                                            <div 
                                                                key={evt.id} 
                                                                className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 text-xs"
                                                            >
                                                                <span className="font-semibold text-slate-700 dark:text-slate-200 truncate pr-2">
                                                                    {evt.subtitle || 'Cliente não identificado'}
                                                                </span>
                                                                {evt.status && (
                                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                                                                        evt.status === 'Concluída' 
                                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                                                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                                                    }`}>
                                                                        {evt.status}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                /* VISÃO LISTA INDIVIDUAL POR CLIENTE */
                                <div className="space-y-2">
                                    {filteredSelectedEvents.map(event => (
                                        <div 
                                            key={event.id}
                                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                                                event.type === 'task' ? 'bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30' : 
                                                event.type === 'license' ? 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30' :
                                                event.type === 'certificate' ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' :
                                                'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                <div className={`p-1.5 rounded-lg shrink-0 ${
                                                    event.type === 'task' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40' : 
                                                    event.type === 'license' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40' :
                                                    event.type === 'certificate' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' :
                                                    'bg-slate-200 text-slate-600 dark:bg-slate-700'
                                                }`}>
                                                    {event.type === 'task' && <CheckCircle2 size={14} />}
                                                    {event.type === 'license' && <FileText size={14} />}
                                                    {event.type === 'certificate' && <Award size={14} />}
                                                    {event.type === 'holiday' && <Info size={14} />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                                                        {event.title}
                                                    </p>
                                                    {event.subtitle && (
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                            {event.subtitle}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {event.status && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                                                    event.status === 'Concluída' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                }`}>
                                                    {event.status}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer do Modal */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium">
                                {filteredSelectedEvents.length} {filteredSelectedEvents.length === 1 ? 'evento exibido' : 'eventos exibidos'}
                            </span>
                            <button 
                                onClick={() => setShowDetailModal(false)}
                                className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-200 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </WidgetContainer>
    );
};

