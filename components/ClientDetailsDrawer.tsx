import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  MapPin, 
  Building2, 
  Pencil, 
  User, 
  Phone, 
  Mail, 
  Receipt, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Copy,
  LayoutList,
  Calendar,
  LogIn,
  LogOut,
  Fingerprint,
  FileText,
  Download,
  Upload,
  Trash2,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  GripVertical
} from 'lucide-react';
import { Client } from '../types';
import { supabase } from '../utils/supabaseClient';
import { Modal } from './ui/Modal';
import { useToast } from '../contexts/ToastContext';

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '---';
  const datePart = dateString.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateString;
};

const getSectorStyle = (sectorName: string | undefined | null) => {
  const name = (sectorName || 'geral').toLowerCase();
  if (name.includes('fiscal') || name.includes('tributário') || name.includes('tributario')) {
    return { bar: 'bg-purple-500' };
  }
  if (name.includes('contábil') || name.includes('contabil')) {
    return { bar: 'bg-blue-500' };
  }
  if (name.includes('dp') || name.includes('pessoal') || name.includes('rh')) {
    return { bar: 'bg-orange-500' };
  }
  if (name.includes('societário') || name.includes('societario') || name.includes('legalização') || name.includes('legalizacao')) {
    return { bar: 'bg-emerald-500' };
  }
  return { bar: 'bg-slate-400' };
};

interface ClientDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onEdit: (client: Client) => void;
}

const DEFAULT_CLIENT_SECTIONS_ORDER = ['info', 'address', 'partner', 'inscriptions', 'contacts', 'certificate', 'activities', 'documents'];

