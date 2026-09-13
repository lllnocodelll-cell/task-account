/**
 * Snippet do estilo de "Little Cards / Callouts Flutuantes"
 * Salvo para reutilização futura em outras seções da Landing Page ou aplicação.
 */

import React from 'react';

export const CalloutCardSnippet = () => (
  <div className="w-64 bg-white/95 dark:bg-[#121722]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 p-4 rounded-2xl shadow-xl shadow-slate-300/40 dark:shadow-2xl">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-yellow-400">
        ROTINAS FISCAIS
      </span>
      <span className="text-[9px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300/60 dark:border-emerald-800/40 px-1.5 py-0.5 rounded font-bold">
        COMPETÊNCIA ATIVA
      </span>
    </div>
    <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">
      PGDAS-D & Obrigações
    </p>
    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
      Tarefas geradas automaticamente com filtros por regime tributário, anexos e responsáveis.
    </p>
  </div>
);

export const CalloutCardRightSnippet = () => (
  <div className="w-64 bg-white/95 dark:bg-[#121722]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 p-4 rounded-2xl shadow-xl shadow-slate-300/40 dark:shadow-2xl">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-yellow-400">
        APONTAMENTO LIVE
      </span>
      <span className="text-[9px] font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-300/60 dark:border-indigo-800/40 px-1.5 py-0.5 rounded font-bold">
        TEMPO REAL
      </span>
    </div>
    <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">
      Quadro Kanban & Timer
    </p>
    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
      Monitore cada minuto gasto por cliente e colaborador com o temporizador direto nos cards.
    </p>
  </div>
);
