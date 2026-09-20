import React, { useEffect, useState, useMemo } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  Timer, 
  Zap, 
  Users, 
  Layers, 
  History, 
  Headphones, 
  User, 
  Building2,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';
import { Tooltip } from '../../ui/Tooltip';

interface Props {
  orgId: string;
  onRemove?: () => void;
}

interface SupportSessionItem {
  id: string;
  org_id: string;
  channel_id: string;
  channel_name: string;
  client_id: string | null;
  client_name: string | null;
  sector_id: string | null;
  sector_name: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  resolved_by: string | null;
  resolved_by_name: string;
  opened_at: string;
  resolved_at: string;
  duration_seconds: number;
  duration_formatted: string;
  messages_count: number | null;
  created_at: string;
}

type PeriodFilter = 'today' | '7d' | '30d' | 'all';
type ViewTab = 'operators' | 'sectors' | 'recent';

const formatSeconds = (sec: number): string => {
  if (isNaN(sec) || sec <= 0) return '0s';
  if (sec < 60) return `${Math.round(sec)}s`;
  const totalMins = Math.round(sec / 60);
  if (totalMins < 60) return `${totalMins}m`;
  const hrs = Math.floor(totalMins / 60);
  const remMins = totalMins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
};

const formatRelativeTime = (isoString: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Agora mesmo';
  if (diffSec < 3600) return `há ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `há ${Math.floor(diffSec / 3600)}h`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const AVATAR_COLORS = [
  'bg-blue-500 text-white',
  'bg-emerald-500 text-white',
  'bg-purple-500 text-white',
  'bg-amber-500 text-white',
  'bg-rose-500 text-white',
  'bg-cyan-500 text-white',
  'bg-indigo-500 text-white'
];

const getAvatarColor = (name: string) => {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

export const SupportAttendanceWidget: React.FC<Props> = ({ orgId, onRemove }) => {
  const [sessions, setSessions] = useState<SupportSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [activeTab, setActiveTab] = useState<ViewTab>('operators');

  useEffect(() => {
    const fetchSessions = async () => {
      if (!orgId) return;
      setLoading(true);
      try {
        const { data, error } = await (supabase.from('chat_support_sessions' as any) as any)
          .select('*')
          .eq('org_id', orgId)
          .order('resolved_at', { ascending: false });

        if (error) throw error;
        setSessions((data || []) as SupportSessionItem[]);
      } catch (err) {
        console.error('Erro ao carregar sessões de atendimento:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [orgId]);

  // Filtragem pelo período selecionado
  const filteredSessions = useMemo(() => {
    if (period === 'all') return sessions;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (period === 'today') {
      return sessions.filter(s => new Date(s.resolved_at).getTime() >= startOfToday);
    }

    const days = period === '7d' ? 7 : 30;
    const threshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).getTime();
    return sessions.filter(s => new Date(s.resolved_at).getTime() >= threshold);
  }, [sessions, period]);

  // Métricas agregadas
  const metrics = useMemo(() => {
    const totalCount = filteredSessions.length;
    if (totalCount === 0) {
      return {
        totalCount: 0,
        totalSeconds: 0,
        avgSeconds: 0,
        fastestSeconds: 0
      };
    }

    const totalSeconds = filteredSessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
    const avgSeconds = Math.round(totalSeconds / totalCount);
    const fastestSeconds = Math.min(...filteredSessions.map(s => s.duration_seconds || 0));

    return {
      totalCount,
      totalSeconds,
      avgSeconds,
      fastestSeconds
    };
  }, [filteredSessions]);

  // Agrupamento por operador
  const operatorStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number; totalSeconds: number }>();

    filteredSessions.forEach(s => {
      const name = s.resolved_by_name || 'Operador';
      const existing = map.get(name) || { name, count: 0, totalSeconds: 0 };
      existing.count += 1;
      existing.totalSeconds += s.duration_seconds || 0;
      map.set(name, existing);
    });

    return Array.from(map.values())
      .map(op => ({
        ...op,
        avgSeconds: Math.round(op.totalSeconds / op.count),
        percentage: metrics.totalCount > 0 ? (op.count / metrics.totalCount) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredSessions, metrics.totalCount]);

  // Agrupamento por setor
  const sectorStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number; totalSeconds: number }>();

    filteredSessions.forEach(s => {
      const name = s.sector_name || 'Geral';
      const existing = map.get(name) || { name, count: 0, totalSeconds: 0 };
      existing.count += 1;
      existing.totalSeconds += s.duration_seconds || 0;
      map.set(name, existing);
    });

    return Array.from(map.values())
      .map(sec => ({
        ...sec,
        avgSeconds: Math.round(sec.totalSeconds / sec.count),
        percentage: metrics.totalCount > 0 ? (sec.count / metrics.totalCount) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredSessions, metrics.totalCount]);

  return (
    <WidgetContainer
      title="TEMPO DE ATENDIMENTO"
      icon={<Headphones size={14} className="text-cyan-500" />}
      onRemove={onRemove}
    >
      <div className="flex-1 flex flex-col p-2.5 space-y-3 overflow-hidden w-full">
        
        {/* Top Header: Filtro de Período */}
        <div className="flex items-center justify-between gap-2 shrink-0 pb-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={11} className="text-cyan-500" />
            Período de Análise
          </span>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
            {(['today', '7d', '30d', 'all'] as PeriodFilter[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${
                  period === p
                    ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {p === 'today' ? 'Hoje' : p === '7d' ? '7d' : p === '30d' ? '30d' : 'Geral'}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Cards de KPIs Rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
          {/* TMA */}
          <div className="p-2 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200/50 dark:border-cyan-900/40 flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-400 flex items-center gap-1">
              <Clock size={10} />
              TMA Médio
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm sm:text-base font-black text-cyan-800 dark:text-cyan-300">
                {formatSeconds(metrics.avgSeconds)}
              </span>
            </div>
          </div>

          {/* Total Atendimentos */}
          <div className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={10} />
              Concluídos
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm sm:text-base font-black text-emerald-800 dark:text-emerald-300">
                {metrics.totalCount}
              </span>
              <span className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">sessões</span>
            </div>
          </div>

          {/* Tempo Total */}
          <div className="p-2 rounded-xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-900/40 flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-400 flex items-center gap-1">
              <Timer size={10} />
              Tempo Total
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm sm:text-base font-black text-violet-800 dark:text-violet-300">
                {formatSeconds(metrics.totalSeconds)}
              </span>
            </div>
          </div>

          {/* Mais Rápido */}
          <div className="p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Zap size={10} />
              Mais Ágil
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm sm:text-base font-black text-amber-800 dark:text-amber-300">
                {metrics.totalCount > 0 ? formatSeconds(metrics.fastestSeconds) : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Seletor de Abas Internas */}
        <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-900/60 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-800/80 shrink-0">
          <button
            onClick={() => setActiveTab('operators')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-md text-[10px] font-bold transition-all ${
              activeTab === 'operators'
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Users size={11} className={activeTab === 'operators' ? 'text-cyan-500' : ''} />
            Por Operador
            {operatorStats.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-slate-200/70 dark:bg-slate-700/80 text-[9px] rounded-full">
                {operatorStats.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('sectors')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-md text-[10px] font-bold transition-all ${
              activeTab === 'sectors'
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Layers size={11} className={activeTab === 'sectors' ? 'text-cyan-500' : ''} />
            Por Setor
            {sectorStats.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-slate-200/70 dark:bg-slate-700/80 text-[9px] rounded-full">
                {sectorStats.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-md text-[10px] font-bold transition-all ${
              activeTab === 'recent'
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <History size={11} className={activeTab === 'recent' ? 'text-cyan-500' : ''} />
            Recentes
            {filteredSessions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-slate-200/70 dark:bg-slate-700/80 text-[9px] rounded-full">
                {filteredSessions.length}
              </span>
            )}
          </button>
        </div>

        {/* Conteúdo Dinâmico com Scroll */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {loading ? (
            <div className="animate-pulse space-y-2.5 w-full py-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-full" />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4">
              <div className="w-10 h-10 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-2">
                <Headphones size={20} />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Nenhum atendimento finalizado no período
              </p>
              <p className="text-[11px] text-slate-400 max-w-[220px] mt-0.5">
                Os chamados de suporte concluídos pelos operadores no chat aparecerão aqui automaticamente.
              </p>
            </div>
          ) : activeTab === 'operators' ? (
            /* Visualização por Operador */
            <div className="space-y-2">
              {operatorStats.map(op => (
                <div
                  key={op.name}
                  className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 flex flex-col gap-1.5 transition-colors hover:border-slate-200 dark:hover:border-slate-700/70"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${getAvatarColor(op.name)}`}>
                        {op.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                        {op.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Tooltip content={`Tempo Médio de Atendimento de ${op.name}`} position="top">
                        <div className="flex items-center gap-1 text-[11px] font-black text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-md">
                          <Clock size={10} />
                          TMA: {formatSeconds(op.avgSeconds)}
                        </div>
                      </Tooltip>

                      <div className="text-right">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                          {op.count}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">atend.</span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso Relativo */}
                  <div className="w-full bg-slate-200/70 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, op.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'sectors' ? (
            /* Visualização por Setor */
            <div className="space-y-2">
              {sectorStats.map(sec => (
                <div
                  key={sec.name}
                  className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 flex flex-col gap-1.5 transition-colors hover:border-slate-200 dark:hover:border-slate-700/70"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Layers size={12} />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {sec.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Tooltip content={`Tempo Médio de Atendimento do Setor ${sec.name}`} position="top">
                        <div className="flex items-center gap-1 text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                          <Clock size={10} />
                          TMA: {formatSeconds(sec.avgSeconds)}
                        </div>
                      </Tooltip>

                      <div className="text-right">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                          {sec.count}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">atend.</span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso Relativo */}
                  <div className="w-full bg-slate-200/70 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, sec.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Feed Cronológico das Sessões Recentes */
            <div className="space-y-2">
              {filteredSessions.slice(0, 30).map(s => (
                <div
                  key={s.id}
                  className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 transition-colors hover:border-slate-200 dark:hover:border-slate-700/70"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={12} className="text-slate-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {s.client_name || s.channel_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 truncate">
                        <User size={10} className="text-slate-400" />
                        {s.resolved_by_name}
                      </span>
                      <span>•</span>
                      <span className="truncate">{s.sector_name || 'Geral'}</span>
                      <span>•</span>
                      <span className="text-slate-400/80">{formatRelativeTime(s.resolved_at)}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <span className="px-2 py-1 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-900/40 rounded-lg text-[11px] font-black flex items-center gap-1">
                      <Clock size={11} />
                      {s.duration_formatted || formatSeconds(s.duration_seconds)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </WidgetContainer>
  );
};
