import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Pencil, 
  User, 
  Building2, 
  Activity, 
  Calendar, 
  Clock, 
  Repeat, 
  AlertCircle, 
  AlertTriangle, 
  Layers, 
  Zap, 
  FileText, 
  FileBadge, 
  Download, 
  ExternalLink,
  ChevronRight,
  Briefcase,
  LayoutList,
  CheckCircle2,
  MinusCircle,
  FileStack,
  Scale,
  Copy
} from 'lucide-react';
import { Task, TaskStatus, Priority, TAX_REGIME_LABELS } from '../types';

interface TaskDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onEdit: (task: Task) => void;
  registrationRegimeLabels: Record<string, string>;
}

export const TaskDetailsDrawer: React.FC<TaskDetailsDrawerProps> = ({ 
  isOpen, 
  onClose, 
  task, 
  onEdit,
  registrationRegimeLabels
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [localTask, setLocalTask] = useState<Task | null>(task);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    task: false,
    details: false,
    simples: false,
    obs: true,
    legis: true,
    files: true
  });
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

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

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const copyToClipboard = (text: string, fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(text);
    setCopyFeedback(fieldId);
    setTimeout(() => setCopyFeedback(null), 1500);
  };

  if (!shouldRender || !localTask) return null;

  const isSimplesNacional = localTask.taxRegime?.includes('simples');

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[9998] transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        onTransitionEnd={handleTransitionEnd}
        className={`fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white dark:bg-slate-950 shadow-2xl z-[9999] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25, 0.1, 0.25, 1)] border-l border-slate-200 dark:border-slate-800 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-900 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
              <LayoutList size={18} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex flex-col text-left">
              <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                Dados da Tarefa
              </h1>
              <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onEdit(localTask)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
            >
              <Pencil size={14} />
              Editar
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-6 pb-32">
            
            {/* SEÇÃO 1: TAREFA */}
            <section className="space-y-3">
              <button 
                onClick={() => toggleSection('task')}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded">Seção 01</span>
                  <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Informações Básicas</h2>
                </div>
                <ChevronRight 
                  size={16} 
                  className={`text-slate-300 transition-transform duration-300 ${openSections.task ? 'rotate-90' : ''}`} 
                />
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openSections.task ? 'max-h-[500px] opacity-100 pb-2' : 'max-h-0 opacity-0'}`}>
                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/60 p-5 space-y-6">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nome da Tarefa</span>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-100 leading-tight">{localTask.taskName}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                        <Building2 size={16} className="text-slate-400" />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Empresa</span>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{localTask.clientName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                          <User size={16} className="text-slate-400" />
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Responsável</span>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{localTask.responsible}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                          <Briefcase size={16} className="text-slate-400" />
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Setor</span>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{localTask.sector}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SEÇÃO 2: DETALHES */}
            <section className="space-y-3">
              <button 
                onClick={() => toggleSection('details')}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded">Seção 02</span>
                  <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Detalhes da Execução</h2>
                </div>
                <ChevronRight 
                  size={16} 
                  className={`text-slate-300 transition-transform duration-300 ${openSections.details ? 'rotate-90' : ''}`} 
                />
              </button>

              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openSections.details ? 'max-h-[600px] opacity-100 pb-2' : 'max-h-0 opacity-0'}`}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Regime Tributário</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{TAX_REGIME_LABELS[localTask.taxRegime || ''] || localTask.taxRegime}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Regime registro</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{registrationRegimeLabels[localTask.registrationRegime || ''] || localTask.registrationRegime || '-'}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Competência</span>
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      <Calendar size={14} />
                      {localTask.competence}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vencimento</span>
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                      <Clock size={14} />
                      {localTask.dueDate?.split('-').reverse().join('/') || '-'}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo Recorrência</span>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                      <Repeat size={14} />
                      <span className="capitalize">{localTask.recurrence || 'Única'}</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Situação</span>
                    <div className={`text-xs font-black uppercase flex items-center gap-1.5 ${
                      localTask.status === TaskStatus.CONCLUIDA ? 'text-emerald-500' :
                      localTask.status === TaskStatus.ATRASADA ? 'text-rose-500' :
                      'text-amber-500'
                    }`}>
                      {localTask.status === TaskStatus.CONCLUIDA && <CheckCircle2 size={14} />}
                      {localTask.status}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prioridade</span>
                    <span className={`text-xs font-black uppercase ${
                      localTask.priority === Priority.ALTA ? 'text-red-500' :
                      localTask.priority === Priority.MEDIA ? 'text-amber-500' :
                      'text-slate-500'
                    }`}>
                      {localTask.priority}
                    </span>
                  </div>
                  {localTask.noMovement && (
                    <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-900/30 flex flex-col gap-1">
                      <span className="text-[9px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest">Movimentação</span>
                      <div className="flex items-center gap-2 text-xs font-black text-red-600 dark:text-red-400 uppercase">
                        <MinusCircle size={14} />
                        Sem Movimento
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* SEÇÃO 3: SIMPLES NACIONAL (Condicional) */}
            {isSimplesNacional && (
              <section className="space-y-3">
                <button 
                  onClick={() => toggleSection('simples')}
                  className="w-full flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded">Seção 03</span>
                    <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Simples Nacional</h2>
                  </div>
                  <ChevronRight 
                    size={16} 
                    className={`text-slate-300 transition-transform duration-300 ${openSections.simples ? 'rotate-90' : ''}`} 
                  />
                </button>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openSections.simples ? 'max-h-[600px] opacity-100 pb-2' : 'max-h-0 opacity-0'}`}>
                  <div className="bg-emerald-50/30 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 p-5 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fator R</span>
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded-md ${localTask.factorR ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                            <Zap size={12} fill={localTask.factorR ? "currentColor" : "none"} />
                          </div>
                          <span className={`text-xs font-bold ${localTask.factorR ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                            {localTask.factorR ? 'Aplicável' : 'Não se aplica'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sublimite</span>
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded-md ${localTask.exceededSublimit ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                            <AlertTriangle size={12} />
                          </div>
                          <span className={`text-xs font-bold ${localTask.exceededSublimit ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                            {localTask.exceededSublimit ? 'Excedido' : 'Dentro do limite'}
                          </span>
                        </div>
                      </div>
                      
                      {/* NOVO CAMPO: EXCLUSÃO NOTIFICADA */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Exclusão Notificada</span>
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded-md ${localTask.notifiedExclusion ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                            <AlertCircle size={12} />
                          </div>
                          <span className={`text-xs font-bold ${localTask.notifiedExclusion ? 'text-red-600 dark:text-red-400 font-black' : 'text-slate-400 font-bold'}`}>
                            {localTask.notifiedExclusion ? 'Sim, Notificada' : 'Não'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {localTask.selectedAnnexes && localTask.selectedAnnexes.length > 0 && (
                      <div className="pt-4 border-t border-emerald-100 dark:border-emerald-500/20">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3">Anexos Vinculados</span>
                        <div className="flex flex-wrap gap-2">
                          {localTask.selectedAnnexes.map(annex => (
                            <span key={annex} className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/30 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-sm flex items-center gap-2">
                              <Layers size={12} />
                              {annex}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* SEÇÃO 4: OBSERVAÇÃO */}
            <section className="space-y-3">
              <button 
                onClick={() => toggleSection('obs')}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Seção 04</span>
                  <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Observação</h2>
                </div>
                <ChevronRight 
                  size={16} 
                  className={`text-slate-300 transition-transform duration-300 ${openSections.obs ? 'rotate-90' : ''}`} 
                />
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openSections.obs ? 'max-h-[500px] opacity-100 pb-2' : 'max-h-0 opacity-0'}`}>
                <div className="relative p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                  <FileText size={40} className="absolute -right-2 -bottom-2 text-slate-50 dark:text-slate-800 opacity-50 group-hover:scale-110 transition-transform" />
                  
                  {localTask.observation ? (
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed relative z-10 whitespace-pre-wrap">
                      {localTask.observation}
                    </p>
                  ) : (
                    <p className="text-xs font-bold text-slate-400 uppercase italic text-center py-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                      Nenhuma observação cadastrada
                    </p>
                  )}
                </div>
              </div>
            </section>
            {/* SEÇÃO 5: LEGISLAÇÃO */}
            <section className="space-y-3">
              <button 
                onClick={() => toggleSection('legis')}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded">Seção 05</span>
                  <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Legislação</h2>
                </div>
                <ChevronRight 
                  size={16} 
                  className={`text-slate-300 transition-transform duration-300 ${openSections.legis ? 'rotate-90' : ''}`} 
                />
              </button>

              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openSections.legis ? 'max-h-[800px] opacity-100 pb-2' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-3">
                  {localTask.clientLegislations && localTask.clientLegislations.length > 0 ? (
                    localTask.clientLegislations.map((legis) => (
                      <div key={legis.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all group overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/40" />
                        
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-50 dark:border-slate-800/50">
                          <div className="flex items-center gap-2">
                            {/* Rótulo removido conforme solicitado */}
                          </div>
                          {legis.access_url && (
                            <a 
                              href={legis.access_url.startsWith('http') ? legis.access_url : `https://${legis.access_url}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="p-1.5 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-all flex items-center gap-1"
                            >
                              <span className="text-[9px] font-black uppercase">Ver</span>
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                        
                        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                            {legis.description}
                          </p>
                        </div>

                        <div className="mt-2 flex justify-end">
                          <button 
                            onClick={(e) => copyToClipboard(legis.description, `legis-${legis.id}`, e)}
                            className="relative flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-purple-500 transition-all uppercase px-2 py-1 rounded-md hover:bg-purple-50 dark:hover:bg-purple-500/5"
                          >
                            {copyFeedback === `legis-${legis.id}` ? (
                              <span className="text-purple-600 animate-in fade-in zoom-in duration-200">Copiado!</span>
                            ) : (
                              <>
                                <Copy size={12} />
                                Copiar Texto
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                      <Scale size={32} className="opacity-20 mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic text-center">Nenhuma legislação disponível</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* SEÇÃO 6: ARQUIVOS */}
            <section className="space-y-3">
              <button 
                onClick={() => toggleSection('files')}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded">Seção 06</span>
                  <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Arquivos</h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <FileStack size={12} className="text-indigo-500" />
                    <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">
                      {localTask.attachments?.length || 0}
                    </span>
                  </div>
                  <ChevronRight 
                    size={16} 
                    className={`text-slate-300 transition-transform duration-300 ${openSections.files ? 'rotate-90' : ''}`} 
                  />
                </div>
              </button>

              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openSections.files ? 'max-h-[800px] opacity-100 pb-2' : 'max-h-0 opacity-0'}`}>
                <div className="grid grid-cols-1 gap-2">
                  {localTask.attachments && localTask.attachments.length > 0 ? (
                    localTask.attachments.map((file, idx) => (
                      <div 
                        key={idx} 
                        className="group flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-800/60 hover:shadow-lg hover:shadow-indigo-500/5 transition-all"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-indigo-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 transition-colors">
                            <FileBadge size={16} />
                          </div>
                          <div className="flex flex-col min-w-0 pr-4">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{(file.size / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {file.url && (
                            <a 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all active:scale-95"
                              title="Visualizar/Download"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                      <FileBadge size={32} className="opacity-20 mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic text-center">Nenhum anexo disponível</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Footer Audit - Estilo sutil */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm sticky bottom-0">
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 dark:text-slate-600">
            <span>Audit LOG</span>
            {localTask.id && <span>ID: {localTask.id.substring(0, 18)}...</span>}
          </div>
        </div>

      </div>
    </>,
    document.body
  );
};
