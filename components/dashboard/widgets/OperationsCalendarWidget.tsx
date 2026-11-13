import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  Award,
  FileText,
  Search,
  X,
  Layers,
  ListFilter,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';
import { Tooltip } from '../../ui/Tooltip';

interface Props {
  orgId: string;
  onRemove?: () => void;
}

type EventType = 'task' | 'license' | 'certificate' | 'holiday';
type FilterType = 'all' | EventType;
type DayTone = 'overdue' | 'completed' | 'alert' | 'open' | 'holiday' | 'empty';

interface CalendarEvent {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
  type: EventType;
  status?: string;
}

interface GroupedEvent {
  key: string;
  title: string;
  type: EventType;
  events: CalendarEvent[];
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  progressPercentage: number;
}

interface DaySummary {
  total: number;
  taskTotal: number;
  taskCompleted: number;
  overdueCount: number;
  docAlertCount: number;
  holidayCount: number;
  completionPct: number;
  tone: DayTone;
}

const EVENT_TYPE_META: Record<
  EventType,
  {
    label: string;
    shortLabel: string;
    dotClass: string;
    iconBgClass: string;
    barBgClass: string;
    cardClass: string;
    Icon: React.FC<{ size?: number; className?: string }>;
  }
> = {
  task: {
    label: 'Tarefas',
    shortLabel: 'Tarefas',
    dotClass: 'bg-indigo-500',
    iconBgClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
    barBgClass: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    cardClass: 'bg-indigo-50/40 border-indigo-100 dark:bg-indigo-500/5 dark:border-indigo-500/20',
    Icon: CheckCircle2
  },
  license: {
    label: 'Licenças',
    shortLabel: 'Licenças',
    dotClass: 'bg-amber-500',
    iconBgClass: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    barBgClass: 'bg-amber-500/10 dark:bg-amber-500/15',
    cardClass: 'bg-amber-50/40 border-amber-100 dark:bg-amber-500/5 dark:border-amber-500/20',
    Icon: FileText
  },
  certificate: {
    label: 'Certificados',
    shortLabel: 'Cert.',
    dotClass: 'bg-emerald-500',
    iconBgClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    barBgClass: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    cardClass: 'bg-emerald-50/40 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/20',
    Icon: Award
  },
  holiday: {
    label: 'Feriados',
    shortLabel: 'Feriados',
    dotClass: 'bg-slate-400 dark:bg-slate-500',
    iconBgClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    barBgClass: 'bg-slate-500/10 dark:bg-slate-500/15',
    cardClass: 'bg-slate-50 border-slate-200/70 dark:bg-slate-800/40 dark:border-slate-700/60',
    Icon: Info
  }
};

const DAY_TONE_META: Record<DayTone, { barClass: string; badgeClass: string; trackerClass: string }> = {
  overdue: {
    barClass: 'bg-rose-500',
    badgeClass: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
    trackerClass: 'bg-rose-500'
  },
  completed: {
    barClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    trackerClass: 'bg-emerald-500'
  },
  alert: {
    barClass: 'bg-amber-500',
    badgeClass: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    trackerClass: 'bg-amber-500'
  },
  open: {
    barClass: 'bg-indigo-500',
    badgeClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
    trackerClass: 'bg-indigo-500'
  },
  holiday: {
    barClass: 'bg-slate-400 dark:bg-slate-500',
    badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    trackerClass: 'bg-slate-400 dark:bg-slate-500'
  },
  empty: {
    barClass: 'bg-slate-200 dark:bg-slate-800',
    badgeClass: '',
    trackerClass: 'bg-slate-200/80 dark:bg-slate-800/80'
  }
};

