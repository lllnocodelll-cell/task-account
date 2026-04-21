import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Activity,
  Layers,
  Zap,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Repeat,
  ListChecks,
  Bookmark,
  GitCompareArrows,
  FileCheck2,
  MinusCircle,
  ScanEye,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Task, TaskStatus, Priority, Client, TAX_REGIME_GROUPS, TAX_REGIME_LABELS } from '../types';
import { Modal } from '../components/ui/Modal';
import { Input, Select, SearchableSelect, Toggle, GroupedSelect } from '../components/ui/Input';
import { supabase } from '../utils/supabaseClient';
import { calculateAdjustedDate } from '../utils/dateUtils';
import { ClientForm } from '../components/ClientForm';
import { ClientDetailsDrawer } from '../components/ClientDetailsDrawer';
import { TutorialsModal } from '../components/tutorials/TutorialsModal';
import { Tooltip } from '../components/ui/Tooltip';
import { Notification, NotificationType } from '../components/ui/Notification';
import { TaskInfoDrawer } from '../components/TaskInfoDrawer';
import { TaskDetailsDrawer } from '../components/TaskDetailsDrawer';

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
  { id: 'nfabi', label: 'NF-e ABI', desc: 'Nota Fiscal de Alienação de Bens Imóveis' },
  { id: 'nfgas', label: 'NFGAS', desc: 'Nota Fiscal de Gás Canalizado' },
];

const SIMPLES_ANNEXES = ['Anexo I', 'Anexo II', 'Anexo III', 'Anexo IV', 'Anexo V'];

const REGISTRATION_REGIME_LABELS: Record<string, string> = {
  'competencia': 'Competência',
  'caixa': 'Caixa'
};

// --- SHARED COMPONENTS ---

interface HeaderCellProps {
  label: string;
  fieldKey: string;
  filterValue?: string;
  isActive?: boolean;
  activeCount?: number;
  widthClass?: string;
  children: React.ReactNode;
  isVisible: boolean;
  onToggle: (key: string) => void;
}

