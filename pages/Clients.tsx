import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Users,
    User,
    UserCheck,
    UserX,
    Calendar,
    Pencil,
    Eye,
    Plus,
    Trash2,
    Copy,
    ExternalLink,
    ListFilter,
    X,
    Save,
    Search,
    Filter,
    MoreHorizontal,
    FileText,
    Phone,
    Mail,
    Building2,
    Loader2,
    CheckSquare,
    Square,
    MapPin,
    LayoutGrid,
    Table as TableIcon,
    ScanEye,
    SlidersHorizontal
} from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Client } from '../types';
import { supabase } from '../utils/supabaseClient';
import { ClientForm } from '../components/ClientForm';
import { Modal } from '../components/ui/Modal';
import { Tooltip } from '../components/ui/Tooltip';
import { Notification, NotificationType } from '../components/ui/Notification';
import { ClientDetailsDrawer } from '../components/ClientDetailsDrawer';






// --- Clients List Components ---
const NotificationPlaceholder = () => null; // Placeholder for state insertion

// --- TABLE COLUMN FILTER PANEL ---
interface TableColumnFilterProps {
  label: string;
  isActive: boolean;
  activeCount: number;
  children: React.ReactNode;
}

const PANEL_WIDTH = 288; // w-72 = 18rem

const TableColumnFilter: React.FC<TableColumnFilterProps> = ({ label, isActive, activeCount, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const openPanel = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();

    // Ajuste de borda: se o painel ultrapassar a janela, ancora pela direita
    const rawLeft = rect.left;
    const left = rawLeft + PANEL_WIDTH > window.innerWidth
      ? window.innerWidth - PANEL_WIDTH - 8
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

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{ top: coords.top, left: coords.left }}
          className="fixed z-[9999] w-72 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/60 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
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

export const Clients: React.FC<{ userProfile: any, initialClientId?: string | null, onClearInitialClientId?: () => void }> = ({ userProfile, initialClientId, onClearInitialClientId }) => {
    const [viewState, setViewState] = useState<'list' | 'create' | 'edit'>('list');
    const [displayMode, setDisplayMode] = useState<'table' | 'cards'>(() => typeof window !== 'undefined' && window.innerWidth < 1024 ? 'cards' : 'table');
    const [clients, setClients] = useState<Client[]>([]); // Use DB data
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState<{ show: boolean; message: string; type: NotificationType }>({
        show: false,
        message: '',
        type: 'info'
    });

    const showNotify = (message: string, type: NotificationType = 'info') => {
        setNotification({ show: true, message, type });
    };
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
    const [clientForDetails, setClientForDetails] = useState<Client | null>(null);

    // Deletion Modal State
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [deleteModalState, setDeleteModalState] = useState<'closed' | 'checking' | 'can_delete' | 'cannot_delete' | 'deleting'>('closed');

    // Filter Values State
    const [filters, setFilters] = useState({
        code: '',
        companyName: '',
        document: '',
        contactName: '',
        phoneFixed: '',
        phoneMobile: '',
        email: '',
        status: '',
    });

    // Grid Filter State
    const [isGridFilterOpen, setIsGridFilterOpen] = useState(false);
    const gridFilterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (gridFilterRef.current && !gridFilterRef.current.contains(event.target as Node)) {
                setIsGridFilterOpen(false);
            }
        }
        if (isGridFilterOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isGridFilterOpen]);


    // Initial load and handling specialized navigation
    useEffect(() => {
        const load = async () => {
            await fetchClients();

            if (initialClientId) {
                // Find client in loaded list or fetch directly if not present
                const target = clients.find(c => c.id === initialClientId);
                if (target) {
                    handleEdit(target);
                } else {
                    // Fetch directly if not in current list view (though it should be)
                    const { data, error } = await supabase
                        .from('clients')
                        .select('*, client_contacts(*)')
                        .eq('id', initialClientId)
                        .eq('org_id', userProfile.org_id)
                        .single();

                    if (data && !error) {
                        const firstContact = (data as any).client_contacts?.[0];
                        const mapped: Client = {
                            id: (data as any).id,
                            code: (data as any).code,
                            companyName: (data as any).company_name,
                            tradeName: (data as any).trade_name,
                            document: (data as any).document,
                            contactName: firstContact?.name || '',
                            phoneFixed: firstContact?.phone_fixed || '',
                            phoneMobile: firstContact?.phone_mobile || '',
                            email: firstContact?.email || '',
                            status: (data as any).status,
                            segment: (data as any).segment,
                            person_type: (data as any).person_type,
                            constitution_date: (data as any).constitution_date,
                            entry_date: (data as any).entry_date,
                            exit_date: (data as any).exit_date,
                            admin_partner_name: (data as any).admin_partner_name,
                            admin_partner_cpf: (data as any).admin_partner_cpf,
                            admin_partner_birthdate: (data as any).admin_partner_birthdate,
                            establishment_type: (data as any).establishment_type,
                            zip_code: (data as any).zip_code,
                            street: (data as any).street,
                            street_number: (data as any).street_number,
                            complement: (data as any).complement,
                            neighborhood: (data as any).neighborhood,
                            city: (data as any).city,
                            state: (data as any).state
                        };
                        handleEdit(mapped);
                    }
                }
                onClearInitialClientId?.();
            }
        };

        load();
    }, [initialClientId]);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('clients')
                .select('*, client_contacts(*)')
                .eq('org_id', userProfile.org_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) {
                // Map DB snake_case to UI camelCase
                const mappedData: Client[] = data.map((c: any) => {
                    const firstContact = c.client_contacts?.[0];
                    return {
                        id: c.id,
                        code: c.code,
                        companyName: c.company_name,
                        tradeName: c.trade_name,
                        document: c.document,
                        contactName: firstContact?.name || '',
                        phoneFixed: firstContact?.phone_fixed || '',
                        phoneMobile: firstContact?.phone_mobile || '',
                        email: firstContact?.email || '',
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
                        created_at: c.created_at
                    };
                });
                setClients(mappedData);
            }

        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };


    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const clearFilters = () => {
        setFilters({
            code: '',
            companyName: '',
            document: '',
            contactName: '',
            phoneFixed: '',
            phoneMobile: '',
            email: '',
            status: '',
        });
    };

    const handleEdit = (client: Client) => {
        setSelectedClient(client);
        setViewState('edit');
    };

    const handleCreate = () => {
        setSelectedClient(null);
        setViewState('create');
    };

    const initDeleteClient = async (client: Client) => {
        setClientToDelete(client);
        setDeleteModalState('checking');

        try {
            // Verifica se o cliente possui tarefas na base
            const { count, error } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('client_id', client.id);

            if (error) {
                console.error("Erro ao verificar tarefas:", error);
                setDeleteModalState('closed');
                showNotify("Erro ao verificar dependências do cliente.", "error");
                return;
            }

            if (count && count > 0) {
                setDeleteModalState('cannot_delete');
            } else {
                setDeleteModalState('can_delete');
            }
        } catch (error) {
            console.error("Erro desconhecido:", error);
            setDeleteModalState('closed');
        }
    };

    const confirmDelete = async () => {
        if (!clientToDelete) return;

        setDeleteModalState('deleting');

        try {
            // Exclui contatos primeiro (caso existam e não tenham ON DELETE CASCADE)
            await supabase
                .from('client_contacts')
                .delete()
                .eq('client_id', clientToDelete.id);

            // Exclui o cliente
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', clientToDelete.id);

            if (error) throw error;

            // Remove o cliente da lista local
            setClients(prev => prev.filter(c => c.id !== clientToDelete.id));

        } catch (err: any) {
            console.error("Erro ao excluir cliente:", err);
            showNotify("Ocorreu um erro ao excluir o cliente. Verifique o console.", "error");
        } finally {
            setDeleteModalState('closed');
            setClientToDelete(null);
        }
    };

    // Derived filtered clients
    const filteredClients = clients.filter((client) => {
        const companySearch = filters.companyName.toLowerCase();
        const matchesCompany = 
            (client.companyName || '').toLowerCase().includes(companySearch) ||
            (client.tradeName || '').toLowerCase().includes(companySearch) ||
            (client.city || '').toLowerCase().includes(companySearch) ||
            (client.state || '').toLowerCase().includes(companySearch);

        return (
            (client.code || '').toLowerCase().includes(filters.code.toLowerCase()) &&
            matchesCompany &&
            (client.document || '').includes(filters.document) &&
            (client.contactName || '').toLowerCase().includes(filters.contactName.toLowerCase()) &&
            (client.phoneFixed || '').includes(filters.phoneFixed) &&
            (client.phoneMobile || '').includes(filters.phoneMobile) &&
            (client.email || '').toLowerCase().includes(filters.email.toLowerCase()) &&
            (filters.status === '' || client.status === filters.status)
        );
    });

    // Derived metrics for cards
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalCurrent = clients.length;
    const totalLastMonth = clients.filter(c => {
        if (!c.created_at) return true;
        return new Date(c.created_at) < thisMonthStart;
    }).length;

    const clientsTrendValue = totalLastMonth > 0 
        ? ((totalCurrent - totalLastMonth) / totalLastMonth * 100)
        : (totalCurrent > 0 ? 100 : 0);

    const clientsTrendLabel = totalLastMonth === 0 && totalCurrent > 0
        ? "Novo este mês"
        : `${clientsTrendValue >= 0 ? '+' : ''}${clientsTrendValue.toFixed(0)}% vs mês ant.`;

    const getClientPercent = (count: number) => totalCurrent > 0 ? (count / totalCurrent * 100) : 0;

    const headerInputClass = "mt-2 w-full h-8 text-xs px-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-sm animate-in fade-in slide-in-from-top-1 duration-200";

    if (viewState === 'create' || viewState === 'edit') {
        return (
            <ClientForm
                onBack={() => {
                    setViewState('list');
                    fetchClients();
                }}
                initialData={selectedClient}
                userProfile={userProfile}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="flex items-center gap-3 mb-2 md:mb-0">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
                        <Building2 size={18} className="text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                            Cadastro de Clientes
                        </h1>
                        <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
                    </div>
                </div>
                <div className="flex gap-3">
                    
                        <div className="relative" ref={gridFilterRef}>
                            <Tooltip content="Filtros" position="top">
                                <Button
                                    variant={Object.values(filters).filter(v => v !== '').length > 0 ? "primary" : "secondary"}
                                    onClick={() => setIsGridFilterOpen(!isGridFilterOpen)}
                                    icon={<SlidersHorizontal size={16} />}
                                    className={`text-xs relative p-2 ${Object.values(filters).filter(v => v !== '').length > 0 ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30' : ''}`}
                                >
                                    {Object.values(filters).filter(v => v !== '').length > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-black px-1 ring-2 ring-white dark:ring-slate-900 bg-indigo-500 text-white shadow-sm">
                                            {Object.values(filters).filter(v => v !== '').length}
                                        </span>
                                    )}
                                </Button>
                            </Tooltip>

                            {isGridFilterOpen && (
                                <div className="fixed inset-x-4 top-24 md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 w-auto md:w-[340px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 p-4 z-[999] animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                                        <h3 className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-[0.1em] flex items-center gap-2">
                                            <SlidersHorizontal size={14} className="text-indigo-500" />
                                            Filtros Avancados
                                        </h3>
                                        <button onClick={() => setIsGridFilterOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                        <div>
                                            <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Código</label>
                                            <input type="text" className="w-full text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" value={filters.code} onChange={e => handleFilterChange('code', e.target.value)} placeholder="000" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Buscar Empresa / Local</label>
                                            <input type="text" className="w-full text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" value={filters.companyName} onChange={e => handleFilterChange('companyName', e.target.value)} placeholder="Nome, Cidade ou UF..." />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">CPF / CNPJ</label>
                                            <input type="text" className="w-full text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" value={filters.document} onChange={e => handleFilterChange('document', e.target.value)} placeholder="000.000.000-00" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Contato</label>
                                            <input type="text" className="w-full text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" value={filters.contactName} onChange={e => handleFilterChange('contactName', e.target.value)} placeholder="Nome do representante" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Fixo</label>
                                                <input type="text" className="w-full text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" value={filters.phoneFixed} onChange={e => handleFilterChange('phoneFixed', e.target.value)} placeholder="(00) ..." />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Celular</label>
                                                <input type="text" className="w-full text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" value={filters.phoneMobile} onChange={e => handleFilterChange('phoneMobile', e.target.value)} placeholder="(00) 9 ..." />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">E-mail</label>
                                            <input type="text" className="w-full text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" value={filters.email} onChange={e => handleFilterChange('email', e.target.value)} placeholder="cliente@email.com" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Situação</label>
                                            <div className="space-y-1.5 mt-1">
                                                {[
                                                    { value: 'Ativo',  label: 'Ativo',  color: 'bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400' },
                                                    { value: 'Inativo',  label: 'Inativo',  color: 'bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-400' },
                                                ].map(opt => (
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
                                        </div>
                                    </div>
                                    
                                    {Object.values(filters).filter(v => v !== '').length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <button onClick={clearFilters} className="w-full text-center text-[10px] font-black uppercase tracking-wider text-rose-500 dark:text-rose-400 hover:text-rose-700 py-2.5 bg-rose-50 dark:bg-rose-500/10 rounded-lg transition-colors border border-rose-200 dark:border-rose-500/30">
                                                Limpar Todos os Filtros
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button
                            onClick={() => setDisplayMode('table')}
                            className={`p-1.5 rounded-md transition-all ${displayMode === 'table' 
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        >
                            <TableIcon size={18} />
                        </button>
                        <button
                            onClick={() => setDisplayMode('cards')}
                            className={`p-1.5 rounded-md transition-all ${displayMode === 'cards' 
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>

                    <Button onClick={handleCreate} icon={<Plus size={18} />} className="hidden md:flex">Novo Cliente</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard 
                    title="Total de Cadastros" 
                    value={clients.length} 
                    icon={<Users size={20} />} 
                    color="indigo" 
                    trend={clientsTrendLabel}
                    variant="horizontal"
                />
                <MetricCard 
                    title="Ativos" 
                    value={clients.filter(c => c.status === 'Ativo').length} 
                    icon={<UserCheck size={20} />} 
                    color="emerald" 
                    progress={getClientPercent(clients.filter(c => c.status === 'Ativo').length)}
                    variant="horizontal"
                />
                <MetricCard 
                    title="Inativos" 
                    value={clients.filter(c => c.status === 'Inativo').length} 
                    icon={<UserX size={20} />} 
                    color="rose" 
                    progress={getClientPercent(clients.filter(c => c.status === 'Inativo').length)}
                    variant="horizontal"
                />
                <MetricCard 
                    title="Novos no Mês" 
                    value={clients.filter(c => {
                        if (!c.created_at) return false;
                        const createdAt = new Date(c.created_at);
                        return createdAt.getMonth() === now.getMonth() &&
                            createdAt.getFullYear() === now.getFullYear();
                    }).length} 
                    icon={<Calendar size={20} />} 
                    color="amber" 
                    progress={getClientPercent(clients.filter(c => {
                        if (!c.created_at) return false;
                        const createdAt = new Date(c.created_at);
                        return createdAt.getMonth() === now.getMonth() &&
                            createdAt.getFullYear() === now.getFullYear();
                    }).length)}
                    variant="horizontal"
                />
            </div>

            <div className="flex-1 overflow-auto min-h-0">
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-600" /></div>
                ) : displayMode === 'table' ? (
                    <Card className="overflow-hidden">
                        <div className="overflow-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                            <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400 border-separate border-spacing-0">
                                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 uppercase font-medium text-xs sticky top-0 z-[20] shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                                    <tr>
                                        {(() => {
                                            const codeActive = !!filters.code;
                                            const codeCount = codeActive ? 1 : 0;
                                            return (
                                                <th className={`px-6 py-4 align-top min-w-[100px] ${codeActive ? 'relative z-50' : 'relative z-10'}`}>
                                                    <div className="flex items-center justify-between gap-2 h-6">
                                                        <span className="truncate text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">Código</span>
                                                        <TableColumnFilter label="Código" isActive={codeActive} activeCount={codeCount}>
                                                            <div>
                                                                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Buscar Código</label>
                                                                <input type="text" className={headerInputClass} value={filters.code} onChange={e => handleFilterChange('code', e.target.value)} autoFocus placeholder="000..." />
                                                            </div>
                                                            {codeActive && (
                                                                <button onClick={() => handleFilterChange('code', '')} className="w-full text-center text-[10px] font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-700 pt-1">Limpar filtro</button>
                                                            )}
                                                        </TableColumnFilter>
                                                    </div>
                                                </th>
                                            );
                                        })()}

                                        {(() => {
                                            const nameActive = !!filters.companyName;
                                            const nameCount = nameActive ? 1 : 0;
                                            return (
                                                <th className={`px-6 py-4 align-top min-w-[200px] ${nameActive ? 'relative z-50' : 'relative z-10'}`}>
                                                    <div className="flex items-center justify-between gap-2 h-6">
                                                        <span className="truncate text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">Razão Social</span>
                                                        <TableColumnFilter label="Razão Social" isActive={nameActive} activeCount={nameCount}>
                                                            <div>
                                                                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Buscar Nome/Cidade/UF</label>
                                                                <input type="text" className={headerInputClass} value={filters.companyName} onChange={e => handleFilterChange('companyName', e.target.value)} autoFocus placeholder="Nome, Cidade ou UF..." />
                                                            </div>
                                                            {nameActive && (
                                                                <button onClick={() => handleFilterChange('companyName', '')} className="w-full text-center text-[10px] font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-700 pt-1">Limpar filtro</button>
                                                            )}
                                                        </TableColumnFilter>
                                                    </div>
                                                </th>
                                            );
                                        })()}

                                        {(() => {
                                            const docActive = !!filters.document;
                                            const docCount = docActive ? 1 : 0;
                                            return (
                                                <th className={`px-6 py-4 align-top min-w-[160px] ${docActive ? 'relative z-50' : 'relative z-10'}`}>
                                                    <div className="flex items-center justify-between gap-2 h-6">
                                                        <span className="truncate text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">CPF/CNPJ</span>
                                                        <TableColumnFilter label="CPF/CNPJ" isActive={docActive} activeCount={docCount}>
                                                            <div>
                                                                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Buscar Documento</label>
                                                                <input type="text" className={headerInputClass} value={filters.document} onChange={e => handleFilterChange('document', e.target.value)} autoFocus placeholder="Documento..." />
                                                            </div>
                                                            {docActive && (
                                                                <button onClick={() => handleFilterChange('document', '')} className="w-full text-center text-[10px] font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-700 pt-1">Limpar filtro</button>
                                                            )}
                                                        </TableColumnFilter>
                                                    </div>
                                                </th>
                                            );
                                        })()}

                                        {(() => {
                                            const contactActive = !!filters.contactName;
                                            const contactCount = contactActive ? 1 : 0;
                                            return (
                                                <th className={`px-6 py-4 align-top min-w-[150px] ${contactActive ? 'relative z-50' : 'relative z-10'}`}>
                                                    <div className="flex items-center justify-between gap-2 h-6">
                                                        <span className="truncate text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">Contato</span>
                                                        <TableColumnFilter label="Contato" isActive={contactActive} activeCount={contactCount}>
                                                            <div>
                                                                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Buscar Contato</label>
                                                                <input type="text" className={headerInputClass} value={filters.contactName} onChange={e => handleFilterChange('contactName', e.target.value)} autoFocus placeholder="Nome contato..." />
                                                            </div>
                                                            {contactActive && (
                                                                <button onClick={() => handleFilterChange('contactName', '')} className="w-full text-center text-[10px] font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-700 pt-1">Limpar filtro</button>
                                                            )}
                                                        </TableColumnFilter>
                                                    </div>
                                                </th>
                                            );
                                        })()}

                                        {(() => {
                                            const fixedActive = !!filters.phoneFixed;
                                            const fixedCount = fixedActive ? 1 : 0;
                                            return (
                                                <th className={`px-6 py-4 align-top min-w-[140px] ${fixedActive ? 'relative z-50' : 'relative z-10'}`}>
                                                    <div className="flex items-center justify-between gap-2 h-6">
                                                        <span className="truncate text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">Fixo</span>
                                                        <TableColumnFilter label="Fixo" isActive={fixedActive} activeCount={fixedCount}>
                                                            <div>
                                                                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Buscar Fixo</label>
                                                                <input type="text" className={headerInputClass} value={filters.phoneFixed} onChange={e => handleFilterChange('phoneFixed', e.target.value)} autoFocus placeholder="Telefone..." />
                                                            </div>
                                                            {fixedActive && (
                                                                <button onClick={() => handleFilterChange('phoneFixed', '')} className="w-full text-center text-[10px] font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-700 pt-1">Limpar filtro</button>
                                                            )}
                                                        </TableColumnFilter>
                                                    </div>
                                                </th>
                                            );
                                        })()}

                                        {(() => {
                                            const mobileActive = !!filters.phoneMobile;
                                            const mobileCount = mobileActive ? 1 : 0;
                                            return (
                                                <th className={`px-6 py-4 align-top min-w-[140px] ${mobileActive ? 'relative z-50' : 'relative z-10'}`}>
                                                    <div className="flex items-center justify-between gap-2 h-6">
                                                        <span className="truncate text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">Celular</span>
                                                        <TableColumnFilter label="Celular" isActive={mobileActive} activeCount={mobileCount}>
                                                            <div>
                                                                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Buscar Celular</label>
                                                                <input type="text" className={headerInputClass} value={filters.phoneMobile} onChange={e => handleFilterChange('phoneMobile', e.target.value)} autoFocus placeholder="Celular..." />
                                                            </div>
                                                            {mobileActive && (
                                                                <button onClick={() => handleFilterChange('phoneMobile', '')} className="w-full text-center text-[10px] font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-700 pt-1">Limpar filtro</button>
                                                            )}
                                                        </TableColumnFilter>
                                                    </div>
                                                </th>
                                            );
                                        })()}

                                        {(() => {
                                            const emailActive = !!filters.email;
                                            const emailCount = emailActive ? 1 : 0;
                                            return (
                                                <th className={`px-6 py-4 align-top min-w-[200px] ${emailActive ? 'relative z-50' : 'relative z-10'}`}>
                                                    <div className="flex items-center justify-between gap-2 h-6">
                                                        <span className="truncate text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">E-mail</span>
                                                        <TableColumnFilter label="E-mail" isActive={emailActive} activeCount={emailCount}>
                                                            <div>
                                                                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Buscar E-mail</label>
                                                                <input type="text" className={headerInputClass} value={filters.email} onChange={e => handleFilterChange('email', e.target.value)} autoFocus placeholder="Email..." />
                                                            </div>
                                                            {emailActive && (
                                                                <button onClick={() => handleFilterChange('email', '')} className="w-full text-center text-[10px] font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-700 pt-1">Limpar filtro</button>
                                                            )}
                                                        </TableColumnFilter>
                                                    </div>
                                                </th>
                                            );
                                        })()}

                                        {(() => {
                                            const statActive = !!filters.status;
                                            const statCount = statActive ? 1 : 0;
                                            const statOptions = [
                                                { value: 'Ativo',  label: 'Ativo',  color: 'bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400' },
                                                { value: 'Inativo',  label: 'Inativo',  color: 'bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-400' },
                                                { value: 'Prospecto',  label: 'Prospecto',  color: 'bg-amber-500/10 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400' },
                                            ];
                                            return (
                                                <th className={`px-6 py-4 align-top min-w-[120px] ${statActive ? 'relative z-50' : 'relative z-10'}`}>
                                                    <div className="flex items-center justify-between gap-2 h-6">
                                                        <span className="truncate text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">Situação</span>
                                                        <TableColumnFilter label="Situação" isActive={statActive} activeCount={statCount}>
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
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {filteredClients.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                                Nenhum cliente encontrado com os filtros selecionados.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredClients.map((client) => (
                                            <tr key={client.id} className="group relative hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-slate-500">{client.code}</td>
                                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                    <div className="flex flex-col">
                                                        <span>{client.companyName}</span>
                                                        {(client.city || client.state) && (
                                                            <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                                                                <MapPin size={10} className="text-slate-400" />
                                                                <span>{client.city}{client.city && client.state ? ', ' : ''}{client.state}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-[11px]">{client.document}</td>
                                                <td className="px-6 py-4">{client.contactName}</td>
                                                <td className="px-6 py-4 text-[11px]">{client.phoneFixed}</td>
                                                <td className="px-6 py-4 text-[11px]">{client.phoneMobile}</td>
                                                <td className="px-6 py-4">{client.email}</td>
                                                <td className="px-6 py-4 relative">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${client.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                                                        {client.status}
                                                    </span>

                                                    {/* Hover Actions Overlay */}
                                                    <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 bg-white dark:bg-slate-900 shadow-lg px-1 py-1 rounded-lg border border-slate-200 dark:border-slate-700 z-10 animate-in fade-in duration-200">
                                                        <Tooltip content="Visualizar" position="top">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                icon={<ScanEye size={16} />}
                                                                className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                                                                onClick={() => {
                                                                    setClientForDetails(client);
                                                                    setIsDetailsDrawerOpen(true);
                                                                }}
                                                            />
                                                        </Tooltip>
                                                        <Tooltip content="Editar" position="top">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                icon={<Pencil size={16} />}
                                                                className="h-8 w-8 p-0 text-indigo-600 dark:text-indigo-400"
                                                                onClick={() => handleEdit(client)}
                                                            />
                                                        </Tooltip>
                                                        <Tooltip content="Excluir" position="top">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                icon={<Trash2 size={16} />}
                                                                className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                                                                onClick={() => initDeleteClient(client)}
                                                            />
                                                        </Tooltip>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ maxHeight: 'calc(100vh - 240px)' }}>
                        {filteredClients.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                Nenhum cliente encontrado com os filtros selecionados.
                            </div>
                        ) : (
                            filteredClients.map((client) => (
                                <Card key={client.id} className="group hover:border-indigo-500/50 dark:hover:border-indigo-400/30 transition-all duration-300 hover:shadow-lg dark:hover:shadow-indigo-500/5 flex flex-col p-0 overflow-hidden relative border-slate-200 dark:border-slate-800">
                                    {/* Secao 1: Cabecalho e Infos */}
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/40 dark:to-slate-900/40">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-[10px] font-black tracking-widest text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">#{client.code}</span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${client.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20'}`}>
                                                {client.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <h3 className="font-extrabold text-slate-800 dark:text-white line-clamp-2 leading-tight text-[13px]">
                                                {client.companyName}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1.5 shadow-sm">
                                                    <FileText size={10} className="opacity-50" />
                                                    {client.document || 'Sem Documento'}
                                                </span>
                                                <span className="text-[9px] uppercase tracking-widest font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                                                    {client.establishment_type || 'Matriz'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Secao 2: Contatos */}
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-1 flex flex-col justify-center">
                                        <h4 className="text-[9px] uppercase tracking-widest font-black text-slate-400 dark:text-slate-500 mb-2.5">Contatos</h4>
                                        
                                        <div className="flex flex-col gap-2.5">
                                            {/* Nome principal */}
                                            {client.contactName && (
                                                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 font-semibold truncate leading-none">
                                                    <User size={13} className="text-slate-400 shrink-0" />
                                                    <span className="truncate">{client.contactName}</span>
                                                </div>
                                            )}
                                            {/* E-mail */}
                                            {client.email ? (
                                                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-none truncate">
                                                    <Mail size={13} className="shrink-0" />
                                                    <span className="truncate tracking-wide">{client.email}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-[11px] text-slate-300 dark:text-slate-600 italic leading-none isolate">
                                                    <Mail size={13} className="shrink-0 opacity-50" />
                                                    <span className="truncate">E-mail não informado</span>
                                                </div>
                                            )}

                                            {/* Telefones */}
                                            <div className="grid grid-cols-2 gap-2 mt-1">
                                                {client.phoneFixed ? (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                                        <Phone size={11} className="text-slate-400 shrink-0" />
                                                        <span className="whitespace-nowrap tracking-tight">{client.phoneFixed}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-300 dark:text-slate-600 italic bg-slate-50/50 dark:bg-slate-800/20 px-2 py-1.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                                        <Phone size={11} className="opacity-50 shrink-0" />
                                                        <span>S/ Fixo</span>
                                                    </div>
                                                )}
                                                {client.phoneMobile ? (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                                        <Phone size={11} className="text-slate-400 shrink-0" />
                                                        <span className="whitespace-nowrap tracking-tight">{client.phoneMobile}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-300 dark:text-slate-600 italic bg-slate-50/50 dark:bg-slate-800/20 px-2 py-1.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                                        <Phone size={11} className="opacity-50 shrink-0" />
                                                        <span>S/ Celular</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Secao 3: Localizacao e Acoes */}
                                    <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 relative">
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-black tracking-wider uppercase w-full sm:w-auto overflow-hidden bg-white/60 dark:bg-slate-800/60 px-2 py-1 rounded shadow-sm">
                                            <MapPin size={12} className="text-indigo-400 shrink-0" />
                                            <span className="truncate">{client.city || 'N/A'}, {client.state || 'N/A'}</span>
                                        </div>
                                        
                                        <div className="flex items-center justify-end w-full sm:w-auto gap-1">
                                            <Tooltip content="Visualizar" position="top">
                                                <button 
                                                    onClick={() => {
                                                        setClientForDetails(client);
                                                        setIsDetailsDrawerOpen(true);
                                                    }}
                                                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm rounded transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                                >
                                                    <ScanEye size={14} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Editar" position="top">
                                                <button 
                                                    onClick={() => handleEdit(client)}
                                                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm rounded transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Excluir" position="top">
                                                <button 
                                                    onClick={() => initDeleteClient(client)}
                                                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 hover:shadow-sm rounded transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Modais de Exclusão */}
            <Modal
                isOpen={deleteModalState !== 'closed'}
                onClose={() => {
                    if (deleteModalState !== 'deleting') {
                        setDeleteModalState('closed');
                    }
                }}
                title={deleteModalState === 'cannot_delete' ? "Exclusão Bloqueada" : "Confirmar Exclusão"}
                size="md"
                footer={
                    deleteModalState === 'can_delete' ? (
                        <>
                            <Button variant="secondary" onClick={() => setDeleteModalState('closed')}>
                                Cancelar
                            </Button>
                            <Button
                                variant="danger"
                                onClick={confirmDelete}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                Excluir Cliente
                            </Button>
                        </>
                    ) : deleteModalState === 'deleting' ? (
                        <Button variant="secondary" disabled>
                            <Loader2 className="animate-spin w-4 h-4 mr-2" />
                            Excluindo...
                        </Button>
                    ) : (
                        <Button variant="secondary" onClick={() => setDeleteModalState('closed')}>
                            Entendi
                        </Button>
                    )
                }
            >
                {deleteModalState === 'checking' && (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
                        <p>Verificando dependências do cliente...</p>
                    </div>
                )}

                {deleteModalState === 'cannot_delete' && (
                    <div className="py-4 text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 p-4 rounded-lg">
                            <ListFilter className="w-6 h-6 shrink-0" />
                            <p className="font-medium">
                                Não é possível excluir <strong>{clientToDelete?.companyName}</strong>.
                            </p>
                        </div>
                        <p>
                            Este cliente possui <strong>tarefas vinculadas</strong> no módulo de Tarefas.
                            Para manter o histórico íntegro, a exclusão sistêmica foi bloqueada.
                        </p>
                        <p className="mt-4 text-sm text-slate-500">
                            Caso ele não seja mais um cliente ativo, recomendamos alterar a Situação dele para <strong>Inativo</strong> através da edição.
                        </p>
                    </div>
                )}

                {deleteModalState === 'can_delete' && (
                    <div className="py-4 text-slate-700 dark:text-slate-300">
                        <p>
                            Você tem certeza que deseja excluir permanentemente o cliente <strong>{clientToDelete?.companyName}</strong>?
                        </p>
                        <p className="mt-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-3 rounded border border-red-100 dark:border-red-900/50">
                            Esta ação é irreversível e todos os dados de contato vinculados também serão apagados.
                        </p>
                    </div>
                )}
            </Modal>
            <Notification
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />
            {/* Client Details Drawer */}
            <ClientDetailsDrawer
                isOpen={isDetailsDrawerOpen}
                onClose={() => setIsDetailsDrawerOpen(false)}
                client={clientForDetails}
                onEdit={(client) => {
                    setIsDetailsDrawerOpen(false);
                    handleEdit(client);
                }}
            />
            {/* FAB: Novo Cliente (Mobile) */}
            <button
                onClick={handleCreate}
                className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-700 dark:hover:bg-indigo-600 active:scale-95 transition-all z-50 md:hidden border-4 border-white dark:border-slate-900"
                title="Novo Cliente"
            >
                <Plus size={28} strokeWidth={3} />
            </button>
        </div>
    );
};
