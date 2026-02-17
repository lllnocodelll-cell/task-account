
import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  XCircle,
  CheckCircle,
  RotateCcw,
  Plus,
  FileText,
  Clock,
  MoreHorizontal,
  X,
  User,
  ExternalLink,
  ListFilter,
  Pencil,
  Save,
  FileBadge,
  LayoutList,
  LayoutGrid,
  GripVertical,
  Calendar,
  AlertCircle,
  CheckSquare,
  Square,
  Info,
  Upload,
  File,
  Trash2,
  MapPin,
  GitMerge,
  FileStack,
  Activity,
  Layers,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Task, TaskStatus, Priority, Client } from '../types';
import { Modal } from '../components/ui/Modal';
import { Input, Select, SearchableSelect, Toggle } from '../components/ui/Input';
import { supabase } from '../utils/supabaseClient';
import { calculateAdjustedDate } from '../utils/dateUtils';

// --- CONFIGS ---

const DF_MODELS = [
  { id: 'nfse', label: 'NFS-e', desc: 'Nota Fiscal de Serviços Eletrônica' },
  { id: 'nfe', label: 'NF-e', desc: 'Nota Fiscal Eletrônica' },
  { id: 'nfce', label: 'NFC-e', desc: 'Nota Fiscal de Consumidor Eletrônica' },
  { id: 'bpe', label: 'BP-e', desc: 'Bilhete de Passagem Eletrônico' },
  { id: 'cte', label: 'CT-e', desc: 'Conhecimento de Transporte Eletrônico' },
  { id: 'mdfe', label: 'MDF-e', desc: 'Manifesto Eletrônico de Documentos Fiscais' },
  { id: 'nf3e', label: 'NF3-e', desc: 'Nota Fiscal de Energia Elétrica Eletrônica' },
  { id: 'nfcom', label: 'NFCom', desc: 'Nota Fiscal Fatura de Serviços de Comunicação Eletrônica' },
  { id: 'nff', label: 'NFF', desc: 'Nota Fiscal Fácil' },
  { id: 'dce', label: 'DC-e', desc: 'Declaração de Conteúdo Eletrônica' },
  { id: 'nfag', label: 'NFAG', desc: 'Nota Fiscal de Água e Esgoto' },
  { id: 'nfabi', label: 'NFABI', desc: 'Nota Fiscal de Alienação de Bens Imóveis' },
  { id: 'nfgas', label: 'NFGAS', desc: 'Nota Fiscal de Gás Canalizado' },
];

const SIMPLES_ANNEXES = ['Anexo I', 'Anexo II', 'Anexo III', 'Anexo IV', 'Anexo V'];

const TAX_REGIME_LABELS: Record<string, string> = {
  'simples': 'Simples Nacional',
  'lp': 'Lucro Presumido',
  'lr': 'Lucro Real',
  'mei': 'MEI'
};

const REGISTRATION_REGIME_LABELS: Record<string, string> = {
  'competencia': 'Competência',
  'caixa': 'Caixa'
};

// --- SHARED COMPONENTS ---

interface HeaderCellProps {
  label: string;
  fieldKey: string;
  filterValue: string;
  widthClass?: string;
  children: React.ReactNode;
  isVisible: boolean;
  onToggle: (key: string) => void;
}

