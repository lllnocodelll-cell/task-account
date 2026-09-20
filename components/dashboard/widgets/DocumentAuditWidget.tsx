import React, { useEffect, useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Eye, 
  Trash2, 
  User, 
  AlertTriangle,
  Calendar,
  Search,
  X,
  RotateCcw,
  Building2,
  Filter
} from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';
import { Tooltip } from '../../ui/Tooltip';

interface Props {
  orgId: string;
  onRemove?: () => void;
}

interface DeletionLogItem {
  id: string;
  client_id: string | null;
  client_name: string;
  document_name: string;
  competence_month: string | null;
  deletion_source: string;
  task_title: string | null;
  deleted_by_name: string;
  deleted_by_role: string | null;
  was_read_by_client: boolean | null;
  first_read_at: string | null;
  created_at: string;
}

type PeriodFilter = 'today' | '7d' | '30d' | 'all';

export const DocumentAuditWidget: React.FC<Props> = ({ orgId, onRemove }) => {
  const [logs, setLogs] = useState<DeletionLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos filtros
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');

  useEffect(() => {
    const fetchAuditLogs = async () => {
      if (!orgId) return;
      setLoading(true);
      try {
        // Buscar os últimos 150 registros para permitir filtros ágeis no cliente
        const { data, error } = await (supabase.from('client_document_deletion_logs' as any) as any)
          .select('*')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(150);

        if (error) throw error;

        const items: DeletionLogItem[] = (data || []).map((row: any) => ({
          id: row.id,
          client_id: row.client_id,
          client_name: row.client_name || 'Cliente',
          document_name: row.document_name,
          competence_month: row.competence_month,
          deletion_source: row.deletion_source,
          task_title: row.task_title,
          deleted_by_name: row.deleted_by_name || 'Operador',
          deleted_by_role: row.deleted_by_role,
          was_read_by_client: !!row.was_read_by_client,
          first_read_at: row.first_read_at,
          created_at: row.created_at || new Date().toISOString()
        }));

        setLogs(items);
      } catch (err) {
        console.error('Erro ao buscar logs de auditoria de exclusão:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, [orgId]);

  // Lista dinâmica de usuários únicos que realizaram exclusões
  const availableUsers = useMemo(() => {
    const userSet = new Set<string>();
    logs.forEach(l => {
      if (l.deleted_by_name) userSet.add(l.deleted_by_name);
    });
    return Array.from(userSet).sort();
  }, [logs]);

  // Aplicação simultânea dos 3 filtros: período, nome do cliente e usuário
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Filtro de Período
      if (period !== 'all') {
        const logDate = new Date(log.created_at).getTime();
        const now = new Date();
        if (period === 'today') {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          if (logDate < startOfToday) return false;
        } else {
          const days = period === '7d' ? 7 : 30;
          const threshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).getTime();
          if (logDate < threshold) return false;
        }
      }

      // 2. Filtro de Cliente / Documento
      if (clientSearch.trim()) {
        const query = clientSearch.toLowerCase().trim();
        const clientMatch = (log.client_name || '').toLowerCase().includes(query);
        const docMatch = (log.document_name || '').toLowerCase().includes(query);
        if (!clientMatch && !docMatch) return false;
      }

      // 3. Filtro de Usuário
      if (selectedUser !== 'all') {
        if (log.deleted_by_name !== selectedUser) return false;
      }

      return true;
    });
  }, [logs, period, clientSearch, selectedUser]);

  // Quantidade de documentos lidos antes de serem excluídos no conjunto filtrado
  const preReadCount = useMemo(() => {
    return filteredLogs.filter(i => i.was_read_by_client).length;
  }, [filteredLogs]);

  // Verifica se há filtros ativos para exibir botão de reset
  const hasActiveFilters = period !== '30d' || clientSearch.trim() !== '' || selectedUser !== 'all';

  const handleResetFilters = () => {
    setPeriod('30d');
    setClientSearch('');
    setSelectedUser('all');
  };

  const periodLabel = period === 'today' ? 'Hoje' : period === '7d' ? 'Últimos 7 Dias' : period === '30d' ? 'Últimos 30 Dias' : 'Geral';

  return (
    <WidgetContainer
      title="AUDITORIA DE DOCUMENTOS"
      icon={<ShieldAlert size={14} className="text-amber-500" />}
      onRemove={onRemove}
    >
      <div className="flex-1 flex flex-col p-2 space-y-2.5 overflow-hidden w-full">
        
        {/* Barra Superior: Filtro de Período e Reset */}
        <div className="flex items-center justify-between gap-2 shrink-0 pb-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar size={11} className="text-amber-500" />
            Período
          </span>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
            {(['today', '7d', '30d', 'all'] as PeriodFilter[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${
                  period === p
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {p === 'today' ? 'Hoje' : p === '7d' ? '7d' : p === '30d' ? '30d' : 'Geral'}
              </button>
            ))}
          </div>
        </div>

        {/* Linha de Filtros: Nome do Cliente e Usuário */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Busca por Cliente */}
          <div className="relative flex-1 min-w-0">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Filtrar por cliente..."
              className="w-full pl-7 pr-6 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg text-[10px] font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
            {clientSearch && (
              <button
                onClick={() => setClientSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={10} />
              </button>
            )}
          </div>

          {/* Seleção de Usuário */}
          <div className="relative shrink-0 max-w-[140px]">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2 py-1 text-[10px] font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:ring-1 focus:ring-amber-500/50 dark:[color-scheme:dark] truncate"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                Todos usuários
              </option>
              {availableUsers.map(user => (
                <option key={user} value={user} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                  {user}
                </option>
              ))}
            </select>
          </div>

          {/* Botão Reset se houver filtros ativos */}
          {hasActiveFilters && (
            <Tooltip content="Limpar todos os filtros" position="top">
              <button
                onClick={handleResetFilters}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors shrink-0"
              >
                <RotateCcw size={11} />
              </button>
            </Tooltip>
          )}
        </div>

        {/* Barra de métricas (Cards dinâmicos) */}
        <div className="grid grid-cols-2 gap-2 shrink-0">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 truncate">
              {hasActiveFilters ? 'Exclusões Filtradas' : periodLabel}
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-black text-slate-800 dark:text-slate-100">
                {filteredLogs.length}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">exclusões</span>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1 truncate">
              <AlertTriangle size={10} className="shrink-0" />
              Lidos Pré-exclusão
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-black text-amber-600 dark:text-amber-400">
                {preReadCount}
              </span>
              <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-medium">com protocolo</span>
            </div>
          </div>
        </div>

        {/* Conteúdo: Lista de ocorrências filtradas ou estado vazio */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {loading ? (
            <div className="animate-pulse space-y-2.5 w-full py-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 space-y-1.5">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700/60 rounded w-2/3"></div>
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-700/40 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col gap-1.5"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Trash2 size={12} className="text-red-500 shrink-0" />
                      <span
                        className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block"
                        title={log.document_name}
                      >
                        {log.document_name}
                      </span>
                    </div>
                    <p
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 truncate mt-0.5"
                      title={log.client_name}
                    >
                      {log.client_name}
                    </p>
                  </div>

                  {/* Tag de Leitura Prévia */}
                  {log.was_read_by_client ? (
                    <span className="shrink-0 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 flex items-center gap-0.5">
                      <Eye size={9} />
                      Lido
                    </span>
                  ) : (
                    <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                      Não lido
                    </span>
                  )}
                </div>

                {/* Informações de Competência, Origem e Operador */}
                <div className="pt-1.5 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between gap-2 text-[9px] text-slate-400">
                  <div className="flex items-center gap-1 truncate">
                    <User size={10} className="text-slate-400 shrink-0" />
                    <span className="truncate font-semibold text-slate-600 dark:text-slate-300" title={log.deleted_by_name}>
                      {log.deleted_by_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {log.competence_month && (
                      <span className="font-bold text-slate-500 dark:text-slate-300 uppercase">
                        {log.competence_month}
                      </span>
                    )}
                    <span>•</span>
                    <span className="text-[8.5px] font-medium">
                      {new Date(log.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Tag de Origem */}
                <div className="flex items-center justify-between text-[8.5px]">
                  <span className="text-slate-400">
                    Origem:
                  </span>
                  {log.deletion_source === 'reopen_task' ? (
                    <span
                      className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-semibold truncate max-w-[170px]"
                      title={log.task_title ? `Reabertura: ${log.task_title}` : 'Reabertura de Tarefa'}
                    >
                      Reabertura {log.task_title ? `(${log.task_title})` : ''}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold">
                      Exclusão Manual no Cliente
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : hasActiveFilters ? (
            <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4">
              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-2">
                <Filter size={18} />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Nenhum resultado para os filtros
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 max-w-[200px]">
                Nenhuma exclusão corresponde ao cliente, usuário ou período selecionado.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-2.5 px-2.5 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1"
              >
                <RotateCcw size={10} />
                Limpar Filtros
              </button>
            </div>
          ) : (
            <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                <ShieldCheck size={20} />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Nenhuma exclusão registrada
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 max-w-[200px]">
                Todos os documentos enviados à área do cliente permanecem íntegros no portal.
              </p>
            </div>
          )}
        </div>
      </div>
    </WidgetContainer>
  );
};
