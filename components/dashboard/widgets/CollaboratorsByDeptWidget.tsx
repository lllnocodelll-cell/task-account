import React, { useEffect, useState, useCallback } from 'react';
import { UsersRound, Briefcase, Code, Megaphone, Headset, Calculator, FileText, ChevronRight, Scale } from 'lucide-react';
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
  'Fiscal': { color: 'text-emerald-500', bg: 'bg-emerald-500', icon: FileText },
  'Departamento Pessoal': { color: 'text-violet-500', bg: 'bg-violet-500', icon: UsersRound },
  'DP': { color: 'text-violet-500', bg: 'bg-violet-500', icon: UsersRound },
  'Administrativo': { color: 'text-slate-500', bg: 'bg-slate-500', icon: FileText },
  'Financeiro': { color: 'text-teal-500', bg: 'bg-teal-500', icon: Scale },
  'Recursos Humanos': { color: 'text-violet-500', bg: 'bg-violet-500', icon: UsersRound },
  'Outros': { color: 'text-indigo-500', bg: 'bg-indigo-500', icon: ChevronRight }
};

export const CollaboratorsByDeptWidget: React.FC<Props> = ({ orgId, onRemove }) => {
  const [data, setData] = useState<{ sectorName: string; count: number; percent: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCollaboratorsByDept = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      // Busca a lista de setores e de membros da organização
      const [sectorsRes, membersRes] = await Promise.all([
        supabase.from('sectors').select('id, name').eq('org_id', orgId),
        supabase.from('members').select('id, sector_id, sector_ids, status, sectors(name)').eq('org_id', orgId)
      ]);

      if (sectorsRes.error) throw sectorsRes.error;
      if (membersRes.error) throw membersRes.error;

      const sectorsList = sectorsRes.data || [];
      const membersData = membersRes.data || [];

      // Mapeamento de setor id -> nome do setor
      const sectorNameMap: Record<string, string> = {};
      sectorsList.forEach((s: any) => {
        sectorNameMap[s.id] = s.name;
      });

      const counts: Record<string, number> = {};
      let totalCollaboratorSectorLinks = 0;

      membersData.forEach((member: any) => {
        // Coleta todos os nomes de setores deste colaborador
        const assignedSectorNames = new Set<string>();

        if (member.sector_ids && Array.isArray(member.sector_ids) && member.sector_ids.length > 0) {
          member.sector_ids.forEach((sid: string) => {
            if (sectorNameMap[sid]) {
              assignedSectorNames.add(sectorNameMap[sid]);
            }
          });
        }

        if (assignedSectorNames.size === 0 && member.sectors?.name) {
          assignedSectorNames.add(member.sectors.name);
        } else if (assignedSectorNames.size === 0 && member.sector_id && sectorNameMap[member.sector_id]) {
          assignedSectorNames.add(sectorNameMap[member.sector_id]);
        }

        // Se o membro possui setor(es) atrelado(s), contabiliza para a equipe do escritório
        // Perfis de cliente/sem setor atribuído são ignorados automaticamente
        assignedSectorNames.forEach(secName => {
          counts[secName] = (counts[secName] || 0) + 1;
          totalCollaboratorSectorLinks++;
        });
      });

      // Converter para array e calcular a porcentagem
      const result = Object.keys(counts).map(sector => ({
        sectorName: sector,
        count: counts[sector],
        percent: totalCollaboratorSectorLinks > 0 ? (counts[sector] / totalCollaboratorSectorLinks) * 100 : 0
      }));

      result.sort((a, b) => b.count - a.count);
      setData(result);
    } catch (err) {
      console.error('Error fetching collaborators by department:', err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchCollaboratorsByDept();
  }, [fetchCollaboratorsByDept]);

  return (
    <WidgetContainer title="COLABORADOR POR SETOR" icon={<UsersRound size={14} className="text-indigo-500" />} onRemove={onRemove}>
      <div className="flex-1 w-full min-h-0 overflow-y-auto custom-scrollbar p-2 lg:p-4 pr-1">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 h-full py-8">
            <div className="w-16 h-16 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-indigo-500 animate-spin"></div>
            <div className="text-sm text-slate-400 font-medium animate-pulse">Buscando equipe...</div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-3 h-full py-8">
            <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
              <UsersRound size={24} className="text-slate-300 dark:text-slate-600" />
            </div>
            <span className="font-medium text-slate-500">Nenhum colaborador com setor atribuído</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.map((item, index) => {
              const styleKeys = Object.keys(DEPT_STYLES);
              let style = DEPT_STYLES[item.sectorName];

              if (!style) {
                const fallbackIndex = index % (styleKeys.length - 1);
                style = DEPT_STYLES[styleKeys[fallbackIndex]] || DEPT_STYLES['Outros'];
              }

              const Icon = style.icon;

              return (
                <div key={index} className="flex flex-col p-3 rounded-xl bg-slate-50 hover:bg-white dark:bg-slate-800/40 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 ${style.color} shrink-0`}>
                        <Icon size={14} />
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate" title={item.sectorName}>
                        {item.sectorName}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 shrink-0 ml-2">
                      <span className="font-bold text-slate-800 dark:text-white text-base tabular-nums">
                        {item.count}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                        ({item.percent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

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