export const ClientDetailsDrawer: React.FC<ClientDetailsDrawerProps> = ({
  isOpen,
  onClose,
  client,
  onEdit
}) => {
  const { addToast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Estado para a ordem das seções, inicializado a partir do localStorage ou ordem padrão
  const [sectionsOrder, setSectionsOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('client_drawer_sections_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        const isValid = DEFAULT_CLIENT_SECTIONS_ORDER.every(item => parsed.includes(item));
        if (isValid && parsed.length === DEFAULT_CLIENT_SECTIONS_ORDER.length) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Erro ao carregar ordem das seções do drawer de cliente:", e);
    }
    return DEFAULT_CLIENT_SECTIONS_ORDER;
  });

  // Estados relacionados ao arrastar (Drag and Drop)
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const [draggableSectionId, setDraggableSectionId] = useState<string | null>(null);

  // Sub-data states
  const [inscriptions, setInscriptions] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  // Estados para Documentos do Cliente
  const [documents, setDocuments] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<any | null>(null);

  // Estados dos filtros
  const [competenceFilter, setCompetenceFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Estados do formulário de upload
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSectorId, setUploadSectorId] = useState('');
  const [uploadCompetence, setUploadCompetence] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploadDueDate, setUploadDueDate] = useState('');
  const [isUploadCalendarOpen, setIsUploadCalendarOpen] = useState(false);
  const [uploadCalendarYear, setUploadCalendarYear] = useState(new Date().getFullYear());
  const uploadCalendarRef = useRef<HTMLDivElement>(null);

  const [isFilterCalendarOpen, setIsFilterCalendarOpen] = useState(false);
  const [filterCalendarYear, setFilterCalendarYear] = useState(new Date().getFullYear());
  const filterCalendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (uploadCalendarRef.current && !uploadCalendarRef.current.contains(event.target as Node)) {
        setIsUploadCalendarOpen(false);
      }
      if (filterCalendarRef.current && !filterCalendarRef.current.contains(event.target as Node)) {
        setIsFilterCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    info: true,
    address: false,
    partner: false,
    inscriptions: true,
    contacts: true,
    certificate: true,
    activities: true,
    documents: false
  });

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => setIsVisible(true), 10);
      fetchSubData();
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, client?.id]);

  const fetchSubData = async () => {
    if (!client?.id) return;
    setLoading(true);
    try {
      const [insc, cont, cert, act, docs, secs] = await Promise.all([
        supabase.from('client_inscriptions').select('*').eq('client_id', client.id),
        supabase.from('client_contacts').select('*').eq('client_id', client.id),
        supabase.from('client_certificates').select('*').eq('client_id', client.id),
        supabase.from('client_activities').select('*').eq('client_id', client.id),
        supabase.from('client_documents' as any).select('*').eq('client_id', client.id),
        supabase.from('sectors').select('*')
      ]);

      setInscriptions(insc.data || []);
      setContacts(cont.data || []);
      setCertificates(cert.data || []);
      setActivities(act.data || []);
      setDocuments(docs.data || []);
      setSectors(secs.data || []);
    } catch (error) {
      console.error('Erro ao buscar dados do cliente:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransitionEnd = () => {
    if (!isVisible) setShouldRender(false);
  };

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '---';
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    } else if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return phone;
  };

  const copyToClipboard = (text: string, fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyFeedback(fieldId);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const competenceMonths = React.useMemo(() => {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
      const value = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
      months.push({ label, value });
    }
    return months;
  }, []);

  const handleUploadDocument = async () => {
    if (!client?.id || !uploadFile || !uploadSectorId || !uploadCompetence) {
      addToast('error', 'Campos Obrigatórios', 'Por favor, preencha todos os campos e selecione um arquivo.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const storagePath = `${client.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(storagePath, uploadFile);

      if (uploadError) throw uploadError;

      const docName = uploadName.trim() || uploadFile.name;
      const { error: dbError } = await supabase.from('client_documents' as any).insert({
        client_id: client.id,
        org_id: (client as any).org_id,
        name: docName,
        competence_month: uploadCompetence,
        sector_id: uploadSectorId,
        storage_path: storagePath,
        status: 'Enviado',
        due_date: uploadDueDate || null
      });

      if (dbError) throw dbError;

      setUploadFile(null);
      setUploadName('');
      setUploadSectorId('');
      setUploadCompetence('');
      setUploadDueDate('');
      setShowUploadForm(false);
      
      const { data: newDocs } = await supabase.from('client_documents' as any).select('*').eq('client_id', client.id);
      setDocuments(newDocs || []);
      
      addToast('success', 'Sucesso', 'Documento enviado com sucesso!');
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Erro de Envio', err.message);
    } finally {
      setUploading(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmDoc) return;
    const doc = deleteConfirmDoc;
    try {
      if (doc.storage_path) {
        await supabase.storage.from('client-documents').remove([doc.storage_path]);
      }

      const { error: deleteError } = await supabase
        .from('client_documents' as any)
        .delete()
        .eq('id', doc.id);

      if (deleteError) throw deleteError;

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      addToast('success', 'Sucesso', 'Documento excluído com sucesso!');
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Erro', 'Erro ao excluir documento: ' + err.message);
    } finally {
      setDeleteConfirmDoc(null);
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .download(doc.storage_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Erro de Download', err.message);
    }
  };

  if (!shouldRender || !client) return null;

  const getDragProps = (sectionId: string) => {
    return {
      draggable: draggableSectionId === sectionId,
      onDragStart: (e: React.DragEvent) => {
        setDraggedSectionId(sectionId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', sectionId);
      },
      onDragEnd: () => {
        setDraggedSectionId(null);
        setDragOverSectionId(null);
        setDraggableSectionId(null);
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedSectionId && draggedSectionId !== sectionId) {
          setDragOverSectionId(sectionId);
        }
      },
      onDragLeave: () => {
        if (dragOverSectionId === sectionId) {
          setDragOverSectionId(null);
        }
      },
      onDrop: () => {
        if (draggedSectionId && draggedSectionId !== sectionId) {
          const fromIndex = sectionsOrder.indexOf(draggedSectionId);
          const toIndex = sectionsOrder.indexOf(sectionId);
          const newOrder = [...sectionsOrder];
          newOrder.splice(fromIndex, 1);
          newOrder.splice(toIndex, 0, draggedSectionId);
          setSectionsOrder(newOrder);
          localStorage.setItem('client_drawer_sections_order', JSON.stringify(newOrder));
        }
        setDraggedSectionId(null);
        setDragOverSectionId(null);
        setDraggableSectionId(null);
      }
    };
  };

  const getSectionWrapperClass = (sectionId: string) => {
    const isDragged = draggedSectionId === sectionId;
    const isDragOver = dragOverSectionId === sectionId;
    return `bg-white dark:bg-slate-800/40 border rounded-2xl overflow-hidden shadow-sm transition-all duration-200 shrink-0 ${
      isDragged ? 'opacity-30 border-dashed border-indigo-500 dark:border-indigo-400 scale-[0.98]' : 
      isDragOver ? 'border-indigo-500 scale-[1.01] shadow-md bg-indigo-50/5 dark:bg-indigo-500/5' : 
      'border-slate-200 dark:border-slate-700/50'
    }`;
  };

  const renderDragHandle = (sectionId: string) => (
    <div
      className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-indigo-500 rounded transition-colors mr-1 shrink-0"
      onMouseDown={(e) => {
        e.stopPropagation();
        setDraggableSectionId(sectionId);
      }}
      onMouseUp={(e) => {
        e.stopPropagation();
        setDraggableSectionId(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      title="Arraste para reordenar"
    >
      <GripVertical size={14} />
    </div>
  );

  const InfoField = ({ 

    label, 
    value, 
    id, 
    valueClassName = "text-sm",
    autoReduce = true 
  }: { 
    label: string; 
    value: string; 
    id: string; 
    valueClassName?: string;
    autoReduce?: boolean 
  }) => {
    const isUppercase = autoReduce && value && value === value.toUpperCase() && /[A-Z]/.test(value);
    const finalValueClassName = isUppercase ? "text-[12px]" : valueClassName;

    return (
      <div 
        className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer group"
        onClick={(e) => copyToClipboard(value, id, e)}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</span>
          <div className="flex items-center gap-1">
            {copyFeedback === id ? (
              <span className="text-[9px] font-bold text-emerald-500 animate-in fade-in slide-in-from-right-1">Copiado!</span>
            ) : (
              <Copy size={10} className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
        <span className={`${finalValueClassName} font-bold text-slate-700 dark:text-slate-200 break-words leading-tight`}>
          {value || '---'}
        </span>
      </div>
    );
  };

  return createPortal(
    <>
      <div 
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[9998] transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <div 
        onTransitionEnd={handleTransitionEnd}
        className={`fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl z-[9999] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25, 0.1, 0.25, 1)] border-l border-white/20 dark:border-slate-800/50 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
              <LayoutList size={18} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex flex-col text-left">
              <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                Dados do Cliente
              </h1>
              <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(client)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-full transition-all shadow-lg active:scale-95"
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
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4">
          
          {/* Section 01: Dados Iniciais */}
          <div 
            style={{ order: sectionsOrder.indexOf('info') }}
            {...getDragProps('info')}
            className={getSectionWrapperClass('info')}
          >
            <button 
              onClick={() => toggleSection('info')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                {renderDragHandle('info')}
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {"Seção " + String(sectionsOrder.indexOf('info') + 1).padStart(2, '0')}
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Informações Básicas</span>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${openSections.info ? 'rotate-180' : ''}`} size={16} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${openSections.info ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden">
                <div className="p-4 pt-0 grid grid-cols-1 gap-3">
                  <InfoField label="Razão Social" value={client.companyName} id="comp-name" />
                  <InfoField label="Nome Fantasia" value={client.tradeName || '---'} id="trade-name" />
                  
                  {/* Informações Compactas - Grid 1 */}
                  <div className="grid grid-cols-3 gap-2 mt-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex flex-col gap-0.5" onClick={(e) => copyToClipboard(client.document, 'doc', e)}>
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1">
                          <Receipt size={10} className="text-indigo-400" />
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">CNPJ/CPF</span>
                        </div>
                        {copyFeedback === 'doc' && <span className="text-[7px] font-bold text-emerald-500">Copiado</span>}
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                        {client.document || '---'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 border-l border-slate-100 dark:border-slate-800 pl-3">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Activity size={10} className="text-emerald-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Situação</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                        {client.status || '---'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 border-l border-slate-100 dark:border-slate-800 pl-3">
                      <div className="flex items-center gap-1 mb-0.5">
                        <CheckCircle2 size={10} className="text-amber-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Segmento</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                        {client.segment || '---'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Datas Minimalistas */}
                  <div className="grid grid-cols-3 gap-2 mt-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Calendar size={10} className="text-indigo-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Constituição</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {formatDate(client.constitution_date)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 border-l border-slate-100 dark:border-slate-800 pl-3">
                      <div className="flex items-center gap-1 mb-0.5">
                        <LogIn size={10} className="text-emerald-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Entrada</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {formatDate(client.entry_date)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 border-l border-slate-100 dark:border-slate-800 pl-3">
                      <div className="flex items-center gap-1 mb-0.5">
                        <LogOut size={10} className="text-rose-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Saída</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {formatDate(client.exit_date)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 02: Endereço */}
          <div 
            style={{ order: sectionsOrder.indexOf('address') }}
            {...getDragProps('address')}
            className={getSectionWrapperClass('address')}
          >
            <button 
              onClick={() => toggleSection('address')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                {renderDragHandle('address')}
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {"Seção " + String(sectionsOrder.indexOf('address') + 1).padStart(2, '0')}
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Endereço</span>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${openSections.address ? 'rotate-180' : ''}`} size={16} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${openSections.address ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden">
                <div className="p-4 pt-0 grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <InfoField label="CEP" value={client.zip_code || ''} id="cep" />
                    </div>
                    <div className="col-span-2">
                       <InfoField label="Complemento" value={client.complement || '---'} id="complement" />
                    </div>
                  </div>
                  <InfoField label="Logradouro" value={`${client.street || ''}${client.street_number ? `, ${client.street_number}` : ''}`} id="street" autoReduce />
                  <div className="grid grid-cols-2 gap-3">
                    <InfoField label="Bairro" value={client.neighborhood || ''} id="neighborhood" autoReduce />
                    <InfoField label="Cidade/UF" value={`${client.city || ''} / ${client.state || ''}`} id="city" autoReduce />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 03: Sócio Administrador */}
          <div 
            style={{ order: sectionsOrder.indexOf('partner') }}
            {...getDragProps('partner')}
            className={getSectionWrapperClass('partner')}
          >
            <button 
              onClick={() => toggleSection('partner')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                {renderDragHandle('partner')}
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {"Seção " + String(sectionsOrder.indexOf('partner') + 1).padStart(2, '0')}
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Sócio Administrador</span>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${openSections.partner ? 'rotate-180' : ''}`} size={16} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${openSections.partner ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden">
                <div className="p-4 pt-0 grid grid-cols-1 gap-3">
                  <InfoField label="Nome do Sócio" value={client.admin_partner_name || ''} id="partner-name" />
                  {/* Sócio Compacto */}
                  <div className="grid grid-cols-2 gap-2 mt-1 border-t border-slate-100 dark:border-slate-800 pt-3 px-1">
                    <div className="flex flex-col gap-0.5" onClick={(e) => copyToClipboard(client.admin_partner_cpf || '', 'partner-cpf', e)}>
                      <div className="flex items-center gap-1 mb-0.5">
                        <Fingerprint size={10} className="text-indigo-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">CPF</span>
                        {copyFeedback === 'partner-cpf' && <span className="text-[8px] font-bold text-emerald-500 ml-1">Copiado</span>}
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {client.admin_partner_cpf || '---'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 border-l border-slate-100 dark:border-slate-800 pl-4">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Calendar size={10} className="text-emerald-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Data de Nasc.</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {formatDate(client.admin_partner_birthdate)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 04: Inscrições */}
          <div 
            style={{ order: sectionsOrder.indexOf('inscriptions') }}
            {...getDragProps('inscriptions')}
            className={getSectionWrapperClass('inscriptions')}
          >
            <button 
              onClick={() => toggleSection('inscriptions')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                {renderDragHandle('inscriptions')}
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {"Seção " + String(sectionsOrder.indexOf('inscriptions') + 1).padStart(2, '0')}
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Inscrições</span>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${openSections.inscriptions ? 'rotate-180' : ''}`} size={16} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${openSections.inscriptions ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden">
                <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                  {inscriptions.length > 0 ? inscriptions.map((insc, idx) => (
                    <div key={idx} className="flex flex-col p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={(e) => copyToClipboard(insc.number, `insc-${idx}`, e)}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-tighter truncate">{insc.type}</span>
                        {copyFeedback === `insc-${idx}` && <span className="text-[8px] font-bold text-emerald-500 flex-shrink-0">Copiado!</span>}
                      </div>
                      <span className={`font-bold text-slate-700 dark:text-slate-200 mt-1 truncate ${insc.number === insc.number?.toUpperCase() && /[A-Z]/.test(insc.number) ? 'text-[12px]' : 'text-[13px]'}`}>
                        {insc.number}
                      </span>
                      {insc.observation && <span className="text-[9px] text-slate-400 mt-1 truncate italic">{insc.observation}</span>}
                    </div>
                  )) : (
                    <div className="col-span-2 text-center py-4 text-slate-400 text-xs italic">Nenhuma inscrição cadastrada</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 05: Contatos */}
          <div 
            style={{ order: sectionsOrder.indexOf('contacts') }}
            {...getDragProps('contacts')}
            className={getSectionWrapperClass('contacts')}
          >
            <button 
              onClick={() => toggleSection('contacts')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                {renderDragHandle('contacts')}
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {"Seção " + String(sectionsOrder.indexOf('contacts') + 1).padStart(2, '0')}
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Contatos</span>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${openSections.contacts ? 'rotate-180' : ''}`} size={16} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${openSections.contacts ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden">
                <div className="p-4 pt-0 space-y-3">
                  {contacts.length > 0 ? contacts.map((cont, idx) => (
                    <div key={idx} className={`p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 shadow-sm relative overflow-hidden group ${idx !== 0 ? 'mt-4 pt-4 border-t border-dashed' : ''}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                             <User size={14} className="text-slate-400" />
                          </div>
                          <div className="flex flex-col">
                            <span className={`font-bold text-slate-700 dark:text-slate-200 ${cont.name === cont.name?.toUpperCase() && /[A-Z]/.test(cont.name) ? 'text-[12px]' : 'text-[13px]'}`}>
                              {cont.name}
                            </span>
                            {cont.is_main && <span className="text-[8px] text-emerald-500 font-black uppercase tracking-widest mt-0.5">Representante Principal</span>}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2.5">
                        {cont.email && (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/20" onClick={(e) => copyToClipboard(cont.email, `cont-e-${idx}`, e)}>
                            <div className="flex items-center gap-2.5">
                              <Mail size={12} className="text-indigo-400" />
                              <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">{cont.email}</span>
                            </div>
                            {copyFeedback === `cont-e-${idx}` && <span className="text-[9px] font-bold text-emerald-500 animate-in fade-in zoom-in">Copiado!</span>}
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-2">
                          {cont.phone_mobile && (
                            <div className="flex-1 min-w-[140px] flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 cursor-pointer transition-all border border-transparent hover:border-emerald-100 dark:hover:border-emerald-500/20" onClick={(e) => copyToClipboard(cont.phone_mobile, `cont-m-${idx}`, e)}>
                              <div className="flex items-center gap-2.5">
                                <Phone size={12} className="text-emerald-400" />
                                <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">{formatPhone(cont.phone_mobile)}</span>
                              </div>
                              {copyFeedback === `cont-m-${idx}` && <span className="text-[9px] font-bold text-emerald-500 animate-in fade-in zoom-in">Cop.</span>}
                            </div>
                          )}
                          {cont.phone_fixed && (
                            <div className="flex-1 min-w-[140px] flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700" onClick={(e) => copyToClipboard(cont.phone_fixed, `cont-f-${idx}`, e)}>
                              <div className="flex items-center gap-2.5">
                                <Phone size={12} className="text-slate-400" />
                                <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">{formatPhone(cont.phone_fixed)}</span>
                              </div>
                              {copyFeedback === `cont-f-${idx}` && <span className="text-[9px] font-bold text-emerald-500 animate-in fade-in zoom-in">Cop.</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-slate-400 text-xs italic">Nenhum contato cadastrado</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 06: Certificado */}
          <div 
            style={{ order: sectionsOrder.indexOf('certificate') }}
            {...getDragProps('certificate')}
            className={getSectionWrapperClass('certificate')}
          >
            <button 
              onClick={() => toggleSection('certificate')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                {renderDragHandle('certificate')}
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {"Seção " + String(sectionsOrder.indexOf('certificate') + 1).padStart(2, '0')}
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Certificado Digital</span>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${openSections.certificate ? 'rotate-180' : ''}`} size={16} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${openSections.certificate ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden">
                <div className="p-4 pt-0 grid grid-cols-1 gap-3">
                  {certificates.length > 0 ? certificates.map((cert, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 relative overflow-hidden group">
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4">
                        {/* Modelo / Tipo */}
                        <div className="flex items-center gap-2.5 min-w-[85px]">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100/50 dark:border-emerald-500/20 shrink-0">
                            <ShieldCheck size={16} className="text-emerald-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Modelo</span>
                            <span className={`font-black text-slate-800 dark:text-slate-200 uppercase tracking-tighter leading-none ${cert.model === cert.model?.toUpperCase() && /[A-Z]/.test(cert.model) ? 'text-[11px]' : 'text-xs'}`}>
                              {cert.model || 'eCNPJ'}
                            </span>
                          </div>
                        </div>

                        {/* Divisor */}
                        <div className="hidden sm:block w-px h-8 bg-slate-200/60 dark:bg-slate-700/50" />

                        {/* Vencimento */}
                        <div className="flex-1 flex items-center gap-3 min-w-[100px]">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Vencimento</span>
                            <div className="flex items-center gap-2">
                              <Calendar size={12} className={`shrink-0 ${new Date(cert.expires_at || cert.expiration_date) < new Date() ? 'text-rose-500' : 'text-indigo-400'}`} />
                              <span className={`text-[12px] font-bold leading-none ${new Date(cert.expires_at || cert.expiration_date) < new Date() ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>
                                {formatDate(cert.expires_at || cert.expiration_date)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Divisor */}
                        <div className="hidden sm:block w-px h-8 bg-slate-200/60 dark:bg-slate-700/50" />

                        {/* Senha */}
                        <div 
                          className="flex flex-col gap-1 cursor-pointer w-full sm:w-auto sm:min-w-[100px] mt-1 sm:mt-0"
                          onClick={(e) => copyToClipboard(cert.password || '', `cert-p-${idx}`, e)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Senha</span>
                            {copyFeedback === `cert-p-${idx}` && <span className="text-[9px] font-bold text-emerald-500 animate-in fade-in zoom-in">Copiado</span>}
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg group-hover:border-indigo-300 transition-all w-full shadow-sm min-w-0">
                            <Fingerprint size={12} className="text-indigo-400 shrink-0" />
                            <span className="text-[12px] font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate">
                              {cert.password || '---'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-slate-400 text-xs italic">Nenhum certificado cadastrado</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 07: Atividades */}
          <div 
            style={{ order: sectionsOrder.indexOf('activities') }}
            {...getDragProps('activities')}
            className={getSectionWrapperClass('activities')}
          >
            <button 
              onClick={() => toggleSection('activities')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                {renderDragHandle('activities')}
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {"Seção " + String(sectionsOrder.indexOf('activities') + 1).padStart(2, '0')}
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Atividades (CNAE)</span>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${openSections.activities ? 'rotate-180' : ''}`} size={16} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${openSections.activities ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden">
                <div className="p-4 pt-0 grid grid-cols-1 gap-2">
                  {activities.length > 0 ? [...activities].sort((a, b) => a.order_type === 'principal' ? -1 : b.order_type === 'principal' ? 1 : 0).map((act, idx) => (
                    <div 
                      key={idx} 
                      className="flex flex-col p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 cursor-pointer group"
                      onClick={(e) => copyToClipboard(act.cnae_code, `act-${idx}`, e)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity size={12} className={act.order_type === 'principal' ? 'text-indigo-500' : 'text-slate-400'} />
                          <span className={`text-[10px] font-black uppercase ${act.order_type === 'principal' ? 'text-indigo-500' : 'text-slate-400'}`}>
                            {act.order_type === 'principal' ? 'Principal' : 'Secundária'}
                          </span>
                        </div>
                        {copyFeedback === `act-${idx}` && <span className="text-[9px] font-bold text-emerald-500">Copiado!</span>}
                      </div>
                      <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-200 mt-1">{act.cnae_code}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">{act.cnae_description}</span>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-slate-400 text-xs italic">Nenhuma atividade cadastrada</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 08: Área do Cliente (Documentos) */}
          <div 
            style={{ order: sectionsOrder.indexOf('documents') }}
            {...getDragProps('documents')}
            className={getSectionWrapperClass('documents')}
          >
            <button 
              onClick={() => toggleSection('documents')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                {renderDragHandle('documents')}
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {"Seção " + String(sectionsOrder.indexOf('documents') + 1).padStart(2, '0')}
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Área do Cliente (Documentos)</span>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${openSections.documents ? 'rotate-180' : ''}`} size={16} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${openSections.documents ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden">
                <div className="p-4 pt-0 flex flex-col gap-4">
                  
                  {/* Formulário/Botão de Upload */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-900/30">
                    {!showUploadForm ? (
                      <button
                        onClick={() => setShowUploadForm(true)}
                        className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-colors border border-dashed border-indigo-200 dark:border-indigo-800"
                      >
                        <Upload size={14} />
                        Enviar Novo Documento
                      </button>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Novo Documento</span>
                          <button onClick={() => { setShowUploadForm(false); setUploadFile(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <X size={14} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Setor Destino *</label>
                            <select
                              value={uploadSectorId}
                              onChange={(e) => setUploadSectorId(e.target.value)}
                              className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                            >
                              <option value="">Selecione o Setor</option>
                              {sectors.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="relative" ref={uploadCalendarRef}>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Competência (Mês/Ano) *</label>
                            <button
                              type="button"
                              onClick={() => setIsUploadCalendarOpen(!isUploadCalendarOpen)}
                              className="w-full text-left text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none flex items-center justify-between font-bold text-slate-700 dark:text-slate-200"
                            >
                              <span>{uploadCompetence || 'Selecione...'}</span>
                              <ChevronDown size={14} className={`text-slate-400 transition-transform ${isUploadCalendarOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isUploadCalendarOpen && (
                              <div className="absolute right-0 mt-1 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-3 animate-in fade-in slide-in-from-top-2 duration-150">
                                {/* Seletor de Ano */}
                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                                  <button
                                    type="button"
                                    onClick={() => setUploadCalendarYear(prev => prev - 1)}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-all active:scale-95"
                                  >
                                    <ChevronLeft size={14} />
                                  </button>
                                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 tracking-wider">
                                    {uploadCalendarYear}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setUploadCalendarYear(prev => prev + 1)}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-all active:scale-95"
                                  >
                                    <ChevronRight size={14} />
                                  </button>
                                </div>

                                {/* Grid de Meses */}
                                <div className="grid grid-cols-4 gap-1.5">
                                  {['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'].map((mLabel, idx) => {
                                    const valueToCheck = `${(idx + 1).toString().padStart(2, '0')}/${uploadCalendarYear}`;
                                    const isSelected = uploadCompetence === valueToCheck;

                                    return (
                                      <button
                                        key={mLabel}
                                        type="button"
                                        onClick={() => {
                                          setUploadCompetence(valueToCheck);
                                          setIsUploadCalendarOpen(false);
                                        }}
                                        className={`py-2 text-[10px] font-black rounded-lg transition-all text-center ${
                                          isSelected
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                            : 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                      >
                                        {mLabel}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Nome de Exibição (Opcional)</label>
                            <input
                              type="text"
                              placeholder="Ex: Guia do DAS Simples"
                              value={uploadName}
                              onChange={(e) => setUploadName(e.target.value)}
                              className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Data de Vencimento (Opcional)</label>
                            <input
                              type="date"
                              value={uploadDueDate}
                              onChange={(e) => setUploadDueDate(e.target.value)}
                              className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                            />
                          </div>
                        </div>

                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors relative">
                          <input
                            type="file"
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <Upload className="mx-auto text-slate-400 mb-2" size={20} />
                          <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                            {uploadFile ? uploadFile.name : 'Clique para selecionar ou arraste o arquivo'}
                          </span>
                        </div>

                        <button
                          onClick={handleUploadDocument}
                          disabled={uploading}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-2"
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="animate-spin" size={14} />
                              Enviando...
                            </>
                          ) : (
                            'Enviar'
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Filtros e Barra de Pesquisa */}
                  <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                      <input
                        type="text"
                        placeholder="Buscar documento pelo nome..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="w-full pl-7 pr-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div className="relative" ref={filterCalendarRef}>
                        <button
                          type="button"
                          onClick={() => setIsFilterCalendarOpen(!isFilterCalendarOpen)}
                          className="w-full text-left text-[10px] p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between"
                        >
                          <span className="truncate">{competenceFilter || 'Período'}</span>
                          <ChevronDown size={12} className={`text-slate-400 shrink-0 transition-transform ${isFilterCalendarOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isFilterCalendarOpen && (
                          <div className="absolute left-0 mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
                            {/* Seletor de Ano */}
                            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => setFilterCalendarYear(prev => prev - 1)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-all active:scale-95"
                              >
                                <ChevronLeft size={12} />
                              </button>
                              <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 tracking-wider">
                                {filterCalendarYear}
                              </span>
                              <button
                                type="button"
                                onClick={() => setFilterCalendarYear(prev => prev + 1)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-all active:scale-95"
                              >
                                <ChevronRight size={12} />
                              </button>
                            </div>

                            {/* Grid de Meses */}
                            <div className="grid grid-cols-4 gap-1">
                              {['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'].map((mLabel, idx) => {
                                const valueToCheck = `${(idx + 1).toString().padStart(2, '0')}/${filterCalendarYear}`;
                                const isSelected = competenceFilter === valueToCheck;

                                return (
                                  <button
                                    key={mLabel}
                                    type="button"
                                    onClick={() => {
                                      setCompetenceFilter(valueToCheck);
                                      setIsFilterCalendarOpen(false);
                                    }}
                                    className={`py-1 text-[9px] font-black rounded-md transition-all text-center ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                        : 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                  >
                                    {mLabel}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Rodapé para Limpar */}
                            <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => {
                                  setCompetenceFilter('');
                                  setIsFilterCalendarOpen(false);
                                }}
                                className="w-full py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider rounded-md transition-all text-center"
                              >
                                Ver Todas
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <select
                        value={sectorFilter}
                        onChange={(e) => setSectorFilter(e.target.value)}
                        className="text-[10px] p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-bold"
                      >
                        <option value="">Todos Setores</option>
                        {sectors.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>

                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-[10px] p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-bold"
                      >
                        <option value="">Todos Status</option>
                        <option value="Enviado">Enviado</option>
                        <option value="Lido">Lido</option>
                        <option value="Pago">Pago</option>
                        <option value="Baixado">Baixado</option>
                      </select>
                    </div>
                  </div>

                  {/* Listagem de Documentos */}
                  <div className="max-h-[300px] overflow-y-auto pr-1 flex flex-col gap-2">
                    {documents.filter(doc => {
                      if (searchFilter && !doc.name.toLowerCase().includes(searchFilter.toLowerCase())) return false;
                      if (competenceFilter && doc.competence_month !== competenceFilter) return false;
                      if (sectorFilter && doc.sector_id !== sectorFilter) return false;
                      if (statusFilter && doc.status !== statusFilter) return false;
                      return true;
                    }).length > 0 ? (
                      documents.filter(doc => {
                        if (searchFilter && !doc.name.toLowerCase().includes(searchFilter.toLowerCase())) return false;
                        if (competenceFilter && doc.competence_month !== competenceFilter) return false;
                        if (sectorFilter && doc.sector_id !== sectorFilter) return false;
                        if (statusFilter && doc.status !== statusFilter) return false;
                        return true;
                      }).map((doc, idx) => {
                        const sec = sectors.find(s => s.id === doc.sector_id);
                        return (
                          <div key={doc.id || idx} className="flex gap-0 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors">
                            {/* Faixa lateral com Setor na Vertical (90º) */}
                            <div className={`w-6 shrink-0 flex items-center justify-center ${getSectorStyle(sec?.name).bar} relative`}>
                              <span className="text-[7.5px] font-black uppercase tracking-widest text-white/90 [writing-mode:vertical-lr] rotate-180 whitespace-nowrap py-1 select-none">
                                {sec?.name || 'Geral'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between p-2.5 flex-1 min-w-0">
                              <div className="min-w-0 flex-1 pl-1.5">
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate" title={doc.name}>{doc.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] font-black text-slate-400 uppercase">{doc.competence_month}</span>
                                  {doc.due_date && (
                                    <>
                                      <span className="text-[9px] font-black text-slate-400">•</span>
                                      <span className="text-[9px] font-bold text-red-500 dark:text-red-400">Venc. {formatDate(doc.due_date)}</span>
                                    </>
                                  )}
                                  <span className="text-[9px] font-black text-slate-400">•</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                    doc.status === 'Pago' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                                    doc.status === 'Lido' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' :
                                    'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                  }`}>
                                    {doc.status || 'Enviado'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <button
                                  onClick={() => handleDownloadDocument(doc)}
                                  className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
                                  title="Baixar documento"
                                >
                                  <Download size={14} />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmDoc(doc)}
                                  className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                  title="Excluir documento"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        Nenhum documento encontrado
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal de Confirmação de Exclusão de Documento */}
      <Modal
        isOpen={deleteConfirmDoc !== null}
        onClose={() => setDeleteConfirmDoc(null)}
        title={
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle size={18} />
            <span>Confirmar Exclusão</span>
          </div>
        }
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              onClick={() => setDeleteConfirmDoc(null)}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={executeDelete}
              className="px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Excluir
            </button>
          </div>
        }
      >
        <div className="p-6 text-sm text-slate-600 dark:text-slate-300">
          <p>Você tem certeza que deseja excluir o documento <strong>{deleteConfirmDoc?.name}</strong>?</p>
          <p className="mt-2 text-xs text-slate-400">Essa ação é permanente e removerá o arquivo do portal do cliente.</p>
        </div>
      </Modal>
    </>,
    document.body
  );
};