const FILTER_OPTIONS: { id: FilterType; label: string; shortLabel: string }[] = [
  { id: 'all', label: 'Todos', shortLabel: 'Todos' },
  { id: 'task', label: 'Tarefas', shortLabel: 'Tarefas' },
  { id: 'license', label: 'Licenças', shortLabel: 'Licenças' },
  { id: 'certificate', label: 'Certificados', shortLabel: 'Cert.' },
  { id: 'holiday', label: 'Feriados', shortLabel: 'Feriados' }
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const formatDateStr = (year: number, monthIndex: number, day: number): string =>
  `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const getStatusPillClass = (status?: string): string => {
  if (status === 'Concluída') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30';
  }
  if (status === 'Atrasada') {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30';
  }
  if (status === 'Iniciada') {
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30';
  }
  return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30';
};

export const OperationsCalendarWidget: React.FC<Props> = ({ orgId, onRemove }) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');

  // Estados do Modal de Detalhes
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalViewMode, setModalViewMode] = useState<'grouped' | 'individual'>('grouped');
  const [modalFilterType, setModalFilterType] = useState<FilterType>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isModalExpanded, setIsModalExpanded] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const today = new Date();
  const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const isCurrentMonthView =
    currentYear === today.getFullYear() && currentMonth === today.getMonth();

  const fetchEvents = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const daysCount = new Date(currentYear, currentMonth + 1, 0).getDate();
      const startDateStr = formatDateStr(currentYear, currentMonth, 1);
      const endDateStr = formatDateStr(currentYear, currentMonth, daysCount);

      const [tasksRes, licensesRes, certificatesRes, holidaysRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, task_name, client_name, due_date, status')
          .eq('org_id', orgId)
          .gte('due_date', startDateStr)
          .lte('due_date', endDateStr),
        supabase
          .from('client_licenses')
          .select('id, license_name, expiry_date, client_id, clients(company_name)')
          .gte('expiry_date', startDateStr)
          .lte('expiry_date', endDateStr),
        supabase
          .from('client_certificates')
          .select('id, model, expires_at, client_id, clients(company_name)')
          .gte('expires_at', startDateStr)
          .lte('expires_at', endDateStr),
        supabase
          .from('holidays')
          .select('id, name, date')
          .eq('org_id', orgId)
          .gte('date', startDateStr)
          .lte('date', endDateStr)
      ]);

      const allEvents: CalendarEvent[] = [
        ...(tasksRes.data?.map(t => ({
          id: t.id,
          title: t.task_name,
          subtitle: t.client_name,
          date: t.due_date,
          type: 'task' as const,
          status: t.status
        })) || []),
        ...(licensesRes.data?.map(l => ({
          id: l.id,
          title: l.license_name,
          subtitle: (l.clients as any)?.company_name || 'Cliente desconhecido',
          date: l.expiry_date,
          type: 'license' as const
        })) || []),
        ...(certificatesRes.data?.map(c => ({
          id: c.id,
          title: `Certificado ${c.model}`,
          subtitle: (c.clients as any)?.company_name || 'Cliente desconhecido',
          date: c.expires_at,
          type: 'certificate' as const
        })) || []),
        ...(holidaysRes.data?.map(h => ({
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
  }, [orgId, currentYear, currentMonth]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!showDetailModal) {
      setIsModalExpanded(false);
      return;
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDetailModal(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showDetailModal]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);
  const blanks = useMemo(() => Array.from({ length: firstDay }, (_, i) => i), [firstDay]);
  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });

  const prevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  const jumpToToday = () => setCurrentDate(new Date());

  const filteredMonthEvents = useMemo(
    () => (filterType === 'all' ? events : events.filter(e => e.type === filterType)),
    [events, filterType]
  );

  // Indexa eventos e estatísticas por dia
  const dayDataMap = useMemo(() => {
    const map: Record<number, { events: CalendarEvent[]; summary: DaySummary }> = {};

    for (let d = 1; d <= daysInMonth; d++) {
      map[d] = {
        events: [],
        summary: {
          total: 0,
          taskTotal: 0,
          taskCompleted: 0,
          overdueCount: 0,
          docAlertCount: 0,
          holidayCount: 0,
          completionPct: 0,
          tone: 'empty'
        }
      };
    }

    filteredMonthEvents.forEach(evt => {
      const parts = evt.date?.split('-');
      if (!parts || parts.length !== 3) return;
      const dayNum = parseInt(parts[2], 10);
      if (!map[dayNum]) return;

      const entry = map[dayNum];
      entry.events.push(evt);
      entry.summary.total++;

      if (evt.type === 'task') {
        entry.summary.taskTotal++;
        if (evt.status === 'Concluída') {
          entry.summary.taskCompleted++;
        } else if (evt.status === 'Atrasada' || evt.date < todayStr) {
          entry.summary.overdueCount++;
        }
      } else if (evt.type === 'license' || evt.type === 'certificate') {
        entry.summary.docAlertCount++;
      } else if (evt.type === 'holiday') {
        entry.summary.holidayCount++;
      }
    });

    for (let d = 1; d <= daysInMonth; d++) {
      const s = map[d].summary;
      if (s.total === 0) {
        s.tone = 'empty';
      } else if (s.overdueCount > 0) {
        s.tone = 'overdue';
      } else if (s.taskTotal > 0 && s.taskCompleted === s.taskTotal && s.docAlertCount === 0) {
        s.tone = 'completed';
      } else if (s.docAlertCount > 0) {
        s.tone = 'alert';
      } else if (s.taskTotal > 0) {
        s.tone = 'open';
      } else {
        s.tone = 'holiday';
      }
      s.completionPct =
        s.taskTotal > 0
          ? Math.round((s.taskCompleted / s.taskTotal) * 100)
          : s.tone === 'completed'
            ? 100
            : 0;
    }

    return map;
  }, [filteredMonthEvents, daysInMonth, todayStr]);

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    setModalSearchQuery('');
    setModalViewMode('grouped');
    setModalFilterType(filterType);
    setExpandedGroups({});
    setShowDetailModal(true);
  };

  // Dados para o Modal do dia selecionado (sempre usa todos os eventos do dia para permitir alternar filtro no modal)
  const rawSelectedEvents = useMemo(() => {
    if (!selectedDay) return [];
    const dateStr = formatDateStr(currentYear, currentMonth, selectedDay);
    return events.filter(e => e.date === dateStr);
  }, [selectedDay, events, currentYear, currentMonth]);

  const filteredSelectedEvents = useMemo(
    () =>
      rawSelectedEvents.filter(e => {
        const matchesFilter = modalFilterType === 'all' || e.type === modalFilterType;
        const query = modalSearchQuery.trim().toLowerCase();
        const matchesQuery =
          !query ||
          e.title.toLowerCase().includes(query) ||
          (e.subtitle && e.subtitle.toLowerCase().includes(query));
        return matchesFilter && matchesQuery;
      }),
    [rawSelectedEvents, modalFilterType, modalSearchQuery]
  );

  const groupedEventsList: GroupedEvent[] = useMemo(() => {
    const groupedMap: Record<string, GroupedEvent> = {};
    filteredSelectedEvents.forEach(event => {
      const groupKey = `${event.type}_${event.title}`;
      if (!groupedMap[groupKey]) {
        groupedMap[groupKey] = {
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
      groupedMap[groupKey].events.push(event);
      groupedMap[groupKey].totalCount++;
      if (event.status === 'Concluída') {
        groupedMap[groupKey].completedCount++;
      } else {
        groupedMap[groupKey].pendingCount++;
      }
    });

    return Object.values(groupedMap)
      .map(group => ({
        ...group,
        progressPercentage:
          group.totalCount > 0 ? Math.round((group.completedCount / group.totalCount) * 100) : 0
      }))
      .sort((a, b) => b.totalCount - a.totalCount);
  }, [filteredSelectedEvents]);

  const maxGroupCount = useMemo(
    () => Math.max(...groupedEventsList.map(g => g.totalCount), 1),
    [groupedEventsList]
  );

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
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar pr-0.5 space-y-2.5">
        {/* Linha 1: Navegação do Mês + Botão Hoje */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-0.5 bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/70 p-0.5 rounded-lg">
            <Tooltip content="Mês anterior" position="top">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 hover:bg-white dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md transition-colors"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={14} />
              </button>
            </Tooltip>
            <h3 className="text-[11px] font-bold capitalize text-slate-700 dark:text-slate-200 min-w-[96px] text-center px-1 select-none">
              {monthName} {currentYear}
            </h3>
            <Tooltip content="Próximo mês" position="top">
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 hover:bg-white dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md transition-colors"
                aria-label="Próximo mês"
              >
                <ChevronRight size={14} />
              </button>
            </Tooltip>
          </div>

          {!isCurrentMonthView && (
            <Tooltip content="Voltar para o mês atual" position="top">
              <button
                type="button"
                onClick={jumpToToday}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 text-[10px] font-bold transition-colors shrink-0"
              >
                <RotateCcw size={10} />
                <span>Hoje</span>
              </button>
            </Tooltip>
          )}
        </div>

        {/* Linha 2: Filtro em Pills (sem select nativo) */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100/80 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200/70 dark:border-slate-800">
          {FILTER_OPTIONS.map(opt => {
            const isActive = filterType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilterType(opt.id)}
                className={`flex-1 min-w-[46px] px-1.5 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/70 dark:border-slate-700'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                }`}
              >
                {opt.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Dias da Semana */}
        <div className="grid grid-cols-7 gap-1 pt-0.5">
          {WEEKDAYS.map(d => (
            <div
              key={d}
              className="text-[9px] font-bold text-slate-400 dark:text-slate-500 text-center uppercase tracking-wider"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grade do Calendário */}
        <div className="grid grid-cols-7 gap-1 flex-1 min-h-[175px]">
          {blanks.map(b => (
            <div key={`blank-${b}`} className="min-h-[34px]" />
          ))}

          {loading
            ? days.map(day => (
                <div
                  key={`skel-${day}`}
                  className="min-h-[34px] rounded-lg bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-200/50 dark:border-slate-800"
                />
              ))
            : days.map(day => {
                const entry = dayDataMap[day];
                const summary = entry.summary;
                const toneStyle = DAY_TONE_META[summary.tone];
                const dateStr = formatDateStr(currentYear, currentMonth, day);
                const isToday = dateStr === todayStr;

                const tooltipContent =
                  summary.total === 0 ? (
                    <span>Dia {day} · Sem eventos</span>
                  ) : (
                    <div className="space-y-0.5 text-left">
                      <div className="font-bold flex items-center justify-between gap-3">
                        <span>
                          {String(day).padStart(2, '0')}/{String(currentMonth + 1).padStart(2, '0')}
                        </span>
                        <span className="tabular-nums text-indigo-300">
                          {summary.total} {summary.total === 1 ? 'registro' : 'registros'}
                        </span>
                      </div>
                      {summary.taskTotal > 0 && (
                        <div className="text-slate-300 tabular-nums">
                          Tarefas: {summary.taskCompleted}/{summary.taskTotal} ({summary.completionPct}%)
                        </div>
                      )}
                      {summary.overdueCount > 0 && (
                        <div className="text-rose-300 font-semibold tabular-nums">
                          {summary.overdueCount} em atraso
                        </div>
                      )}
                      {summary.docAlertCount > 0 && (
                        <div className="text-amber-300 tabular-nums">
                          {summary.docAlertCount} venc. documento(s)
                        </div>
                      )}
                    </div>
                  );

                return (
                  <Tooltip key={day} content={tooltipContent} position="top" className="w-full h-full">
                    <button
                      type="button"
                      onClick={() => handleDayClick(day)}
                      className={`w-full h-full min-h-[34px] rounded-lg border p-1 flex flex-col justify-between transition-all cursor-pointer select-none ${
                        isToday
                          ? 'bg-indigo-50/70 dark:bg-indigo-500/15 border-indigo-400 dark:border-indigo-500/60 ring-1 ring-indigo-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full gap-0.5 leading-none">
                        <span
                          className={`text-[10.5px] font-bold tabular-nums ${
                            isToday
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {day}
                        </span>
                        {summary.total > 0 && (
                          <span
                            className={`text-[9px] font-black px-1 py-0.5 leading-none rounded tabular-nums ${toneStyle.badgeClass}`}
                          >
                            {summary.total}
                          </span>
                        )}
                      </div>

                      <div className="w-full h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-1">
                        {summary.total > 0 && (
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${toneStyle.barClass}`}
                            style={{
                              width: `${
                                summary.taskTotal > 0 ? Math.max(summary.completionPct, 18) : 100
                              }%`
                            }}
                          />
                        )}
                      </div>
                    </button>
                  </Tooltip>
                );
              })}
        </div>

        {/* Tremor Tracker: Termômetro Diário do Mês */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 shrink-0">
          <div className="flex items-center justify-between text-[9.5px] text-slate-400 dark:text-slate-500 font-medium">
            <span>Visão diária do mês</span>
            <span className="tabular-nums">01 → {String(daysInMonth).padStart(2, '0')}</span>
          </div>
          <div className="flex items-center gap-0.5 h-3.5">
            {days.map(day => {
              const summary = dayDataMap[day].summary;
              const toneStyle = DAY_TONE_META[summary.tone];
              const isToday = formatDateStr(currentYear, currentMonth, day) === todayStr;
              const trackerTip =
                summary.total === 0
                  ? `Dia ${day}: sem eventos`
                  : `Dia ${day}: ${summary.total} evento(s)${
                      summary.taskTotal > 0 ? ` · ${summary.completionPct}% concluído` : ''
                    }`;

              return (
                <Tooltip key={`trk-${day}`} content={trackerTip} position="top" className="flex-1 h-full">
                  <button
                    type="button"
                    onClick={() => handleDayClick(day)}
                    aria-label={trackerTip}
                    className={`w-full h-full rounded-[2px] transition-transform hover:scale-y-125 cursor-pointer ${toneStyle.trackerClass} ${
                      isToday ? 'ring-1 ring-slate-700 dark:ring-white' : ''
                    }`}
                  />
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quadro de Detalhes: contido nos limites do widget ou expandido via Portal */}
      {showDetailModal && (() => {
        const detailOverlay = (
          <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200 ${
              isModalExpanded
                ? 'p-3 sm:p-6 bg-slate-950/60'
                : 'no-drag p-2 sm:p-3 bg-slate-900/50'
            }`}
            onClick={() => setShowDetailModal(false)}
            onMouseDown={e => e.stopPropagation()}
          >
            <div
              className={`bg-white dark:bg-slate-900 w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-200 ${
                isModalExpanded
                  ? 'rounded-2xl max-w-3xl max-h-[88vh]'
                  : 'rounded-xl max-w-full max-h-full'
              }`}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
            >
              {/* Header do Modal (alinhado à tipografia do WidgetContainer) */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shrink-0 shadow-sm text-slate-500 dark:text-slate-400 flex items-center mt-0.5">
                    <CalendarIcon size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-col min-w-0">
                      <h4 className="text-[10px] sm:text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-[0.18em] sm:tracking-[0.25em] uppercase leading-none truncate">
                        Eventos do dia {selectedDay} de {monthName}
                      </h4>
                      <div className="h-0.5 w-4 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1 rounded-full" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1.5 tabular-nums">
                      {rawSelectedEvents.length}{' '}
                      {rawSelectedEvents.length === 1 ? 'registro encontrado' : 'registros encontrados'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Tooltip
                    content={isModalExpanded ? 'Reduzir para o widget' : 'Expandir para tela maior'}
                    position="bottom"
                  >
                    <button
                      type="button"
                      onClick={() => setIsModalExpanded(prev => !prev)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                      aria-label={isModalExpanded ? 'Reduzir para o widget' : 'Expandir para tela maior'}
                    >
                      {isModalExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                    </button>
                  </Tooltip>
                  <Tooltip content="Fechar (Esc)" position="left">
                    <button
                      type="button"
                      onClick={() => setShowDetailModal(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                      aria-label="Fechar modal"
                    >
                      <X size={16} />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* Sub-Header: Busca + Alternador de Visão + Filtros */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/60 flex flex-col gap-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por obrigação ou cliente..."
                      value={modalSearchQuery}
                      onChange={e => setModalSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-8 py-1.5 text-xs bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 transition-colors"
                    />
                    {modalSearchQuery && (
                      <Tooltip content="Limpar busca" position="top">
                        <button
                          type="button"
                          onClick={() => setModalSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X size={12} />
                        </button>
                      </Tooltip>
                    )}
                  </div>

                  {/* Alternador de Visão */}
                  <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/70 dark:border-slate-700 shrink-0">
                    <Tooltip content="Visão Agrupada por Obrigação" position="top">
                      <button
                        type="button"
                        onClick={() => setModalViewMode('grouped')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                          modalViewMode === 'grouped'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <Layers size={12} />
                        <span>Agrupado</span>
                      </button>
                    </Tooltip>
                    <Tooltip content="Visão Lista Individual por Cliente" position="top">
                      <button
                        type="button"
                        onClick={() => setModalViewMode('individual')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                          modalViewMode === 'individual'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <ListFilter size={12} />
                        <span>Individual</span>
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {/* Filtro Rápido por Tipo */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5 text-[11px]">
                  {FILTER_OPTIONS.map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setModalFilterType(tab.id)}
                      className={`px-2.5 py-1 rounded-full whitespace-nowrap font-semibold transition-all ${
                        modalFilterType === tab.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
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
                  <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                    <Info className="mx-auto mb-2 opacity-30" size={36} />
                    <p className="text-xs font-medium">
                      Nenhum evento encontrado para os filtros selecionados.
                    </p>
                  </div>
                ) : modalViewMode === 'grouped' ? (
                  /* VISÃO AGRUPADA ESTILO TREMOR BARLIST */
                  <div className="space-y-2.5">
                    {groupedEventsList.map(group => {
                      const isExpanded = !!expandedGroups[group.key];
                      const meta = EVENT_TYPE_META[group.type];
                      const TypeIcon = meta.Icon;
                      const barWidth = Math.round((group.totalCount / maxGroupCount) * 100);

                      return (
                        <div
                          key={group.key}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-all"
                        >
                          <div
                            onClick={() => toggleGroupExpand(group.key)}
                            className="relative p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors select-none overflow-hidden"
                          >
                            {/* Barra de volume proporcional ao fundo (Tremor BarList) */}
                            <div
                              className={`absolute inset-y-0 left-0 pointer-events-none transition-all duration-300 ${meta.barBgClass}`}
                              style={{ width: `${barWidth}%` }}
                            />

                            <div className="relative flex items-center gap-3 min-w-0 flex-1 pr-2">
                              <div className={`p-2 rounded-lg shrink-0 ${meta.iconBgClass}`}>
                                <TypeIcon size={16} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                    {group.title}
                                  </h5>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100/90 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700 shrink-0 tabular-nums">
                                    {group.totalCount}{' '}
                                    {group.totalCount === 1 ? 'cliente' : 'clientes'}
                                  </span>
                                </div>

                                {group.type === 'task' && (
                                  <div className="flex items-center gap-2 mt-1.5 max-w-xs">
                                    <div className="h-1.5 flex-1 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                        style={{ width: `${group.progressPercentage}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                                      {group.completedCount}/{group.totalCount} (
                                      {group.progressPercentage}%)
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="relative flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                                {isExpanded ? 'Ocultar' : 'Ver empresas'}
                              </span>
                              {isExpanded ? (
                                <ChevronUp size={16} className="text-slate-400" />
                              ) : (
                                <ChevronDown size={16} className="text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Sub-lista Expandida de Clientes */}
                          {isExpanded && (
                            <div className="p-3 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-1.5">
                              {group.events.map(evt => (
                                <div
                                  key={evt.id}
                                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs"
                                >
                                  <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                                    {evt.subtitle || 'Cliente não identificado'}
                                  </span>
                                  {evt.status && (
                                    <span
                                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${getStatusPillClass(
                                        evt.status
                                      )}`}
                                    >
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
                    {filteredSelectedEvents.map(event => {
                      const meta = EVENT_TYPE_META[event.type];
                      const TypeIcon = meta.Icon;

                      return (
                        <div
                          key={event.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${meta.cardClass}`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={`p-1.5 rounded-lg shrink-0 ${meta.iconBgClass}`}>
                              <TypeIcon size={14} />
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
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${getStatusPillClass(
                                event.status
                              )}`}
                            >
                              {event.status}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer do Modal */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                  {filteredSelectedEvents.length}{' '}
                  {filteredSelectedEvents.length === 1 ? 'evento exibido' : 'eventos exibidos'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-200 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
        return isModalExpanded && typeof document !== 'undefined'
          ? createPortal(detailOverlay, document.body)
          : detailOverlay;
      })()}
    </WidgetContainer>
  );
};
