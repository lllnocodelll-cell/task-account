import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 dark:bg-slate-800/80 rounded-md ${className}`}
      {...props}
    />
  );
};

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  showZoomControls?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 8, cols = 7 }) => {
  return (
    <div className="w-full overflow-hidden flex flex-col min-h-0">
      <div className="w-full pb-4">
        <table className="w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="bg-slate-200/60 dark:bg-slate-900/60">
              <th className="px-6 py-3.5 rounded-l-2xl border-t-[3px] border-l border-slate-300/60 dark:border-slate-800 border-t-indigo-500/40">
                <Skeleton className="h-3 w-16" />
              </th>
              {Array.from({ length: cols - 2 }).map((_, i) => (
                <th key={i} className="px-6 py-3.5 border-t-[3px] border-slate-300/60 dark:border-slate-800 border-t-slate-400/40 dark:border-t-slate-600/40">
                  <Skeleton className="h-3 w-20" />
                </th>
              ))}
              <th className="px-6 py-3.5 rounded-r-2xl border-t-[3px] border-r border-slate-300/60 dark:border-slate-800 border-t-slate-400/40 dark:border-t-slate-600/40 text-right">
                <Skeleton className="h-3 w-12 ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr
                key={rowIndex}
                className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs"
              >
                {/* Coluna 1: Ações / Ícone */}
                <td className="px-6 py-4 rounded-l-2xl border-y border-l border-slate-200/80 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
                    <Skeleton className="h-4 w-12 hidden sm:block" />
                  </div>
                </td>

                {/* Coluna 2: Título Principal e Subtítulo */}
                <td className="px-6 py-4 border-y border-slate-200/80 dark:border-slate-800/80">
                  <div className="space-y-1.5 min-w-[160px]">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24 opacity-70" />
                  </div>
                </td>

                {/* Coluna 3: Badges / Pílula */}
                <td className="px-6 py-4 border-y border-slate-200/80 dark:border-slate-800/80">
                  <Skeleton className="h-6 w-24 rounded-full" />
                </td>

                {/* Coluna 4: Data ou Prazo */}
                <td className="px-6 py-4 border-y border-slate-200/80 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-3.5 h-3.5 rounded-full shrink-0" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                </td>

                {/* Coluna 5: Responsável / Avatar */}
                <td className="px-6 py-4 border-y border-slate-200/80 dark:border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                    <Skeleton className="h-3.5 w-24 hidden md:block" />
                  </div>
                </td>

                {/* Colunas Opcionais */}
                {cols > 6 && (
                  <td className="px-6 py-4 border-y border-slate-200/80 dark:border-slate-800/80 hidden lg:table-cell">
                    <Skeleton className="h-5 w-20 rounded-md" />
                  </td>
                )}

                {/* Última Coluna: Ações / Menu */}
                <td className="px-6 py-4 rounded-r-2xl border-y border-r border-slate-200/80 dark:border-slate-800/80 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const KanbanSkeleton: React.FC = () => {
  const columns = [
    { title: 'Pendentes', accent: 'bg-indigo-500/20 text-indigo-500' },
    { title: 'Iniciadas', accent: 'bg-amber-500/20 text-amber-500' },
    { title: 'Atrasadas', accent: 'bg-rose-500/20 text-rose-500' },
    { title: 'Concluídas', accent: 'bg-emerald-500/20 text-emerald-500' }
  ];

  return (
    <div className="w-full flex-1 overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[1100px] h-full">
        {columns.map((col, idx) => (
          <div
            key={idx}
            className="flex-1 flex flex-col min-w-[260px] max-w-[360px] bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/60 rounded-2xl p-3 space-y-3"
          >
            {/* Header da Coluna */}
            <div className="flex items-center justify-between px-1 py-1">
              <div className="flex items-center gap-2">
                <Skeleton className="w-3 h-3 rounded-full" />
                <Skeleton className="h-4 w-24 font-bold" />
              </div>
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>

            {/* Cartões Simulados */}
            <div className="space-y-3 flex-1 overflow-hidden">
              {[1, 2, 3].map((cardIdx) => (
                <div
                  key={cardIdx}
                  className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3"
                >
                  {/* Topo do card: tag e ações */}
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="w-5 h-5 rounded-md" />
                  </div>

                  {/* Nome da tarefa */}
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3.5 w-3/4 opacity-75" />
                  </div>

                  {/* Barra de checklist/progresso */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-2.5 w-16" />
                      <Skeleton className="h-2.5 w-8" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>

                  {/* Rodapé: data de vencimento e avatar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="w-6 h-6 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ClientCardsSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden flex flex-col justify-between"
        >
          {/* Topo: Avatar e Identificação */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3 opacity-70" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full shrink-0" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
          </div>

          {/* Meio: Contato Principal */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-2.5 flex-1 flex flex-col justify-center">
            <Skeleton className="h-2.5 w-20 uppercase tracking-widest" />
            <div className="flex items-center gap-2">
              <Skeleton className="w-3.5 h-3.5 rounded-full shrink-0" />
              <Skeleton className="h-3.5 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="w-3.5 h-3.5 rounded-full shrink-0" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-full rounded" />
            </div>
          </div>

          {/* Rodapé: Ações e Segmento */}
          <div className="p-3 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between">
            <Skeleton className="h-5 w-24 rounded-full" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const ChatSidebarSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="space-y-1 p-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-full flex items-center gap-2 py-2 px-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40 bg-white/60 dark:bg-slate-900/30"
        >
          {/* Avatar com indicador de status */}
          <div className="relative shrink-0">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900" />
          </div>

          {/* Nome e última mensagem */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-10" />
            </div>
            <div className="flex items-center justify-between gap-1">
              <Skeleton className="h-3 w-36 opacity-70" />
              <Skeleton className="h-3 w-3 rounded-full shrink-0" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const ChatMessageBubblesSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 py-2 animate-in fade-in duration-300">
      {/* Mensagem recebida (esquerda) */}
      <div className="flex items-end gap-2.5 max-w-[70%]">
        <Skeleton className="w-8 h-8 rounded-full shrink-0 mb-1" />
        <div className="space-y-1.5 p-3.5 rounded-2xl rounded-bl-none bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex-1">
          <Skeleton className="h-3.5 w-44" />
          <Skeleton className="h-3 w-32 opacity-75" />
          <Skeleton className="h-2 w-12 ml-auto mt-1 opacity-50" />
        </div>
      </div>

      {/* Mensagem enviada (direita) */}
      <div className="flex items-end justify-end gap-2.5 max-w-[70%] ml-auto">
        <div className="space-y-1.5 p-3.5 rounded-2xl rounded-br-none bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 shadow-xs flex-1">
          <Skeleton className="h-3.5 w-40 ml-auto bg-indigo-200 dark:bg-indigo-800/60" />
          <Skeleton className="h-3 w-24 ml-auto bg-indigo-100 dark:bg-indigo-900/40" />
          <Skeleton className="h-2 w-10 ml-auto mt-1 opacity-50" />
        </div>
      </div>

      {/* Mensagem recebida mais longa (esquerda) */}
      <div className="flex items-end gap-2.5 max-w-[78%]">
        <Skeleton className="w-8 h-8 rounded-full shrink-0 mb-1" />
        <div className="space-y-1.5 p-3.5 rounded-2xl rounded-bl-none bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex-1">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3 w-2/3 opacity-75" />
          <Skeleton className="h-2 w-12 ml-auto mt-1 opacity-50" />
        </div>
      </div>

      {/* Mensagem enviada curta (direita) */}
      <div className="flex items-end justify-end gap-2.5 max-w-[55%] ml-auto">
        <div className="space-y-1.5 p-3 rounded-2xl rounded-br-none bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 shadow-xs flex-1">
          <Skeleton className="h-3.5 w-28 ml-auto bg-indigo-200 dark:bg-indigo-800/60" />
          <Skeleton className="h-2 w-10 ml-auto mt-1 opacity-50" />
        </div>
      </div>
    </div>
  );
};

export const ChatMessagesSkeleton: React.FC<{ showHeader?: boolean; showInput?: boolean }> = ({
  showHeader = true,
  showInput = true
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
      {/* Header simulado */}
      {showHeader && (
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20 opacity-70" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="w-8 h-8 rounded-lg" />
          </div>
        </div>
      )}

      {/* Área de mensagens com balões alternados */}
      <div className="flex-1 p-6 space-y-4 overflow-hidden">
        <ChatMessageBubblesSkeleton />
      </div>

      {/* Input de mensagem simulado no rodapé */}
      {showInput && (
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      )}
    </div>
  );
};