const HeaderCell: React.FC<HeaderCellProps> = ({
  label,
  fieldKey,
  filterValue = '',
  isActive,
  activeCount = 0,
  widthClass,
  children,
  isVisible,
  onToggle
}) => {
  const hasFilter = isActive ?? !!filterValue;
  return (
    <th className={`px-6 py-4 align-top ${widthClass} ${isVisible || hasFilter ? 'relative z-50' : 'relative z-10'}`}>
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-2 h-6">
          <span className="truncate text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">{label}</span>
          <Tooltip content={`Filtrar por ${label}`} position="top">
            <button
              onClick={() => onToggle(fieldKey)}
              className={`relative p-1 rounded-md transition-colors ${hasFilter || isVisible
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              <ListFilter size={14} strokeWidth={hasFilter ? 2.5 : 2} />
              {hasFilter && activeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[8px] font-black px-0.5 ring-2 ring-white dark:ring-slate-900 bg-indigo-600 text-white">
                  {activeCount}
                </span>
              )}
            </button>
          </Tooltip>
        </div>
        {isVisible && children}
      </div>
    </th>
  );
};

// --- TABLE COLUMN FILTER PANEL ---
interface TableColumnFilterProps {
  label: string;
  isActive: boolean;
  activeCount: number;
  children: React.ReactNode;
  widthClass?: string;
  widthPx?: number;
}

const PANEL_WIDTH = 288; // w-72 = 18rem

const TableColumnFilter: React.FC<TableColumnFilterProps> = ({ 
  label, 
  isActive, 
  activeCount, 
  children,
  widthClass = 'w-72',
  widthPx = 288
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const openPanel = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();

    // Ajuste de borda: se o painel ultrapassar a janela, ancora pela direita
    const rawLeft = rect.left;
    const left = rawLeft + widthPx > window.innerWidth
      ? window.innerWidth - widthPx - 8
      : rawLeft;

    setCoords({ top: rect.bottom + 6, left });
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleScroll = () => setIsOpen(false);

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  return (
    <>
      {/* Botão trigger */}
      <button
        ref={buttonRef}
        onClick={() => isOpen ? setIsOpen(false) : openPanel()}
        className={`relative p-1 rounded-md transition-colors ${isActive || isOpen
          ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        title={`Filtrar por ${label}`}
      >
        <ListFilter size={14} strokeWidth={isActive ? 2.5 : 2} />
        {isActive && activeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[8px] font-black px-0.5 ring-2 ring-white dark:ring-slate-900 bg-indigo-600 text-white">
            {activeCount}
          </span>
        )}
      </button>

      {/* Painel via portal — renderizado no document.body, fora do overflow */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{ top: coords.top, left: coords.left }}
          className={`fixed z-[9999] ${widthClass} animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200`}
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/60 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
            {/* Header do painel */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em]">
                  Filtrar por {label}
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-0.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
            {/* Conteúdo dos filtros */}
            <div className="px-4 py-3 space-y-2.5">
              {children}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};


interface ActionMenuProps {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onConclude: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const ActionMenu: React.FC<ActionMenuProps> = ({ task, onStatusChange, onConclude, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, right: 0 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative flex justify-end">
      <Tooltip content="Ações" position="left">
        <button
          ref={buttonRef}
          onClick={toggleMenu}
          className={`p-2 rounded-lg transition-colors ${isOpen
            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
        >
          <MoreHorizontal size={18} />
        </button>
      </Tooltip>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={menuRef}
          style={{ top: coords.top, right: coords.right }}
          className="fixed w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 z-[9999] py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right"
        >
          {task.status === TaskStatus.CONCLUIDA ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(task.id, TaskStatus.INICIADA);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Play size={16} className="text-blue-500" /> Iniciar
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConclude(task.id);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
              >
                <CheckCircle size={16} className="text-emerald-500" /> Concluir
              </button>

              <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, TaskStatus.PENDENTE);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-2"
              >
                <XCircle size={16} /> Cancelar
              </button>
            </>
          )}

          {task.status !== TaskStatus.CONCLUIDA && (
            <>
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
              >
                <Trash2 size={16} /> Excluir Tarefa
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

// --- RESPONSIBLE FILTER PANEL ---
interface ResponsibleFilterPanelProps {
  tasks: Task[];
  selected: string[];
  onChange: (list: string[]) => void;
}

const ResponsibleFilterPanel: React.FC<ResponsibleFilterPanelProps> = ({ tasks, selected, onChange }) => {
  const [search, setSearch] = useState('');

  const responsibles = useMemo(() => {
    const unique = Array.from(new Set(tasks.map(t => t.responsible).filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [tasks]);

  const filtered = responsibles.filter(r => r.toLowerCase().includes(search.toLowerCase()));

  const toggle = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter(n => n !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  return (
    <div className="space-y-2">
      {/* Busca */}
      <input
        type="text"
        placeholder="Buscar colaborador..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full text-[11px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
      />
      {/* Lista com scroll */}
      <div className="max-h-[160px] overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
        {filtered.length === 0 ? (
          <p className="text-[10px] text-slate-400 text-center py-3">Nenhum colaborador encontrado</p>
        ) : (
          filtered.map(name => {
            const isChecked = selected.includes(name);
            return (
              <button
                key={name}
                onClick={() => toggle(name)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all text-left ${isChecked ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
              >
                <span className={`flex-shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
                  {isChecked && <span className="text-[8px] text-white font-black leading-none">✓</span>}
                </span>
                <span className={`text-[11px] truncate ${isChecked ? 'font-semibold text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                  {name}
                </span>
              </button>
            );
          })
        )}
      </div>
      {/* Contador */}
      {selected.length > 0 && (
        <p className="text-[9px] text-indigo-500 dark:text-indigo-400 font-semibold text-center">
          {selected.length} selecionado{selected.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

// --- Kanban Column Filter State ---

interface KanbanColFilter {
  taskName: string;
  responsible: string;
  priority: string;
  taxRegime: string;
  clientName: string;
  dueDate: string;
}

const EMPTY_COL_FILTER: KanbanColFilter = {
  taskName: '', responsible: '', priority: '',
  taxRegime: '', clientName: '', dueDate: ''
};

// --- Kanban Column Component ---
interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onConclude: (id: string) => void;
  onDelete: (task: Task) => void;
  color: string;
  accentColor: string; // e.g. 'indigo' | 'amber' | 'rose' | 'emerald'
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, status: TaskStatus) => void;
  onNavigateToClient?: (clientId: string) => void;
  onViewTask: (task: Task) => void;
  onViewClient: (client: Client) => void;
  onViewTaskInfo: (task: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  clients: Client[];
  userProfile: any;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  status,
  tasks,
  onEdit,
  onConclude,
  onDelete,
  color,
  accentColor,
  onDragStart,
  onDrop,
  onNavigateToClient,
  onViewTask,
  onViewClient,
  onViewTaskInfo,
  onStatusChange,
  clients,
  userProfile
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [colFilter, setColFilter] = useState<KanbanColFilter>(EMPTY_COL_FILTER);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterContainerRef = useRef<HTMLDivElement>(null);

  // click outside fecha o painel
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterContainerRef.current && !filterContainerRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isFilterOpen]);

  const activeFilterCount = Object.values(colFilter).filter(v => v !== '').length;
  const isFilterActive = activeFilterCount > 0;

  const localFilteredTasks = tasks.filter(task => {
    const dueDateMatch = !colFilter.dueDate || task.dueDate === colFilter.dueDate;
    return (
      task.taskName.toLowerCase().includes(colFilter.taskName.toLowerCase()) &&
      task.responsible.toLowerCase().includes(colFilter.responsible.toLowerCase()) &&
      (colFilter.priority === '' || task.priority === colFilter.priority) &&
      (colFilter.taxRegime === '' || task.taxRegime === colFilter.taxRegime) &&
      task.clientName.toLowerCase().includes(colFilter.clientName.toLowerCase()) &&
      dueDateMatch
    );
  });

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
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(e, status);
  };

  // Mapeamento de accent para classes CSS
  const accentMap: Record<string, { btn: string; badge: string; dot: string; input: string }> = {
    indigo: {
      btn: 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400',
      badge: 'bg-indigo-600 text-white',
      dot: 'bg-indigo-500',
      input: 'focus:ring-indigo-500/30 focus:border-indigo-400'
    },
    amber: {
      btn: 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-500 text-white',
      dot: 'bg-amber-500',
      input: 'focus:ring-amber-500/30 focus:border-amber-400'
    },
    rose: {
      btn: 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400',
      badge: 'bg-rose-500 text-white',
      dot: 'bg-rose-500',
      input: 'focus:ring-rose-500/30 focus:border-rose-400'
    },
    emerald: {
      btn: 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-500 text-white',
      dot: 'bg-emerald-500',
      input: 'focus:ring-emerald-500/30 focus:border-emerald-400'
    },
  };
  const accent = accentMap[accentColor] || accentMap.indigo;

  const inputBase = `w-full text-[11px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${accent.input}`;

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

      {/* Cabeçalho da Coluna + Painel de Filtro — wrapper com ref para click-outside */}
      <div ref={filterContainerRef} className="relative mb-3">

        {/* Linha do cabeçalho */}
        <div className={`flex items-center justify-between px-1 pb-2 border-b-2 ${color}`}>
          <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">{title}</h3>

          <div className="flex items-center gap-1.5">
            {/* Contador: X/Y quando filtrado, apenas Y quando normal */}
            <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-md font-bold">
              {isFilterActive ? `${localFilteredTasks.length}/${tasks.length}` : tasks.length}
            </span>

            {/* Botão de Filtro */}
            <button
              onClick={(e) => { e.stopPropagation(); setIsFilterOpen(p => !p); }}
              className={`relative p-1.5 rounded-lg border transition-all duration-200 ${
                isFilterActive
                  ? accent.btn
                  : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
              title="Filtrar coluna"
            >
              <SlidersHorizontal size={12} strokeWidth={2.5} />
              {/* Badge de contagem */}
              {isFilterActive && (
                <span className={`absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[8px] font-black px-0.5 ring-2 ring-white dark:ring-slate-900 ${accent.badge}`}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Painel de Filtro — posicionado relativo ao container da coluna, left-0 right-0 = alinhado à coluna */}
        {isFilterOpen && (
          <div
            className="absolute top-full left-0 right-0 mt-2 z-[200] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/60 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">

              {/* Topo do painel */}
              <div className="flex items-center justify-between px-3.5 pt-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${accent.dot}`} />
                  <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em]">
                    Filtrar Coluna
                  </span>
                </div>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-0.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>

              {/* Campos de filtro */}
              <div className="px-3.5 py-3 space-y-2">

                {/* Tarefa */}
                <input
                  type="text"
                  placeholder="Nome da tarefa..."
                  className={inputBase}
                  value={colFilter.taskName}
                  onChange={e => setColFilter(p => ({ ...p, taskName: e.target.value }))}
                />

                {/* Responsável */}
                <input
                  type="text"
                  placeholder="Responsável..."
                  className={inputBase}
                  value={colFilter.responsible}
                  onChange={e => setColFilter(p => ({ ...p, responsible: e.target.value }))}
                />

                {/* Prioridade + Regime — em linha */}
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className={inputBase}
                    value={colFilter.priority}
                    onChange={e => setColFilter(p => ({ ...p, priority: e.target.value }))}
                  >
                    <option value="">Prioridade</option>
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>

                  <select
                    className={inputBase}
                    value={colFilter.taxRegime}
                    onChange={e => setColFilter(p => ({ ...p, taxRegime: e.target.value }))}
                  >
                    <option value="">Regime</option>
                    {TAX_REGIME_GROUPS.map(group => (
                      <optgroup key={group.category} label={group.category}>
                        {group.options.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Cliente */}
                <input
                  type="text"
                  placeholder="Nome do cliente..."
                  className={inputBase}
                  value={colFilter.clientName}
                  onChange={e => setColFilter(p => ({ ...p, clientName: e.target.value }))}
                />

                {/* Vencimento */}
                <input
                  type="date"
                  className={`${inputBase} dark:[color-scheme:dark]`}
                  value={colFilter.dueDate}
                  onChange={e => setColFilter(p => ({ ...p, dueDate: e.target.value }))}
                />
              </div>

              {/* Rodapé — Limpar */}
              <div className="px-3.5 pb-3 pt-0">
                <div className="border-t border-slate-100 dark:border-slate-800/60 pt-2.5 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500">
                    {activeFilterCount === 0
                      ? 'Sem filtros ativos'
                      : `${activeFilterCount} filtro${activeFilterCount > 1 ? 's' : ''} ativo${activeFilterCount > 1 ? 's' : ''}`}
                  </span>
                  <button
                    onClick={() => setColFilter(EMPTY_COL_FILTER)}
                    disabled={!isFilterActive}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all ${
                      isFilterActive
                        ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                        : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    Limpar tudo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 min-h-[100px]">
        {localFilteredTasks.map(task => {
          const clientData = clients.find(c => c.id === task.clientId);
          const hasSimplesBadges = task.taxRegime === 'simples' && (
            (task.selectedAnnexes && task.selectedAnnexes.length > 0) || task.factorR || task.exceededSublimit || task.notifiedExclusion
          );
          const hasExtraInfo = (task.clientDfes && task.clientDfes.length > 0) || 
                              (task.clientAccesses && task.clientAccesses.length > 0) || 
                              (task.clientLegislations && task.clientLegislations.length > 0) || 
                              task.observation || 
                              task.noMovement;

          return (
            <div
              key={task.id}
              draggable
              onDragStart={(e) => onDragStart(e, task.id)}
              className={`bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 border-t-4 ${color.replace('border-', 'border-t-')} hover:-translate-y-1 hover:shadow-xl transition-all duration-200 active:cursor-grabbing group select-none relative cursor-default`}
            >
              <div className="flex justify-between items-center px-3 pt-3 pb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                    {task.taskName}
                  </h4>
                </div>
                <div className="flex items-center gap-1.5">
                  <GripVertical size={13} className="text-slate-300 dark:text-slate-600" />
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 leading-tight">
                      {task.responsible.split(' ').slice(0, 2).join(' ')}
                    </span>
                    {task.sector && (
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight">{task.sector}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-3 pb-2 flex items-center justify-start gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide ${
                  task.priority === Priority.ALTA ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  task.priority === Priority.MEDIA ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                  {task.priority}
                </span>

                {task.noMovement && (
                  <span className="px-2 py-0.5 bg-red-50 dark:bg-red-500/10 text-[9px] text-red-600 dark:text-red-400 font-black whitespace-nowrap border border-red-100 dark:border-red-900/30 rounded-md shadow-sm">
                    Sem Movimento
                  </span>
                )}

                <Tooltip content="Dados da Tarefa">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewTask(task);
                    }}
                    className="p-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-90"
                  >
                    <Eye size={13} />
                  </button>
                </Tooltip>
              </div>

              {task.taxRegime && (
                <div className="mx-3 mb-2 px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                  <span className="text-[8.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Regime Fiscal</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                      {TAX_REGIME_LABELS[task.taxRegime] || task.taxRegime}
                    </span>
                    {task.registrationRegime && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-[8.5px] text-slate-600 dark:text-slate-400 font-bold shrink-0">
                        <Activity size={8} />
                        {REGISTRATION_REGIME_LABELS[task.registrationRegime] || task.registrationRegime}
                      </span>
                    )}
                  </div>
                  {hasSimplesBadges && (
                    <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700/50">
                      {task.selectedAnnexes && task.selectedAnnexes.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-[9px] text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-500/20">
                          <Layers size={8} /> Anexo: {task.selectedAnnexes.map(a => a.replace('Anexo ', '')).join(', ')}
                        </span>
                      )}
                      {task.factorR && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-[9px] text-indigo-700 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-500/20">
                          <Zap size={8} fill="currentColor" /> Fator R
                        </span>
                      )}
                      {task.exceededSublimit && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-[9px] text-amber-700 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-500/20">
                          <AlertTriangle size={8} /> Sublimite
                        </span>
                      )}
                      {task.notifiedExclusion && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/10 text-[9px] text-rose-700 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-500/20">
                          <AlertTriangle size={8} /> Exclusão
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div
                className="mx-3 mb-2 px-2.5 py-2 rounded-lg bg-indigo-50/40 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 group/client"
              >
                <div className="flex items-start justify-between gap-1 mb-0.5">
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight line-clamp-2 transition-colors">
                    {task.clientName}
                  </p>
                </div>
                {clientData?.document && (
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono tracking-wide mb-1">
                    {clientData.document}
                  </div>
                )}
                {(task.clientCity || task.clientState) && (
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-slate-500 font-medium mb-1.5">
                    <MapPin size={8} className="text-slate-300 dark:text-slate-600 shrink-0" />
                    <span className="truncate">{task.clientCity}{task.clientCity && task.clientState ? ' - ' : ''}{task.clientState}</span>
                  </div>
                )}
                {(task.establishmentType || hasExtraInfo) && (
                  <div className="flex items-center justify-between gap-1.5 mt-1 pt-1.5 border-t border-indigo-100/50 dark:border-indigo-800/30">
                    <div>
                      {task.establishmentType && (
                        <span className={`inline-flex items-center justify-center h-[26px] gap-1 px-2 text-[9px] font-bold uppercase tracking-wide rounded-md ${
                          task.establishmentType === 'matriz'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                          <GitMerge size={10} />
                          {task.establishmentType === 'matriz' ? 'Matriz' : 'Filial'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Tooltip content="Dados da Empresa">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (clientData) onViewClient(clientData);
                          }}
                          className="h-[26px] w-[26px] flex items-center justify-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-90"
                        >
                          <Eye size={14} />
                        </button>
                      </Tooltip>

                      {hasExtraInfo && (
                        <Tooltip content="Acessos">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewTaskInfo(task);
                            }}
                            className="h-[26px] w-[26px] flex items-center justify-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-90"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-3 pb-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0 py-0.5">
                  {task.recurrence && !['unico', 'nao_recorre', 'none'].includes(task.recurrence) && (
                    <>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-md shadow-sm">
                        <Repeat size={9} className="shrink-0" />
                        <span className="text-[9px] font-bold capitalize tracking-wide">{task.recurrence}</span>
                      </div>
                      <div className="w-px h-3 bg-slate-300 dark:bg-slate-600/60" />
                    </>
                  )}
                  <div className="flex items-center gap-1 text-[9.5px] font-bold text-slate-600 dark:text-slate-400" title="Competência">
                    <Calendar size={10} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="uppercase tracking-[0.05em]">{task.competence}</span>
                  </div>
                  {task.dueDate && (
                    <>
                      <div className="w-px h-3 bg-slate-300 dark:bg-slate-600/60" />
                      <div className="flex items-center gap-1 text-[9.5px] font-bold text-indigo-600 dark:text-indigo-400" title="Vencimento">
                        <Clock size={10} className="shrink-0" />
                        <span>{task.dueDate.split('-').reverse().join('/')}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between px-3 py-2 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700/50 rounded-b-xl">
                <div className="flex items-center gap-1.5 transition-all">
                  {status === TaskStatus.INICIADA && (
                    <Tooltip content="Voltar para Pendente" position="top">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(task.id, TaskStatus.PENDENTE);
                        }}
                        className="text-slate-600 bg-slate-200/60 hover:bg-slate-300/80 dark:bg-slate-800 dark:text-slate-400 p-1.5 rounded-lg transition-all shadow-sm"
                      >
                        <ChevronLeft size={16} />
                      </button>
                    </Tooltip>
                  )}
                  {status === TaskStatus.CONCLUIDA && (
                    <Tooltip content="Mover para Iniciadas (Reabrir)" position="top">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(task.id, TaskStatus.INICIADA);
                        }}
                        className="text-slate-600 bg-slate-200/60 hover:bg-slate-300/80 dark:bg-slate-800 dark:text-slate-400 p-1.5 rounded-lg transition-all shadow-sm"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </Tooltip>
                  )}
                  {status === TaskStatus.PENDENTE && (
                    <Tooltip content="Iniciar Tarefa" position="top">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(task.id, TaskStatus.INICIADA);
                        }}
                        className="text-blue-600 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-900/60 p-1.5 rounded-lg transition-all shadow-sm"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </Tooltip>
                  )}
                  {status === TaskStatus.INICIADA && (
                    <Tooltip content="Concluir Tarefa" position="top">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onConclude(task.id);
                        }}
                        className="text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 p-1.5 rounded-lg transition-all shadow-sm"
                      >
                        <CheckCircle size={16} />
                      </button>
                    </Tooltip>
                  )}
                  {status !== TaskStatus.CONCLUIDA && status !== TaskStatus.PENDENTE && status !== TaskStatus.INICIADA && (
                    <Tooltip content="Concluir Rápido" position="top">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onConclude(task.id);
                        }}
                        className="text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 p-1.5 rounded-lg transition-all shadow-sm"
                      >
                        <CheckCircle size={14} />
                      </button>
                    </Tooltip>
                  )}
                </div>
                <Tooltip content="Excluir" position="top">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(task);
                    }}
                    className="text-red-600 bg-red-100/60 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/60 p-1.5 rounded-lg transition-all shadow-sm"
                  >
                    <Trash2 size={13} />
                  </button>
                </Tooltip>
              </div>
            </div>
          );
        })}
        {localFilteredTasks.length === 0 && !isDragOver && (
          <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-slate-400 text-xs text-center p-4">
            {isFilterActive ? 'Nenhuma tarefa encontrada com os filtros aplicados.' : 'Arraste tarefas para cá'}
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


// --- MAIN TASKS PAGE ---

export const Tasks: React.FC<{ userProfile: any; onNavigateToClient?: (clientId: string) => void }> = ({ userProfile, onNavigateToClient }) => {
  const [viewState, setViewState] = useState<'list' | 'create' | 'edit'>('list');
  const [layoutMode, setLayoutMode] = useState<'list' | 'kanban'>(() => typeof window !== 'undefined' && window.innerWidth < 1024 ? 'kanban' : 'list');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [concludeModalOpen, setConcludeModalOpen] = useState(false);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenModalTask, setReopenModalTask] = useState<Task | null>(null);
  const [reopenModalNewStatus, setReopenModalNewStatus] = useState<TaskStatus | null>(null);
  const [reopenModalDocsStatus, setReopenModalDocsStatus] = useState<any[]>([]);
  const [selectedTaskForConclude, setSelectedTaskForConclude] = useState<string | null>(null);
  const [concludeFiles, setConcludeFiles] = useState<File[]>([]);
  const [showDeleteRecurrenceModal, setShowDeleteRecurrenceModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteModalDocsStatus, setDeleteModalDocsStatus] = useState<any[]>([]);
  const concludeFileInputRef = useRef<HTMLInputElement>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [isTaskDetailsDrawerOpen, setIsTaskDetailsDrawerOpen] = useState(false);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Task | null>(null);
  const [isClientDetailsDrawerOpen, setIsClientDetailsDrawerOpen] = useState(false);
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<Client | null>(null);
  const [isClientEditModalOpen, setIsClientEditModalOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [isTaskInfoDrawerOpen, setIsTaskInfoDrawerOpen] = useState(false);
  const [selectedTaskForInfo, setSelectedTaskForInfo] = useState<Task | null>(null);
  const [tutorialsModalOpen, setTutorialsModalOpen] = useState(false);

  // Filter Values State
  const [filters, setFilters] = useState(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const defaultCompetence = `${lastMonth.getFullYear()}-${(lastMonth.getMonth() + 1).toString().padStart(2, '0')}`;

    return {
      clientName: '',
      taskName: '',
      competence: defaultCompetence,
      competenceFrom: defaultCompetence,
      competenceTo: defaultCompetence,
      dueDate: '',
      dueDateFrom: '',
      dueDateTo: '',
      taxRegime: '',
      selectedAnnex: '',
      exceededSublimit: false,
      notifiedExclusion: false,
      priority: '',
      sector: '',
      responsible: '',
      responsibleList: [] as string[],
      status: '',
      clientDocument: '',
      clientCity: '',
      clientState: '',
      noMovement: false,
    };
  });

  const [rangeMode, setRangeMode] = useState(false);

  // Filter Visibility State
  const [visibleFilters, setVisibleFilters] = useState<Record<string, boolean>>({});

  const toggleFilterVisibility = (field: string) => {
    setVisibleFilters(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Tasks filtradas para os cards (ignora filtro de status da tabela)
  const cardsTasks = tasks.filter((task) => {
    // Filtro de competência: respeita o modo ativo (aba selecionada)
    let competenceMatch = true;
    if (rangeMode) {
      const taskComp = task.competence; // formato YYYY-MM
      if (filters.competenceFrom && filters.competenceTo) {
        competenceMatch = taskComp >= filters.competenceFrom && taskComp <= filters.competenceTo;
      } else if (filters.competenceFrom) {
        competenceMatch = taskComp >= filters.competenceFrom;
      } else if (filters.competenceTo) {
        competenceMatch = taskComp <= filters.competenceTo;
      }
    } else if (filters.competence) {
      competenceMatch = task.competence.toLowerCase().includes(filters.competence.toLowerCase());
    }

    return (
      task.clientName.toLowerCase().includes(filters.clientName.toLowerCase()) &&
      (filters.clientDocument === '' || (task.clientDocument ?? '').toLowerCase().includes(filters.clientDocument.toLowerCase())) &&
      (filters.clientCity === '' || (task.clientCity ?? '').toLowerCase().includes(filters.clientCity.toLowerCase())) &&
      (filters.clientState === '' || task.clientState === filters.clientState) &&
      task.taskName.toLowerCase().includes(filters.taskName.toLowerCase()) &&
      (!filters.noMovement || task.noMovement === true) &&
      competenceMatch &&
      (() => {
        if (rangeMode) {
          if (filters.dueDateFrom && filters.dueDateTo) {
            return task.dueDate >= filters.dueDateFrom && task.dueDate <= filters.dueDateTo;
          } else if (filters.dueDateFrom) {
            return task.dueDate >= filters.dueDateFrom;
          } else if (filters.dueDateTo) {
            return task.dueDate <= filters.dueDateTo;
          }
          return true;
        }
        return filters.dueDate === '' || task.dueDate === filters.dueDate;
      })() &&
      (filters.taxRegime === '' || task.taxRegime === filters.taxRegime) &&
      (filters.selectedAnnex === '' || (task.selectedAnnexes ?? []).includes(filters.selectedAnnex)) &&
      (!filters.exceededSublimit || task.exceededSublimit === true) &&
      (!filters.notifiedExclusion || task.notifiedExclusion === true) &&
      (filters.priority === '' || task.priority === filters.priority) &&
      (filters.sector === '' || task.sector === filters.sector) &&
      (filters.responsibleList.length > 0
        ? filters.responsibleList.includes(task.responsible)
        : task.responsible.toLowerCase().includes(filters.responsible.toLowerCase()))
    );
  });

  // Derived filtered tasks
  const filteredTasks = cardsTasks.filter((task) => {
    return (filters.status === '' || task.status === filters.status);
  });

  const totalTasks = cardsTasks.length;
  const pendingCount = cardsTasks.filter(t => t.status === TaskStatus.PENDENTE).length;
  const inProgressCount = cardsTasks.filter(t => t.status === TaskStatus.INICIADA).length;
  const delayedCount = cardsTasks.filter(t => t.status === TaskStatus.ATRASADA).length;
  const completedCount = cardsTasks.filter(t => t.status === TaskStatus.CONCLUIDA).length;
  const getPercent = (count: number) => totalTasks > 0 ? ((count / totalTasks) * 100).toFixed(0) : '0';

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const defaultCompetence = `${lastMonth.getFullYear()}-${(lastMonth.getMonth() + 1).toString().padStart(2, '0')}`;

    setFilters({
      clientName: '',
      taskName: '',
      competence: defaultCompetence,
      competenceFrom: defaultCompetence,
      competenceTo: defaultCompetence,
      dueDate: '',
      dueDateFrom: '',
      dueDateTo: '',
      taxRegime: '',
      selectedAnnex: '',
      exceededSublimit: false,
      notifiedExclusion: false,
      priority: '',
      sector: '',
      responsible: '',
      responsibleList: [],
      status: '',
      clientDocument: '',
      clientCity: '',
      clientState: '',
      noMovement: false,
    });
    setVisibleFilters({});
    setRangeMode(false);
  };

  const formatMonthDisplay = (val: string) => {
    if (!val) return '';
    const [year, month] = val.split('-');
    return `${month}/${year}`;
  };


  const getPrevMonthCompetence = (curr: string) => {
    if (!curr) return '';
    const [year, month] = curr.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const prevCompetence = getPrevMonthCompetence(filters.competence);
  const totalTasksPrevMonth = tasks.filter(t => t.competence === prevCompetence).length;
  
  const trendValue = totalTasksPrevMonth > 0 
    ? (((totalTasks - totalTasksPrevMonth) / totalTasksPrevMonth) * 100)
    : (totalTasks > 0 ? 100 : 0);
    
  const trendLabel = totalTasksPrevMonth === 0 && totalTasks > 0 
    ? "Novo este mês" 
    : `${trendValue >= 0 ? '+' : ''}${trendValue.toFixed(0)}% vs mês ant.`;

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      // Fetch members and their sectors for accurate sector mapping
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('first_name, last_name, sectors(name)')
        .eq('org_id', userProfile.org_id)
        .not('sector_id', 'is', null);
        
      if (membersError) console.error('Error fetching members for sectors:', membersError);
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          clients(city, state, document, establishment_type, client_dfe_series(id, dfe_type, login_url, issuer, series, username, password), client_accesses(id, access_name, username, password, access_url, sector), client_legislations(id, description, status, access_url)),
          attachments:task_attachments(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Map DB fields to component Task type if names differ
        const mappedTasks: Task[] = data.map((t: any) => {
          // Find the current sector of the responsible member
          const member = membersData?.find(m => 
            `${m.first_name || ''} ${m.last_name || ''}`.trim() === t.responsible || 
            (m.first_name || '').trim() === t.responsible
          );
          const currentSector = member?.sectors?.name || t.sector;

          return {
            id: t.id,
            clientId: t.client_id,
            clientName: t.client_name,
            taskName: t.task_name,
            competence: t.competence,
            taxRegime: t.tax_regime,
            priority: t.priority as Priority,
            sector: currentSector,
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
            notifiedExclusion: t.notified_exclusion,
            selectedAnnexes: t.selected_annexes,
            clientCity: t.clients?.city,
            clientState: t.clients?.state,
            clientDocument: t.clients?.document,
            establishmentType: t.clients?.establishment_type,
            clientDfes: t.clients?.client_dfe_series || [],
            clientAccesses: t.clients?.client_accesses || [],
            clientLegislations: t.clients?.client_legislations || [],
            attachments: t.attachments?.map((a: any) => ({
              id: a.id,
              name: a.file_name,
              size: a.file_size,
              url: a.download_url,
              storage_path: a.storage_path
            }))
          };
        });
        setTasks(mappedTasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('org_id', userProfile.org_id);

      if (error) throw error;

      if (data) {
        const mappedClients: Client[] = data.map((c: any) => ({
          id: c.id,
          code: c.code,
          companyName: c.company_name,
          tradeName: c.trade_name,
          document: c.document,
          contactName: c.contact_name,
          phoneFixed: c.phone_fixed,
          phoneMobile: c.phone_mobile,
          email: c.email,
          status: c.status,
          segment: c.segment,
          person_type: c.person_type,
          constitution_date: c.constitution_date,
          entry_date: c.entry_date,
          exit_date: c.exit_date,
          admin_partner_name: c.admin_partner_name,
          admin_partner_cpf: c.admin_partner_cpf,
          admin_partner_birthdate: c.admin_partner_birthdate,
          establishment_type: c.establishment_type,
          zip_code: c.zip_code,
          street: c.street,
          street_number: c.street_number,
          complement: c.complement,
          neighborhood: c.neighborhood,
          city: c.city,
          state: c.state,
          updated_at: c.updated_at
        }));
        setClients(mappedClients);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchClients();
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
      // Find current status to check for reopen confirmation
      const currentTask = tasks.find(t => t.id === id);
      if (currentTask?.status === TaskStatus.CONCLUIDA && newStatus !== TaskStatus.CONCLUIDA) {
        if (currentTask.attachments && currentTask.attachments.length > 0) {
          try {
            const { data } = await supabase.from('client_documents' as any).select('name, status').eq('task_id', currentTask.id);
            if (data) setReopenModalDocsStatus(data);
          } catch (e) {
            console.error('Erro ao buscar status dos documentos para reabertura: ', e);
          }
        }
        setReopenModalTask(currentTask);
        setReopenModalNewStatus(newStatus);
        setReopenModalOpen(true);
        return;
      }

      await executeTaskStatusUpdate(id, newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erro ao atualizar status da tarefa');
    }
  };

  const executeTaskStatusUpdate = async (id: string, newStatus: TaskStatus) => {
    setLoading(true);
    try {
      const { error } = await (supabase
        .from('tasks') as any)
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error('Error in executeTaskStatusUpdate:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleReopenTask = async (deleteAttachments: boolean) => {
    if (!reopenModalTask || !reopenModalNewStatus) return;
    
    setLoading(true);
    try {
      if (deleteAttachments && reopenModalTask.attachments && reopenModalTask.attachments.length > 0) {
        for (const attachment of reopenModalTask.attachments) {
          // Atualiza o status no client portal
          await supabase.from('client_documents' as any)
            .update({ status: 'Excluído' })
            .eq('task_id', reopenModalTask.id)
            .eq('name', attachment.name);
            
          // Remove o arquivo fisicamente do bucket client-documents
          if (attachment.storage_path) {
            await supabase.storage.from('client-documents').remove([attachment.storage_path]);
          }
          
          // Remove da tabela task_attachments
          if (attachment.id) {
            await supabase.from('task_attachments' as any)
              .delete()
              .eq('id', attachment.id);
          }
        }
      }
      
      // Atualiza o status da tarefa principal
      const { error } = await (supabase.from('tasks') as any)
        .update({ status: reopenModalNewStatus })
        .eq('id', reopenModalTask.id);
        
      if (error) throw error;
      
      // Atualiza a listagem local
      setTasks(prev => prev.map(t => {
        if (t.id === reopenModalTask.id) {
          return { 
            ...t, 
            status: reopenModalNewStatus,
            attachments: deleteAttachments ? [] : t.attachments
          };
        }
        return t;
      }));
      
    } catch (error: any) {
      console.error('Erro ao reabrir tarefa:', error);
      alert('Erro ao reabrir tarefa: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
      setReopenModalOpen(false);
      setReopenModalTask(null);
      setReopenModalNewStatus(null);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    setTaskToDelete(task);
    
    // Check for documents
    let hasDocs = false;
    if (task.attachments && task.attachments.length > 0) {
      try {
        const { data } = await supabase.from('client_documents' as any).select('name, status').eq('task_id', task.id);
        if (data && data.length > 0) {
          setDeleteModalDocsStatus(data);
          hasDocs = true;
        } else {
          setDeleteModalDocsStatus([]);
        }
      } catch (e) {
        console.error('Erro ao buscar status dos documentos para exclusão: ', e);
      }
    } else {
      setDeleteModalDocsStatus([]);
    }

    const isRecurring = task.recurrence && !['unico', 'nao_recorre', 'none'].includes(task.recurrence);

    if (isRecurring && !hasDocs) {
      setShowDeleteRecurrenceModal(true);
    } else {
      setDeleteModalOpen(true);
    }
  };

  const executeDeleteWithChoice = async (deleteDocs: boolean) => {
    if (!taskToDelete) return;
    setLoading(true);

    try {
      if (!deleteDocs) {
        // Unlink so CASCADE doesn't blow them away
        await supabase.from('client_documents' as any).update({ task_id: null }).eq('task_id', taskToDelete.id);
      } else {
        // Physical deletion from storage
        const { data: clientDocs } = await supabase.from('client_documents' as any).select('storage_path').eq('task_id', taskToDelete.id);
        if (clientDocs && clientDocs.length > 0) {
           const paths = (clientDocs as any[]).map(d => d.storage_path).filter(Boolean);
           if (paths.length > 0) await supabase.storage.from('client-documents').remove(paths);
        }
        
        const { data: taskAtts } = await supabase.from('task_attachments' as any).select('storage_path').eq('task_id', taskToDelete.id);
        if (taskAtts && taskAtts.length > 0) {
           const paths = (taskAtts as any[]).map(d => d.storage_path).filter(Boolean);
           if (paths.length > 0) await supabase.storage.from('task-attachments').remove(paths);
        }
      }

      await executeDelete(taskToDelete.id);
    } catch (error: any) {
       console.error('Erro ao processar a exclusão: ', error);
    } finally {
      setDeleteModalOpen(false);
      setTaskToDelete(null);
      setLoading(false);
    }
  };

  const executeDelete = async (id: string) => {
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

  const handleConfirmDelete = async (type: 'current' | 'future') => {
    if (!taskToDelete) return;

    try {
      setLoading(true);

      if (type === 'current') {
        await executeDelete(taskToDelete.id);
      } else {
        // Delete current
        const { error: currentError } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskToDelete.id);

        if (currentError) throw currentError;

        // Delete future
        const { error: futureError } = await (supabase
          .from('tasks') as any)
          .delete()
          .eq('client_id', taskToDelete.clientId)
          .eq('task_name', taskToDelete.taskName)
          .eq('org_id', (await supabase.auth.getUser()).data.user?.id)
          .gt('competence', taskToDelete.competence);

        if (futureError) throw futureError;

        // Refresh list
        await fetchTasks();
      }

      setShowDeleteRecurrenceModal(false);
      setTaskToDelete(null);
    } catch (error: any) {
      console.error('Error in batch delete:', error);
      alert('Erro ao excluir tarefas em lote: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
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

        const taskToConclude = tasks.find(t => t.id === selectedTaskForConclude);
        if (!taskToConclude) throw new Error('Tarefa não encontrada');

        // 1. Update Status
        const { error: statusError } = await (supabase
          .from('tasks') as any)
          .update({ status: TaskStatus.CONCLUIDA })
          .eq('id', selectedTaskForConclude);

        if (statusError) throw statusError;

        // 2. Insert Conclusion Attachments & Mirror to Client Portal
        if (concludeFiles.length > 0) {
          // Get sector_id for mirroring
          const { data: sectorData } = await supabase
            .from('sectors')
            .select('id')
            .eq('org_id', userProfile.org_id)
            .eq('name', taskToConclude.sector)
            .single();

          for (const file of concludeFiles) {
            // Remove caracteres especiais, espaços e pontos duplos que o Supabase bloqueia como "vulnerabilidade de pasta (..)"
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.+/g, '.');
            const storagePath = `tasks/${selectedTaskForConclude}/conclude/${Date.now()}_${safeName}`;
            
            // Upload Físico do arquivo para o bucket
            const { error: uploadError } = await supabase.storage
              .from('client-documents')
              .upload(storagePath, file);
              
            if (uploadError) {
              console.error('Falha no upload', uploadError);
              throw new Error(`Erro ao subir arquivo ${file.name}: ` + uploadError.message);
            }
            
            await supabase.from('task_attachments' as any).insert({
              task_id: selectedTaskForConclude,
              file_name: file.name,
              file_size: file.size,
              storage_path: storagePath,
              is_conclude_attachment: true
            });

            // b. Mirror to client_documents
            // Convert YYYY-MM to MM/YYYY
            const compParts = taskToConclude.competence.split('-');
            const competenceMonth = compParts.length === 2 ? `${compParts[1]}/${compParts[0]}` : taskToConclude.competence;

            await supabase.from('client_documents' as any).insert({
              org_id: userProfile.org_id,
              client_id: taskToConclude.clientId,
              task_id: taskToConclude.id,
              name: file.name,
              storage_path: storagePath,
              sector_id: sectorData?.id,
              competence_month: competenceMonth,
              due_date: taskToConclude.dueDate,
              type: taskToConclude.taskName,
              status: 'Pendente',
              uploaded_by_role: userProfile.role
            });
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

  const handleViewTaskInfo = (task: Task) => {
    setSelectedTaskForInfo(task);
    setIsTaskInfoDrawerOpen(true);
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
        clients={clients}
        userProfile={userProfile}
      />
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <style>
        {`
          .month-input-mask::-webkit-datetime-edit { color: transparent !important; }
          .month-input-mask::-webkit-datetime-edit-fields-wrapper { color: transparent !important; }
        `}
      </style>
      <TaskInfoDrawer
        key={selectedTaskForInfo?.id || 'none'}
        isOpen={isTaskInfoDrawerOpen}
        onClose={() => {
          setIsTaskInfoDrawerOpen(false);
          setSelectedTaskForInfo(null);
        }}
        task={selectedTaskForInfo}
      />

      <TaskDetailsDrawer
        isOpen={isTaskDetailsDrawerOpen}
        onClose={() => {
          setIsTaskDetailsDrawerOpen(false);
          setSelectedTaskForDetails(null);
        }}
        task={selectedTaskForDetails}
        onEdit={(task) => {
          handleEdit(task);
          setIsTaskDetailsDrawerOpen(false);
        }}
        registrationRegimeLabels={REGISTRATION_REGIME_LABELS}
      />

      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3 mb-2 md:mb-0">
          <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
            <ListChecks size={18} className="text-slate-500 dark:text-slate-400" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
              Controle de Tarefa
            </h1>
            <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800">
            <div className="relative group flex">
              <button
                onClick={() => setLayoutMode('list')}
                className={`p-2 rounded transition-colors ${layoutMode === 'list' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutList size={18} />
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block whitespace-nowrap px-2 py-1 bg-slate-900 text-white text-[10px] rounded shadow-lg z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                Tabela
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900" />
              </div>
            </div>
            <div className="relative group flex">
              <button
                onClick={() => setLayoutMode('kanban')}
                className={`p-2 rounded transition-colors ${layoutMode === 'kanban' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block whitespace-nowrap px-2 py-1 bg-slate-900 text-white text-[10px] rounded shadow-lg z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                Kanban
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900" />
              </div>
            </div>
          </div>
          <Button onClick={handleCreate} icon={<Plus size={18} />} className="hidden md:flex">Nova Tarefa</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 shrink-0 px-1">
        <MetricCard 
          title="Total de Tarefas" 
          value={totalTasks} 
          icon={<ListChecks size={20} />} 
          color="slate" 
          trend={trendLabel}
          variant="horizontal"
        />
        <MetricCard 
          title="Pendentes" 
          value={pendingCount} 
          icon={<Clock size={20} />} 
          color="indigo" 
          progress={Number(getPercent(pendingCount))}
          variant="horizontal"
        />
        <MetricCard 
          title="Iniciadas" 
          value={inProgressCount} 
          icon={<Play size={20} />} 
          color="amber" 
          progress={Number(getPercent(inProgressCount))}
          variant="horizontal"
        />
        <MetricCard 
          title="Atrasadas" 
          value={delayedCount} 
          icon={<XCircle size={20} />} 
          color="rose" 
          progress={Number(getPercent(delayedCount))}
          variant="horizontal"
        />
        <MetricCard 
          title="Concluídas" 
          value={completedCount} 
          icon={<CheckCircle size={20} />} 
          color="emerald" 
          progress={Number(getPercent(completedCount))}
          variant="horizontal"
        />
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
            <div className="overflow-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ maxHeight: 'calc(100vh - 260px)' }}>
              <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400 border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 uppercase font-medium text-xs sticky top-0 z-[40] shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                  <tr>
                    {/* == CLIENTE == */}
                    {(() => {
                      const clientActive = !!(filters.clientName || filters.clientDocument || filters.clientCity || filters.clientState);
                      const clientCount = [filters.clientName, filters.clientDocument, filters.clientCity, filters.clientState].filter(Boolean).length;
                      return (
                        <th className={`px-6 py-4 align-top min-w-[200px] ${clientActive ? 'relative z-50' : 'relative z-10'}`}>
                          <div className="flex items-center justify-between gap-2 h-6">
                            <span className="truncate text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">Cliente</span>
                            <TableColumnFilter label="Cliente" isActive={clientActive} activeCount={clientCount}>
                              {/* Nome */}
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Nome</label>
                                <input type="text" placeholder="Buscar cliente..." className={headerInputClass} value={filters.clientName} onChange={e => handleFilterChange('clientName', e.target.value)} autoFocus />
                              </div>
                              {/* CNPJ/CPF */}
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">CNPJ / CPF</label>
                                <input type="text" placeholder="Digite o documento..." className={headerInputClass} value={filters.clientDocument} onChange={e => handleFilterChange('clientDocument', e.target.value)} />
                              </div>
                              {/* Cidade + UF */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Cidade</label>
                                  <input type="text" placeholder="Cidade..." className={headerInputClass} value={filters.clientCity} onChange={e => handleFilterChange('clientCity', e.target.value)} />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">UF</label>
                                  <select className={headerInputClass} value={filters.clientState} onChange={e => handleFilterChange('clientState', e.target.value)}>
                                    <option value="">Todos</option>
                                    {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                                      <option key={uf} value={uf}>{uf}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              {/* Limpar */}
                              {clientActive && (
                                <button onClick={() => { handleFilterChange('clientName', ''); handleFilterChange('clientDocument', ''); handleFilterChange('clientCity', ''); handleFilterChange('clientState', ''); }} className="w-full text-center text-[10px] font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-700 pt-1">
                                  Limpar filtros
                                </button>
                              )}
                            </TableColumnFilter>
                          </div>
                        </th>
                      );
                    })()}

                    {/* == TAREFA == */}
                    {(() => {
                      const tarefaActive = !!(filters.taskName || filters.noMovement);
                      const tarefaCount = [filters.taskName, filters.noMovement ? 'x' : ''].filter(Boolean).length;
                      return (
                        <th className={`px-6 py-4 align-top min-w-[180px] ${tarefaActive ? 'relative z-50' : 'relative z-10'}`}>
                          <div className="flex items-center justify-between gap-2 h-6">
                            <span className="truncate text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">Tarefa</span>
                            <TableColumnFilter label="Tarefa" isActive={tarefaActive} activeCount={tarefaCount}>
                              {/* Nome */}
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Nome da Tarefa</label>
                                <input type="text" placeholder="Buscar tarefa..." className={headerInputClass} value={filters.taskName} onChange={e => handleFilterChange('taskName', e.target.value)} autoFocus />
                              </div>
                              {/* Toggle Sem Movimento */}
                              <button
                                onClick={() => setFilters(p => ({ ...p, noMovement: !p.noMovement }))}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-[11px] font-semibold ${filters.noMovement ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                              >
                                <span>Sem Movimento</span>
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${filters.noMovement ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                  {filters.noMovement ? '✓' : ''}
                                </span>
                              </button>
                              {/* Limpar */}
                              {tarefaActive && (
                                <button onClick={() => { handleFilterChange('taskName', ''); setFilters(p => ({ ...p, noMovement: false })); }} className="w-full text-center text-[10px] font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-700 pt-1">
                                  Limpar filtros
                                </button>
                              )}
                            </TableColumnFilter>
                          </div>
                        </th>
                      );
                    })()}

                    {/* == PERÍODO == */}
                    {(() => {
                      const periodActive = !!(filters.competence || filters.competenceFrom || filters.competenceTo || filters.dueDate || filters.dueDateFrom || filters.dueDateTo);
                      const periodCount = [
                        (filters.competence || filters.competenceFrom || filters.competenceTo) ? 'c' : '',
                        (filters.dueDate || filters.dueDateFrom || filters.dueDateTo) ? 'd' : ''
                      ].filter(Boolean).length;
                      return (
                        <th className={`px-6 py-4 align-top min-w-[130px] ${periodActive ? 'relative z-50' : 'relative z-10'}`}>
                          <div className="flex items-center justify-between gap-2 h-6">
                            <span className="truncate text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">Período</span>
                            <TableColumnFilter label="Período" isActive={periodActive} activeCount={periodCount}>
                              {/* Toggle mês único / intervalo */}
                              <div>
                                <div className="flex items-center gap-1 mb-2 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                  <button onClick={() => setRangeMode(false)} className={`flex-1 text-[10px] font-bold py-1 rounded-md transition-all ${!rangeMode ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}>Mês único</button>
                                  <button onClick={() => setRangeMode(true)} className={`flex-1 text-[10px] font-bold py-1 rounded-md transition-all ${rangeMode ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}>Intervalo</button>
                                </div>
                                {!rangeMode ? (
                                  <div className="relative group">
                                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Competência</label>
                                    <div className="relative">
                                      <input 
                                        type="month" 
                                        className={`${headerInputClass} dark:[color-scheme:dark] text-transparent focus:text-transparent selection:bg-transparent month-input-mask`} 
                                        value={filters.competence} 
                                        onChange={e => handleFilterChange('competence', e.target.value)} 
                                      />
                                      <div className="absolute inset-y-0 left-0 flex items-center px-2 pointer-events-none text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase">
                                        {formatMonthDisplay(filters.competence)}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="relative group">
                                      <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">De</label>
                                      <div className="relative">
                                        <input 
                                          type="month" 
                                          className={`${headerInputClass} dark:[color-scheme:dark] text-transparent focus:text-transparent selection:bg-transparent month-input-mask`} 
                                          value={filters.competenceFrom} 
                                          onChange={e => handleFilterChange('competenceFrom', e.target.value)} 
                                        />
                                        <div className="absolute inset-y-0 left-0 flex items-center px-2 pointer-events-none text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase">
                                          {formatMonthDisplay(filters.competenceFrom)}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="relative group">
                                      <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Até</label>
                                      <div className="relative">
                                        <input 
                                          type="month" 
                                          className={`${headerInputClass} dark:[color-scheme:dark] text-transparent focus:text-transparent selection:bg-transparent month-input-mask`} 
                                          value={filters.competenceTo} 
                                          onChange={e => handleFilterChange('competenceTo', e.target.value)} 
                                        />
                                        <div className="absolute inset-y-0 left-0 flex items-center px-2 pointer-events-none text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase">
                                          {formatMonthDisplay(filters.competenceTo)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {/* Vencimento */}
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Data de Vencimento</label>
                                {!rangeMode ? (
                                  <input type="date" className={`${headerInputClass} dark:[color-scheme:dark]`} value={filters.dueDate} onChange={e => handleFilterChange('dueDate', e.target.value)} />
                                ) : (
                                  <div className="grid grid-cols-2 gap-2">
                                    <input type="date" className={`${headerInputClass} dark:[color-scheme:dark]`} value={filters.dueDateFrom} onChange={e => handleFilterChange('dueDateFrom', e.target.value)} />
                                    <input type="date" className={`${headerInputClass} dark:[color-scheme:dark]`} value={filters.dueDateTo} onChange={e => handleFilterChange('dueDateTo', e.target.value)} />
                                  </div>
                                )}
                              </div>
                              {/* Limpar */}
                              {periodActive && (
                                <button onClick={() => { 
                                  handleFilterChange('competence', ''); 
                                  handleFilterChange('competenceFrom', ''); 
                                  handleFilterChange('competenceTo', ''); 
                                  handleFilterChange('dueDate', ''); 
                                  handleFilterChange('dueDateFrom', ''); 
                                  handleFilterChange('dueDateTo', ''); 
                                  setRangeMode(false); 
                                }} className="w-full text-center text-[10px] font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-700 pt-1">
                                  Limpar filtros
                                </button>
                              )}
                            </TableColumnFilter>
                          </div>
                        </th>
                      );
                    })()}

                    {/* == REGIME == */}
                    {(() => {
                      const regimeActive = !!(filters.taxRegime || filters.selectedAnnex || filters.exceededSublimit || filters.notifiedExclusion);
                      const regimeCount = [filters.taxRegime, filters.selectedAnnex, filters.exceededSublimit ? 'x' : '', filters.notifiedExclusion ? 'x' : ''].filter(Boolean).length;
                      return (
                        <th className={`px-6 py-4 align-top min-w-[200px] ${regimeActive ? 'relative z-50' : 'relative z-10'}`}>
                          <div className="flex items-center justify-between gap-2 h-6">
                            <span className="truncate text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">Regime</span>
                            <TableColumnFilter label="Regime" isActive={regimeActive} activeCount={regimeCount}>
                              {/* Regime */}
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Regime Fiscal</label>
                                <select className={headerInputClass} value={filters.taxRegime} onChange={e => { handleFilterChange('taxRegime', e.target.value); if (e.target.value !== 'simples') handleFilterChange('selectedAnnex', ''); }}>
                                  <option value="">Todos</option>
                                  {TAX_REGIME_GROUPS.map(group => (
                                    <optgroup key={group.category} label={group.category}>
                                      {group.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </optgroup>
                                  ))}
                                </select>
                              </div>
                              {/* Anexo — só para Simples */}
                              {filters.taxRegime === 'simples' && (
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Anexo do Simples</label>
                                  <select className={headerInputClass} value={filters.selectedAnnex} onChange={e => handleFilterChange('selectedAnnex', e.target.value)}>
                                    <option value="">Todos os Anexos</option>
                                    {SIMPLES_ANNEXES.map(a => <option key={a} value={a}>{a}</option>)}
                                  </select>
                                </div>
                              )}
                              {/* Toggles */}
                              <div className="space-y-1.5">
                                <button onClick={() => setFilters(p => ({ ...p, exceededSublimit: !p.exceededSublimit }))} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-[11px] font-semibold ${filters.exceededSublimit ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                  <span>Sublimite Excedido</span>
                                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${filters.exceededSublimit ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>{filters.exceededSublimit ? '✓' : ''}</span>
                                </button>
                                <button onClick={() => setFilters(p => ({ ...p, notifiedExclusion: !p.notifiedExclusion }))} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-[11px] font-semibold ${filters.notifiedExclusion ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                  <span>Exclusão Notificada</span>
                                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${filters.notifiedExclusion ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>{filters.notifiedExclusion ? '✓' : ''}</span>
                                </button>
                              </div>
                              {/* Limpar */}
                              {regimeActive && (
                                <button onClick={() => { handleFilterChange('taxRegime', ''); handleFilterChange('selectedAnnex', ''); setFilters(p => ({ ...p, exceededSublimit: false, notifiedExclusion: false })); }} className="w-full text-center text-[10px] font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-700 pt-1">
                                  Limpar filtros
                                </button>
                              )}
                            </TableColumnFilter>
                          </div>
                        </th>
                      );
                    })()}

                    {/* == PRIORIDADE == */}
                    {(() => {
                      const prioActive = !!filters.priority;
                      const prioCount = prioActive ? 1 : 0;
                      const prioOptions = [
                        { value: 'Alta',  label: 'Alta',  color: 'bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-400' },
                        { value: 'Média', label: 'Média', color: 'bg-amber-500/10 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400' },
                        { value: 'Baixa', label: 'Baixa', color: 'bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400' },
                      ];
                      return (
                        <th className={`px-6 py-4 align-top min-w-[120px] ${prioActive ? 'relative z-50' : 'relative z-10'}`}>
                          <div className="flex items-center justify-between gap-2 h-6">
                            <span className="truncate text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">Prioridade</span>
                            <TableColumnFilter label="Prioridade" isActive={prioActive} activeCount={prioCount} widthClass="w-60" widthPx={240}>
                              <div className="space-y-1.5">
                                {prioOptions.map(opt => (
                                  <button
                                    key={opt.value}
                                    onClick={() => handleFilterChange('priority', filters.priority === opt.value ? '' : opt.value)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-[11px] font-semibold ${
                                      filters.priority === opt.value
                                        ? opt.color
                                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    <span>{opt.label}</span>
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                                      filters.priority === opt.value
                                        ? 'bg-current text-white opacity-80'
                                        : 'bg-slate-200 dark:bg-slate-700'
                                    }`}>
                                      {filters.priority === opt.value ? '✓' : ''}
                                    </span>
                                  </button>
                                ))}
                              </div>
                              {prioActive && (
                                <button onClick={() => handleFilterChange('priority', '')} className="w-full text-center text-[10px] font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-700 pt-1">
                                  Limpar filtro
                                </button>
                              )}
                            </TableColumnFilter>
                          </div>
                        </th>
                      );
                    })()}

                    {/* == RESPONSÁVEL == */}
                    {(() => {
                      const respActive = filters.responsibleList.length > 0;
                      const respCount = filters.responsibleList.length;
                      return (
                        <th className={`px-6 py-4 align-top min-w-[150px] ${respActive ? 'relative z-50' : 'relative z-10'}`}>
                          <div className="flex items-center justify-between gap-2 h-6">
                            <span className="truncate text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">Responsável</span>
                            <TableColumnFilter label="Responsável" isActive={respActive} activeCount={respCount}>
                              <ResponsibleFilterPanel
                                tasks={tasks}
                                selected={filters.responsibleList}
                                onChange={list => setFilters(p => ({ ...p, responsibleList: list, responsible: '' }))}
                              />
                              {respActive && (
                                <button onClick={() => setFilters(p => ({ ...p, responsibleList: [] }))} className="w-full text-center text-[10px] font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-700 pt-1">
                                  Limpar filtros
                                </button>
                              )}
                            </TableColumnFilter>
                          </div>
                        </th>
                      );
                    })()}

                    {/* == STATUS == */}
                    {(() => {
                      const statActive = !!filters.status;
                      const statCount = statActive ? 1 : 0;
                      const statOptions = [
                        { value: TaskStatus.PENDENTE,  label: 'Pendente',  color: 'bg-slate-500/10 border-slate-300 dark:border-slate-500/40 text-slate-600 dark:text-slate-300' },
                        { value: TaskStatus.INICIADA,  label: 'Iniciada',  color: 'bg-blue-500/10 border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-400' },
                        { value: TaskStatus.ATRASADA,  label: 'Atrasada',  color: 'bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-400' },
                        { value: TaskStatus.CONCLUIDA, label: 'Concluída', color: 'bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400' },
                      ];
                      return (
                        <th className={`px-6 py-4 align-top min-w-[130px] ${statActive ? 'relative z-50' : 'relative z-10'}`}>
                          <div className="flex items-center justify-between gap-2 h-6">
                            <span className="truncate text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">Status</span>
                            <TableColumnFilter label="Status" isActive={statActive} activeCount={statCount} widthClass="w-60" widthPx={240}>
                              <div className="space-y-1.5">
                                {statOptions.map(opt => (
                                  <button
                                    key={opt.value}
                                    onClick={() => handleFilterChange('status', filters.status === opt.value ? '' : opt.value)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-[11px] font-semibold ${
                                      filters.status === opt.value
                                        ? opt.color
                                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    <span>{opt.label}</span>
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                                      filters.status === opt.value
                                        ? 'bg-current text-white opacity-80'
                                        : 'bg-slate-200 dark:bg-slate-700'
                                    }`}>
                                      {filters.status === opt.value ? '✓' : ''}
                                    </span>
                                  </button>
                                ))}
                              </div>
                              {statActive && (
                                <button onClick={() => handleFilterChange('status', '')} className="w-full text-center text-[10px] font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-700 pt-1">
                                  Limpar filtro
                                </button>
                              )}
                            </TableColumnFilter>
                          </div>
                        </th>
                      );
                    })()}

                    <th className="px-6 py-4 w-[80px]"></th>
                  </tr>

                </thead>
                <tbody className="">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        Nenhuma tarefa encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => (
                      <tr key={task.id} className="group relative border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div
                              className="font-medium text-slate-900 dark:text-white"
                            >
                              {task.clientName}
                            </div>
                            {(() => {
                              const clientData = clients.find(c => c.id === task.clientId);
                              return (
                                <>
                                  {clientData?.document && (
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tracking-wide">
                                      {clientData.document}
                                    </div>
                                  )}
                                  {(task.clientCity || task.clientState) && (
                                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400 font-medium">
                                      <MapPin size={10} className="text-slate-300 shrink-0" />
                                      <span className="truncate">{task.clientCity}{task.clientCity && task.clientState ? ' - ' : ''}{task.clientState}</span>
                                    </div>
                                  )}
                                  {(task.establishmentType || clientData?.status === 'Inativo') && (
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                      {task.establishmentType && (
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                          <GitCompareArrows size={10} className="text-slate-300 shrink-0" />
                                          <span className="capitalize">{task.establishmentType === 'matriz' ? 'Matriz' : 'Filial'}</span>
                                        </div>
                                      )}
                                      {clientData?.status === 'Inativo' && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                                          <AlertCircle size={9} /> Inativo
                                        </span>
                                      )}
                                    </div>
                                  )}
                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                      <Tooltip content="Dados da Empresa">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const clientData = clients.find(c => c.id === task.clientId);
                                            if (clientData) {
                                              setSelectedClientForDetails(clientData);
                                              setIsClientDetailsDrawerOpen(true);
                                            }
                                          }}
                                          className="p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-90"
                                        >
                                          <Eye size={14} />
                                        </button>
                                      </Tooltip>

                                      {((task.clientDfes && task.clientDfes.length > 0) || (task.clientAccesses && task.clientAccesses.length > 0) || (task.clientLegislations && task.clientLegislations.length > 0) || task.observation || task.noMovement) && (
                                        <Tooltip content="Acessos">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleViewTaskInfo(task);
                                            }}
                                            className="p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-90"
                                          >
                                            <ExternalLink size={14} />
                                          </button>
                                        </Tooltip>
                                      )}
                                    </div>
                                  {task.hasBranches && (
                                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-indigo-500 dark:text-indigo-400 font-bold">
                                      <GitMerge size={10} />
                                      <span>Filiais</span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug max-w-[200px]">
                              {task.taskName}
                            </span>
                            
                            {/* Pilha de Ações/Badges */}
                            <div className="flex items-center gap-2">
                              <Tooltip content="Dados da Tarefa">
                                <button
                                  onClick={() => {
                                    setSelectedTaskForDetails(task);
                                    setIsTaskDetailsDrawerOpen(true);
                                  }}
                                  className="p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-90"
                                >
                                  <Eye size={14} />
                                </button>
                              </Tooltip>
                              
                              {task.noMovement && (
                                <span className="px-2 py-0.5 bg-red-50 dark:bg-red-500/10 text-[9px] text-red-600 dark:text-red-400 font-black whitespace-nowrap border border-red-100 dark:border-red-900/30 rounded-md shadow-sm">
                                  Sem Movimento
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
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
                            {task.recurrence && !['unico', 'nao_recorre', 'none'].includes(task.recurrence) && (
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-indigo-500 dark:text-indigo-400 font-bold">
                                <Repeat size={10} />
                                <span className="capitalize">{task.recurrence}</span>
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
                                {task.notifiedExclusion && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-rose-500 font-bold">
                                    <AlertTriangle size={10} />
                                    <span>Exclusão Notificada</span>
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
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-700 dark:text-slate-200">{task.responsible}</span>
                            {task.sector && (
                              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-medium">
                                <Layers size={10} className="text-slate-300" />
                                <span>{task.sector}</span>
                              </div>
                            )}
                          </div>
                        </td>
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
                  accentColor="indigo"
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  onNavigateToClient={onNavigateToClient}
                  onViewTask={(task) => {
                    setSelectedTaskForDetails(task);
                    setIsTaskDetailsDrawerOpen(true);
                  }}
                  onViewClient={(client) => {
                    setSelectedClientForDetails(client);
                    setIsClientDetailsDrawerOpen(true);
                  }}
                  onViewTaskInfo={handleViewTaskInfo}
                  onStatusChange={handleStatusChange}
                  clients={clients}
                  userProfile={userProfile}
                />
              </div>
              <div className="flex-1 min-w-[250px]">
                <KanbanColumn
                  title="Iniciadas"
                  status={TaskStatus.INICIADA}
                  tasks={filteredTasks.filter(t => t.status === TaskStatus.INICIADA)}
                  onEdit={handleEdit}
                  onConclude={openConcludeModal}
                  onDelete={handleDeleteTask}
                  color="border-amber-400"
                  accentColor="amber"
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  onNavigateToClient={onNavigateToClient}
                  onViewTask={(task) => {
                    setSelectedTaskForDetails(task);
                    setIsTaskDetailsDrawerOpen(true);
                  }}
                  onViewClient={(client) => {
                    setSelectedClientForDetails(client);
                    setIsClientDetailsDrawerOpen(true);
                  }}
                  onViewTaskInfo={handleViewTaskInfo}
                  onStatusChange={handleStatusChange}
                  clients={clients}
                  userProfile={userProfile}
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
                  accentColor="rose"
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  onNavigateToClient={onNavigateToClient}
                  onViewTask={(task) => {
                    setSelectedTaskForDetails(task);
                    setIsTaskDetailsDrawerOpen(true);
                  }}
                  onViewClient={(client) => {
                    setSelectedClientForDetails(client);
                    setIsClientDetailsDrawerOpen(true);
                  }}
                  onViewTaskInfo={handleViewTaskInfo}
                  onStatusChange={handleStatusChange}
                  clients={clients}
                  userProfile={userProfile}
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
                  accentColor="emerald"
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  onNavigateToClient={onNavigateToClient}
                  onViewTask={(task) => {
                    setSelectedTaskForDetails(task);
                    setIsTaskDetailsDrawerOpen(true);
                  }}
                  onViewClient={(client) => {
                    setSelectedClientForDetails(client);
                    setIsClientDetailsDrawerOpen(true);
                  }}
                  onViewTaskInfo={handleViewTaskInfo}
                  onStatusChange={handleStatusChange}
                  clients={clients}
                  userProfile={userProfile}
                />
              </div>
            </div>
          </div>
        )
      }

      {/* Reopen Task Modal */}
      <Modal
        isOpen={reopenModalOpen}
        onClose={() => {
          setReopenModalOpen(false);
          setReopenModalTask(null);
          setReopenModalNewStatus(null);
        }}
        title="Reabrir Tarefa"
        size="md"
        footer={
          reopenModalTask?.attachments && reopenModalTask.attachments.length > 0 ? (
            <div className="flex justify-between w-full gap-2">
              <Button variant="ghost" onClick={() => setReopenModalOpen(false)}>Cancelar</Button>
              <div className="flex gap-2">
                <Button onClick={() => handleReopenTask(false)} className="bg-slate-700 hover:bg-slate-800 text-white whitespace-normal h-auto py-2">Reabrir e Manter</Button>
                <Button variant="danger" onClick={() => handleReopenTask(true)} className="whitespace-normal h-auto py-2">Reabrir e Excluir</Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end w-full gap-2">
              <Button variant="ghost" onClick={() => setReopenModalOpen(false)}>Cancelar</Button>
              <Button onClick={() => handleReopenTask(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white">Confirmar Reabertura</Button>
            </div>
          )
        }
      >
        <div className="space-y-4">
          {reopenModalTask?.attachments && reopenModalTask.attachments.length > 0 ? (
            <>
               <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl">
                 <div className="flex gap-3">
                   <AlertTriangle className="text-amber-500 shrink-0" size={24} />
                   <div>
                      <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-1">Atenção: Documentos Vinculados</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                        Esta tarefa possui documentos enviados ao portal do cliente. O que você deseja fazer com eles ao reabrir a tarefa?
                      </p>
                      
                      <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2 flex flex-col gap-2">
                        {reopenModalTask.attachments.map((file, idx) => {
                          const docStatus = reopenModalDocsStatus.find(d => d.name === file.name)?.status || 'Pendente';
                          return (
                            <div key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 p-2 rounded border border-amber-100 dark:border-amber-800/50 shadow-sm">
                              <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-2" title={file.name}>{file.name}</span>
                              {docStatus === 'Lido' ? (
                                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500 text-white uppercase tracking-tighter">LIDO</span>
                              ) : (
                                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-white uppercase tracking-tighter">NÃO LIDO</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                   </div>
                 </div>
               </div>
               
               <div className="text-sm text-slate-600 dark:text-slate-300 ml-1">
                 <ul className="list-disc pl-5 space-y-3">
                   <li><strong>Reabrir e Manter:</strong> A tarefa volta para Pendente, mas o arquivo continuará acessível para o cliente.</li>
                   <li><strong>Reabrir e Excluir:</strong> A tarefa volta para Pendente, e o arquivo será bloqueado e marcado como Excluído no portal do cliente e removido do provedor de armazenamento.</li>
                 </ul>
               </div>
            </>
          ) : (
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              Tem certeza que deseja reabrir esta tarefa? Ela voltará para o status Pendente.
            </p>
          )}
        </div>
      </Modal>

      {/* Delete Task Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTaskToDelete(null);
        }}
        title="Excluir Tarefa"
        size="md"
        footer={
          taskToDelete?.attachments && taskToDelete.attachments.length > 0 ? (
            <div className="flex justify-between w-full gap-2">
              <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancelar</Button>
              <div className="flex gap-2">
                <Button onClick={() => executeDeleteWithChoice(false)} className="bg-slate-700 hover:bg-slate-800 text-white whitespace-normal h-auto py-2">Excluir Tarefa e Manter Documento</Button>
                <Button variant="danger" onClick={() => executeDeleteWithChoice(true)} className="whitespace-normal h-auto py-2">Excluir Tarefa e Documentos</Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end w-full gap-2">
              <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancelar</Button>
              <Button variant="danger" onClick={() => executeDeleteWithChoice(true)}>Confirmar Exclusão</Button>
            </div>
          )
        }
      >
        <div className="space-y-4">
          {taskToDelete?.attachments && taskToDelete.attachments.length > 0 ? (
            <>
               <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl">
                 <div className="flex gap-3">
                   <AlertTriangle className="text-red-500 shrink-0" size={24} />
                   <div>
                      <h4 className="font-bold text-red-800 dark:text-red-400 mb-1">Atenção: Documentos Vinculados</h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                        Aviso: Esta tarefa possui documentos enviados ao portal do cliente. Deseja limpá-los do portal também?
                      </p>
                      
                      <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2 flex flex-col gap-2">
                        {taskToDelete.attachments.map((file, idx) => {
                          const docStatus = deleteModalDocsStatus.find(d => d.name === file.name)?.status || 'Pendente';
                          return (
                            <div key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 p-2 rounded border border-red-100 dark:border-red-800/50 shadow-sm">
                              <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-2" title={file.name}>{file.name}</span>
                              {docStatus === 'Lido' ? (
                                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500 text-white uppercase tracking-tighter">LIDO</span>
                              ) : (
                                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-white uppercase tracking-tighter">NÃO LIDO</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                   </div>
                 </div>
               </div>
               
               <div className="text-sm text-slate-600 dark:text-slate-300 ml-1">
                 <ul className="list-disc pl-5 space-y-3">
                   <li><strong>Excluir Tarefa e Manter Documento:</strong> A tarefa some, mas o documento continuará perfeitamente acessível ao cliente no Portal.</li>
                   <li><strong>Excluir Tarefa e Documentos:</strong> A tarefa some, e o arquivo será apagado fisicamente do Portal.</li>
                 </ul>
               </div>
            </>
          ) : (
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              Tem certeza que deseja excluir permanentemente esta tarefa?
            </p>
          )}
        </div>
      </Modal>

      {/* Conclude Task Modal */}
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


      {/* Client Edit Modal */}
      <Modal
        isOpen={isClientEditModalOpen}
        onClose={() => setIsClientEditModalOpen(false)}
        size="7xl"
        title="Editar Cliente"
      >
        {selectedClientForDetails && (
          <ClientForm
            onBack={() => {
              setIsClientEditModalOpen(false);
              fetchTasks(); // Refresh to catch any changes
            }}
            initialData={selectedClientForDetails}
            userProfile={userProfile}
          />
        )}
      </Modal>

      {/* Client Details Drawer */}
      <ClientDetailsDrawer
        isOpen={isClientDetailsDrawerOpen}
        onClose={() => setIsClientDetailsDrawerOpen(false)}
        client={selectedClientForDetails}
        onEdit={(client) => {
          setIsClientDetailsDrawerOpen(false);
          setSelectedClientForDetails(client);
          setIsClientEditModalOpen(true);
        }}
      />

      {/* Modal de Confirmação de Exclusão de Recorrência */}
      <Modal
        isOpen={showDeleteRecurrenceModal}
        onClose={() => {
          setShowDeleteRecurrenceModal(false);
          setTaskToDelete(null);
        }}
        title="Excluir Tarefa Recorrente"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl mb-2">
            <AlertTriangle className="text-red-500" size={24} />
            <p className="text-sm text-red-800 dark:text-red-200 font-medium leading-relaxed">
              Esta é uma tarefa recorrente. Como você deseja proceder com a exclusão?
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => handleConfirmDelete('current')}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:text-red-600 transition-colors">
                <Calendar size={24} />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition-colors">Apenas este mês</div>
                <div className="text-xs text-slate-500">Remove somente o lançamento de {taskToDelete?.competence}</div>
              </div>
              <ChevronRight size={20} className="text-slate-300 group-hover:text-red-500 transition-all group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => handleConfirmDelete('future')}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:text-red-600 transition-colors">
                <Trash2 size={24} />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition-colors">Este mês e futuros</div>
                <div className="text-xs text-slate-500">Remove esta e todas as tarefas subsequentes vinculadas</div>
              </div>
              <ChevronRight size={20} className="text-slate-300 group-hover:text-red-500 transition-all group-hover:translate-x-1" />
            </button>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={() => {
                setShowDeleteRecurrenceModal(false);
                setTaskToDelete(null);
              }}
              className="px-6 py-2 text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
      {/* Tutorials Modal */}
      {tutorialsModalOpen && (
        <TutorialsModal
          isOpen={tutorialsModalOpen}
          onClose={() => setTutorialsModalOpen(false)}
          orgId={userProfile?.org_id}
          userId={userProfile?.id}
          clients={clients}
        />
      )}
      {/* FAB: Nova Tarefa (Mobile) */}
      <button
        onClick={handleCreate}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-700 dark:hover:bg-indigo-600 active:scale-95 transition-all z-50 md:hidden border-4 border-white dark:border-slate-900"
        title="Nova Tarefa"
      >
        <Plus size={28} strokeWidth={3} />
      </button>
    </div>
  );
};

// --- TASK FORM COMPONENT ---

interface ClientConfig {
  taxRegime: string;
  regimeRegistro: string;
  semMovimento: boolean;
  selectedAnnexes: string[];
  excedeuSublimite: boolean;
  fatorR: boolean;
  notifiedExclusion: boolean;
  observation: string;
  uploadedFiles: File[];
  existingAttachments: { name: string; size: number; url?: string }[];
}

function TaskForm({ onBack, initialData, clients, userProfile }: { onBack: () => void; initialData?: Task | null; clients: Client[]; userProfile: any }) {
  const isEditing = !!initialData;

  // Selected Clients State
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>(
    initialData?.clientName ? [initialData.clientName] : []
  );
  const [activeClientId, setActiveClientId] = useState<string | null>(
    initialData?.clientName || null
  );

  // Default config for new clients
  const createDefaultConfig = (data?: Task | null): ClientConfig => ({
    taxRegime: data?.taxRegime || 'simples',
    regimeRegistro: data?.registrationRegime || 'competencia',
    semMovimento: data?.noMovement || false,
    selectedAnnexes: data?.selectedAnnexes || [],
    excedeuSublimite: data?.exceededSublimit || false,
    fatorR: data?.factorR || false,
    notifiedExclusion: data?.notifiedExclusion || false,
    observation: data?.observation || '',
    uploadedFiles: [],
    existingAttachments: data?.attachments || []
  });

  // Client Configurations Map
  const [clientConfigs, setClientConfigs] = useState<Record<string, ClientConfig>>(
    initialData?.clientName
      ? { [initialData.clientName]: createDefaultConfig(initialData) }
      : {}
  );

  const [activeTab, setActiveTab] = useState(initialData?.taxRegime === 'simples' ? 'simples' : 'observacao');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Data State
  const [taskTypes, setTaskTypes] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [holidayDates, setHolidayDates] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: NotificationType }>({ show: false, message: '', type: 'info' });

  const showNotify = (message: string, type: NotificationType = 'info') => {
    setNotification({ show: true, message, type });
  };

  // Recurrence Update Flow State
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [updateFutureTasks, setUpdateFutureTasks] = useState<boolean | null>(null);

  // Form State
  // (We use client IDs as the key in clientConfigs, which is the companyName for now since SearchableSelect uses it)

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
    taskName: '',
    sector: '',
    responsible: '',
    priority: Priority.MEDIA,
    competence: new Date().toISOString().substring(0, 7), // YYYY-MM
    vencimento: '',
    vencimentoVariavel: 'nao_aplica',
    recurrence: 'mensal',
    months: [] as number[],
    repetitions: 1,
  });

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);


  useEffect(() => {
    fetchFormData();
  }, []);

  useEffect(() => {
    if (updateFutureTasks !== null) {
      handleSaveAll();
    }
  }, [updateFutureTasks]);

  const fetchFormData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [taskTypesRes, sectorsRes, membersRes, clientsRes, holidaysRes] = await Promise.all([
        supabase.from('task_types').select('*').eq('org_id', userProfile.org_id),
        supabase.from('sectors').select('*').eq('org_id', userProfile.org_id),
        supabase.from('members')
          .select('*')
          .eq('org_id', userProfile.org_id)
          .not('sector_id', 'is', null),
        supabase.from('clients').select('*').eq('org_id', userProfile.org_id).eq('status', 'Ativo'),
        supabase.from('holidays').select('date').eq('org_id', userProfile.org_id)
      ]);

      if (taskTypesRes.data) setTaskTypes(taskTypesRes.data);
      if (sectorsRes.data) setSectors(sectorsRes.data);
      if (membersRes.data) setMembers(membersRes.data);
      if (holidaysRes.data) setHolidayDates(holidaysRes.data.map((h: any) => h.date));
    } catch (error) {
      console.error('Error fetching form data:', error);
    } finally {
      setLoadingData(false);
    }
  };



  const toggleAnnex = (annex: string) => {
    if (!activeClientId) return;
    setClientConfigs(prev => {
      const config = prev[activeClientId];
      const newAnnexes = config.selectedAnnexes.includes(annex)
        ? config.selectedAnnexes.filter(x => x !== annex)
        : [...config.selectedAnnexes, annex];
      return { ...prev, [activeClientId]: { ...config, selectedAnnexes: newAnnexes } };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && activeClientId) {
      const newFiles = Array.from(e.target.files);
      setClientConfigs(prev => ({
        ...prev,
        [activeClientId]: {
          ...prev[activeClientId],
          uploadedFiles: [...prev[activeClientId].uploadedFiles, ...newFiles]
        }
      }));
    }
  };

  const removeFile = (index: number) => {
    if (!activeClientId) return;
    setClientConfigs(prev => ({
      ...prev,
      [activeClientId]: {
        ...prev[activeClientId],
        uploadedFiles: prev[activeClientId].uploadedFiles.filter((_, i) => i !== index)
      }
    }));
  };

  const handleDeleteExistingAttachment = async (attachment: any, index: number) => {
    if (!initialData || !activeClientId) return;
    
    if (!confirm('Deseja realmente excluir este arquivo? Ele será marcado como excluído no portal do cliente.')) return;
    
    setLoadingData(true);
    try {
      // Atualiza o status no client portal
      await supabase.from('client_documents' as any)
        .update({ status: 'Excluído' })
        .eq('task_id', initialData.id)
        .eq('name', attachment.name);
        
      // Remove fisicamente do bucket
      if (attachment.storage_path) {
        await supabase.storage.from('client-documents').remove([attachment.storage_path]);
      }
      
      // Remove da tabela task_attachments
      if (attachment.id) {
        await supabase.from('task_attachments' as any)
          .delete()
          .eq('id', attachment.id);
      }
      
      // Atualiza estado local
      setClientConfigs(prev => ({
        ...prev,
        [activeClientId]: {
          ...prev[activeClientId],
          existingAttachments: prev[activeClientId].existingAttachments.filter((_, i) => i !== index)
        }
      }));
      
    } catch (error: any) {
      console.error('Erro ao excluir anexo:', error);
      alert('Erro ao excluir anexo: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddPendingTask = () => {
    if (!tempTask.taskName || !tempTask.responsible || !tempTask.competence) {
      return alert('Preencha os campos obrigatórios da tarefa (Tarefa, Responsável e Competência)');
    }
    if (tempTask.recurrence !== 'mensal' && tempTask.recurrence !== 'personalizado' && tempTask.months.length === 0) {
      return alert('Selecione pelo menos um mês para esta recorrência');
    }

    if (editingTaskId) {
      // Update existing
      setPendingTasks(prev => prev.map(t =>
        t.id === editingTaskId ? { ...tempTask, id: editingTaskId } : t
      ));
      setEditingTaskId(null);
    } else {
      // Add new
      setPendingTasks([...pendingTasks, { ...tempTask, id: Date.now().toString() }]);
    }

    setTempTask({
      taskTypeId: '',
      taskName: '',
      sector: '',
      responsible: '',
      priority: Priority.MEDIA,
      competence: new Date().toISOString().substring(0, 7),
      vencimento: '',
      vencimentoVariavel: 'nao_aplica',
      recurrence: 'mensal',
      months: [],
      repetitions: 1,
    });
  };

  const handleEditPendingTask = (task: any) => {
    setEditingTaskId(task.id);
    setTempTask({
      taskTypeId: '', // We don't track the ID back, just the name/sector
      taskName: task.taskName,
      sector: task.sector,
      responsible: task.responsible,
      priority: task.priority,
      competence: task.competence,
      vencimento: task.vencimento,
      vencimentoVariavel: task.vencimentoVariavel,
      recurrence: task.recurrence,
      months: task.months || [],
      repetitions: task.repetitions || 1,
    });
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setTempTask({
      taskTypeId: '',
      taskName: '',
      sector: '',
      responsible: '',
      priority: Priority.MEDIA,
      competence: new Date().toISOString().substring(0, 7),
      vencimento: '',
      vencimentoVariavel: 'nao_aplica',
      recurrence: 'mensal',
      months: [],
      repetitions: 1,
    });
  };

  const getAutoFilledDueDate = (taskTypeName: string, comp: string, overrideVariable?: string) => {
    const type = taskTypes.find(t => t.name === taskTypeName);
    if (!type || !type.due_day || !comp) return null;
    
    const [y, m] = comp.split('-');
    if (!y || !m) return null;
    let year = parseInt(y);
    let month = parseInt(m) + 1;
    if (month > 12) { month = 1; year += 1; }
    
    const daysInMonth = new Date(year, month, 0).getDate();
    const day = Math.min(type.due_day, daysInMonth);
    
    const rawDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const variable = overrideVariable !== undefined ? overrideVariable : (type.non_working_day_action || 'nao_se_aplica');
    
    const finalDate = calculateAdjustedDate(rawDate, variable, holidayDates);
    return { vencimento: finalDate, vencimentoVariavel: variable };
  };

  const removePendingTask = (id: string) => {
    setPendingTasks(pendingTasks.filter(t => t.id !== id));
  };

  const handleSaveAll = async () => {
    if (selectedClientIds.length === 0) return showNotify('Selecione pelo menos uma empresa.', 'warning');
    if (pendingTasks.length === 0 && !tempTask.taskName) return showNotify('Adicione pelo menos uma tarefa.', 'warning');

    // Recurrence Check for Editing
    // We consider it recurring if it has a recurrence value other than common non-recurring terms
    const isRecurring = initialData?.recurrence && !['unico', 'nao_recorre', 'none'].includes(initialData.recurrence);

    if (isEditing && isRecurring && updateFutureTasks === null) {
      setShowRecurrenceModal(true);
      return;
    }

    try {
      setIsSaving(true);
      setLoadingData(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return showNotify('Usuário não autenticado.', 'error');

      let tasksToSave = [...pendingTasks];
      if (tasksToSave.length === 0 && tempTask.taskName) {
        tasksToSave.push({ ...tempTask, id: 'temp-' + Date.now() });
      }

      // We will iterate over EACH selected client
      for (const clientName of selectedClientIds) {
        const client = clients.find(c => c.companyName === clientName);
        if (!client) continue;

        const config = clientConfigs[clientName];
        if (!config) continue;

        const allPayloadsForClient: any[] = [];

        for (const t of tasksToSave) {
          // Recurrence logic: if it's a NEW task, we expand it. If editing, we only update the specific one.
          if (isEditing && t.id === initialData.id) {
            const adjustedDate = calculateAdjustedDate(t.vencimento, t.vencimentoVariavel, holidayDates);
            allPayloadsForClient.push({
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
              tax_regime: config.taxRegime,
              registration_regime: config.regimeRegistro,
              no_movement: config.semMovimento,
              exceeded_sublimit: config.excedeuSublimite,
              factor_r: config.fatorR,
              notified_exclusion: config.notifiedExclusion,
              selected_annexes: config.selectedAnnexes,
              observation: config.observation,
              org_id: user.id
            });
          } else {
            // Expansion logic for creation
            const [startYear, startMonth] = t.competence.split('-').map(Number);
            let monthOffset = 0;
            let baseDay = 10;

            if (t.vencimento) {
              const typeDef = taskTypes.find(tt => tt.name === t.taskName);
              const dDate = new Date(t.vencimento + 'T12:00:00');
              const dYear = dDate.getFullYear();
              const dMonth = dDate.getMonth() + 1;
              monthOffset = (dYear - startYear) * 12 + (dMonth - startMonth);
              baseDay = typeDef?.due_day || dDate.getDate();
            }

            const createIterationPayload = (month: number, year: number) => {
              const compStr = `${year}-${month.toString().padStart(2, '0')}`;
              const targetDueDate = new Date(year, (month - 1) + monthOffset, baseDay, 12, 0, 0);
              const yearVal = targetDueDate.getFullYear();
              const monthVal = (targetDueDate.getMonth() + 1).toString().padStart(2, '0');
              const dayVal = targetDueDate.getDate().toString().padStart(2, '0');
              const rawDueStr = `${yearVal}-${monthVal}-${dayVal}`;
              const finalDate = calculateAdjustedDate(rawDueStr, t.vencimentoVariavel, holidayDates);

              return {
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
                tax_regime: config.taxRegime,
                registration_regime: config.regimeRegistro,
                no_movement: config.semMovimento,
                exceeded_sublimit: config.excedeuSublimite,
                factor_r: config.fatorR,
                notified_exclusion: config.notifiedExclusion,
                selected_annexes: config.selectedAnnexes,
                observation: config.observation,
                org_id: user.id
              };
            };

            if (t.recurrence === 'mensal') {
              // Create 12 monthly iterations starting from startMonth
              for (let i = 0; i < 12; i++) {
                let m = startMonth + i;
                let y = startYear;
                while (m > 12) { m -= 12; y++; }
                allPayloadsForClient.push(createIterationPayload(m, y));
              }
            } else if (t.recurrence === 'personalizado') {
              for (let i = 0; i < (t.repetitions || 1); i++) {
                let currentMonth = startMonth + i;
                let currentYear = startYear;
                while (currentMonth > 12) {
                  currentMonth -= 12;
                  currentYear++;
                }
                allPayloadsForClient.push(createIterationPayload(currentMonth, currentYear));
              }
            } else {
              // bimestral, trimestral, semestral, anual
              // Scan 12 months from startMonth and create tasks for selected months
              const selectedMonths = t.months || [];
              for (let i = 0; i < 12; i++) {
                let m = startMonth + i;
                let y = startYear;
                while (m > 12) { m -= 12; y++; }
                if (selectedMonths.includes(m)) {
                  allPayloadsForClient.push(createIterationPayload(m, y));
                }
              }
            }
          }
        }

        // Insert/Update tasks for THIS client
        for (const payload of allPayloadsForClient) {
          let taskData;
          let taskError;

          if (payload.id) {
            const { data: taskData, error: taskError } = await (supabase
              .from('tasks') as any)
              .update(payload)
              .eq('id', payload.id)
              .select()
              .single();

            if (taskError) throw taskError;

            // Update Future Tasks if requested
            if (isEditing && updateFutureTasks && taskData) {
              const { data: futureTasks, error: fetchFutureError } = await (supabase
                .from('tasks') as any)
                .select('id, competence')
                .eq('client_id', payload.client_id)
                .eq('org_id', userProfile.org_id)
                .eq('task_name', initialData.taskName) // Use original name to find buddies
                .gt('competence', initialData.competence);

              const { data: futureAttachments, error: attachmentsError } = await (supabase
                .from('task_attachments') as any)
                .select('*')
                .in('task_id', futureTasks.map(t => t.id));

              if (fetchFutureError) throw fetchFutureError;

              if (futureTasks && futureTasks.length > 0) {
                // Calculate the month offset between the edited task's competence and its due date
                const typeDef = taskTypes.find(tt => tt.name === payload.task_name);
                const newDueDate = new Date(payload.due_date + 'T12:00:00');
                const baseDay = typeDef?.due_day || newDueDate.getDate();
                
                const [editCompYear, editCompMonth] = payload.competence.split('-').map(Number);
                const dueDateYear = newDueDate.getFullYear();
                const dueDateMonth = newDueDate.getMonth() + 1;
                // monthOffset = how many months ahead the due date is from the competence
                const monthOffset = (dueDateYear - editCompYear) * 12 + (dueDateMonth - editCompMonth);

                for (const ft of futureTasks) {
                  const [fYear, fMonth] = ft.competence.split('-').map(Number);

                  // Apply the same month offset to the future task's competence
                  let targetMonth = fMonth + monthOffset;
                  let targetYear = fYear;
                  while (targetMonth > 12) { targetMonth -= 12; targetYear++; }
                  while (targetMonth < 1) { targetMonth += 12; targetYear--; }

                  // Handle months with fewer days (e.g., day 31 in a month with 30 days)
                  const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
                  const safeDay = Math.min(baseDay, lastDayOfMonth);

                  const rawDueStr = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-${safeDay.toString().padStart(2, '0')}`;
                  const finalDate = calculateAdjustedDate(rawDueStr, payload.variable_adjustment, holidayDates);

                  const { error: futureUpdateError } = await (supabase
                    .from('tasks') as any)
                    .update({
                      task_name: payload.task_name,
                      sector: payload.sector,
                      responsible: payload.responsible,
                      due_date: finalDate,
                      variable_adjustment: payload.variable_adjustment,
                      priority: payload.priority,
                      observation: payload.observation,
                      tax_regime: payload.tax_regime,
                      registration_regime: payload.registration_regime,
                      no_movement: payload.no_movement,
                      exceeded_sublimit: payload.exceeded_sublimit,
                      factor_r: payload.factor_r,
                      selected_annexes: payload.selected_annexes
                    })
                    .eq('id', ft.id);

                  if (futureUpdateError) throw futureUpdateError;
                }
              }
            }

            // Upload and Link Files for THIS task
            if (config.uploadedFiles.length > 0 && taskData) {
              for (const file of config.uploadedFiles) {
                await (supabase.from('task_attachments') as any).insert({
                  task_id: (taskData as any).id,
                  file_name: file.name,
                  file_size: file.size,
                  storage_path: `tasks/${(taskData as any).id}/${file.name}`,
                  is_conclude_attachment: false
                });
              }
            }
          } else {
            const { data: taskData, error: taskError } = await (supabase
              .from('tasks') as any)
              .insert(payload)
              .select()
              .single();

            if (taskError) throw taskError;

            // Upload and Link Files for THIS task
            if (config.uploadedFiles.length > 0 && taskData) {
              for (const file of config.uploadedFiles) {
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
        }
      }

      showNotify(`${selectedClientIds.length} empresa(s) processada(s) com sucesso!`, 'success');
      setUpdateFutureTasks(null);
      // Aguarda 1.5s para o usuário ver a notificação antes de voltar
      await new Promise(resolve => setTimeout(resolve, 1500));
      onBack();
    } catch (error: any) {
      console.error('Error saving tasks:', error);
      showNotify('Erro ao salvar tarefas: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
      setIsSaving(false);
      setLoadingData(false);
    }
  };

  const tabs = [
    { id: 'recorrencia', label: 'Recorrência' },
    { id: 'simples', label: 'Simples Nacional' },
    { id: 'observacao', label: 'Observação' },
    { id: 'arquivos', label: 'Arquivos' },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">

      {/* Notification Toast */}
      {notification.show && (
        <Notification
          show={notification.show}
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(prev => ({ ...prev, show: false }))}
        />
      )}

      {/* Saving Overlay */}
      {isSaving && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 p-10 rounded-2xl bg-slate-900/90 border border-indigo-500/30 shadow-2xl">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-b-violet-500/60 animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">Salvando tarefa{pendingTasks.length > 1 ? 's' : ''}...</p>
              <p className="text-slate-400 text-sm mt-1">Aguarde, estamos processando {selectedClientIds.length} empresa(s).</p>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
            <FileCheck2 size={18} className="text-slate-500 dark:text-slate-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                {isEditing ? `Editando` : 'Cadastro de Tarefas em Lote'}
              </h1>
              {!isEditing && (
                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase rounded-full border border-indigo-100 dark:border-indigo-400/20 shadow-sm">
                  {selectedClientIds.length} {selectedClientIds.length === 1 ? 'Empresa' : 'Empresas'}
                </span>
              )}
            </div>
            <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
            {isEditing && (
              <span className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tight">
                {initialData.taskName} | {initialData.clientName}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onBack} disabled={isSaving}>Cancelar</Button>
          <Button
            icon={isSaving ? <div className="w-[18px] h-[18px] rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Save size={18} />}
            onClick={handleSaveAll}
            disabled={isSaving}
          >
            {isSaving ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : `Criar ${pendingTasks.length || (tempTask.taskName ? 1 : 0)} Tarefa(s)`)}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA: CONTEXTO DO CLIENTE */}
        <div className="lg:col-span-4 space-y-6">
          <Card title="Contexto do Cliente" titleClassName="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">
            {activeClientId && (
              <div className="flex justify-end mb-4">
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-full uppercase tracking-tighter animate-pulse">
                  Editando: {activeClientId}
                </span>
              </div>
            )}
            <div className="space-y-6">
              <div className="space-y-4">
                <SearchableSelect
                  label="Empresa"
                  options={clients
                    .filter(c => !selectedClientIds.includes(c.companyName))
                    .map(c => ({
                      value: c.companyName,
                      label: c.companyName
                    }))}
                  value=""
                  onChange={(val) => {
                    if (val && !selectedClientIds.includes(val)) {
                      const newIds = [...selectedClientIds, val];
                      setSelectedClientIds(newIds);
                      if (!activeClientId) setActiveClientId(val);
                      setClientConfigs(prev => ({
                        ...prev,
                        [val]: createDefaultConfig()
                      }));
                    }
                  }}
                  placeholder="Selecione e adicione empresas..."
                />

                {selectedClientIds.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Empresas Selecionadas</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedClientIds.map(id => (
                        <div
                          key={id}
                          onClick={() => setActiveClientId(id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${activeClientId === id
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:border-indigo-300'
                            }`}
                        >
                          <span className="truncate max-w-[150px]">{id}</span>
                          {!isEditing && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newIds = selectedClientIds.filter(x => x !== id);
                                setSelectedClientIds(newIds);
                                if (activeClientId === id) setActiveClientId(newIds[0] || null);
                                setClientConfigs(prev => {
                                  const { [id]: _, ...rest } = prev;
                                  return rest;
                                });
                              }}
                              className={`p-0.5 rounded-full hover:bg-white/20 ${activeClientId === id ? 'text-indigo-100' : 'text-slate-400'}`}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <GroupedSelect
                  label="Regime Tributário"
                  disabled={!activeClientId}
                  groups={TAX_REGIME_GROUPS}
                  value={activeClientId ? clientConfigs[activeClientId].taxRegime : ''}
                  onChange={(value) => {
                    if (activeClientId) {
                      setClientConfigs(prev => ({
                        ...prev,
                        [activeClientId]: { ...prev[activeClientId], taxRegime: value }
                      }));
                    }
                  }}
                />
                <Select
                  label="Regime de Registro"
                  disabled={!activeClientId}
                  options={[
                    { value: 'competencia', label: 'Competência' },
                    { value: 'caixa', label: 'Caixa' },
                    { value: 'misto', label: 'Misto' },
                  ]}
                  value={activeClientId ? clientConfigs[activeClientId].regimeRegistro : ''}
                  onChange={(e) => {
                    if (activeClientId) {
                      setClientConfigs(prev => ({
                        ...prev,
                        [activeClientId]: { ...prev[activeClientId], regimeRegistro: e.target.value }
                      }));
                    }
                  }}
                />
              </div>

              <div className="flex items-center gap-3 py-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={!activeClientId}
                  onClick={() => {
                    if (activeClientId) {
                      setClientConfigs(prev => ({
                        ...prev,
                        [activeClientId]: { ...prev[activeClientId], semMovimento: !prev[activeClientId].semMovimento }
                      }));
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${activeClientId && clientConfigs[activeClientId].semMovimento ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${activeClientId && clientConfigs[activeClientId].semMovimento ? 'translate-x-6' : 'translate-x-1'}`} />
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
                    className={`flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
            </div>
            <div className="p-4 max-h-[400px] overflow-auto custom-scrollbar">
              {activeTab === 'simples' && activeClientId && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4">
                    <Toggle
                      label="Exclusão Notificada"
                      value={clientConfigs[activeClientId].notifiedExclusion}
                      onChange={(val) => setClientConfigs(prev => ({
                        ...prev,
                        [activeClientId]: { ...prev[activeClientId], notifiedExclusion: val }
                      }))}
                    />
                    <Toggle
                      label="Excedeu Sublimite?"
                      value={clientConfigs[activeClientId].excedeuSublimite}
                      onChange={(val) => setClientConfigs(prev => ({
                        ...prev,
                        [activeClientId]: { ...prev[activeClientId], excedeuSublimite: val }
                      }))}
                    />
                    <Toggle
                      label="Fator R"
                      value={clientConfigs[activeClientId].fatorR}
                      onChange={(val) => setClientConfigs(prev => ({
                        ...prev,
                        [activeClientId]: { ...prev[activeClientId], fatorR: val }
                      }))}
                    />
                  </div>
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anexos</h4>
                    <div className="flex flex-wrap gap-2">
                      {SIMPLES_ANNEXES.map((annex) => (
                        <button
                          key={annex}
                          type="button"
                          onClick={() => toggleAnnex(annex)}
                          className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${clientConfigs[activeClientId].selectedAnnexes.includes(annex)
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

              {activeTab === 'observacao' && activeClientId && (
                <textarea
                  value={clientConfigs[activeClientId].observation}
                  onChange={(e) => {
                    const val = e.target.value;
                    setClientConfigs(prev => ({
                      ...prev,
                      [activeClientId]: { ...prev[activeClientId], observation: val }
                    }));
                  }}
                  className="w-full h-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Observações gerais para este cliente..."
                />
              )}

              {activeTab === 'arquivos' && activeClientId && (
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
                    {(clientConfigs[activeClientId].uploadedFiles.length === 0 && clientConfigs[activeClientId].existingAttachments.length === 0) ? (
                      <div className="text-center py-4 text-xs text-slate-400 italic bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        Nenhum arquivo anexado ainda.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Existing Attachments */}
                        {clientConfigs[activeClientId].existingAttachments.map((file: any, idx: number) => (
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
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 rounded">Existente</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteExistingAttachment(file, idx)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                title="Excluir arquivo do portal"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* New Uploads */}
                        {clientConfigs[activeClientId].uploadedFiles.map((file, idx) => (
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
          <Card title="Adicionar Tarefas à Operação" titleClassName="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">
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
                        
                        let newVencimento = tempTask.vencimento;
                        let newVariavel = tempTask.vencimentoVariavel;
                        const autoFill = getAutoFilledDueDate(val, tempTask.competence);
                        if (autoFill) {
                          newVencimento = autoFill.vencimento;
                          newVariavel = autoFill.vencimentoVariavel;
                        }

                        setTempTask(prev => ({
                          ...prev,
                          taskName: val,
                          sector: type?.sector_id ? sectors.find(s => s.id === type.sector_id)?.name || prev.sector : prev.sector,
                          vencimento: newVencimento,
                          vencimentoVariavel: newVariavel
                        }));
                      }}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Select
                      label="Responsável"
                      className="text-[11px]"
                      options={[
                        ...(userProfile ? [{
                          value: userProfile.full_name || userProfile.email || 'Eu',
                          label: userProfile.full_name || userProfile.email || 'Eu'
                        }] : []),
                        ...members.map(m => ({
                          value: `${m.first_name} ${m.last_name}`,
                          label: `${m.first_name} ${m.last_name}`
                        }))
                      ]}
                      value={tempTask.responsible}
                      onChange={(e) => setTempTask(prev => ({ ...prev, responsible: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="month"
                      label="Período Inicial"
                      className="text-[11px]"
                      value={tempTask.competence}
                      onChange={(e) => {
                        const val = e.target.value;
                        let newVencimento = tempTask.vencimento;
                        let newVariavel = tempTask.vencimentoVariavel;
                        const autoFill = getAutoFilledDueDate(tempTask.taskName, val);
                        if (autoFill) {
                          newVencimento = autoFill.vencimento;
                          newVariavel = autoFill.vencimentoVariavel;
                        }
                        setTempTask(prev => ({ ...prev, competence: val, vencimento: newVencimento, vencimentoVariavel: newVariavel }));
                      }}
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
                      onChange={(e) => {
                        const val = e.target.value;
                        let newVencimento = tempTask.vencimento;
                        const autoFill = getAutoFilledDueDate(tempTask.taskName, tempTask.competence, val);
                        if (autoFill) {
                          newVencimento = autoFill.vencimento;
                        }
                        setTempTask(prev => ({ ...prev, vencimentoVariavel: val, vencimento: newVencimento }));
                      }}
                    />
                  </div>

                  <div className="md:col-span-4">
                    <Select
                      label="Recorrência"
                      className="text-[11px]"
                      options={[
                        { value: 'personalizado', label: 'Personalizado' },
                        { value: 'mensal', label: 'Mensal' },
                        { value: 'bimestral', label: 'Bimestral' },
                        { value: 'trimestral', label: 'Trimestral' },
                        { value: 'semestral', label: 'Semestral' },
                        { value: 'anual', label: 'Anual' },
                      ]}
                      value={tempTask.recurrence}
                      onChange={(e) => {
                        const val = e.target.value;
                        const defaultMonths: Record<string, number[]> = {
                          mensal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                          bimestral: [2, 4, 6, 8, 10, 12],
                          trimestral: [3, 6, 9, 12],
                          semestral: [6, 12],
                          anual: [],
                          personalizado: [],
                        };
                        setTempTask(prev => ({
                          ...prev,
                          recurrence: val,
                          months: defaultMonths[val] ?? []
                        }));
                      }}
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

                  {tempTask.recurrence === 'personalizado' && (
                    <div className="md:col-span-4 animate-in fade-in zoom-in-95 duration-200">
                      <Input
                        type="number"
                        label="Quantidade de Repetições"
                        min={1}
                        max={60}
                        className="text-[11px]"
                        value={tempTask.repetitions}
                        onChange={(e) => setTempTask(prev => ({ ...prev, repetitions: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  )}

                  <div className="md:col-span-4 flex gap-2">
                    {editingTaskId ? (
                      <button
                        onClick={handleAddPendingTask}
                        className="flex-1 h-10 flex items-center justify-center gap-2 px-4 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-sm hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:scale-[1.02] active:scale-[0.98] transition-all animate-in fade-in zoom-in-95 duration-200"
                      >
                        <Save size={18} />
                        Atualizar
                      </button>
                    ) : (
                      <Button
                        variant="success"
                        icon={<Plus size={18} />}
                        onClick={handleAddPendingTask}
                        className="w-full h-10 font-bold"
                      >
                        Adicionar à Lista
                      </Button>
                    )}

                    {editingTaskId && (
                      <button
                        onClick={cancelEditing}
                        className="h-10 flex items-center justify-center gap-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                      >
                        <X size={18} />
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>

                {/* MONTH SELECTOR */}
                {tempTask.recurrence !== 'personalizado' && (
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

              {/* LISTA DE TAREFAS ADICIONADAS - CARDS REORGANIZADOS E COMPACTOS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ListChecks size={14} />
                    Tarefas na Fila ({pendingTasks.length})
                  </h4>
                  {pendingTasks.length > 0 && (
                    <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                      Pronto para salvar
                    </span>
                  )}
                </div>

                {pendingTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-100 dark:border-slate-800/50 rounded-2xl bg-slate-50/30 dark:bg-slate-900/20 text-center animate-in fade-in duration-500">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4 scale-110">
                      <Zap size={32} />
                    </div>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Nenhuma tarefa na fila</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-[240px]">Preencha os campos acima e clique em "Adicionar à Lista" para montar sua operação.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {pendingTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className={`group relative overflow-hidden bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${editingTaskId === task.id ? 'ring-2 ring-amber-500 border-amber-500 shadow-amber-500/10' : ''}`}
                      >
                        {/* Seção 1: Nome da Tarefa e Prioridade */}
                        <div className="flex justify-between items-center mb-4 relative z-10">
                          <h5 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate tracking-tight flex-1 pr-2">
                            {task.taskName}
                          </h5>
                          <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                            task.priority === Priority.ALTA 
                              ? 'bg-red-500 text-white' 
                              : task.priority === Priority.MEDIA 
                                ? 'bg-amber-400 text-amber-900' 
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {task.priority}
                          </span>
                        </div>

                        {/* Seção 2: Competência | Vencimento */}
                        <div className="flex items-center gap-3 py-2 border-b border-slate-100/50 dark:border-slate-800/50 relative z-10">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                            <Calendar size={13} className="shrink-0" />
                            <span>{task.competence.split('-').reverse().join('/')}</span>
                          </div>
                          <div className="h-3 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            <Clock size={11} className="text-rose-500 shrink-0" />
                            <span>{task.vencimento ? new Date(task.vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</span>
                          </div>
                        </div>

                        {/* Seção 3: Variável | Tipo de Recorrência */}
                        <div className="flex items-center gap-3 py-2 border-b border-slate-100/50 dark:border-slate-800/50 relative z-10">
                          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 italic">
                            <GitCompareArrows size={13} className="text-slate-300 shrink-0" />
                            <span>{task.vencimentoVariavel === 'nao_aplica' ? 'Fixo' : task.vencimentoVariavel}</span>
                          </div>
                          <div className="h-3 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-600 dark:text-slate-200 uppercase tracking-widest">
                            <Repeat size={13} className="text-indigo-500 shrink-0" />
                            <span>{task.recurrence}</span>
                          </div>
                        </div>

                        {/* Seção 4: Responsável | Setor */}
                        <div className="flex items-center justify-between py-3 relative z-10">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                              <User size={11} />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate">{task.responsible}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-tighter shrink-0 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700">
                            <Layers size={9} className="text-slate-300" />
                            {task.sector}
                          </div>
                        </div>

                        {/* Meses da Recorrência (Sub-seção de contexto) */}
                        {task.months.length > 0 && task.recurrence !== 'mensal' && (
                          <div className="flex flex-wrap gap-1 mb-4 animate-in fade-in slide-in-from-top-1 duration-300">
                            {task.months.map((m: number) => (
                              <span key={m} className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-[8px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 uppercase tracking-tighter">
                                {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][m - 1]}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Seção 5: Ações */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 relative z-10">
                          <span className="text-[8px] text-slate-300 font-mono">ID: {task.id.toString().slice(-6)}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleEditPendingTask(task)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${
                                editingTaskId === task.id 
                                  ? 'bg-amber-500 text-white' 
                                  : 'bg-indigo-50/80 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white'
                              }`}
                            >
                              <Pencil size={11} />
                              Editar
                            </button>
                            <button
                              onClick={() => removePendingTask(task.id)}
                              className="p-1 px-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all hover:rotate-12"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recurrence Update Confirmation Modal */}
      <Modal
        isOpen={showRecurrenceModal}
        onClose={() => setShowRecurrenceModal(false)}
        title="Atualizar Tarefa Recorrente"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl mb-2">
            <Info className="text-indigo-500" size={24} />
            <p className="text-sm text-indigo-800 dark:text-indigo-200 font-medium leading-relaxed">
              Esta é uma tarefa recorrente. Como você deseja aplicar as alterações realizadas?
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => {
                setUpdateFutureTasks(false);
                setShowRecurrenceModal(false);
              }}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all group group relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:text-indigo-600 transition-colors">
                <Calendar size={24} />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">Apenas este mês</div>
                <div className="text-xs text-slate-500">Altera somente o lançamento de {initialData?.competence}</div>
              </div>
              <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-500 transition-all group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => {
                setUpdateFutureTasks(true);
                setShowRecurrenceModal(false);
              }}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all group relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:text-indigo-600 transition-colors">
                <Repeat size={24} />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">Este mês e futuros</div>
                <div className="text-xs text-slate-500">Altera esta e todas as tarefas subsequentes deste cliente</div>
              </div>
              <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-500 transition-all group-hover:translate-x-1" />
            </button>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={() => setShowRecurrenceModal(false)}
              className="px-6 py-2 text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* TaskInfoDrawer movido para o topo */}
      
    </div>
  );
}

