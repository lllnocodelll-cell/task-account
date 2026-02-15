
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
  Info
} from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Task, TaskStatus, Priority } from '../types';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { supabase } from '../utils/supabaseClient';
import { calculateAdjustedDate } from '../utils/dateUtils';

// --- MOCK DATA ---
const MOCK_TASKS: Task[] = [
  {
    id: '1',
    clientName: 'Tech Solutions Ltda',
    taskName: 'Fechamento Fiscal',
    competence: '01/2026',
    taxRegime: 'Simples Nacional',
    priority: Priority.ALTA,
    sector: 'Fiscal',
    responsible: 'Ana Souza',
    status: TaskStatus.PENDENTE,
  },
  {
    id: '2',
    clientName: 'Mercado Silva',
    taskName: 'Folha de Pagamento',
    competence: '01/2026',
    taxRegime: 'Lucro Presumido',
    priority: Priority.MEDIA,
    sector: 'DP',
    responsible: 'Carlos Oliveira',
    status: TaskStatus.INICIADA,
  },
  {
    id: '3',
    clientName: 'Consultoria XYZ',
    taskName: 'DAS',
    competence: '12/2025',
    taxRegime: 'Simples Nacional',
    priority: Priority.ALTA,
    sector: 'Fiscal',
    responsible: 'Ana Souza',
    status: TaskStatus.ATRASADA,
  },
  {
    id: '4',
    clientName: 'Padaria do João',
    taskName: 'Recolhimento FGTS',
    competence: '01/2026',
    taxRegime: 'Simples Nacional',
    priority: Priority.BAIXA,
    sector: 'DP',
    responsible: 'Carlos Oliveira',
    status: TaskStatus.PENDENTE,
  },
];

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
}

const ActionMenu: React.FC<ActionMenuProps> = ({ task, onStatusChange, onConclude, onEdit }) => {
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
          <button
            onClick={() => {
              onEdit(task);
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
          >
            <Pencil size={16} className="text-slate-500" /> Editar
          </button>

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
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
              >
                <XCircle size={16} /> Cancelar
              </button>
            </>
          )}
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
  color: string;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDrop: (e: React.DragEvent, status: TaskStatus) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  status,
  tasks,
  onEdit,
  onConclude,
  color,
  onDragStart,
  onDrop
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
            className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group select-none"
            onClick={() => onEdit(task)}
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
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 truncate">{task.clientName}</p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
              <span className="text-xs text-slate-400">{task.competence}</span>
              {status !== TaskStatus.CONCLUIDA && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onConclude(task.id);
                  }}
                  className="text-emerald-500 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  title="Concluir Rápido"
                >
                  <CheckCircle size={16} />
                </button>
              )}
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

