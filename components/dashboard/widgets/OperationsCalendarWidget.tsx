import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, Info, CheckCircle2, AlertCircle, Award, FileText } from 'lucide-react';
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

export const OperationsCalendarWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [filterType, setFilterType] = useState<string>('all');

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
        setShowDetailModal(true);
    };

    const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

    return (
        <WidgetContainer 
            title="CALENDÁRIO OPERACIONAL" 
            icon={<CalendarIcon size={14} />} 
            onRemove={onRemove}
        >
            <div className="flex flex-col h-full">
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
                            className="text-[10px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 outline-none"
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

            {/* Modal de Detalhes (Simples implementação via portal ou condicional) */}
            {showDetailModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100">
                                Eventos do dia {selectedDay} de {monthName}
                            </h4>
                            <button 
                                onClick={() => setShowDetailModal(false)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full"
                            >
                                <ChevronRight className="rotate-45" size={20} />
                            </button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {selectedDayEvents.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <Info className="mx-auto mb-2 opacity-20" size={32} />
                                    <p className="text-sm">Nenhum evento para este dia.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedDayEvents.map(event => (
                                        <div 
                                            key={event.id}
                                            className={`p-3 rounded-xl border flex items-start gap-3
                                                ${event.type === 'task' ? 'bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30' : 
                                                  event.type === 'license' ? 'bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30' :
                                                  event.type === 'certificate' ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' :
                                                  'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700'}
                                            `}
                                        >
                                            <div className={`p-2 rounded-lg ${
                                                event.type === 'task' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40' : 
                                                event.type === 'license' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40' :
                                                event.type === 'certificate' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' :
                                                'bg-slate-200 text-slate-600 dark:bg-slate-700'
                                            }`}>
                                                {event.type === 'task' && <CheckCircle2 size={16} />}
                                                {event.type === 'license' && <FileText size={16} />}
                                                {event.type === 'certificate' && <Award size={16} />}
                                                {event.type === 'holiday' && <Info size={16} />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                                                    {event.title}
                                                </p>
                                                {event.subtitle && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                        {event.subtitle}
                                                    </p>
                                                )}
                                                {event.status && (
                                                    <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                                        event.status === 'Concluída' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                                                    }`}>
                                                        {event.status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-center">
                            <button 
                                onClick={() => setShowDetailModal(false)}
                                className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
                            >
                                Fechar Detalhes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </WidgetContainer>
    );
};
