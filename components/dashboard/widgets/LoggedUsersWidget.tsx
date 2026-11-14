import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Users,
  Wifi,
  WifiOff,
  Clock,
  Search,
  X,
  Eye,
  EyeOff,
  Briefcase,
} from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';
import { Tooltip } from '../../ui/Tooltip';
import { Input } from '../../ui/Input';

interface ProfileRow {
  id: string;
  full_name: string | null;
  role: string;
  job_title: string | null;
  avatar_url: string | null;
  chat_status: string | null;
  current_session_start: string | null;
  last_active_at: string | null;
  accumulated_active_seconds_today: number | null;
  last_active_day: string | null;
  email: string | null;
}

interface MemberRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  status: string | null;
  role: string | null;
  sector_id: string | null;
  sector_ids: string[] | null;
}

interface SectorRow {
  id: string;
  name: string;
}

type StatusFilter = 'all' | 'online' | 'offline';
type PresenceStatusKey = 'disponível' | 'ocupado' | 'ausente' | 'almoço' | 'férias' | 'offline';

interface TeamMemberPresence {
  id: string;
  fullName: string;
  roleLabel: string;
  jobTitle: string | null;
  sectorNames: string[];
  avatarUrl: string | null;
  isOnline: boolean;
  effectiveStatus: PresenceStatusKey;
  lastActiveMs: number | null;
  currentSessionStartMs: number | null;
  todayActiveSeconds: number;
}

interface Props {
  orgId?: string;
  onRemove?: () => void;
}

const ONLINE_THRESHOLD_MS = 15 * 60 * 1000;
const MIN_VALID_TIMESTAMP_MS = new Date('2000-01-01T00:00:00Z').getTime();
const STORAGE_KEY_SHOW_CARDS = 'widget_logged_users_show_cards';

const STATUS_META: Record<
  PresenceStatusKey,
  { label: string; dotClass: string; badgeClass: string }
> = {
  disponível: {
    label: 'Online',
    dotClass: 'bg-emerald-500',
    badgeClass:
      'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-500/30',
  },
  ocupado: {
    label: 'Ocupado',
    dotClass: 'bg-rose-500',
    badgeClass:
      'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-500/30',
  },
  ausente: {
    label: 'Ausente',
    dotClass: 'bg-amber-500',
    badgeClass:
      'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200/80 dark:border-amber-500/30',
  },
  almoço: {
    label: 'Almoço',
    dotClass: 'bg-blue-500',
    badgeClass:
      'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200/80 dark:border-blue-500/30',
  },
  férias: {
    label: 'Férias',
    dotClass: 'bg-teal-500',
    badgeClass:
      'bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-200/80 dark:border-teal-500/30',
  },
  offline: {
    label: 'Offline',
    dotClass: 'bg-slate-400 dark:bg-slate-500',
    badgeClass:
      'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  },
};

function parseValidTimestamp(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < MIN_VALID_TIMESTAMP_MS) return null;
  return ms;
}

function getTodayDateStringBR(nowMs: number): string {
  return new Date(nowMs).toLocaleDateString('pt-BR');
}

function isSameLocalDay(ms: number, refMs: number): boolean {
  const a = new Date(ms);
  const b = new Date(refMs);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDurationSeconds(totalSeconds: number): string {
  const mins = Math.floor(Math.max(0, totalSeconds) / 60);
  if (mins < 1) return 'Recém logado';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

function formatLastSeenShort(lastActiveMs: number | null, nowMs: number): string {
  if (!lastActiveMs) return 'Desconectado';
  const diffMs = Math.max(0, nowMs - lastActiveMs);
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return diffMins <= 1 ? 'há 1 min' : `há ${diffMins} min`;
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24 && isSameLocalDay(lastActiveMs, nowMs)) {
    return `há ${diffHours}h`;
  }

  const yesterdayMs = nowMs - 24 * 60 * 60 * 1000;
  const timeStr = new Date(lastActiveMs).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isSameLocalDay(lastActiveMs, yesterdayMs)) {
    return `Ontem, ${timeStr}`;
  }

  const dateStr = new Date(lastActiveMs).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
  return `${dateStr} · ${timeStr}`;
}