export const Tasks: React.FC = () => {
  const [viewState, setViewState] = useState<'list' | 'create' | 'edit'>('list');
  const [layoutMode, setLayoutMode] = useState<'list' | 'kanban'>('list');
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [concludeModalOpen, setConcludeModalOpen] = useState(false);
  const [selectedTaskForConclude, setSelectedTaskForConclude] = useState<string | null>(null);
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
  const handleStatusChange = (id: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const openConcludeModal = (id: string) => {
    setSelectedTaskForConclude(id);
    setConcludeModalOpen(true);
  };

  const handleConcludeTask = () => {
    if (selectedTaskForConclude) {
      handleStatusChange(selectedTaskForConclude, TaskStatus.CONCLUIDA);
      setConcludeModalOpen(false);
      setSelectedTaskForConclude(null);
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
        onBack={() => setViewState('list')}
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

      {layoutMode === 'list' ? (
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
                    label="Competência"
                    fieldKey="competence"
                    filterValue={filters.competence}
                    isVisible={!!visibleFilters['competence']}
                    onToggle={toggleFilterVisibility}
                    widthClass="min-w-[120px]"
                  >
                    <input
                      type="text"
                      placeholder="MM/AAAA"
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
                    widthClass="min-w-[150px]"
                  >
                    <select
                      className={headerInputClass}
                      value={filters.taxRegime}
                      onChange={(e) => handleFilterChange('taxRegime', e.target.value)}
                      autoFocus
                    >
                      <option value="">Todos</option>
                      <option value="Simples Nacional">Simples Nacional</option>
                      <option value="Lucro Presumido">Lucro Presumido</option>
                      <option value="Lucro Real">Lucro Real</option>
                      <option value="MEI">MEI</option>
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
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{task.clientName}</td>
                      <td className="px-6 py-4">{task.taskName}</td>
                      <td className="px-6 py-4">{task.competence}</td>
                      <td className="px-6 py-4">{task.taxRegime}</td>
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
                title="Pendentes"
                status={TaskStatus.PENDENTE}
                tasks={filteredTasks.filter(t => t.status === TaskStatus.PENDENTE)}
                onEdit={handleEdit}
                onConclude={openConcludeModal}
                color="border-slate-400"
                onDragStart={handleDragStart}
                onDrop={handleDrop}
              />
            </div>
            <div className="flex-1 min-w-[250px]">
              <KanbanColumn
                title="Iniciadas"
                status={TaskStatus.INICIADA}
                tasks={filteredTasks.filter(t => t.status === TaskStatus.INICIADA)}
                onEdit={handleEdit}
                onConclude={openConcludeModal}
                color="border-blue-500"
                onDragStart={handleDragStart}
                onDrop={handleDrop}
              />
            </div>
            <div className="flex-1 min-w-[250px]">
              <KanbanColumn
                title="Atrasadas"
                status={TaskStatus.ATRASADA}
                tasks={filteredTasks.filter(t => t.status === TaskStatus.ATRASADA)}
                onEdit={handleEdit}
                onConclude={openConcludeModal}
                color="border-red-500"
                onDragStart={handleDragStart}
                onDrop={handleDrop}
              />
            </div>
            <div className="flex-1 min-w-[250px]">
              <KanbanColumn
                title="Concluídas"
                status={TaskStatus.CONCLUIDA}
                tasks={filteredTasks.filter(t => t.status === TaskStatus.CONCLUIDA)}
                onEdit={handleEdit}
                onConclude={openConcludeModal}
                color="border-emerald-500"
                onDragStart={handleDragStart}
                onDrop={handleDrop}
              />
            </div>
          </div>
        </div>
      )}

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
        <p className="text-slate-600 dark:text-slate-300">
          Tem certeza que deseja marcar esta tarefa como concluída?
        </p>
      </Modal>
    </div>
  );
};

// --- TASK FORM COMPONENT ---

const TaskForm: React.FC<{ onBack: () => void; initialData?: Task | null }> = ({ onBack, initialData }) => {
  const isEditing = !!initialData;
  const [activeTab, setActiveTab] = useState('recorrencia');
  const [semMovimento, setSemMovimento] = useState(false);
  const [selectedDfe, setSelectedDfe] = useState<string[]>([]);
  const [selectedAnnexes, setSelectedAnnexes] = useState<string[]>([]);

  // Dynamic Data State
  const [taskTypes, setTaskTypes] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form State
  const [selectedTaskType, setSelectedTaskType] = useState(initialData?.taskName || '');
  const [selectedSector, setSelectedSector] = useState(initialData?.sector || '');

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [taskTypesRes, sectorsRes, membersRes] = await Promise.all([
        supabase.from('task_types').select('*').eq('org_id', user.id),
        supabase.from('sectors').select('*').eq('org_id', user.id),
        supabase.from('members').select('*').eq('org_id', user.id)
      ]);

      if (taskTypesRes.data) setTaskTypes(taskTypesRes.data);
      if (sectorsRes.data) setSectors(sectorsRes.data);
      if (membersRes.data) setMembers(membersRes.data);
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

  const tabs = [
    { id: 'recorrencia', label: 'Recorrência' },
    { id: 'simples', label: 'Simples Nacional' },
    { id: 'observacao', label: 'Observação' },
    { id: 'dfe', label: 'Modelos DF-e' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isEditing ? `Editando: ${initialData.taskName}` : 'Nova Tarefa'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            {isEditing ? `Cliente: ${initialData.clientName}` : 'Preencha os detalhes da tarefa'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onBack}>Voltar</Button>
          <Button icon={<Save size={18} />}>
            {isEditing ? 'Salvar Alterações' : 'Criar Tarefa'}
          </Button>
        </div>
      </div>

      {/* SECTION 1: DADOS INICIAIS */}
      <Card title="Dados Iniciais">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Input
            label="Data de Criação"
            value={new Date().toISOString().split('T')[0]}
            disabled
            className="bg-slate-100 dark:bg-slate-800 text-slate-500"
          />
          <div className="md:col-span-3">
            <Select
              label="Empresa"
              options={[
                { value: '1', label: 'Tech Solutions Ltda' },
                { value: '2', label: 'Mercado Silva' },
                { value: '3', label: 'Consultoria XYZ' },
              ]}
              defaultValue={initialData?.clientName === 'Tech Solutions Ltda' ? '1' : ''}
            />
          </div>

          <Select
            label="Prioridade"
            options={[
              { value: Priority.BAIXA, label: 'Baixa' },
              { value: Priority.MEDIA, label: 'Média' },
              { value: Priority.ALTA, label: 'Alta' },
            ]}
            defaultValue={initialData?.priority}
          />
          <div className="md:col-span-1">
            <Select
              label="Tarefa"
              options={taskTypes.map(t => ({ value: t.name, label: t.name }))}
              value={selectedTaskType}
              onChange={(e) => {
                setSelectedTaskType(e.target.value);
                // Auto-select sector if linked
                const type = taskTypes.find(t => t.name === e.target.value);
                if (type && type.sector_id) {
                  const sector = sectors.find(s => s.id === type.sector_id);
                  if (sector) setSelectedSector(sector.name); // Assuming sector name is what we store/display or ID? 
                  // Wait, Task interface uses 'sector' string name usually in mocks. 
                  // Let's assume name for now to match mock structure, but ideally should be ID.
                  // Checking mock: sector: 'Fiscal'.
                }
              }}
            />
          </div>
          <Select
            label="Responsável"
            options={members.map(m => ({
              value: `${m.first_name} ${m.last_name}`,
              label: `${m.first_name} ${m.last_name}`
            }))}
            defaultValue={initialData?.responsible}
          />
          <Select
            label="Setor"
            options={sectors.map(s => ({ value: s.name, label: s.name }))}
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
          />

          <Select
            label="Regime Tributário"
            options={[
              { value: 'simples', label: 'Simples Nacional' },
              { value: 'lp', label: 'Lucro Presumido' },
              { value: 'lr', label: 'Lucro Real' },
              { value: 'mei', label: 'MEI' },
            ]}
            defaultValue={initialData?.taxRegime === 'Simples Nacional' ? 'simples' : 'lp'}
          />
          <Select
            label="Regime de Registro"
            options={[
              { value: 'competencia', label: 'Competência' },
              { value: 'caixa', label: 'Caixa' },
              { value: 'misto', label: 'Misto' },
            ]}
          />

          <div className="md:col-span-2 flex items-end h-[66px] pb-3">
            <div className="flex items-center gap-3">
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
        </div>
      </Card>

      {/* SECTION 2: TABBARS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden min-h-[400px]">
        <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <div className="flex w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-800/30' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">

          {/* 2.3.2 Tabbar - Recorrência */}
          {activeTab === 'recorrencia' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <Select
                  label="Recorrência"
                  options={[
                    { value: 'mensal', label: 'Mensal' },
                    { value: 'bimestral', label: 'Bimestral' },
                    { value: 'trimestral', label: 'Trimestral' },
                    { value: 'semestral', label: 'Semestral' },
                    { value: 'anual', label: 'Anual' },
                    { value: 'personalizada', label: 'Personalizada' },
                  ]}
                />
                <Input type="month" label="Competência Inicial" />
                <Input type="date" label="Vencimento" defaultValue={initialData ? calculateAdjustedDate('2026-01-20', 'none') : ''} />
                <Select
                  label="Variável do Vencimento"
                  options={[
                    { value: 'nao_aplica', label: 'Não se aplica' },
                    { value: 'antecipar', label: 'Antecipar' },
                    { value: 'prorrogar', label: 'Prorrogar' },
                  ]}
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <Info className="text-indigo-500 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Resumo da Recorrência</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    A tarefa será gerada mensalmente a partir da competência selecionada. O vencimento será ajustado automaticamente conforme a regra selecionada caso caia em feriados ou finais de semana.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2.3.3 Tabbar - Simples Nacional */}
          {activeTab === 'simples' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <Select
                  label="Excedeu Sublimite?"
                  options={[{ value: 's', label: 'Sim' }, { value: 'n', label: 'Não' }]}
                />
                <Input label="CNPJ Acesso" placeholder="00.000.000/0000-00" copyable />
                <Input label="CPF Acesso" placeholder="000.000.000-00" copyable />
                <Input label="Código de Acesso" placeholder="123456789012" copyable />
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <FileText size={18} className="text-indigo-600" />
                  Anexos do Simples Nacional
                </h4>
                <div className="flex flex-wrap gap-4">
                  {SIMPLES_ANNEXES.map((annex) => (
                    <button
                      key={annex}
                      type="button"
                      onClick={() => toggleAnnex(annex)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${selectedAnnexes.includes(annex)
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-500 dark:text-indigo-300'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                    >
                      {selectedAnnexes.includes(annex) ? <CheckSquare size={16} /> : <Square size={16} />}
                      {annex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2.3.4 Tabbar - Observação */}
          {activeTab === 'observacao' && (
            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Observações Gerais</label>
              <textarea
                className="w-full h-40 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Digite aqui informações importantes sobre esta tarefa..."
              />
            </div>
          )}

          {/* 2.3.5 Tabbar - Modelos DF-e */}
          {activeTab === 'dfe' && (
            <div>
              <div className="flex items-center gap-2 mb-4 text-slate-500 dark:text-slate-400 text-sm">
                <AlertCircle size={16} />
                <p>Selecione os modelos de documentos fiscais utilizados pelo cliente.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {DF_MODELS.map((model) => (
                  <div
                    key={model.id}
                    onClick={() => toggleDfe(model.id)}
                    title={model.desc}
                    className={`cursor-pointer p-4 rounded-lg border-2 text-center transition-all duration-200 relative group ${selectedDfe.includes(model.id)
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700'
                      }`}
                  >
                    <div className={`text-lg font-bold mb-1 ${selectedDfe.includes(model.id) ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                      {model.label}
                    </div>
                    <div className="absolute top-2 right-2">
                      {selectedDfe.includes(model.id) && <CheckCircle size={16} className="text-indigo-600 dark:text-indigo-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
