
import React, { useState } from 'react';
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
  Save
} from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Client } from '../types';

const MOCK_CLIENTS: Client[] = [
  {
    id: 1,
    code: '000001',
    companyName: 'Tech Solutions Ltda',
    tradeName: 'Tech Soluções',
    document: '12.345.678/0001-90',
    contactName: 'Carlos Silva',
    phoneFixed: '(11) 3333-4444',
    phoneMobile: '(11) 99999-8888',
    email: 'contato@techsolutions.com',
    status: 'Ativo',
    segment: 'Tecnologia'
  },
  {
    id: 2,
    code: '000002',
    companyName: 'Mercado Silva',
    tradeName: 'Mercadinho do João',
    document: '98.765.432/0001-10',
    contactName: 'João Silva',
    phoneFixed: '(11) 3333-5555',
    phoneMobile: '(11) 98888-7777',
    email: 'joao@mercado.com',
    status: 'Ativo',
    segment: 'Varejo'
  }
];

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
          className={`p-1 rounded-md transition-colors ${
            filterValue || isVisible
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

export const Clients: React.FC = () => {
  const [viewState, setViewState] = useState<'list' | 'create' | 'edit'>('list');
  const [clients] = useState<Client[]>(MOCK_CLIENTS);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

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

  // Derived filtered clients
  const filteredClients = clients.filter((client) => {
    return (
      client.code.toLowerCase().includes(filters.code.toLowerCase()) &&
      client.companyName.toLowerCase().includes(filters.companyName.toLowerCase()) &&
      client.document.includes(filters.document) &&
      client.contactName.toLowerCase().includes(filters.contactName.toLowerCase()) &&
      client.phoneFixed.includes(filters.phoneFixed) &&
      client.phoneMobile.includes(filters.phoneMobile) &&
      client.email.toLowerCase().includes(filters.email.toLowerCase()) &&
      (filters.status === '' || client.status === filters.status)
    );
  });

  // Helper styles for header inputs
  const headerInputClass = "mt-2 w-full h-8 text-xs px-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-sm animate-in fade-in slide-in-from-top-1 duration-200";

  if (viewState === 'create' || viewState === 'edit') {
    return (
      <ClientForm 
        onBack={() => setViewState('list')} 
        initialData={selectedClient} 
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
        <MetricCard title="Total de Cadastros" value="142" icon={<Users size={20} />} color="indigo" />
        <MetricCard title="Ativos" value="128" icon={<UserCheck size={20} />} color="emerald" />
        <MetricCard title="Inativos" value="14" icon={<UserX size={20} />} color="rose" />
        <MetricCard title="Novos no Mês" value="5" icon={<Calendar size={20} />} color="amber" />
      </div>

      <Card className="overflow-visible">
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
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{client.companyName}</td>
                    <td className="px-6 py-4">{client.document}</td>
                    <td className="px-6 py-4">{client.contactName}</td>
                    <td className="px-6 py-4">{client.phoneFixed}</td>
                    <td className="px-6 py-4">{client.phoneMobile}</td>
                    <td className="px-6 py-4">{client.email}</td>
                    <td className="px-6 py-4 relative">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${client.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                        {client.status}
                      </span>
                      
                      {/* Hover Actions Overlay */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 bg-white dark:bg-slate-900 shadow-lg px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 z-10 animate-in fade-in duration-200">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          icon={<Eye size={16} />} 
                          title="Visualizar" 
                          className="h-8 w-8 p-0" 
                          onClick={() => handleEdit(client)}
                        />
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          icon={<Pencil size={16} />} 
                          title="Editar" 
                          className="h-8 w-8 p-0 text-indigo-600 dark:text-indigo-400" 
                          onClick={() => handleEdit(client)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// --- Client Form Component ---

const ClientForm: React.FC<{ onBack: () => void; initialData?: Client | null }> = ({ onBack, initialData }) => {
  const isEditing = !!initialData;
  const [personType, setPersonType] = useState('juridica');
  const [activeTab, setActiveTab] = useState('inscricoes');
  const [otherInscriptionType, setOtherInscriptionType] = useState(false);
  
  // State for Status
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>(
    (initialData?.status as 'Ativo' | 'Inativo') || 'Ativo'
  );

  // Helpers for dynamic labels
  const getDocumentLabel = () => {
    if (personType === 'fisica') return 'CPF';
    if (personType === 'juridica') return 'CNPJ';
    return 'Estrangeiro';
  };

  const tabs = [
    { id: 'inscricoes', label: 'Inscrições' },
    { id: 'contatos', label: 'Contatos' },
    { id: 'regime', label: 'Regime Tributário' },
    { id: 'atividades', label: 'Atividades' },
    { id: 'acessos', label: 'Acessos' },
    { id: 'certificado', label: 'Certificado' },
    { id: 'licencas', label: 'Licenças' },
    { id: 'legislacao', label: 'Legislação' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
       <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isEditing ? `Editando: ${initialData.tradeName || initialData.companyName}` : 'Cadastro de Cliente'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            {isEditing ? `Código: ${initialData.code}` : 'Preencha os dados para registrar um novo cliente'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onBack}>Voltar</Button>
          <Button icon={<Save size={18} />}>
            {isEditing ? 'Salvar Alterações' : 'Criar Cliente'}
          </Button>
        </div>
      </div>

      {/* Section 1: Initial Data */}
      <Card title="Dados Iniciais">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Input 
            label="Código" 
            placeholder="000000" 
            defaultValue={initialData?.code} 
          />
          <Select 
            label="Tipo de Pessoa" 
            value={personType}
            onChange={(e) => setPersonType(e.target.value)}
            options={[
              { value: 'juridica', label: 'Jurídica' },
              { value: 'fisica', label: 'Física' },
              { value: 'exterior', label: 'Exterior' },
            ]} 
          />
          <Input 
            label={getDocumentLabel()} 
            copyable 
            defaultValue={initialData?.document} 
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Situação</label>
            <div className="flex bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700 h-10">
              <button 
                type="button"
                onClick={() => setStatus('Ativo')}
                className={`flex-1 rounded text-xs font-medium transition-colors ${status === 'Ativo' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                Ativo
              </button>
              <button 
                type="button"
                onClick={() => setStatus('Inativo')}
                className={`flex-1 rounded text-xs font-medium transition-colors ${status === 'Inativo' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                Inativo
              </button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <Input type="date" label="Data Constituição" />
          <Input type="date" label="Data Entrada" />
          <Input type="date" label="Data Saída" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Input 
            label="Razão Social" 
            copyable 
            defaultValue={initialData?.companyName} 
          />
          <Input 
            label="Nome Fantasia" 
            copyable 
            defaultValue={initialData?.tradeName} 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <Select 
            label="Possui Filiais?" 
            options={[{value: 's', label: 'Sim'}, {value: 'n', label: 'Não'}]} 
          />
          <Select 
            label="Segmento" 
            options={[{value: 'tec', label: 'Tecnologia'}, {value: 'varejo', label: 'Varejo'}]} 
            defaultValue={initialData?.segment === 'Tecnologia' ? 'tec' : 'varejo'}
          />
        </div>
        
        <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Sócio Administrador</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <Input label="Nome" copyable />
             <Input label="CPF" copyable />
             <Input type="date" label="Data Nascimento" />
          </div>
        </div>
      </Card>

      {/* Section 2: Address */}
      <Card title="Endereço">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <Input 
            label="CEP" 
            copyable 
            containerClassName="md:col-span-2" 
            placeholder="00000-000"
          />
          <Input 
            label="Logradouro" 
            copyable 
            containerClassName="md:col-span-8" 
          />
          <Input 
            label="Número" 
            copyable 
            containerClassName="md:col-span-2" 
          />
          
          <Input 
            label="Complemento" 
            copyable 
            containerClassName="md:col-span-3"
          />
          <Input 
            label="Bairro" 
            copyable 
            containerClassName="md:col-span-3" 
          />
          <Input 
            label="Cidade" 
            copyable 
            containerClassName="md:col-span-4" 
          />
          <Input 
            label="UF" 
            copyable 
            containerClassName="md:col-span-2" 
            maxLength={2}
          />
        </div>
      </Card>

      {/* Section 3: Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden min-h-[400px]">
        <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <div className="flex w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-800/30' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          
          {/* 3.4.1 Tabbar ‘Inscrições’ */}
          {activeTab === 'inscricoes' && (
            <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="md:col-span-1">
                    <Select 
                      label="Tipo de Inscrição"
                      options={[
                        {value: 'Municipal', label: 'Municipal'},
                        {value: 'Estadual', label: 'Estadual'},
                        {value: 'Suframa', label: 'Suframa'},
                        {value: 'Nire', label: 'Nire'},
                        {value: 'Outra', label: 'Outra'},
                      ]}
                      onChange={(e) => setOtherInscriptionType(e.target.value === 'Outra')}
                    />
                    {otherInscriptionType && <Input placeholder="Nome da Inscrição" className="mt-2" />}
                  </div>
                  <Input label="Número da Inscrição" placeholder="Ex. 123.123-1" copyable />
                  <Input label="Observação" />
                  <div className="md:col-span-3 flex justify-end">
                    <Button size="sm" icon={<Plus size={16} />}>Adicionar Inscrição</Button>
                  </div>
               </div>
               
               <div className="text-center text-slate-400 dark:text-slate-500 py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  Nenhuma inscrição adicionada.
               </div>
            </div>
          )}

          {/* 3.4.2 Tabbar ‘Contatos’ */}
          {activeTab === 'contatos' && (
             <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                  <Input label="Nome do Contato" copyable defaultValue={initialData?.contactName} />
                  <Input label="E-mail" type="email" copyable defaultValue={initialData?.email} />
                  <Input label="Fixo" copyable defaultValue={initialData?.phoneFixed} />
                  <Input label="Celular" copyable defaultValue={initialData?.phoneMobile} />
                  <div className="lg:col-span-4 flex justify-end">
                    <Button size="sm" icon={<Plus size={16} />}>Adicionar Contato</Button>
                  </div>
               </div>

               {initialData ? (
                 // Mock list for editing view
                 <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                       <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                          <tr>
                             <th className="px-4 py-3">Nome</th>
                             <th className="px-4 py-3">Email</th>
                             <th className="px-4 py-3">Telefone</th>
                             <th className="px-4 py-3 text-right">Ações</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          <tr>
                             <td className="px-4 py-3 text-slate-900 dark:text-white">{initialData.contactName}</td>
                             <td className="px-4 py-3">{initialData.email}</td>
                             <td className="px-4 py-3">{initialData.phoneFixed}</td>
                             <td className="px-4 py-3 text-right">
                                <button className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                             </td>
                          </tr>
                       </tbody>
                    </table>
                 </div>
               ) : (
                  <div className="text-center text-slate-400 dark:text-slate-500 py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                      Nenhum contato adicionado.
                  </div>
               )}
             </div>
          )}

          {/* 3.4.3 Tabbar ‘Regime Tributário’ */}
          {activeTab === 'regime' && (
             <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                  <Input label="Início em" type="date" />
                  <Input label="Saída em" type="date" />
                  <Select 
                    label="Regime Tributário"
                    options={[
                      {value: 'simples', label: 'Simples Nacional'},
                      {value: 'lp', label: 'Lucro Presumido'},
                      {value: 'lr', label: 'Lucro Real'},
                      {value: 'mei', label: 'MEI'},
                    ]}
                  />
                  <div className="md:col-span-3">
                    <Input label="Observação" copyable />
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <Button size="sm" icon={<Plus size={16} />}>Adicionar Histórico</Button>
                  </div>
               </div>

               <div className="text-center text-slate-400 dark:text-slate-500 py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  Nenhum histórico de regime tributário.
               </div>
             </div>
          )}

          {/* 3.4.4 Tabbar ‘Atividades’ */}
          {activeTab === 'atividades' && (
             <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="md:col-span-2">
                    <Select 
                      label="Ordem"
                      options={[
                        {value: 'principal', label: 'Principal'},
                        {value: 'secundaria', label: 'Secundária'},
                      ]}
                    />
                  </div>
                  <Input label="CNAE" placeholder="6920-6/0" copyable containerClassName="md:col-span-2" />
                  <Input label="Descrição do CNAE" placeholder="Contabilidade" copyable containerClassName="md:col-span-8" />
                  <div className="md:col-span-12 flex justify-end">
                    <Button size="sm" icon={<Plus size={16} />}>Adicionar CNAE</Button>
                  </div>
               </div>

               <div className="text-center text-slate-400 dark:text-slate-500 py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  Nenhuma atividade cadastrada.
               </div>
             </div>
          )}

           {/* 3.4.5 Tabbar ‘Acessos’ */}
           {activeTab === 'acessos' && (
            <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                  <Input label="Nome do Acesso" placeholder="Simples, NFS-e..." copyable />
                  <Input label="Usuário" copyable />
                  <Input label="Senha (Visível)" copyable />
                  <div className="flex flex-col gap-1.5">
                     <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Link de Acesso</label>
                     <div className="flex gap-2">
                        <input 
                          className="w-full h-10 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 underline" 
                          placeholder="https://" 
                        />
                        <button className="p-2 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Abrir Link">
                           <ExternalLink size={16} className="text-slate-500 dark:text-slate-400" />
                        </button>
                     </div>
                  </div>
                  <div className="lg:col-span-4 flex justify-end">
                    <Button size="sm" icon={<Plus size={16} />}>Adicionar Acesso</Button>
                  </div>
               </div>

               <div className="text-center text-slate-400 dark:text-slate-500 py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  Nenhum acesso cadastrado.
               </div>
            </div>
          )}

          {/* 3.4.6 Tabbar ‘Certificado’ */}
          {activeTab === 'certificado' && (
             <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                  <Select 
                    label="Modelo"
                    options={[
                      {value: 'ecnpj_a1', label: 'eCNPJ - A1'},
                      {value: 'ecnpj_a3', label: 'eCNPJ - A3'},
                      {value: 'ecpf_a1', label: 'eCPF - A1'},
                      {value: 'ecpf_a3', label: 'eCPF - A3'},
                    ]}
                  />
                  <Input label="Expira em" type="date" />
                  <Input label="Senha (Visível)" type="text" copyable />
                  <Select 
                    label="Signatário"
                    options={[
                      {value: 'propria', label: 'Própria Empresa'},
                      {value: 'socio', label: 'Sócio Administrador'},
                      {value: 'procurador', label: 'Procurador'},
                    ]}
                  />
                  <div className="lg:col-span-4 flex justify-end">
                    <Button size="sm" icon={<Plus size={16} />}>Adicionar Certificado</Button>
                  </div>
               </div>

               <div className="text-center text-slate-400 dark:text-slate-500 py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  Nenhum certificado cadastrado.
               </div>
             </div>
          )}

          {/* 3.4.7 Tabbar ‘Licenças’ */}
          {activeTab === 'licencas' && (
             <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                  <Input label="Nome da Licença" placeholder="Alvará, Vigilância..." copyable />
                  <Input label="Número da Licença" copyable />
                  <Input label="Data de Validade" type="date" />
                  <div className="flex flex-col gap-1.5">
                     <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Link de Acesso</label>
                     <div className="flex gap-2">
                        <input 
                          className="w-full h-10 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 underline" 
                          placeholder="https://" 
                        />
                        <button className="p-2 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Abrir Link">
                           <ExternalLink size={16} className="text-slate-500 dark:text-slate-400" />
                        </button>
                     </div>
                  </div>
                  <div className="lg:col-span-4 flex justify-end">
                    <Button size="sm" icon={<Plus size={16} />}>Adicionar Licença</Button>
                  </div>
               </div>

               <div className="text-center text-slate-400 dark:text-slate-500 py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  Nenhuma licença cadastrada.
               </div>
             </div>
          )}

          {/* 3.4.8 Tabbar ‘Legislação’ */}
          {activeTab === 'legislacao' && (
             <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                  <Input 
                    label="Descrição da Base Legal" 
                    placeholder="Artigo 18º da Lei..." 
                    copyable 
                    containerClassName="md:col-span-7"
                  />
                  <div className="md:col-span-2">
                    <Select 
                      label="Situação"
                      options={[
                        {value: 'vigente', label: 'Vigente'},
                        {value: 'revogado', label: 'Revogado'},
                      ]}
                    />
                  </div>
                  <div className="md:col-span-3 flex flex-col gap-1.5">
                     <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Link de Acesso</label>
                     <div className="flex gap-2">
                        <input 
                          className="w-full h-10 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 underline" 
                          placeholder="https://" 
                        />
                        <button className="p-2 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Abrir Link">
                           <ExternalLink size={16} className="text-slate-500 dark:text-slate-400" />
                        </button>
                     </div>
                  </div>
                  <div className="md:col-span-12 flex justify-end">
                    <Button size="sm" icon={<Plus size={16} />}>Adicionar Legislação</Button>
                  </div>
               </div>

               <div className="text-center text-slate-400 dark:text-slate-500 py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  Nenhuma legislação cadastrada.
               </div>
             </div>
          )}
          
        </div>
      </div>
    </div>
  );
};
