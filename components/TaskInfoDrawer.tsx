import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X,
  FileCode,
  Code,
  ChevronDown,
  ExternalLink,
  Copy,
  Calendar,
  Key,
  FileText,
  MoveHorizontal
} from 'lucide-react';
import { Task } from '../types';

interface TaskInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}

export const TaskInfoDrawer: React.FC<TaskInfoDrawerProps> = ({ isOpen, onClose, task }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [localTask, setLocalTask] = useState<Task | null>(task);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    access: true,
    dfe: true
  });
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Gerencia montagem e persistência de dados
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setLocalTask(task);
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, task]);

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (!isOpen && e.propertyName === 'transform') {
      setShouldRender(false);
      setLocalTask(null);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(text);
    setCopyFeedback(fieldId);
    setTimeout(() => setCopyFeedback(null), 1500);
  };

  if (!shouldRender || !localTask) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[9998] transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Drawer Container */}
      <div 
        onTransitionEnd={handleTransitionEnd}
        className={`fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl z-[9999] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25, 0.1, 0.25, 1)] border-l border-white/20 dark:border-slate-800/50 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
                <MoveHorizontal size={18} className="text-slate-500 dark:text-slate-400" />
              </div>
              <div className="flex flex-col text-left">
                <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                  Acesso Rápido
                </h1>
                <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          
          {/* Summary */}
          <div className="grid grid-cols-1 gap-3 mb-6">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Cliente</span>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{localTask.clientName}</p>
            </div>
          </div>

          {/* 1. ACORDEÃO: ACESSOS E CREDENCIAIS */}
          <div className="space-y-2">
            <button 
              onClick={() => toggleSection('access')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${expandedSections['access'] ? 'bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/30' : 'bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800'}`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${expandedSections['access'] ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20'}`}>
                <Code size={16} />
              </div>
              <span className={`text-sm font-bold flex-1 text-left ${expandedSections['access'] ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}`}>
                Acessos e Credenciais
              </span>
              <div className={`transition-transform duration-300 ${expandedSections['access'] ? 'rotate-180 text-amber-500' : 'text-slate-400'}`}>
                <ChevronDown size={18} />
              </div>
            </button>

            <div className={`grid transition-all duration-300 ease-in-out ${expandedSections['access'] ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden space-y-3 px-1">
                {localTask.clientAccesses && localTask.clientAccesses.length > 0 ? (
                  localTask.clientAccesses.map((acc) => (
                    <div key={acc.id} className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-amber-100 dark:border-amber-500/20 shadow-sm hover:border-amber-300 dark:hover:border-amber-500/40 transition-all group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1 bg-amber-50 dark:bg-amber-500/10 rounded text-amber-500 shrink-0">
                             <Key size={12} />
                          </div>
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">{acc.access_name}</span>
                          {acc.sector && <span className="text-[9px] font-black text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded uppercase shrink-0">{acc.sector}</span>}
                        </div>
                        {acc.access_url && (
                          <a href={acc.access_url.startsWith('http') ? acc.access_url : `https://${acc.access_url}`} target="_blank" rel="noopener noreferrer" className="p-1 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors">
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div 
                          onClick={(e) => acc.username && copyToClipboard(acc.username, `acc-${acc.id}-user`, e)}
                          className="relative p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-transparent hover:border-amber-200 dark:hover:border-amber-500/30 cursor-pointer transition-all active:scale-95 group/cred"
                        >
                          <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Usuário</span>
                          <p className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 truncate pr-4">{acc.username || '—'}</p>
                          {copyFeedback === `acc-${acc.id}-user` ? (
                            <span className="absolute inset-0 flex items-center justify-center bg-amber-500 text-white text-[9px] font-bold rounded-lg animate-in fade-in zoom-in duration-200 uppercase">Copiado!</span>
                          ) : <div className="absolute top-2 right-2 opacity-0 group-hover/cred:opacity-100 transition-opacity text-amber-400"><Copy size={10} /></div>}
                        </div>
                        <div 
                          onClick={(e) => acc.password && copyToClipboard(acc.password, `acc-${acc.id}-pass`, e)}
                          className="relative p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-transparent hover:border-amber-200 dark:hover:border-amber-500/30 cursor-pointer transition-all active:scale-95 group/cred"
                        >
                          <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Senha</span>
                          <p className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 truncate pr-4">{acc.password || '—'}</p>
                          {copyFeedback === `acc-${acc.id}-pass` ? (
                            <span className="absolute inset-0 flex items-center justify-center bg-amber-500 text-white text-[9px] font-bold rounded-lg animate-in fade-in zoom-in duration-200 uppercase">Copiado!</span>
                          ) : <div className="absolute top-2 right-2 opacity-0 group-hover/cred:opacity-100 transition-opacity text-amber-400"><Copy size={10} /></div>}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl italic">Nenhuma credencial vinculada.</p>
                )}
              </div>
            </div>
          </div>

          {/* 2. ACORDEÃO: DF-E */}
          <div className="space-y-2">
            <button 
              onClick={() => toggleSection('dfe')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${expandedSections['dfe'] ? 'bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-200 dark:ring-indigo-500/30' : 'bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800'}`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${expandedSections['dfe'] ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-500 dark:bg-indigo-500/20'}`}>
                <FileCode size={16} />
              </div>
              <span className={`text-sm font-bold flex-1 text-left ${expandedSections['dfe'] ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}>
                DF-e | Documento Fiscal Eletrônico
              </span>
              <div className={`transition-transform duration-300 ${expandedSections['dfe'] ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`}>
                <ChevronDown size={18} />
              </div>
            </button>

            <div className={`grid transition-all duration-300 ease-in-out ${expandedSections['dfe'] ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden space-y-3 px-1">
                {localTask.clientDfes && localTask.clientDfes.length > 0 ? (
                  localTask.clientDfes.map((dfe) => (
                    <div key={dfe.id} className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-indigo-100 dark:border-indigo-500/20 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">{dfe.dfe_type}</span>
                          {dfe.series && <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400 px-1.5 py-0.5 rounded uppercase">Sér: {dfe.series}</span>}
                        </div>
                        {dfe.login_url && (
                          <a href={dfe.login_url.startsWith('http') ? dfe.login_url : `https://${dfe.login_url}`} target="_blank" rel="noopener noreferrer" className="p-1 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors">
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div 
                          onClick={(e) => dfe.username && copyToClipboard(dfe.username, `dfe-${dfe.id}-user`, e)}
                          className="relative p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-500/30 cursor-pointer transition-all active:scale-95 group/cred"
                        >
                          <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Usuário</span>
                          <p className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 truncate pr-4">{dfe.username || '—'}</p>
                          {copyFeedback === `dfe-${dfe.id}-user` ? (
                            <span className="absolute inset-0 flex items-center justify-center bg-indigo-500 text-white text-[9px] font-bold rounded-lg animate-in fade-in zoom-in duration-200 uppercase">Copiado!</span>
                          ) : <div className="absolute top-2 right-2 opacity-0 group-hover/cred:opacity-100 transition-opacity text-indigo-400"><Copy size={10} /></div>}
                        </div>
                        <div 
                          onClick={(e) => dfe.password && copyToClipboard(dfe.password, `dfe-${dfe.id}-pass`, e)}
                          className="relative p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-500/30 cursor-pointer transition-all active:scale-95 group/cred"
                        >
                          <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Senha</span>
                          <p className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 truncate pr-4">{dfe.password || '—'}</p>
                          {copyFeedback === `dfe-${dfe.id}-pass` ? (
                            <span className="absolute inset-0 flex items-center justify-center bg-indigo-500 text-white text-[9px] font-bold rounded-lg animate-in fade-in zoom-in duration-200 uppercase">Copiado!</span>
                          ) : <div className="absolute top-2 right-2 opacity-0 group-hover/cred:opacity-100 transition-opacity text-indigo-400"><Copy size={10} /></div>}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl italic">Nenhum documento fiscal vinculado.</p>
                )}
              </div>
            </div>
          </div>


        </div>

      </div>
    </>,
    document.body
  );
};