const HeaderCell: React.FC<HeaderCellProps> = ({
  label,
  fieldKey,
  filterValue,
  widthClass,
  children,
  isVisible,
  onToggle
}) => (
  <th className={`px-6 py-4 align-top ${widthClass}`}>
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 h-6">
        <span className="truncate">{label}</span>
        <button
          onClick={() => onToggle(fieldKey)}
          className={`p-1 rounded-md transition-colors ${filterValue || isVisible
            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          title={`Filtrar por ${label}`}
        >
          <ListFilter size={14} strokeWidth={filterValue ? 2.5 : 2} />
        </button>
      </div>
      {isVisible && children}
    </div>
  </th>
);

interface ActionMenuProps {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onConclude: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const ActionMenu: React.FC<ActionMenuProps> = ({ task, onStatusChange, onConclude, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative flex justify-end" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-colors ${isOpen
          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        title="Ações"
      >
        <MoreHorizontal size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 z-50 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
          {task.status !== TaskStatus.CONCLUIDA && (
            <button
              onClick={() => {
                onEdit(task);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <Pencil size={16} className="text-slate-500" /> Editar
            </button>
          )}

          {task.status === TaskStatus.CONCLUIDA ? (
            <button
              onClick={() => {
                onStatusChange(task.id, TaskStatus.PENDENTE);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <RotateCcw size={16} className="text-slate-500" /> Reabrir Tarefa
            </button>
          ) : (
            <>
              {task.status !== TaskStatus.INICIADA && (
                <button
                  onClick={() => {
                    onStatusChange(task.id, TaskStatus.INICIADA);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Play size={16} className="text-blue-500" /> Iniciar
                </button>
              )}

              <button
                onClick={() => {
                  onConclude(task.id);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
              >
                <CheckCircle size={16} className="text-emerald-500" /> Concluir
              </button>

              <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

              <button
                onClick={() => {
                  onStatusChange(task.id, TaskStatus.PENDENTE);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-2"
              >
                <XCircle size={16} /> Cancelar
              </button>
            </>
          )}

          <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

          <button
            onClick={() => {
              if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                onDelete(task.id);
                setIsOpen(false);
              }
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
          >
            <Trash2 size={16} /> Excluir Tarefa
          </button>
        </div>
      )}
    </div>
  );
};

// --- Kanban Column Component ---
interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onConclude: (id: string) => void;
  onDelete: (id: string) => void;
  color: string;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDrop: (e: React.DragEvent, status: TaskStatus) => void;
  onNavigateToClient?: (clientId: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  status,
  tasks,
  onEdit,
  onConclude,
  onDelete,
  color,
  onDragStart,
  onDrop,
  onNavigateToClient
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Avoid flickering when entering children
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(e, status);
  };

  return (
    <div
      className={`flex flex-col h-full rounded-xl p-3 border transition-colors duration-200
        ${isDragOver
          ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-300 dark:border-indigo-700 shadow-inner'
          : 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
        }`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`flex items-center justify-between mb-3 px-1 pb-2 border-b-2 ${color}`}>
        <h3 className="font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
        <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs px-2 py-0.5 rounded-full font-bold">
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 min-h-[100px]">
        {tasks.map(task => (
          <div
            key={task.id}
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow active:cursor-grabbing group select-none ${task.status === TaskStatus.CONCLUIDA ? 'cursor-default' : 'cursor-pointer'}`}
            onClick={() => task.status !== TaskStatus.CONCLUIDA && onEdit(task)}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${task.priority === Priority.ALTA ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                task.priority === Priority.MEDIA ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                {task.priority}
              </span>
              <div className="flex items-center gap-1">
                <GripVertical size={14} className="text-slate-300 dark:text-slate-600" />
                <span className="text-xs text-slate-400">{task.responsible.split(' ')[0]}</span>
              </div>
            </div>

            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 line-clamp-2">{task.taskName}</h4>
            <div className="flex items-center gap-1.5 group/client cursor-pointer" onClick={(e) => {
              e.stopPropagation();
              task.clientId && onNavigateToClient?.(task.clientId);
            }}>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5 truncate flex-1">{task.clientName}</p>
              <User size={12} className="text-indigo-400 opacity-0 group-hover/client:opacity-100 transition-opacity" />
            </div>
            {(task.clientCity || task.clientState) && (
              <div className="flex items-center gap-1 mb-1 text-[10px] text-slate-400">
                <MapPin size={10} className="text-slate-300 dark:text-slate-500" />
                <span className="truncate">{task.clientCity}{task.clientCity && task.clientState ? ', ' : ''}{task.clientState}</span>
              </div>
            )}
            {task.hasBranches && (
              <div className="flex items-center gap-1 mb-1 text-[10px] text-indigo-500 dark:text-indigo-400 font-bold">
                <GitMerge size={10} />
                <span>Filiais</span>
              </div>
            )}
            {task.selectedDfes && task.selectedDfes.length > 0 && (
              <div className="flex items-center gap-1 mb-2 text-[10px] text-slate-400">
                <FileStack size={10} className="text-slate-300 dark:text-slate-500" />
                <span className="truncate">DF-e: {task.selectedDfes.map(dfe => dfe.toUpperCase()).join(', ')}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
              <span className="text-xs text-slate-400">{task.competence}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {status !== TaskStatus.CONCLUIDA && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onConclude(task.id);
                    }}
                    className="text-emerald-500 hover:text-emerald-600 p-1"
                    title="Concluir Rápido"
                  >
                    <CheckCircle size={16} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                      onDelete(task.id);
                    }
                  }}
                  className="text-red-400 hover:text-red-500 p-1"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {tasks.length === 0 && !isDragOver && (
          <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-slate-400 text-xs text-center p-4">
            Arraste tarefas para cá
          </div>
        )}
        {isDragOver && (
          <div className="h-24 border-2 border-dashed border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center text-indigo-500 text-xs text-center p-4 animate-pulse">
            Solte aqui
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN TASKS PAGE ---

export const Tasks: React.FC<{ onNavigateToClient?: (clientId: string) => void }> = ({ onNavigateToClient }) => {
  const [viewState, setViewState] = useState<'list' | 'create' | 'edit'>('list');
  const [layoutMode, setLayoutMode] = useState<'list' | 'kanban'>('list');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [concludeModalOpen, setConcludeModalOpen] = useState(false);
  const [selectedTaskForConclude, setSelectedTaskForConclude] = useState<string | null>(null);
  const [concludeFiles, setConcludeFiles] = useState<File[]>([]);
  const concludeFileInputRef = useRef<HTMLInputElement>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Filter Values State
  const [filters, setFilters] = useState({
    clientName: '',
    taskName: '',
    competence: '',
    taxRegime: '',
    priority: '',
    sector: '',
    responsible: '',
    status: '',
  });

  // Filter Visibility State
  const [visibleFilters, setVisibleFilters] = useState<Record<string, boolean>>({});

  const toggleFilterVisibility = (field: string) => {
    setVisibleFilters(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Derived filtered tasks
  const filteredTasks = tasks.filter((task) => {
    return (
      task.clientName.toLowerCase().includes(filters.clientName.toLowerCase()) &&
      task.taskName.toLowerCase().includes(filters.taskName.toLowerCase()) &&
      task.competence.toLowerCase().includes(filters.competence.toLowerCase()) &&
      (filters.taxRegime === '' || task.taxRegime === filters.taxRegime) &&
      (filters.priority === '' || task.priority === filters.priority) &&
      (filters.sector === '' || task.sector === filters.sector) &&
      task.responsible.toLowerCase().includes(filters.responsible.toLowerCase()) &&
      (filters.status === '' || task.status === filters.status)
    );
  });

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      clientName: '',
      taskName: '',
      competence: '',
      taxRegime: '',
      priority: '',
      sector: '',
      responsible: '',
      status: '',
    });
    setVisibleFilters({});
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          clients(city, state, has_branches),
          attachments:task_attachments(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Map DB fields to component Task type if names differ
        const mappedTasks: Task[] = data.map((t: any) => ({
          id: t.id,
          clientId: t.client_id,
          clientName: t.client_name,
          taskName: t.task_name,
          competence: t.competence,
          taxRegime: t.tax_regime,
          priority: t.priority as Priority,
          sector: t.sector,
          responsible: t.responsible,
          status: t.status as TaskStatus,
          dueDate: t.due_date,
          variableAdjustment: t.variable_adjustment,
          recurrence: t.recurrence,
          recurrenceMonths: t.recurrence_months,
          registrationRegime: t.registration_regime,
          observation: t.observation,
          noMovement: t.no_movement,
          exceededSublimit: t.exceeded_sublimit,
          factorR: t.factor_r,
          selectedAnnexes: t.selected_annexes,
          selectedDfes: t.selected_dfes,
          clientCity: t.clients?.city,
          clientState: t.clients?.state,
          hasBranches: t.clients?.has_branches,
          attachments: t.attachments?.map((a: any) => ({
            name: a.file_name,
            size: a.file_size,
            url: a.download_url
          }))
        }));
        setTasks(mappedTasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // CRUD Handlers
  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setViewState('edit');
  };

  const handleCreate = () => {
    setSelectedTask(null);
    setViewState('create');
  };

  // Status Handlers
  const handleStatusChange = async (id: string, newStatus: TaskStatus) => {
    try {
      const { error } = await (supabase
        .from('tasks') as any)
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erro ao atualizar status da tarefa');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (error: any) {
      console.error('Error deleting task:', error);
      alert('Erro ao excluir tarefa: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const openConcludeModal = (id: string) => {
    setSelectedTaskForConclude(id);
    setConcludeFiles([]);
    setConcludeModalOpen(true);
  };

  const handleConcludeTask = async () => {
    if (selectedTaskForConclude) {
      try {
        setLoading(true);

        // 1. Update Status
        const { error: statusError } = await (supabase
          .from('tasks') as any)
          .update({ status: TaskStatus.CONCLUIDA })
          .eq('id', selectedTaskForConclude);

        if (statusError) throw statusError;

        // 2. Insert Conclusion Attachments
        if (concludeFiles.length > 0) {
          for (const file of concludeFiles) {
            await supabase.from('task_attachments').insert({
              task_id: selectedTaskForConclude,
              file_name: file.name,
              file_size: file.size,
              storage_path: `tasks/${selectedTaskForConclude}/conclude/${file.name}`,
              is_conclude_attachment: true
            } as any);
          }
        }

        // 3. Local Refresh or Refetch
        await fetchTasks();

        setConcludeModalOpen(false);
        setSelectedTaskForConclude(null);
        setConcludeFiles([]);
      } catch (error: any) {
        console.error('Error concluding task:', error);
        alert('Erro ao concluir tarefa: ' + (error.message || 'Erro desconhecido'));
      } finally {
        setLoading(false);
      }
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    const taskId = draggedTaskId || e.dataTransfer.getData('text/plain');
    if (taskId) {
      handleStatusChange(taskId, targetStatus);
      setDraggedTaskId(null);
    }
  };

  const headerInputClass = "mt-2 w-full h-8 text-xs px-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-sm animate-in fade-in slide-in-from-top-1 duration-200";

  if (viewState === 'create' || viewState === 'edit') {
    return (
      <TaskForm
        onBack={() => {
          setViewState('list');
          fetchTasks();
        }}
        initialData={selectedTask}
      />
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestão de Tarefas</h1>
          <p className="text-slate-500 dark:text-slate-400">Controle operacional e acompanhamento de prazos</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setLayoutMode('list')}
              className={`p-2 rounded transition-colors ${layoutMode === 'list' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
              title="Visualização em Lista"
            >
              <LayoutList size={18} />
            </button>
            <button
              onClick={() => setLayoutMode('kanban')}
              className={`p-2 rounded transition-colors ${layoutMode === 'kanban' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
              title="Visualização Kanban"
            >
              <LayoutGrid size={18} />
            </button>
          </div>

          <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg px-3 border border-slate-200 dark:border-slate-800 h-10 group focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Calendar size={16} className="text-slate-400 mr-2 group-focus-within:text-indigo-500" />
            <input
              type="month"
              className="bg-transparent border-none text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-0 p-0 w-36 uppercase"
              value={filters.competence}
              onChange={(e) => handleFilterChange('competence', e.target.value)}
              title="Filtrar por Competência"
            />
            {filters.competence && (
              <button
                onClick={() => handleFilterChange('competence', '')}
                className="ml-1 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <Button
            variant="secondary"
            onClick={clearFilters}
            icon={<X size={16} />}
            className="text-xs hidden md:flex"
            disabled={Object.values(filters).every(v => v === '')}
          >
            Limpar
          </Button>
          <Button onClick={handleCreate} icon={<Plus size={18} />}>Nova Tarefa</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <MetricCard title="Pendentes" value={tasks.filter(t => t.status === TaskStatus.PENDENTE).length} icon={<Clock size={20} />} color="indigo" />
        <MetricCard title="Em Andamento" value={tasks.filter(t => t.status === TaskStatus.INICIADA).length} icon={<Play size={20} />} color="amber" />
        <MetricCard title="Atrasadas" value={tasks.filter(t => t.status === TaskStatus.ATRASADA).length} icon={<XCircle size={20} />} color="rose" />
        <MetricCard title="Concluídas" value={tasks.filter(t => t.status === TaskStatus.CONCLUIDA).length} icon={<CheckCircle size={20} />} color="emerald" />
      </div>

      {
        loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RotateCcw className="animate-spin text-indigo-500" size={32} />
              <p className="text-sm text-slate-500">Carregando tarefas...</p>
            </div>
          </div>
        ) : layoutMode === 'list' ? (
          <Card className="overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="overflow-auto custom-scrollbar flex-1">
              <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-200 uppercase font-medium text-xs sticky top-0 z-10 shadow-sm">
                  <tr>
                    <HeaderCell
                      label="Cliente"
                      fieldKey="clientName"
                      filterValue={filters.clientName}
                      isVisible={!!visibleFilters['clientName']}
                      onToggle={toggleFilterVisibility}
                      widthClass="min-w-[200px]"
                    >
                      <input
                        type="text"
                        placeholder="Buscar cliente..."
                        className={headerInputClass}
                        value={filters.clientName}
                        onChange={(e) => handleFilterChange('clientName', e.target.value)}
                        autoFocus
                      />
                    </HeaderCell>

                    <HeaderCell
                      label="Tarefa"
                      fieldKey="taskName"
                      filterValue={filters.taskName}
                      isVisible={!!visibleFilters['taskName']}
                      onToggle={toggleFilterVisibility}
                      widthClass="min-w-[180px]"
                    >
                      <input
                        type="text"
                        placeholder="Nome da tarefa..."
                        className={headerInputClass}
                        value={filters.taskName}
                        onChange={(e) => handleFilterChange('taskName', e.target.value)}
                        autoFocus
                      />
                    </HeaderCell>

                    <HeaderCell
                      label="Período"
                      fieldKey="competence"
                      filterValue={filters.competence}
                      isVisible={!!visibleFilters['competence']}
                      onToggle={toggleFilterVisibility}
                      widthClass="min-w-[110px]"
                    >
                      <input
                        type="month"
                        className={headerInputClass}
                        value={filters.competence}
                        onChange={(e) => handleFilterChange('competence', e.target.value)}
                        autoFocus
                      />
                    </HeaderCell>

                    <HeaderCell
                      label="Regime"
                      fieldKey="taxRegime"
                      filterValue={filters.taxRegime}
                      isVisible={!!visibleFilters['taxRegime']}
                      onToggle={toggleFilterVisibility}
                      widthClass="min-w-[200px]"
                    >
                      <select
                        className={headerInputClass}
                        value={filters.taxRegime}
                        onChange={(e) => handleFilterChange('taxRegime', e.target.value)}
                        autoFocus
                      >
                        <option value="">Todos</option>
                        {Object.entries(TAX_REGIME_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </HeaderCell>

                    <HeaderCell
                      label="Prioridade"
                      fieldKey="priority"
                      filterValue={filters.priority}
                      isVisible={!!visibleFilters['priority']}
                      onToggle={toggleFilterVisibility}
                      widthClass="min-w-[120px]"
                    >
                      <select
                        className={headerInputClass}
                        value={filters.priority}
                        onChange={(e) => handleFilterChange('priority', e.target.value)}
                        autoFocus
                      >
                        <option value="">Todas</option>
                        <option value="Alta">Alta</option>
                        <option value="Média">Média</option>
                        <option value="Baixa">Baixa</option>
                      </select>
                    </HeaderCell>

                    <HeaderCell
                      label="Responsável"
                      fieldKey="responsible"
                      filterValue={filters.responsible}
                      isVisible={!!visibleFilters['responsible']}
                      onToggle={toggleFilterVisibility}
                      widthClass="min-w-[150px]"
                    >
                      <input
                        type="text"
                        placeholder="Nome..."
                        className={headerInputClass}
                        value={filters.responsible}
                        onChange={(e) => handleFilterChange('responsible', e.target.value)}
                        autoFocus
                      />
                    </HeaderCell>

                    <HeaderCell
                      label="Status"
                      fieldKey="status"
                      filterValue={filters.status}
                      isVisible={!!visibleFilters['status']}
                      onToggle={toggleFilterVisibility}
                      widthClass="min-w-[130px]"
                    >
                      <select
                        className={headerInputClass}
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        autoFocus
                      >
                        <option value="">Todos</option>
                        <option value={TaskStatus.PENDENTE}>{TaskStatus.PENDENTE}</option>
                        <option value={TaskStatus.INICIADA}>{TaskStatus.INICIADA}</option>
                        <option value={TaskStatus.ATRASADA}>{TaskStatus.ATRASADA}</option>
                        <option value={TaskStatus.CONCLUIDA}>{TaskStatus.CONCLUIDA}</option>
                      </select>
                    </HeaderCell>

                    <th className="px-6 py-4 w-[80px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        Nenhuma tarefa encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => (
                      <tr key={task.id} className="group relative hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div
                              className="flex items-center gap-2 group/client cursor-pointer w-fit"
                              onClick={() => task.clientId && onNavigateToClient?.(task.clientId)}
                              title="Ver cadastro do cliente"
                            >
                              <span className="font-medium text-slate-900 dark:text-white">{task.clientName}</span>
                              <User size={14} className="text-indigo-400 opacity-0 group-hover/client:opacity-100 transition-opacity" />
                            </div>
                            {(task.clientCity || task.clientState) && (
                              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-medium">
                                <MapPin size={10} className="text-slate-300" />
                                <span>{task.clientCity}{task.clientCity && task.clientState ? ', ' : ''}{task.clientState}</span>
                              </div>
                            )}
                            {task.hasBranches && (
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-indigo-500 dark:text-indigo-400 font-bold">
                                <GitMerge size={10} />
                                <span>Filiais</span>
                              </div>
                            )}
                            {task.selectedDfes && task.selectedDfes.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-medium">
                                <FileStack size={10} className="text-slate-300" />
                                <span>DF-e: {task.selectedDfes.map(dfe => dfe.toUpperCase()).join(', ')}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">{task.taskName}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900 dark:text-white uppercase">{task.competence}</span>
                            {task.dueDate && (
                              <div
                                className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-medium cursor-help"
                                title="Vencimento"
                              >
                                <Calendar size={10} className="text-slate-300" />
                                <span>{task.dueDate.split('-').reverse().join('/')}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {TAX_REGIME_LABELS[task.taxRegime] || task.taxRegime}
                            </span>

                            {task.registrationRegime && (
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                <Activity size={10} className="text-slate-300" />
                                <span>{REGISTRATION_REGIME_LABELS[task.registrationRegime] || task.registrationRegime}</span>
                              </div>
                            )}

                            {task.taxRegime === 'simples' && (
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                {task.selectedAnnexes && task.selectedAnnexes.length > 0 && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                    <Layers size={10} className="text-slate-300" />
                                    <span>Anexos: {task.selectedAnnexes.map(a => a.replace('Anexo ', '')).join(', ')}</span>
                                  </div>
                                )}
                                {task.factorR && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-indigo-500 font-bold">
                                    <Zap size={10} fill="currentColor" />
                                    <span>Fator R</span>
                                  </div>
                                )}
                                {task.exceededSublimit && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-bold">
                                    <AlertTriangle size={10} />
                                    <span>Excedeu Sublimite</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${task.priority === Priority.ALTA ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            task.priority === Priority.MEDIA ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">{task.responsible}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${task.status === TaskStatus.CONCLUIDA ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                            task.status === TaskStatus.ATRASADA ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                              task.status === TaskStatus.INICIADA ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' :
                                'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            }`}>
                            {task.status === TaskStatus.CONCLUIDA && <CheckCircle size={12} />}
                            {task.status === TaskStatus.ATRASADA && <XCircle size={12} />}
                            {task.status === TaskStatus.INICIADA && <Play size={12} />}
                            {task.status === TaskStatus.PENDENTE && <Clock size={12} />}
                            {task.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <ActionMenu
                            task={task}
                            onStatusChange={handleStatusChange}
                            onConclude={openConcludeModal}
                            onEdit={handleEdit}
                            onDelete={handleDeleteTask}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 h-full min-w-[1000px] pb-2">
              <div className="flex-1 min-w-[250px]">
                <KanbanColumn
                  title="Pendente"
                  status={TaskStatus.PENDENTE}
                  tasks={filteredTasks.filter(t => t.status === TaskStatus.PENDENTE)}
                  onEdit={handleEdit}
                  onConclude={openConcludeModal}
                  onDelete={handleDeleteTask}
                  color="border-slate-400"
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  onNavigateToClient={onNavigateToClient}
                />
              </div>
              <div className="flex-1 min-w-[250px]">
                <KanbanColumn
                  title="Em Andamento"
                  status={TaskStatus.INICIADA}
                  tasks={filteredTasks.filter(t => t.status === TaskStatus.INICIADA)}
                  onEdit={handleEdit}
                  onConclude={openConcludeModal}
                  onDelete={handleDeleteTask}
                  color="border-amber-400"
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  onNavigateToClient={onNavigateToClient}
                />
              </div>
              <div className="flex-1 min-w-[250px]">
                <KanbanColumn
                  title="Atrasadas"
                  status={TaskStatus.ATRASADA}
                  tasks={filteredTasks.filter(t => t.status === TaskStatus.ATRASADA)}
                  onEdit={handleEdit}
                  onConclude={openConcludeModal}
                  onDelete={handleDeleteTask}
                  color="border-rose-400"
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  onNavigateToClient={onNavigateToClient}
                />
              </div>
              <div className="flex-1 min-w-[250px]">
                <KanbanColumn
                  title="Concluídas"
                  status={TaskStatus.CONCLUIDA}
                  tasks={filteredTasks.filter(t => t.status === TaskStatus.CONCLUIDA)}
                  onEdit={handleEdit}
                  onConclude={openConcludeModal}
                  onDelete={handleDeleteTask}
                  color="border-emerald-400"
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  onNavigateToClient={onNavigateToClient}
                />
              </div>
            </div>
          </div>
        )
      }

      {/* Confirmation Modal */}
      <Modal
        isOpen={concludeModalOpen}
        onClose={() => setConcludeModalOpen(false)}
        title="Concluir Tarefa"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConcludeModalOpen(false)}>Cancelar</Button>
            <Button variant="success" onClick={handleConcludeTask}>Confirmar Conclusão</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300">
            Tem certeza que deseja marcar esta tarefa como concluída? Você pode anexar arquivos de comprovante abaixo se desejar.
          </p>

          <div className="space-y-3">
            <input
              type="file"
              ref={concludeFileInputRef}
              onChange={(e) => {
                if (e.target.files) {
                  setConcludeFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                }
              }}
              className="hidden"
              multiple
            />

            <div
              onClick={() => concludeFileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
            >
              <Upload size={20} className="text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Clique para anexar comprovantes</p>
              <p className="text-[10px] text-slate-400 mt-0.5">PDF, PNG, JPG (Opcional)</p>
            </div>

            {concludeFiles.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                {concludeFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <File size={12} className="text-indigo-500 shrink-0" />
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{file.name}</span>
                    </div>
                    <button
                      onClick={() => setConcludeFiles(files => files.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div >
  );
};

// --- TASK FORM COMPONENT ---

const TaskForm: React.FC<{ onBack: () => void; initialData?: Task | null }> = ({ onBack, initialData }) => {
  const isEditing = !!initialData;
  const [activeTab, setActiveTab] = useState(initialData?.taxRegime === 'simples' ? 'simples' : 'observacao');
  const [taxRegime, setTaxRegime] = useState(initialData?.taxRegime || 'simples');
  const [regimeRegistro, setRegimeRegistro] = useState(initialData?.registrationRegime || 'competencia');
  const [semMovimento, setSemMovimento] = useState(initialData?.noMovement || false);
  const [selectedDfe, setSelectedDfe] = useState<string[]>(initialData?.selectedDfes || []);
  const [selectedAnnexes, setSelectedAnnexes] = useState<string[]>(initialData?.selectedAnnexes || []);
  const [excedeuSublimite, setExcedeuSublimite] = useState(initialData?.exceededSublimit || false);
  const [fatorR, setFatorR] = useState(initialData?.factorR || false);
  const [observation, setObservation] = useState(initialData?.observation || '');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<{ name: string; size: number; url?: string }[]>(initialData?.attachments || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Data State
  const [taskTypes, setTaskTypes] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [holidayDates, setHolidayDates] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState(initialData?.clientName || '');

  // Multi-task State
  const [pendingTasks, setPendingTasks] = useState<any[]>(
    initialData ? [{
      id: initialData.id,
      taskName: initialData.taskName,
      sector: initialData.sector,
      responsible: initialData.responsible,
      competence: initialData.competence,
      vencimento: initialData.dueDate || '',
      vencimentoVariavel: initialData.variableAdjustment || 'nao_aplica',
      recurrence: initialData.recurrence || 'mensal',
      months: initialData.recurrenceMonths || [],
      priority: initialData.priority || Priority.MEDIA
    }] : []
  );

  const [tempTask, setTempTask] = useState({
    taskTypeId: '',
    taskName: initialData?.taskName || '',
    sector: initialData?.sector || '',
    responsible: initialData?.responsible || '',
    priority: initialData?.priority || Priority.MEDIA,
    competence: initialData?.competence || new Date().toISOString().substring(0, 7), // YYYY-MM
    vencimento: initialData?.dueDate || '',
    vencimentoVariavel: initialData?.variableAdjustment || 'nao_aplica',
    recurrence: initialData?.recurrence || 'mensal',
    months: initialData?.recurrenceMonths || [] as number[],
  });


  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [taskTypesRes, sectorsRes, membersRes, clientsRes, holidaysRes] = await Promise.all([
        supabase.from('task_types').select('*').eq('org_id', user.id),
        supabase.from('sectors').select('*').eq('org_id', user.id),
        supabase.from('members').select('*').eq('org_id', user.id),
        supabase.from('clients').select('*').eq('org_id', user.id).eq('status', 'Ativo'),
        supabase.from('holidays').select('date').eq('org_id', user.id)
      ]);

      if (taskTypesRes.data) setTaskTypes(taskTypesRes.data);
      if (sectorsRes.data) setSectors(sectorsRes.data);
      if (membersRes.data) setMembers(membersRes.data);
      if (holidaysRes.data) setHolidayDates(holidaysRes.data.map((h: any) => h.date));
      if (clientsRes.data) {
        const mappedClients: Client[] = clientsRes.data.map((c: any) => ({
          id: c.id,
          code: c.code,
          companyName: c.company_name,
          tradeName: c.trade_name,
          status: c.status
        })) as any;
        setClients(mappedClients);
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const toggleDfe = (id: string) => {
    setSelectedDfe(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAnnex = (annex: string) => {
    setSelectedAnnexes(prev =>
      prev.includes(annex) ? prev.filter(x => x !== annex) : [...prev, annex]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddPendingTask = () => {
    if (!tempTask.taskName || !tempTask.responsible || !tempTask.competence) {
      return alert('Preencha os campos obrigatórios da tarefa (Tarefa, Responsável e Competência)');
    }
    if (tempTask.recurrence !== 'mensal' && tempTask.recurrence !== 'unica' && tempTask.months.length === 0) {
      return alert('Selecione pelo menos um mês para esta recorrência');
    }
    setPendingTasks([...pendingTasks, { ...tempTask, id: Date.now().toString() }]);
    setTempTask(prev => ({
      ...prev,
      taskTypeId: '',
      taskName: '',
      sector: '',
      months: [],
      // keep responsible, competence and recurrence as they might be the same for next item
    }));
  };

  const removePendingTask = (id: string) => {
    setPendingTasks(pendingTasks.filter(t => t.id !== id));
  };

  const handleSaveAll = async () => {
    // Find client ID
    const client = clients.find(c => c.companyName === selectedClientId);
    if (!client) return alert('Selecione uma empresa válida');

    if (pendingTasks.length === 0 && !tempTask.taskName) return alert('Adicione pelo menos uma tarefa');

    let tasksToSave = [...pendingTasks];
    if (tasksToSave.length === 0 && tempTask.taskName) {
      tasksToSave.push({ ...tempTask, id: 'temp-' + Date.now() });
    }

    try {
      setLoadingData(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert('Usuário não autenticado');

      const allPayloads: any[] = [];

      for (const t of tasksToSave) {
        // Recurrence logic: if it's a NEW task, we expand it. If editing, we only update the specific one.
        if (isEditing && t.id === initialData.id) {
          const adjustedDate = calculateAdjustedDate(t.vencimento, t.vencimentoVariavel, holidayDates);
          allPayloads.push({
            id: t.id,
            client_id: client.id,
            client_name: client.companyName,
            task_name: t.taskName,
            sector: t.sector,
            responsible: t.responsible,
            competence: t.competence,
            due_date: adjustedDate || null,
            variable_adjustment: t.vencimentoVariavel,
            priority: t.priority,
            status: initialData.status,
            recurrence: t.recurrence,
            recurrence_months: t.months,
            tax_regime: taxRegime,
            registration_regime: regimeRegistro,
            no_movement: semMovimento,
            exceeded_sublimit: excedeuSublimite,
            factor_r: fatorR,
            selected_annexes: selectedAnnexes,
            selected_dfes: selectedDfe,
            observation: observation,
            org_id: user.id
          });
        } else {
          // Expansion logic for creation
          const [startYear, startMonth] = t.competence.split('-').map(Number);

          let monthOffset = 0;
          let baseDay = 10;

          if (t.vencimento) {
            const dDate = new Date(t.vencimento + 'T12:00:00');
            const dYear = dDate.getFullYear();
            const dMonth = dDate.getMonth() + 1;
            monthOffset = (dYear - startYear) * 12 + (dMonth - startMonth);
            baseDay = dDate.getDate();
          }

          const createIteration = (month: number, year: number) => {
            const compStr = `${year}-${month.toString().padStart(2, '0')}`;

            // Calculate base due date by applying the same month offset and day
            const targetDueDate = new Date(year, (month - 1) + monthOffset, baseDay, 12, 0, 0);
            const yearVal = targetDueDate.getFullYear();
            const monthVal = (targetDueDate.getMonth() + 1).toString().padStart(2, '0');
            const dayVal = targetDueDate.getDate().toString().padStart(2, '0');
            const rawDueStr = `${yearVal}-${monthVal}-${dayVal}`;

            const finalDate = calculateAdjustedDate(rawDueStr, t.vencimentoVariavel, holidayDates);

            allPayloads.push({
              client_id: client.id,
              client_name: client.companyName,
              task_name: t.taskName,
              sector: t.sector,
              responsible: t.responsible,
              competence: compStr,
              due_date: finalDate,
              variable_adjustment: t.vencimentoVariavel,
              priority: t.priority,
              status: TaskStatus.PENDENTE,
              recurrence: t.recurrence,
              recurrence_months: t.months,
              tax_regime: taxRegime,
              registration_regime: regimeRegistro,
              no_movement: semMovimento,
              exceeded_sublimit: excedeuSublimite,
              factor_r: fatorR,
              selected_annexes: selectedAnnexes,
              selected_dfes: selectedDfe,
              observation: observation,
              org_id: user.id
            });
          };

          if (t.recurrence === 'mensal') {
            for (let m = startMonth; m <= 12; m++) {
              createIteration(m, startYear);
            }
          } else if (t.recurrence === 'unica') {
            createIteration(startMonth, startYear);
          } else {
            // Periodic: register month + chosen months in the future
            const months = t.months || [];
            const iterations = new Set<number>();
            iterations.add(startMonth);
            months.forEach((m: number) => {
              if (m > startMonth) iterations.add(m); // Check for strictly greater as startMonth is added above
            });

            Array.from(iterations).sort((a, b) => a - b).forEach(m => {
              createIteration(m, startYear);
            });
          }
        }
      }

      for (const payload of allPayloads) {
        let taskData;
        let taskError;

        if (payload.id) {
          const { data, error } = await (supabase
            .from('tasks') as any)
            .update(payload)
            .eq('id', payload.id)
            .select()
            .single();
          taskData = data;
          taskError = error;
        } else {
          const { data, error } = await (supabase
            .from('tasks') as any)
            .insert(payload)
            .select()
            .single();
          taskData = data;
          taskError = error;
        }

        if (taskError) throw taskError;

        // 2. Upload and Link Files
        if (uploadedFiles.length > 0 && taskData) {
          for (const file of uploadedFiles) {
            await (supabase.from('task_attachments') as any).insert({
              task_id: (taskData as any).id,
              file_name: file.name,
              file_size: file.size,
              storage_path: `tasks/${(taskData as any).id}/${file.name}`,
              is_conclude_attachment: false
            });
          }
        }
      }

      alert(`${tasksToSave.length} tarefa(s) cadastrada(s) com sucesso!`);
      onBack();
    } catch (error: any) {
      console.error('Error saving tasks:', error);
      alert('Erro ao salvar tarefas: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoadingData(false);
    }
  };

  const tabs = [
    { id: 'recorrencia', label: 'Recorrência' },
    { id: 'simples', label: 'Simples Nacional' },
    { id: 'observacao', label: 'Observação' },
    { id: 'dfe', label: 'Modelos DF-e' },
    { id: 'arquivos', label: 'Arquivos' },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isEditing ? `Editando: ${initialData.taskName}` : 'Cadastro de Tarefas em Lote'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            {isEditing ? `Cliente: ${initialData.clientName}` : 'Selecione o cliente e adicione as tarefas operacionais'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onBack}>Cancelar</Button>
          <Button icon={<Save size={18} />} onClick={handleSaveAll}>
            {isEditing ? 'Salvar Alterações' : `Criar ${pendingTasks.length || (tempTask.taskName ? 1 : 0)} Tarefa(s)`}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA: CONTEXTO DO CLIENTE */}
        <div className="lg:col-span-4 space-y-6">
          <Card title="Contexto do Cliente">
            <div className="space-y-6">
              <SearchableSelect
                label="Empresa"
                options={clients.map(c => ({
                  value: c.companyName,
                  label: c.companyName
                }))}
                value={selectedClientId}
                onChange={(val) => setSelectedClientId(val)}
                placeholder="Selecione a empresa..."
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Regime Tributário"
                  options={[
                    { value: 'simples', label: 'Simples Nacional' },
                    { value: 'lp', label: 'Lucro Presumido' },
                    { value: 'lr', label: 'Lucro Real' },
                    { value: 'mei', label: 'MEI' },
                  ]}
                  value={taxRegime}
                  onChange={(e) => setTaxRegime(e.target.value)}
                />
                <Select
                  label="Regime de Registro"
                  options={[
                    { value: 'competencia', label: 'Competência' },
                    { value: 'caixa', label: 'Caixa' },
                    { value: 'misto', label: 'Misto' },
                  ]}
                  value={regimeRegistro}
                  onChange={(e) => setRegimeRegistro(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 py-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSemMovimento(!semMovimento)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${semMovimento ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${semMovimento ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Sem Movimento</span>
              </div>
            </div>
          </Card>

          {/* TABBARS REDUZIDAS PARA CONTEXTO GERAL */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto bg-slate-50 dark:bg-slate-900/50">
              {tabs
                .filter(t => t.id !== 'recorrencia')
                .map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
            </div>
            <div className="p-4 max-h-[400px] overflow-auto custom-scrollbar">
              {activeTab === 'simples' && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4">
                    <Toggle label="Excedeu Sublimite?" value={excedeuSublimite} onChange={setExcedeuSublimite} />
                    <Toggle label="Fator R" value={fatorR} onChange={setFatorR} />
                  </div>
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anexos</h4>
                    <div className="flex flex-wrap gap-2">
                      {SIMPLES_ANNEXES.map((annex) => (
                        <button
                          key={annex}
                          type="button"
                          onClick={() => toggleAnnex(annex)}
                          className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${selectedAnnexes.includes(annex)
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30'
                            : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700'
                            }`}
                        >
                          {annex}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'observacao' && (
                <textarea
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  className="w-full h-32 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Observações gerais para este cliente..."
                />
              )}

              {activeTab === 'dfe' && (
                <div className="grid grid-cols-3 gap-2">
                  {DF_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => toggleDfe(model.id)}
                      className={`p-2 rounded border text-[10px] font-bold transition-all ${selectedDfe.includes(model.id)
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:border-indigo-300'
                        }`}
                    >
                      {model.label}
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'arquivos' && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    multiple
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                      <Upload size={24} />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Clique ou arraste arquivos</p>
                    <p className="text-xs text-slate-500 mt-1">PDF, PNG, JPG ou DOC (Máx. 10MB)</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2">Arquivos selecionados</h4>
                    {(uploadedFiles.length === 0 && existingAttachments.length === 0) ? (
                      <div className="text-center py-4 text-xs text-slate-400 italic bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        Nenhum arquivo anexado ainda.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Existing Attachments */}
                        {existingAttachments.map((file, idx) => (
                          <div key={`existing-${idx}`} className="flex items-center justify-between p-2 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:underline truncate"
                              >
                                {file.name}
                              </a>
                              <span className="text-[10px] text-slate-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                            <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 rounded">Existente</span>
                          </div>
                        ))}

                        {/* New Uploads */}
                        {uploadedFiles.map((file, idx) => (
                          <div key={`new-${idx}`} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <File size={14} className="text-indigo-500 shrink-0" />
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
                              <span className="text-[10px] text-slate-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                            <button
                              onClick={() => removeFile(idx)}
                              className="text-slate-400 hover:text-red-500 p-1"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: TAREFAS */}
        <div className="lg:col-span-8 space-y-6">
          <Card title="Adicionar Tarefas à Operação">
            <div className="space-y-6">
              {/* LINHA DE ADIÇÃO RÁPIDA */}
              <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-3">
                    <Select
                      label="Tarefa"
                      className="text-[11px]"
                      options={taskTypes.map(t => ({ value: t.name, label: t.name }))}
                      value={tempTask.taskName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const type = taskTypes.find(t => t.name === val);
                        setTempTask(prev => ({
                          ...prev,
                          taskName: val,
                          sector: type?.sector_id ? sectors.find(s => s.id === type.sector_id)?.name || prev.sector : prev.sector
                        }));
                      }}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Select
                      label="Responsável"
                      className="text-[11px]"
                      options={members.map(m => ({
                        value: `${m.first_name} ${m.last_name}`,
                        label: `${m.first_name} ${m.last_name}`
                      }))}
                      value={tempTask.responsible}
                      onChange={(e) => setTempTask(prev => ({ ...prev, responsible: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="month"
                      label="Competência"
                      className="text-[11px]"
                      value={tempTask.competence}
                      onChange={(e) => setTempTask(prev => ({ ...prev, competence: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="date"
                      label="Vencimento"
                      className="text-[11px]"
                      value={tempTask.vencimento}
                      onChange={(e) => setTempTask(prev => ({ ...prev, vencimento: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Select
                      label="Variável"
                      className="text-[11px]"
                      tooltip="Define se o vencimento deve ser antecipado ou prorrogado caso caia em fins de semana ou feriados."
                      options={[
                        { value: 'nao_aplica', label: 'Não se aplica' },
                        { value: 'antecipar', label: 'Antecipar' },
                        { value: 'prorrogar', label: 'Prorrogar' },
                      ]}
                      value={tempTask.vencimentoVariavel}
                      onChange={(e) => setTempTask(prev => ({ ...prev, vencimentoVariavel: e.target.value }))}
                    />
                  </div>

                  <div className="md:col-span-4">
                    <Select
                      label="Recorrência"
                      className="text-[11px]"
                      options={[
                        { value: 'unica', label: 'Única' },
                        { value: 'mensal', label: 'Mensal' },
                        { value: 'bimestral', label: 'Bimestral' },
                        { value: 'trimestral', label: 'Trimestral' },
                        { value: 'semestral', label: 'Semestral' },
                        { value: 'anual', label: 'Anual' },
                      ]}
                      value={tempTask.recurrence}
                      onChange={(e) => setTempTask(prev => ({
                        ...prev,
                        recurrence: e.target.value,
                        months: (e.target.value === 'mensal' || e.target.value === 'unica') ? [] : prev.months
                      }))}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <Select
                      label="Prioridade"
                      className="text-[11px]"
                      options={[
                        { value: Priority.BAIXA, label: 'Baixa' },
                        { value: Priority.MEDIA, label: 'Média' },
                        { value: Priority.ALTA, label: 'Alta' },
                      ]}
                      value={tempTask.priority}
                      onChange={(e) => setTempTask(prev => ({ ...prev, priority: e.target.value as Priority }))}
                    />
                  </div>

                  <div className="md:col-span-4">
                    <Button
                      fullWidth
                      variant="success"
                      icon={<Plus size={18} />}
                      onClick={handleAddPendingTask}
                      className="h-10"
                    >
                      Adicionar à Lista
                    </Button>
                  </div>
                </div>

                {/* MONTH SELECTOR FOR NON-MONTHLY */}
                {tempTask.recurrence !== 'mensal' && tempTask.recurrence !== 'unica' && (
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">
                      Selecione os meses de repetição
                    </label>
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                      {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((month, idx) => {
                        const monthNum = idx + 1;
                        return (
                          <button
                            key={month}
                            type="button"
                            onClick={() => {
                              setTempTask(prev => ({
                                ...prev,
                                months: prev.months.includes(monthNum)
                                  ? prev.months.filter(m => m !== monthNum)
                                  : [...prev.months, monthNum]
                              }));
                            }}
                            className={`py-2 px-1 rounded-lg border text-xs font-bold transition-all ${tempTask.months.includes(monthNum)
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-indigo-300'
                              }`}
                          >
                            {month}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* LISTA DE TAREFAS ADICIONADAS */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Tarefa</th>
                      <th className="px-4 py-3">Setor</th>
                      <th className="px-4 py-3">Responsável</th>
                      <th className="px-4 py-3">Comp.</th>
                      <th className="px-4 py-3">Venc.</th>
                      <th className="px-4 py-3">Variável</th>
                      <th className="px-4 py-3">Recorrência</th>
                      <th className="px-4 py-3">Prioridade</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {pendingTasks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                          Nenhuma tarefa adicionada à lista. Preencha acima e clique em "Adicionar".
                        </td>
                      </tr>
                    ) : (
                      pendingTasks.map((task) => (
                        <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{task.taskName}</td>
                          <td className="px-4 py-3 text-slate-500">{task.sector}</td>
                          <td className="px-4 py-3 text-slate-500">{task.responsible}</td>
                          <td className="px-4 py-3 text-slate-500">{task.competence}</td>
                          <td className="px-4 py-3 text-slate-500">{task.vencimento}</td>
                          <td className="px-4 py-3 text-slate-500 text-[10px] font-medium italic">
                            {task.vencimentoVariavel === 'nao_aplica' ? '-' : task.vencimentoVariavel}
                          </td>
                          <td className="px-4 py-3 text-slate-500 uppercase text-[10px] font-bold">
                            {task.recurrence}
                            {task.months.length > 0 && (
                              <div className="text-[9px] text-indigo-500 mt-0.5">
                                {task.months.map((m: number) => ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][m]).join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${task.priority === Priority.ALTA ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => removePendingTask(task.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

