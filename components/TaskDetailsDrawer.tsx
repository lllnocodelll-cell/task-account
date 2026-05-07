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
  ChevronDown,
  Briefcase,
  LayoutList,
  CheckCircle2,
  MinusCircle,
  FileStack,
  Scale,
  Copy
} from 'lucide-react';
import { Task, TaskStatus, Priority, TAX_REGIME_LABELS } from '../types';
import { supabase } from '../utils/supabaseClient';

interface TaskDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onEdit: (task: Task) => void;
  onWorkflowToggle?: (taskId: string, workflowId: string, isCompleted: boolean) => void;
  registrationRegimeLabels: Record<string, string>;
}

export const TaskDetailsDrawer: React.FC<TaskDetailsDrawerProps> = ({ 
  isOpen, 
  onClose, 
  task, 
  onEdit,
  onWorkflowToggle,
  registrationRegimeLabels
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [localTask, setLocalTask] = useState<Task | null>(task);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    task: true,
    details: true,
    simples: true,
    obs: true,
    legis: true,
    files: true,
    workflow: true
  });

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

  const handleTransitionEnd = () => {
    if (!isVisible) {
      setShouldRender(false);
      setLocalTask(null);
    }
  };

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyFeedback(fieldId);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleDownload = async (url: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      // Fallback: abre em nova aba se o fetch falhar
      window.open(url, '_blank');
    }
  };

  const toggleWorkflowItem = async (wfId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Otimista - Imediato
    if (localTask?.workflows) {
      setLocalTask(prev => prev ? ({
        ...prev,
        workflows: prev.workflows?.map(wf => wf.id === wfId ? { 
          ...wf, 
          is_completed: newStatus
        } : wf)
      }) : prev);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await (supabase as any)
        .from('task_workflows')
        .update({ 
          is_completed: newStatus,
          completed_by: newStatus ? user?.id : null,
          completed_at: newStatus ? new Date().toISOString() : null
        })
        .eq('id', wfId);

      if (error) throw error;
      
      // Notifica o pai para sincronizar o estado global
      if (localTask?.id) {
        onWorkflowToggle?.(localTask.id, wfId, newStatus);
      }
      
    } catch (error) {
      console.error('Erro ao atualizar workflow:', error);
      // Reverter estado em caso de erro real
      if (localTask?.workflows) {
        setLocalTask(prev => prev ? ({
          ...prev,
          workflows: prev.workflows?.map(wf => wf.id === wfId ? { ...wf, is_completed: currentStatus } : wf)
        }) : prev);
      }
    }
  };

  if (!shouldRender || !localTask) return null;

  const isSimplesNacional = localTask.taxRegime?.includes('simples');

  const InfoField = ({ 
    label, 
    value, 
    id, 
    icon: Icon, 
    valueClassName = "text-sm", 
    color = "indigo" 
  }: { 
    label: string; 
    value: string; 
    id: string; 
    icon?: any;
    valueClassName?: string;
    color?: string;
  }) => (
    <div 
      className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer group"
      onClick={(e) => copyToClipboard(value, id, e)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={10} className="text-slate-400" />}
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          {copyFeedback === id ? (
            <span className="text-[9px] font-bold text-emerald-500 animate-in fade-in slide-in-from-right-1">Copiado!</span>
          ) : (
            <Copy size={10} className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
      <span className={`${valueClassName} font-bold text-slate-700 dark:text-slate-200 break-words leading-tight`}>
        {value || '---'}
      </span>
    </div>
  );

  return createPortal(
    <>
      <div 
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[9998] transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <div 
        onTransitionEnd={handleTransitionEnd}
        className={`fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl z-[9999] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25, 0.1, 0.25, 1)] border-l border-white/20 dark:border-slate-800/50 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 sticky top-0 z-10">
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
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-full transition-all shadow-lg active:scale-95 shadow-indigo-600/20"
            >
              <Pencil size={14} />
              Editar
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
          
          {/* Section 01: Informações Básicas */}
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleSection('task')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Seção 01</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Informações Básicas</span>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${openSections.task ? 'rotate-180' : ''}`} size={16} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${openSections.task ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden">
                <div className="p-4 pt-0 grid grid-cols-1 gap-3">
                  <InfoField label="Nome da Tarefa" value={localTask.taskName} id="task-name" valueClassName="text-base" />
                  <InfoField label="Empresa" value={localTask.clientName} id="client-name" icon={Building2} />
                  
                  {/* Footer Compacto S01 */}
                  <div className="grid grid-cols-2 gap-2 mt-1 border-t border-slate-100 dark:border-slate-800 pt-3 px-1">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <User size={10} className="text-indigo-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Responsável</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate text-center">
                        {localTask.responsible || '---'}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 border-l border-slate-100 dark:border-slate-800 px-1">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Briefcase size={10} className="text-emerald-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Setor</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate text-center">
                        {localTask.sector || '---'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 02: Detalhes da Execução */}
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleSection('details')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Seção 02</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Detalhes da Execução</span>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${openSections.details ? 'rotate-180' : ''}`} size={16} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${openSections.details ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden">
                <div className="p-4 pt-0">

                  {/* Linha 1: Regime Tributário + Regime de Registro */}
                  <div className="grid grid-cols-2 mb-0 px-1">
                    <div className="flex flex-col items-center gap-0.5 py-2.5">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Scale size={10} className="text-indigo-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Regime Tributário</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 text-center leading-tight">
                        {TAX_REGIME_LABELS[localTask.taxRegime || ''] || localTask.taxRegime || '-'}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 py-2.5 border-l border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <FileText size={10} className="text-amber-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Regime de Registro</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 text-center leading-tight">
                        {registrationRegimeLabels[localTask.registrationRegime || ''] || localTask.registrationRegime || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Divisor horizontal entre linhas */}
                  <div className="border-t border-slate-100 dark:border-slate-800 mx-1" />

                  {/* Linha 2: Competência + Vencimento + Movimentação */}
                  <div className="grid grid-cols-3 mb-3 px-1">
                    <div className="flex flex-col items-center gap-0.5 py-2.5">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Calendar size={10} className="text-slate-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Competência</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 text-center">{localTask.competence || '-'}</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 py-2.5 border-l border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Clock size={10} className="text-slate-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Vencimento</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 text-center">{localTask.dueDate?.split('-').reverse().join('/') || '-'}</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 py-2.5 border-l border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Activity size={10} className={localTask.noMovement ? 'text-rose-400' : 'text-emerald-400'} />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Movimentação</span>
                      </div>
                      <span className={`text-[11px] font-bold text-center flex items-center gap-1 ${localTask.noMovement ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {localTask.noMovement ? <><MinusCircle size={10} /> Sem Mov.</> : 'Normal'}
                      </span>
                    </div>
                  </div>

                  {/* Footer Compacto S02: Recorrência, Situação, Prioridade */}
                  <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 pb-4 px-1">
                    {/* Recorrência */}
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Repeat size={10} className="text-indigo-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Recorrência</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate text-center">
                        {localTask.recurrence ? (localTask.recurrence.charAt(0).toUpperCase() + localTask.recurrence.slice(1).toLowerCase()) : 'Única'}
                      </span>
                    </div>

                    {/* Situação */}
                    <div className="flex flex-col items-center gap-0.5 border-l border-slate-100 dark:border-slate-800 px-1">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Activity size={10} className="text-slate-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Situação</span>
                      </div>
                      <div className={`text-[11px] font-black flex items-center justify-center gap-1 ${
                        localTask.status === TaskStatus.CONCLUIDA ? 'text-emerald-500' :
                        localTask.status === TaskStatus.ATRASADA ? 'text-rose-500' :
                        localTask.status === TaskStatus.INICIADA ? 'text-blue-500' :
                        'text-amber-500'
                      }`}>
                        {localTask.status === TaskStatus.CONCLUIDA ? 'Concluída' :
                         localTask.status === TaskStatus.ATRASADA ? 'Atrasada' :
                         localTask.status === TaskStatus.INICIADA ? 'Iniciada' :
                         'Pendente'}
                      </div>
                    </div>

                    {/* Prioridade */}
                    <div className="flex flex-col items-center gap-0.5 border-l border-slate-100 dark:border-slate-800 px-1">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <AlertCircle size={10} className="text-slate-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Prioridade</span>
                      </div>
                      <span className={`text-[11px] font-black uppercase text-center ${
                        localTask.priority === Priority.ALTA ? 'text-red-500' :
                        localTask.priority === Priority.MEDIA ? 'text-amber-500' :
                        'text-slate-500'
                      }`}>
                        {localTask.priority ? (localTask.priority.charAt(0).toUpperCase() + localTask.priority.slice(1).toLowerCase()) : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 03: Simples Nacional */}
          {isSimplesNacional && (
            <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
              <button 
                onClick={() => toggleSection('simples')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Seção 03</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Simples Nacional</span>
                </div>
                <ChevronDown className={`text-slate-400 transition-transform duration-300 ${openSections.simples ? 'rotate-180' : ''}`} size={16} />
              </button>
              <div className={`grid transition-all duration-300 ease-in-out ${openSections.simples ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
                <div className="overflow-hidden">
                  <div className="p-4 pt-0 grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">Fator R</span>
                        <div className="flex items-center justify-center gap-1.5">
                          <Zap size={11} className={localTask.factorR ? 'text-emerald-500' : 'text-slate-300'} fill={localTask.factorR ? 'currentColor' : 'none'} />
                          <span className={`text-[11px] font-bold ${localTask.factorR ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                            {localTask.factorR ? 'Sim' : 'Não'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">Sublimite</span>
                        <div className="flex items-center justify-center gap-1.5">
                          <AlertTriangle size={11} className={localTask.exceededSublimit ? 'text-rose-500' : 'text-slate-300'} />
                          <span className={`text-[11px] font-bold ${localTask.exceededSublimit ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                            {localTask.exceededSublimit ? 'Sim' : 'Não'}
                          </span>
                        </div>
                      </div>
                      <div className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border ${localTask.notifiedExclusion ? 'bg-rose-50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-900/20' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/50'}`}>
                        <span className={`text-[9px] font-black uppercase tracking-wider text-center ${localTask.notifiedExclusion ? 'text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>Notificação</span>
                        <div className="flex items-center justify-center gap-1.5">
                           <AlertCircle size={11} className={localTask.notifiedExclusion ? 'text-rose-500' : 'text-slate-300'} />
                           <span className={`text-[11px] font-bold ${localTask.notifiedExclusion ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                             {localTask.notifiedExclusion ? 'Sim, Notificada' : 'Não'}
                           </span>
                        </div>
                      </div>
                    </div>
                    {localTask.selectedAnnexes && localTask.selectedAnnexes.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Anexos Vinculados</span>
                        <div className="flex flex-wrap gap-2">
                          {localTask.selectedAnnexes.map(annex => (
                            <span key={annex} className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                              <Layers size={10} className="text-indigo-500" />
                              {annex}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 04: Observação */}
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleSection('obs')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md uppercase tracking-wider">Seção 04</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Observação</span>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${openSections.obs ? 'rotate-180' : ''}`} size={16} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${openSections.obs ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden">
                <div className="p-4 pt-0">
                  <div 
                    className="relative p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 group cursor-pointer"
                    onClick={(e) => copyToClipboard(localTask.observation || '', 'obs', e)}
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/40 rounded-l-xl" />
                    <div className="flex justify-between items-start mb-2">
                      <FileText size={14} className="text-slate-400" />
                      {copyFeedback === 'obs' ? (
                        <span className="text-[9px] font-bold text-emerald-500">Copiado!</span>
                      ) : (
                        <Copy size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                    {localTask.observation ? (
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {localTask.observation}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic text-center py-2">Nenhuma observação cadastrada</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 05: Legislação */}
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleSection('legis')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Seção 05</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Legislação</span>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${openSections.legis ? 'rotate-180' : ''}`} size={16} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${openSections.legis ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden">
                <div className="p-4 pt-0 space-y-3">
                  {localTask.clientLegislations && localTask.clientLegislations.length > 0 ? (
                    localTask.clientLegislations.map((legis) => (
                      <div key={legis.id} className="group relative p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer" onClick={(e) => copyToClipboard(legis.description, `legis-${legis.id}`, e)}>
                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/40 rounded-l-xl" />
                        <div className="flex items-center justify-between mb-2">
                          <Scale size={14} className="text-purple-500" />
                          <div className="flex items-center gap-2">
                            {copyFeedback === `legis-${legis.id}` ? (
                              <span className="text-[9px] font-bold text-emerald-500">Copiado!</span>
                            ) : (
                              <Copy size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                            {legis.access_url && (
                              <a 
                                href={legis.access_url.startsWith('http') ? legis.access_url : `https://${legis.access_url}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 px-2 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-md text-[9px] font-black uppercase flex items-center gap-1 hover:bg-purple-200 transition-colors"
                              >
                                Acessar <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                          {legis.description}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-xs italic">Nenhuma legislação disponível</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Seção 06: Workflow (Checklist) */}
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleSection('workflow')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Seção 06</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Workflow de Execução</span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
                  <CheckCircle2 size={10} className="text-emerald-500" />
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">
                    {localTask.workflows?.filter(w => w.is_completed).length || 0}/{localTask.workflows?.length || 0}
                  </span>
                </div>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${openSections.workflow ? 'rotate-180' : ''}`} size={16} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${openSections.workflow ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden">
                <div className="p-4 pt-0 space-y-2">
                  {localTask.workflows && localTask.workflows.length > 0 ? (
                    localTask.workflows.map((wf, idx) => (
                      <button 
                        key={wf.id || idx}
                        type="button"
                        onClick={() => toggleWorkflowItem(wf.id, wf.is_completed)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${wf.is_completed ? 'bg-emerald-50/30 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20 opacity-70' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm hover:shadow-md'}`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${wf.is_completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 bg-transparent text-transparent'}`}>
                          <CheckCircle2 size={12} className={wf.is_completed ? "block" : "hidden"} />
                        </div>
                        <span className={`text-sm font-medium ${wf.is_completed ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                          {wf.description}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-xs italic">Nenhum item de workflow</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Seção 07: Arquivos */}
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleSection('files')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Seção 07</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Arquivos</span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
                  <FileStack size={10} className="text-indigo-500" />
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">{localTask.attachments?.length || 0}</span>
                </div>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${openSections.files ? 'rotate-180' : ''}`} size={16} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${openSections.files ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden">
                <div className="p-4 pt-0 space-y-2">
                  {localTask.attachments && localTask.attachments.length > 0 ? (
                    localTask.attachments.map((file, idx) => (
                      <div 
                        key={idx} 
                        className="group flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-indigo-500 shadow-sm border border-slate-100 dark:border-slate-700">
                            <FileBadge size={16} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{(file.size / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {file.url && (
                             <div className="flex items-center gap-1">
                              <a 
                                href={file.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-indigo-500/10 rounded-lg transition-all"
                                title="Visualizar"
                              >
                                <ExternalLink size={14} />
                              </a>
                              <button 
                                onClick={(e) => handleDownload(file.url, file.name, e)}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-emerald-500/10 rounded-lg transition-all"
                                title="Download"
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-xs italic">Nenhum anexo disponível</div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Audit - Estilo sutil */}
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 dark:text-slate-600">
            <span>Audit LOG</span>
            {localTask.id && <span className="font-mono">ID: {localTask.id.substring(0, 18)}...</span>}
          </div>
        </div>

      </div>
    </>,
    document.body
  );
};