function formatFullDateTimeBR(ms: number): string {
  return new Date(ms).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeStatusKey(raw: string | null | undefined): PresenceStatusKey {
  const norm = (raw || 'disponível').trim().toLowerCase();
  if (norm === 'ocupado' || norm === 'ausente' || norm === 'almoço' || norm === 'férias' || norm === 'offline') {
    return norm;
  }
  return 'disponível';
}

function normalizeName(name: string | null | undefined): string {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export const LoggedUsersWidget: React.FC<Props> = ({ orgId, onRemove }) => {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [sectors, setSectors] = useState<SectorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showCards, setShowCards] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHOW_CARDS);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleShowCards = () => {
    setShowCards((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_SHOW_CARDS, String(next));
      } catch {
        // Ignora erro de cota do storage
      }
      return next;
    });
  };

  const fetchTeamPresence = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setFetchError(null);
    try {
      let profilesQuery = (supabase
        .from('profiles')
        .select(
          'id, full_name, role, job_title, avatar_url, chat_status, current_session_start, last_active_at, accumulated_active_seconds_today, last_active_day, email'
        ) as any)
        .neq('role', 'cliente');

      if (orgId) {
        profilesQuery = profilesQuery.eq('org_id', orgId);
      }

      const membersPromise = orgId
        ? supabase
            .from('members')
            .select('id, first_name, last_name, email, status, role, sector_id, sector_ids')
            .eq('org_id', orgId)
            .neq('role', 'cliente')
        : Promise.resolve({ data: [] as MemberRow[], error: null });

      const sectorsPromise = orgId
        ? supabase.from('sectors').select('id, name').eq('org_id', orgId)
        : Promise.resolve({ data: [] as SectorRow[], error: null });

      const [profilesRes, membersRes, sectorsRes] = await Promise.all([
        profilesQuery,
        membersPromise,
        sectorsPromise,
      ]);

      if (profilesRes.error) throw profilesRes.error;

      setProfiles(((profilesRes.data || []) as ProfileRow[]).filter((u) => u.role !== 'cliente'));
      if (!membersRes.error && membersRes.data) {
        setMembers(membersRes.data as MemberRow[]);
      }
      if (!sectorsRes.error && sectorsRes.data) {
        setSectors(sectorsRes.data as SectorRow[]);
      }
    } catch (err) {
      console.error('Erro ao buscar presença dos usuários:', err);
      if (!silent) {
        setFetchError('Não foi possível carregar a presença da equipe.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchTeamPresence(false);

    // Revalida periodicamente para detectar expiração dos 15 minutos de inatividade
    const refreshInterval = setInterval(() => {
      fetchTeamPresence(true);
    }, 60000);

    // Escuta atualizações em tempo real na tabela profiles
    const channelName = `logged-users-presence-${orgId || 'all'}`;
    const filterConfig = orgId
      ? { event: '*', schema: 'public', table: 'profiles', filter: `org_id=eq.${orgId}` }
      : { event: '*', schema: 'public', table: 'profiles' };

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', filterConfig as any, () => {
        fetchTeamPresence(true);
      })
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, [orgId, fetchTeamPresence]);

  // Atualiza relógio local a cada 10s para manter tempos ativos e "visto há X min" sempre frescos
  useEffect(() => {
    const ticker = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(ticker);
  }, []);

  const sectorNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    sectors.forEach((s) => {
      map[s.id] = s.name;
    });
    return map;
  }, [sectors]);

  const { memberByEmail, memberByName } = useMemo(() => {
    const byEmail = new Map<string, MemberRow>();
    const byName = new Map<string, MemberRow>();

    members.forEach((m) => {
      if (m.email) {
        byEmail.set(m.email.trim().toLowerCase(), m);
      }
      const full = normalizeName(`${m.first_name} ${m.last_name}`);
      if (full) {
        byName.set(full, m);
      }
    });

    return { memberByEmail: byEmail, memberByName: byName };
  }, [members]);

  const teamMembers = useMemo<TeamMemberPresence[]>(() => {
    const todayStr = getTodayDateStringBR(currentTime);

    const list: TeamMemberPresence[] = [];

    profiles.forEach((profile) => {
      const emailKey = profile.email?.trim().toLowerCase() || '';
      const nameKey = normalizeName(profile.full_name);
      const matchedMember =
        (emailKey ? memberByEmail.get(emailKey) : undefined) ||
        (nameKey ? memberByName.get(nameKey) : undefined);

      // Ignora ex-colaboradores marcados explicitamente como Inativo em members
      if (matchedMember?.status === 'Inativo') {
        return;
      }

      const lastActiveMs = parseValidTimestamp(profile.last_active_at);
      const sessionStartMs = parseValidTimestamp(profile.current_session_start);
      const rawChatStatus = normalizeStatusKey(profile.chat_status);

      const isRecentlyActive =
        lastActiveMs !== null && currentTime - lastActiveMs <= ONLINE_THRESHOLD_MS;

      const isOnline =
        isRecentlyActive &&
        sessionStartMs !== null &&
        rawChatStatus !== 'offline';

      const effectiveStatus: PresenceStatusKey = isOnline ? rawChatStatus : 'offline';

      // Só contabiliza segundos acumulados de hoje (evita exibir tempo residual de dias anteriores)
      const isFromToday =
        profile.last_active_day === todayStr ||
        (lastActiveMs !== null && isSameLocalDay(lastActiveMs, currentTime));

      let todayActiveSeconds = isFromToday
        ? Math.max(0, profile.accumulated_active_seconds_today || 0)
        : 0;

      if (isOnline && lastActiveMs !== null) {
        const elapsedSincePingMs = currentTime - lastActiveMs;
        if (elapsedSincePingMs > 0 && elapsedSincePingMs < ONLINE_THRESHOLD_MS) {
          todayActiveSeconds += Math.floor(elapsedSincePingMs / 1000);
        }
      }

      const memberSectorNames: string[] = [];
      if (matchedMember) {
        if (Array.isArray(matchedMember.sector_ids) && matchedMember.sector_ids.length > 0) {
          matchedMember.sector_ids.forEach((sid) => {
            if (sectorNameMap[sid] && !memberSectorNames.includes(sectorNameMap[sid])) {
              memberSectorNames.push(sectorNameMap[sid]);
            }
          });
        } else if (matchedMember.sector_id && sectorNameMap[matchedMember.sector_id]) {
          memberSectorNames.push(sectorNameMap[matchedMember.sector_id]);
        }
      }

      list.push({
        id: profile.id,
        fullName: profile.full_name?.trim() || 'Usuário sem nome',
        roleLabel: profile.role === 'gestor' ? 'Gestor' : 'Colaborador',
        jobTitle: profile.job_title?.trim() || null,
        sectorNames: memberSectorNames,
        avatarUrl: profile.avatar_url,
        isOnline,
        effectiveStatus,
        lastActiveMs,
        currentSessionStartMs: sessionStartMs,
        todayActiveSeconds,
      });
    });

    // Ordenação: Online primeiro (mais ativos recentemente), depois Offline (mais recentemente vistos)
    return list.sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      const aTime = a.lastActiveMs || 0;
      const bTime = b.lastActiveMs || 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.fullName.localeCompare(b.fullName, 'pt-BR');
    });
  }, [profiles, memberByEmail, memberByName, sectorNameMap, currentTime]);

  const stats = useMemo(() => {
    const onlineCount = teamMembers.filter((m) => m.isOnline).length;
    const offlineCount = teamMembers.length - onlineCount;
    const total = teamMembers.length;

    const onlineRate = total > 0 ? Math.round((onlineCount / total) * 100) : 0;
    const offlineRate = total > 0 ? 100 - onlineRate : 0;

    return {
      total,
      onlineCount,
      offlineCount,
      onlineRate,
      offlineRate,
    };
  }, [teamMembers]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return teamMembers.filter((m) => {
      if (statusFilter === 'online' && !m.isOnline) return false;
      if (statusFilter === 'offline' && m.isOnline) return false;
      if (!q) return true;
      const matchName = m.fullName.toLowerCase().includes(q);
      const matchRole = m.roleLabel.toLowerCase().includes(q);
      const matchJob = (m.jobTitle || '').toLowerCase().includes(q);
      const matchSector = m.sectorNames.some((s) => s.toLowerCase().includes(q));
      return matchName || matchRole || matchJob || matchSector;
    });
  }, [teamMembers, statusFilter, searchQuery]);

  const onlineList = useMemo(() => filteredMembers.filter((m) => m.isOnline), [filteredMembers]);
  const offlineList = useMemo(() => filteredMembers.filter((m) => !m.isOnline), [filteredMembers]);

  const handleCardToggle = (target: 'online' | 'offline') => {
    setStatusFilter((prev) => (prev === target ? 'all' : target));
  };

  const headerActionsNode = (
    <div className="flex items-center gap-1.5 no-drag">
      <Tooltip
        content={showSearch ? 'Ocultar busca' : 'Buscar colaborador'}
        position="top"
      >
        <button
          type="button"
          onClick={() => {
            setShowSearch((prev) => {
              if (prev) setSearchQuery('');
              return !prev;
            });
          }}
          className={`h-6 w-6 flex items-center justify-center rounded-md transition-colors shrink-0 ${
            showSearch || searchQuery
              ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          aria-label="Buscar colaborador"
        >
          <Search size={13} strokeWidth={2.2} />
        </button>
      </Tooltip>

      <Tooltip
        content={showCards ? 'Ocultar resumo de presença' : 'Exibir resumo de presença'}
        position="top"
      >
        <button
          type="button"
          onClick={toggleShowCards}
          className={`h-6 w-6 flex items-center justify-center rounded-md transition-colors shrink-0 ${
            showCards
              ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          aria-label={showCards ? 'Ocultar resumo' : 'Exibir resumo'}
        >
          {showCards ? <Eye size={13} strokeWidth={2.2} /> : <EyeOff size={13} strokeWidth={2.2} />}
        </button>
      </Tooltip>
    </div>
  );

  const renderUserRow = (member: TeamMemberPresence) => {
    const statusInfo = STATUS_META[member.effectiveStatus];
    const subtitleParts = [
      member.jobTitle || member.roleLabel,
      ...member.sectorNames.slice(0, 2),
    ].filter(Boolean);

    const lastSeenLabel = formatLastSeenShort(member.lastActiveMs, currentTime);
    const activeTodayLabel = formatDurationSeconds(member.todayActiveSeconds);

    const rightTooltipContent = member.isOnline
      ? [
          `Status: ${statusInfo.label}`,
          member.currentSessionStartMs
            ? `Sessão atual desde ${new Date(member.currentSessionStartMs).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : null,
          `Tempo ativo hoje: ${activeTodayLabel}`,
        ]
          .filter(Boolean)
          .join(' · ')
      : [
          member.lastActiveMs
            ? `Última atividade: ${formatFullDateTimeBR(member.lastActiveMs)}`
            : 'Sem acesso registrado recentemente',
          member.todayActiveSeconds >= 60 ? `Ativo hoje: ${activeTodayLabel}` : null,
        ]
          .filter(Boolean)
          .join(' · ');

    return (
      <div
        key={member.id}
        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
          member.isOnline
            ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-500/30 hover:bg-emerald-50/20 dark:hover:bg-slate-800/70'
            : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
        }`}
      >
        {/* Avatar + Indicador de Presença */}
        <div className="relative shrink-0">
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt={member.fullName}
              className={`w-9 h-9 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-xs transition-opacity ${
                member.isOnline ? 'opacity-100' : 'opacity-70 grayscale-[35%]'
              }`}
            />
          ) : (
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white dark:border-slate-800 shadow-xs ${
                member.isOnline
                  ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              {member.fullName.charAt(0).toUpperCase()}
            </div>
          )}

          <Tooltip content={statusInfo.label} position="top">
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              {member.effectiveStatus === 'disponível' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              )}
              <span
                className={`relative inline-flex rounded-full h-3 w-3 border-2 border-white dark:border-slate-900 ${statusInfo.dotClass}`}
              />
            </span>
          </Tooltip>
        </div>

        {/* Nome + Função/Setor */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p
              className={`text-xs font-bold truncate ${
                member.isOnline
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {member.fullName}
            </p>

            <Tooltip content={rightTooltipContent} position="left">
              <div className="flex items-center gap-1 shrink-0">
                {member.isOnline && member.effectiveStatus !== 'disponível' && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${statusInfo.badgeClass}`}
                  >
                    {statusInfo.label}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap tabular-nums ${
                    member.isOnline
                      ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Clock size={10} className="shrink-0 opacity-80" />
                  {member.isOnline ? activeTodayLabel : lastSeenLabel}
                </span>
              </div>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            <Briefcase size={10} className="shrink-0 opacity-70" />
            <span className="truncate">{subtitleParts.join(' · ')}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <WidgetContainer
      title="USUÁRIOS ONLINE"
      icon={<Users size={14} />}
      headerActions={headerActionsNode}
      onRemove={onRemove}
    >
      <div className="flex-1 flex flex-col min-h-0 space-y-2.5 overflow-y-auto custom-scrollbar pr-0.5">
        {loading ? (
          <div className="flex-1 flex flex-col animate-pulse space-y-2.5 p-1">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(105px,1fr))] gap-2">
              <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            ))}
          </div>
        ) : fetchError ? (
          <div className="flex-1 flex items-center justify-center text-center p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{fetchError}</p>
          </div>
        ) : (
          <>
            {/* Tremor KPI Cards */}
            {showCards && (
              <div className="shrink-0 animate-in fade-in duration-200 no-drag">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(105px,1fr))] gap-2">
                  {/* Card Online */}
                  <button
                    type="button"
                    onClick={() => handleCardToggle('online')}
                    className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                      statusFilter === 'online'
                        ? 'bg-emerald-50/70 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/50 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                        <Wifi size={11} className="text-emerald-500 shrink-0" />
                        Online
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">
                        {stats.onlineRate}%
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-1">
                      <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
                        {stats.onlineCount}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        ativos
                      </span>
                    </div>
                  </button>

                  {/* Card Offline */}
                  <button
                    type="button"
                    onClick={() => handleCardToggle('offline')}
                    className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400/40 ${
                      statusFilter === 'offline'
                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                        <WifiOff size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        Offline
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                        {stats.offlineRate}%
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-1">
                      <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
                        {stats.offlineCount}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        ausentes
                      </span>
                    </div>
                  </button>

                  {/* Card Total Equipe */}
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                      statusFilter === 'all'
                        ? 'bg-indigo-50/70 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/50 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                        <Users size={11} className="text-indigo-500 shrink-0" />
                        Equipe
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 tabular-nums shrink-0">
                        100%
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-1">
                      <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
                        {stats.total}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        membros
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Barra de abas rápidas + busca opcional */}
            <div className="flex flex-col gap-2 shrink-0 no-drag">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                  {(
                    [
                      { id: 'all', label: `Todos (${stats.total})` },
                      { id: 'online', label: `Online (${stats.onlineCount})` },
                      { id: 'offline', label: `Offline (${stats.offlineCount})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all tabular-nums ${
                        statusFilter === tab.id
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {showSearch && (
                <div className="relative animate-in fade-in slide-in-from-top-1 duration-150">
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nome, cargo ou setor..."
                    icon={<Search size={13} />}
                    className="!h-8 !text-xs pr-8"
                  />
                  {searchQuery && (
                    <Tooltip content="Limpar busca" position="top">
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Limpar busca"
                      >
                        <X size={12} />
                      </button>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>

            {/* Lista de Usuários Online e Offline */}
            <div className="flex-1 min-h-[140px] overflow-y-auto custom-scrollbar pr-0.5 space-y-3">
              {filteredMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8 px-4 text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Users size={24} className="mb-2 opacity-40" />
                  <p className="text-xs font-medium">
                    {searchQuery.trim()
                      ? 'Nenhum colaborador corresponde à busca.'
                      : statusFilter === 'online'
                      ? 'Nenhum usuário online no momento.'
                      : statusFilter === 'offline'
                      ? 'Todos os colaboradores estão online.'
                      : 'Nenhum colaborador encontrado na organização.'}
                  </p>
                </div>
              ) : (
                <>
                  {(statusFilter === 'all' || statusFilter === 'online') && onlineList.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Online agora
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                          {onlineList.length}
                        </span>
                      </div>
                      <div className="space-y-1.5">{onlineList.map(renderUserRow)}</div>
                    </div>
                  )}

                  {(statusFilter === 'all' || statusFilter === 'offline') && offlineList.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                          Offline
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                          {offlineList.length}
                        </span>
                      </div>
                      <div className="space-y-1.5">{offlineList.map(renderUserRow)}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </WidgetContainer>
  );
};
