import React, { useState, useEffect } from 'react';
import {
    Users,
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
    MapPin
} from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Client } from '../types';
import { supabase } from '../utils/supabaseClient';
import { ClientForm } from '../components/ClientForm';
import { Modal } from '../components/ui/Modal';






// --- Clients List Components ---

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

export const Clients: React.FC<{ userProfile: any, initialClientId?: string | null, onClearInitialClientId?: () => void }> = ({ userProfile, initialClientId, onClearInitialClientId }) => {
    const [viewState, setViewState] = useState<'list' | 'create' | 'edit'>('list');
    const [clients, setClients] = useState<Client[]>([]); // Use DB data
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

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

    // Filter Visibility State
    const [visibleFilters, setVisibleFilters] = useState<Record<string, boolean>>({});

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

    const toggleFilterVisibility = (field: string) => {
        setVisibleFilters(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
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
        setVisibleFilters({});
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
                alert("Erro ao verificar dependências do cliente.");
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

        } catch (error) {
            console.error("Erro ao excluir cliente:", error);
            alert("Ocorreu um erro ao excluir o cliente. Verifique o console.");
        } finally {
            setDeleteModalState('closed');
            setClientToDelete(null);
        }
    };

    // Derived filtered clients
    const filteredClients = clients.filter((client) => {
        return (
            (client.code || '').toLowerCase().includes(filters.code.toLowerCase()) &&
            (client.companyName || '').toLowerCase().includes(filters.companyName.toLowerCase()) &&
            (client.document || '').includes(filters.document) &&
            (client.contactName || '').toLowerCase().includes(filters.contactName.toLowerCase()) &&
            (client.phoneFixed || '').includes(filters.phoneFixed) &&
            (client.phoneMobile || '').includes(filters.phoneMobile) &&
            (client.email || '').toLowerCase().includes(filters.email.toLowerCase()) &&
            (filters.status === '' || client.status === filters.status)
        );
    });

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
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestão de Clientes</h1>
                    <p className="text-slate-500 dark:text-slate-400">Base de dados de clientes e empresas</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={clearFilters}
                        icon={<X size={16} />}
                        className="text-xs"
                        disabled={Object.values(filters).every(v => v === '')}
                    >
                        Limpar Filtros
                    </Button>
                    <Button onClick={handleCreate} icon={<Plus size={18} />}>Novo Cliente</Button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard title="Total de Cadastros" value={clients.length.toString()} icon={<Users size={20} />} color="indigo" />
                <MetricCard title="Ativos" value={clients.filter(c => c.status === 'Ativo').length.toString()} icon={<UserCheck size={20} />} color="emerald" />
                <MetricCard title="Inativos" value={clients.filter(c => c.status === 'Inativo').length.toString()} icon={<UserX size={20} />} color="rose" />
                <MetricCard title="Novos no Mês" value={clients.filter(c => {
                    if (!c.created_at) return false;
                    const createdAt = new Date(c.created_at);
                    const now = new Date();
                    return createdAt.getMonth() === now.getMonth() &&
                        createdAt.getFullYear() === now.getFullYear();
                }).length.toString()} icon={<Calendar size={20} />} color="amber" />
            </div>

            <Card className="overflow-visible">
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-600" /></div>
                ) : (
                    <div className="overflow-x-auto min-h-[300px]">
                        <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-200 uppercase font-medium text-xs sticky top-0 z-10 [&_th:first-child]:rounded-tl-lg [&_th:last-child]:rounded-tr-lg">
                                <tr>
                                    <HeaderCell
                                        label="Código"
                                        fieldKey="code"
                                        filterValue={filters.code}
                                        isVisible={!!visibleFilters['code']}
                                        onToggle={toggleFilterVisibility}
                                        widthClass="min-w-[100px]"
                                    >
                                        <input
                                            type="text"
                                            placeholder="000..."
                                            className={headerInputClass}
                                            value={filters.code}
                                            onChange={(e) => handleFilterChange('code', e.target.value)}
                                            autoFocus
                                        />
                                    </HeaderCell>

                                    <HeaderCell
                                        label="Razão Social"
                                        fieldKey="companyName"
                                        filterValue={filters.companyName}
                                        isVisible={!!visibleFilters['companyName']}
                                        onToggle={toggleFilterVisibility}
                                        widthClass="min-w-[200px]"
                                    >
                                        <input
                                            type="text"
                                            placeholder="Buscar empresa..."
                                            className={headerInputClass}
                                            value={filters.companyName}
                                            onChange={(e) => handleFilterChange('companyName', e.target.value)}
                                            autoFocus
                                        />
                                    </HeaderCell>

                                    <HeaderCell
                                        label="CPF/CNPJ"
                                        fieldKey="document"
                                        filterValue={filters.document}
                                        isVisible={!!visibleFilters['document']}
                                        onToggle={toggleFilterVisibility}
                                        widthClass="min-w-[160px]"
                                    >
                                        <input
                                            type="text"
                                            placeholder="Documento..."
                                            className={headerInputClass}
                                            value={filters.document}
                                            onChange={(e) => handleFilterChange('document', e.target.value)}
                                            autoFocus
                                        />
                                    </HeaderCell>

                                    <HeaderCell
                                        label="Contato"
                                        fieldKey="contactName"
                                        filterValue={filters.contactName}
                                        isVisible={!!visibleFilters['contactName']}
                                        onToggle={toggleFilterVisibility}
                                        widthClass="min-w-[150px]"
                                    >
                                        <input
                                            type="text"
                                            placeholder="Nome contato..."
                                            className={headerInputClass}
                                            value={filters.contactName}
                                            onChange={(e) => handleFilterChange('contactName', e.target.value)}
                                            autoFocus
                                        />
                                    </HeaderCell>

                                    <HeaderCell
                                        label="Fixo"
                                        fieldKey="phoneFixed"
                                        filterValue={filters.phoneFixed}
                                        isVisible={!!visibleFilters['phoneFixed']}
                                        onToggle={toggleFilterVisibility}
                                        widthClass="min-w-[140px]"
                                    >
                                        <input
                                            type="text"
                                            placeholder="Telefone..."
                                            className={headerInputClass}
                                            value={filters.phoneFixed}
                                            onChange={(e) => handleFilterChange('phoneFixed', e.target.value)}
                                            autoFocus
                                        />
                                    </HeaderCell>

                                    <HeaderCell
                                        label="Celular"
                                        fieldKey="phoneMobile"
                                        filterValue={filters.phoneMobile}
                                        isVisible={!!visibleFilters['phoneMobile']}
                                        onToggle={toggleFilterVisibility}
                                        widthClass="min-w-[140px]"
                                    >
                                        <input
                                            type="text"
                                            placeholder="Celular..."
                                            className={headerInputClass}
                                            value={filters.phoneMobile}
                                            onChange={(e) => handleFilterChange('phoneMobile', e.target.value)}
                                            autoFocus
                                        />
                                    </HeaderCell>

                                    <HeaderCell
                                        label="E-mail"
                                        fieldKey="email"
                                        filterValue={filters.email}
                                        isVisible={!!visibleFilters['email']}
                                        onToggle={toggleFilterVisibility}
                                        widthClass="min-w-[200px]"
                                    >
                                        <input
                                            type="text"
                                            placeholder="Email..."
                                            className={headerInputClass}
                                            value={filters.email}
                                            onChange={(e) => handleFilterChange('email', e.target.value)}
                                            autoFocus
                                        />
                                    </HeaderCell>

                                    <HeaderCell
                                        label="Situação"
                                        fieldKey="status"
                                        filterValue={filters.status}
                                        isVisible={!!visibleFilters['status']}
                                        onToggle={toggleFilterVisibility}
                                        widthClass="min-w-[120px]"
                                    >
                                        <select
                                            className={headerInputClass}
                                            value={filters.status}
                                            onChange={(e) => handleFilterChange('status', e.target.value)}
                                            autoFocus
                                        >
                                            <option value="">Todas</option>
                                            <option value="Ativo">Ativo</option>
                                            <option value="Inativo">Inativo</option>
                                        </select>
                                    </HeaderCell>
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
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        icon={<Pencil size={16} />}
                                                        title="Editar"
                                                        className="h-8 w-8 p-0 text-indigo-600 dark:text-indigo-400"
                                                        onClick={() => handleEdit(client)}
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        icon={<Trash2 size={16} />}
                                                        title="Excluir"
                                                        className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                                                        onClick={() => initDeleteClient(client)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

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
        </div>
    );
};
