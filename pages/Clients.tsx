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

// --- Interfaces for Sub-Tables ---
interface ClientInscription { id?: string; client_id?: string; type: string; custom_name?: string; number: string; observation?: string; }
interface ClientContact { id?: string; client_id?: string; name: string; email?: string; phone_fixed?: string; phone_mobile?: string; }
interface ClientTaxRegime { id?: string; client_id?: string; start_date?: string; end_date?: string; regime: string; observation?: string; }
interface ClientActivity { id?: string; client_id?: string; order_type: string; cnae_code: string; cnae_description?: string; }
interface ClientAccess { id?: string; client_id?: string; access_name: string; username?: string; password?: string; access_url?: string; }
interface ClientCertificate { id?: string; client_id?: string; model: string; expires_at?: string; password?: string; signatory?: string; }
interface ClientLicense { id?: string; client_id?: string; license_name: string; license_number?: string; expiry_date?: string; access_url?: string; }
interface ClientLegislation { id?: string; client_id?: string; description: string; status?: string; access_url?: string; }

// --- Client Form Component ---
const ClientForm: React.FC<{ onBack: () => void; initialData?: Client | null }> = ({ onBack, initialData }) => {
    const isEditing = !!initialData;
    const [loading, setLoading] = useState(false);
    const [personType, setPersonType] = useState(initialData?.person_type || 'juridica');
    const [activeTab, setActiveTab] = useState('inscricoes');

    // Main Client Data State
    const [formData, setFormData] = useState({
        code: initialData?.code || '',
        companyName: initialData?.companyName || '',
        tradeName: initialData?.tradeName || '',
        document: initialData?.document || '',
        status: (initialData?.status as 'Ativo' | 'Inativo') || 'Ativo',
        segment: initialData?.segment || 'Tecnologia',
        admin_partner_name: initialData?.admin_partner_name || '',
        admin_partner_cpf: initialData?.admin_partner_cpf || '',
        admin_partner_birthdate: initialData?.admin_partner_birthdate || '',
        constitution_date: initialData?.constitution_date || '',
        entry_date: initialData?.entry_date || '',
        exit_date: initialData?.exit_date || '',
        has_branches: initialData?.has_branches === true ? 's' : 'n',
        cep: initialData?.zip_code || '',
        street: initialData?.street || '',
        number: initialData?.street_number || '',
        complement: initialData?.complement || '',
        neighborhood: initialData?.neighborhood || '',
        city: initialData?.city || '',
        state: initialData?.state || ''
    });

    // --- Sub-Lists State ---
    const [inscriptions, setInscriptions] = useState<ClientInscription[]>([]);
    const [contacts, setContacts] = useState<ClientContact[]>([]);
    const [taxRegimes, setTaxRegimes] = useState<ClientTaxRegime[]>([]);
    const [activities, setActivities] = useState<ClientActivity[]>([]);
    const [accesses, setAccesses] = useState<ClientAccess[]>([]);
    const [certificates, setCertificates] = useState<ClientCertificate[]>([]);
    const [licenses, setLicenses] = useState<ClientLicense[]>([]);
    const [legislations, setLegislations] = useState<ClientLegislation[]>([]);

    // --- Temporary Input State for Tabs ---
    const [tempInscription, setTempInscription] = useState<Partial<ClientInscription>>({ type: 'Municipal' });
    const [tempContact, setTempContact] = useState<Partial<ClientContact>>({});
    const [tempRegime, setTempRegime] = useState<Partial<ClientTaxRegime>>({ regime: 'simples' });
    const [tempActivity, setTempActivity] = useState<Partial<ClientActivity>>({ order_type: 'principal' });
    const [tempAccess, setTempAccess] = useState<Partial<ClientAccess>>({});
    const [tempCertificate, setTempCertificate] = useState<Partial<ClientCertificate>>({ model: 'ecnpj_a1', signatory: 'propria' });
    const [tempLicense, setTempLicense] = useState<Partial<ClientLicense>>({});
    const [tempLegislation, setTempLegislation] = useState<Partial<ClientLegislation>>({ status: 'vigente' });

    const [otherInscriptionType, setOtherInscriptionType] = useState(false);

    // --- Load Sub-Data on Edit ---
    useEffect(() => {
        if (isEditing && initialData?.id) {
            const fetchSubData = async () => {
                const { data: insc } = await supabase.from('client_inscriptions').select('*').eq('client_id', initialData.id);
                if (insc) setInscriptions(insc);

                const { data: cont } = await supabase.from('client_contacts').select('*').eq('client_id', initialData.id);
                if (cont) setContacts(cont);

                const { data: tax } = await supabase.from('client_tax_regime_history').select('*').eq('client_id', initialData.id);
                if (tax) setTaxRegimes(tax);

                const { data: act } = await supabase.from('client_activities').select('*').eq('client_id', initialData.id);
                if (act) setActivities(act);

                const { data: acc } = await supabase.from('client_accesses').select('*').eq('client_id', initialData.id);
                if (acc) setAccesses(acc);

                const { data: cert } = await supabase.from('client_certificates').select('*').eq('client_id', initialData.id);
                if (cert) setCertificates(cert);

                const { data: lic } = await supabase.from('client_licenses').select('*').eq('client_id', initialData.id);
                if (lic) setLicenses(lic);

                const { data: leg } = await supabase.from('client_legislations').select('*').eq('client_id', initialData.id);
                if (leg) setLegislations(leg);
            };
            fetchSubData();
        }
    }, [isEditing, initialData]);

    // --- Handlers ---
    const handleAddInscription = () => {
        if (!tempInscription.number) return alert('Preencha o número da inscrição');
        setInscriptions([...inscriptions, { ...tempInscription, type: otherInscriptionType ? tempInscription.custom_name || 'Outra' : tempInscription.type || 'Municipal' } as ClientInscription]);
        setTempInscription({ type: 'Municipal', number: '', observation: '', custom_name: '' });
        setOtherInscriptionType(false);
    };
    const handleAddContact = () => {
        if (!tempContact.name) return alert('Preencha o nome do contato');
        setContacts([...contacts, tempContact as ClientContact]);
        setTempContact({});
    };
    const handleAddRegime = () => {
        if (!tempRegime.regime) return alert('Selecione um regime');
        setTaxRegimes([...taxRegimes, tempRegime as ClientTaxRegime]);
        setTempRegime({ regime: 'simples', start_date: '', end_date: '', observation: '' });
    };
    const handleAddActivity = () => {
        if (!tempActivity.cnae_code) return alert('Preencha o código CNAE');
        setActivities([...activities, tempActivity as ClientActivity]);
        setTempActivity({ order_type: 'principal', cnae_code: '', cnae_description: '' });
    };
    const handleAddAccess = () => {
        if (!tempAccess.access_name) return alert('Preencha o nome do acesso');
        setAccesses([...accesses, tempAccess as ClientAccess]);
        setTempAccess({});
    };
    const handleAddCertificate = () => {
        if (!tempCertificate.model) return alert('Selecione o modelo');
        setCertificates([...certificates, tempCertificate as ClientCertificate]);
        setTempCertificate({ model: 'ecnpj_a1', signatory: 'propria', expires_at: '', password: '' });
    };
    const handleAddLicense = () => {
        if (!tempLicense.license_name) return alert('Preencha o nome da licença');
        setLicenses([...licenses, tempLicense as ClientLicense]);
        setTempLicense({});
    };
    const handleAddLegislation = () => {
        if (!tempLegislation.description) return alert('Preencha a descrição');
        setLegislations([...legislations, tempLegislation as ClientLegislation]);
        setTempLegislation({ status: 'vigente', description: '', access_url: '' });
    };

    const handleRemoveItem = async (listSetter: any, list: any[], index: number, table: string) => {
        const item = list[index];
        if (item.id) {
            if (confirm('Deseja realmente excluir este item? Esta ação não pode ser desfeita.')) {
                const { error } = await supabase.from(table).delete().eq('id', item.id);
                if (error) {
                    alert('Erro ao excluir item: ' + error.message);
                    return;
                }
            } else {
                return;
            }
        }
        const newList = [...list];
        newList.splice(index, 1);
        listSetter(newList);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            // Fix: Include all fields and map to DB column names
            const clientData = {
                org_id: user.id,
                code: formData.code,
                company_name: formData.companyName,
                trade_name: formData.tradeName,
                document: formData.document,
                status: formData.status,
                segment: formData.segment,
                person_type: personType,
                // New Fields
                constitution_date: formData.constitution_date || null,
                entry_date: formData.entry_date || null,
                exit_date: formData.exit_date || null,
                admin_partner_name: formData.admin_partner_name,
                admin_partner_cpf: formData.admin_partner_cpf,
                admin_partner_birthdate: formData.admin_partner_birthdate || null,
                has_branches: formData.has_branches === 's',
                zip_code: formData.cep,
                street: formData.street,
                street_number: formData.number,
                complement: formData.complement,
                neighborhood: formData.neighborhood,
                city: formData.city,
                state: formData.state,
            };

            let clientId = initialData?.id;

            if (initialData?.id) {
                const { error } = await (supabase.from('clients') as any).update(clientData).eq('id', initialData.id);
                if (error) throw error;
            } else {
                const { data, error } = await (supabase.from('clients') as any).insert(clientData).select().single();
                if (error) throw error;
                clientId = data?.id;
            }

            if (!clientId) throw new Error('Falha ao obter ID do cliente');

            const prepareItems = (items: any[]) => items.filter(i => !i.id).map(i => ({ ...i, client_id: clientId }));

            // Custom mappers for tables with field name mismatches
            const prepareCertificates = (items: any[]) => items.filter(i => !i.id).map(i => ({
                client_id: clientId,
                model: i.model,
                expires_at: i.expiration_date || null, // Map expiration_date -> expires_at
                password: i.password,
                signatory: i.signatory
            }));

            const prepareLicenses = (items: any[]) => items.filter(i => !i.id).map(i => ({
                client_id: clientId,
                license_name: i.license_name,
                license_number: i.number, // Map number -> license_number
                expiry_date: i.expiration_date || null, // Map expiration_date -> expiry_date
                access_url: i.access_url
            }));

            if (prepareItems(inscriptions).length > 0) await (supabase.from('client_inscriptions') as any).insert(prepareItems(inscriptions));
            if (prepareItems(contacts).length > 0) await (supabase.from('client_contacts') as any).insert(prepareItems(contacts));
            if (prepareItems(taxRegimes).length > 0) await (supabase.from('client_tax_regime_history') as any).insert(prepareItems(taxRegimes));
            if (prepareItems(activities).length > 0) await (supabase.from('client_activities') as any).insert(prepareItems(activities));
            if (prepareItems(accesses).length > 0) await (supabase.from('client_accesses') as any).insert(prepareItems(accesses));

            // Use custom mappers for certificates and licenses
            if (prepareCertificates(certificates).length > 0) await (supabase.from('client_certificates') as any).insert(prepareCertificates(certificates));
            if (prepareLicenses(licenses).length > 0) await (supabase.from('client_licenses') as any).insert(prepareLicenses(licenses));

            if (prepareItems(legislations).length > 0) await (supabase.from('client_legislations') as any).insert(prepareItems(legislations));

            alert('Cliente salvo com sucesso!');
            onBack();
        } catch (error: any) {
            console.error('Error saving client:', error);
            alert('Erro ao salvar cliente: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

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
                        {isEditing ? `Editando: ${formData.tradeName || formData.companyName}` : 'Cadastro de Cliente'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        {isEditing ? `Código: ${formData.code}` : 'Preencha os dados para registrar um novo cliente'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={onBack}>Voltar</Button>
                    <Button icon={loading ? <Loader2 className="animate-spin" /> : <Save size={18} />} onClick={handleSave} disabled={loading}>
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
                        value={formData.code}
                        onChange={e => setFormData({ ...formData, code: e.target.value })}
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
                        value={formData.document}
                        onChange={e => setFormData({ ...formData, document: e.target.value })}
                    />
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Situação</label>
                        <div className="flex bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700 h-10">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, status: 'Ativo' })}
                                className={`flex-1 rounded text-xs font-medium transition-colors ${formData.status === 'Ativo' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            >
                                Ativo
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, status: 'Inativo' })}
                                className={`flex-1 rounded text-xs font-medium transition-colors ${formData.status === 'Inativo' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            >
                                Inativo
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <Input type="date" label="Data Constituição" value={formData.constitution_date} onChange={e => setFormData({ ...formData, constitution_date: e.target.value })} />
                    <Input type="date" label="Data Entrada" value={formData.entry_date} onChange={e => setFormData({ ...formData, entry_date: e.target.value })} />
                    <Input type="date" label="Data Saída" value={formData.exit_date} onChange={e => setFormData({ ...formData, exit_date: e.target.value })} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <Input
                        label="Razão Social"
                        copyable
                        value={formData.companyName}
                        onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                    />
                    <Input
                        label="Nome Fantasia"
                        copyable
                        value={formData.tradeName}
                        onChange={e => setFormData({ ...formData, tradeName: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                    <Select
                        label="Possui Filiais?"
                        value={formData.has_branches}
                        onChange={e => setFormData({ ...formData, has_branches: e.target.value })}
                        options={[{ value: 's', label: 'Sim' }, { value: 'n', label: 'Não' }]}
                    />
                    <Select
                        label="Segmento"
                        value={formData.segment}
                        onChange={e => setFormData({ ...formData, segment: e.target.value })}
                        options={[{ value: 'tec', label: 'Tecnologia' }, { value: 'varejo', label: 'Varejo' }]}
                    />
                </div>

                <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Sócio Administrador</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Input label="Nome" copyable value={formData.admin_partner_name} onChange={e => setFormData({ ...formData, admin_partner_name: e.target.value })} />
                        <Input label="CPF" copyable value={formData.admin_partner_cpf} onChange={e => setFormData({ ...formData, admin_partner_cpf: e.target.value })} />
                        <Input type="date" label="Data Nascimento" value={formData.admin_partner_birthdate} onChange={e => setFormData({ ...formData, admin_partner_birthdate: e.target.value })} />
                    </div>
                </div>
            </Card>

            {/* Section 2: Address */}
            <Card title="Endereço">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <Input
                        label="CEP"
                        placeholder="00000-000"
                        containerClassName="md:col-span-2"
                        value={formData.cep}
                        onChange={e => setFormData({ ...formData, cep: e.target.value })}
                    />
                    <Input
                        label="Logradouro"
                        containerClassName="md:col-span-8"
                        value={formData.street}
                        onChange={e => setFormData({ ...formData, street: e.target.value })}
                    />
                    <Input
                        label="Número"
                        containerClassName="md:col-span-2"
                        value={formData.number}
                        onChange={e => setFormData({ ...formData, number: e.target.value })}
                    />

                    <Input
                        label="Complemento"
                        containerClassName="md:col-span-3"
                        value={formData.complement}
                        onChange={e => setFormData({ ...formData, complement: e.target.value })}
                    />
                    <Input
                        label="Bairro"
                        containerClassName="md:col-span-3"
                        value={formData.neighborhood}
                        onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                    />
                    <Input
                        label="Cidade"
                        containerClassName="md:col-span-4"
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                    />
                    <Input
                        label="UF"
                        containerClassName="md:col-span-2"
                        maxLength={2}
                        value={formData.state}
                        onChange={e => setFormData({ ...formData, state: e.target.value })}
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
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-800/30' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
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
                                        value={tempInscription.type}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setTempInscription({ ...tempInscription, type: val });
                                            setOtherInscriptionType(val === 'Outra');
                                        }}
                                        options={[
                                            { value: 'Municipal', label: 'Municipal' },
                                            { value: 'Estadual', label: 'Estadual' },
                                            { value: 'Suframa', label: 'Suframa' },
                                            { value: 'Nire', label: 'Nire' },
                                            { value: 'Outra', label: 'Outra' },
                                        ]}
                                    />
                                    {otherInscriptionType && (
                                        <Input
                                            placeholder="Nome da Inscrição"
                                            className="mt-2"
                                            value={tempInscription.custom_name}
                                            onChange={e => setTempInscription({ ...tempInscription, custom_name: e.target.value })}
                                        />
                                    )}
                                </div>
                                <Input
                                    label="Número da Inscrição"
                                    placeholder="Ex. 123.123-1"
                                    value={tempInscription.number}
                                    onChange={e => setTempInscription({ ...tempInscription, number: e.target.value })}
                                />
                                <Input
                                    label="Observação"
                                    value={tempInscription.observation}
                                    onChange={e => setTempInscription({ ...tempInscription, observation: e.target.value })}
                                />
                                <div className="md:col-span-3 flex justify-end">
                                    <Button size="sm" icon={<Plus size={16} />} onClick={handleAddInscription}>Adicionar Inscrição</Button>
                                </div>
                            </div>

                            {inscriptions.length > 0 ? (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Tipo</th>
                                                <th className="px-4 py-3">Número</th>
                                                <th className="px-4 py-3">Observação</th>
                                                <th className="px-4 py-3 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {inscriptions.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.type}</td>
                                                    <td className="px-4 py-3">{item.number}</td>
                                                    <td className="px-4 py-3 text-slate-500">{item.observation}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button onClick={() => handleRemoveItem(setInscriptions, inscriptions, index, 'client_inscriptions')} className="text-slate-400 hover:text-red-500 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 dark:text-slate-500 py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                    Nenhuma inscrição adicionada.
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3.4.2 Tabbar ‘Contatos’ */}
                    {activeTab === 'contatos' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                                <Input
                                    label="Nome do Contato"
                                    value={tempContact.name}
                                    onChange={e => setTempContact({ ...tempContact, name: e.target.value })}
                                />
                                <Input
                                    label="E-mail"
                                    type="email"
                                    value={tempContact.email}
                                    onChange={e => setTempContact({ ...tempContact, email: e.target.value })}
                                />
                                <Input
                                    label="Fixo"
                                    value={tempContact.phone_fixed}
                                    onChange={e => setTempContact({ ...tempContact, phone_fixed: e.target.value })}
                                />
                                <Input
                                    label="Celular"
                                    value={tempContact.phone_mobile}
                                    onChange={e => setTempContact({ ...tempContact, phone_mobile: e.target.value })}
                                />
                                <div className="lg:col-span-4 flex justify-end">
                                    <Button size="sm" icon={<Plus size={16} />} onClick={handleAddContact}>Adicionar Contato</Button>
                                </div>
                            </div>

                            {contacts.length > 0 ? (
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
                                            {contacts.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.name}</td>
                                                    <td className="px-4 py-3">{item.email}</td>
                                                    <td className="px-4 py-3">{item.phone_mobile || item.phone_fixed}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button onClick={() => handleRemoveItem(setContacts, contacts, index, 'client_contacts')} className="text-slate-400 hover:text-red-500 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
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
                                <Input
                                    label="Início em"
                                    type="date"
                                    value={tempRegime.start_date}
                                    onChange={e => setTempRegime({ ...tempRegime, start_date: e.target.value })}
                                />
                                <Input
                                    label="Saída em"
                                    type="date"
                                    value={tempRegime.end_date}
                                    onChange={e => setTempRegime({ ...tempRegime, end_date: e.target.value })}
                                />
                                <Select
                                    label="Regime Tributário"
                                    value={tempRegime.regime}
                                    onChange={e => setTempRegime({ ...tempRegime, regime: e.target.value })}
                                    options={[
                                        { value: 'simples', label: 'Simples Nacional' },
                                        { value: 'lp', label: 'Lucro Presumido' },
                                        { value: 'lr', label: 'Lucro Real' },
                                        { value: 'mei', label: 'MEI' },
                                    ]}
                                />
                                <div className="md:col-span-3">
                                    <Input
                                        label="Observação"
                                        value={tempRegime.observation}
                                        onChange={e => setTempRegime({ ...tempRegime, observation: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-3 flex justify-end">
                                    <Button size="sm" icon={<Plus size={16} />} onClick={handleAddRegime}>Adicionar Histórico</Button>
                                </div>
                            </div>

                            {taxRegimes.length > 0 ? (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Início</th>
                                                <th className="px-4 py-3">Fim</th>
                                                <th className="px-4 py-3">Regime</th>
                                                <th className="px-4 py-3 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {taxRegimes.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3">{item.start_date}</td>
                                                    <td className="px-4 py-3">{item.end_date}</td>
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                        {item.regime === 'simples' ? 'Simples Nacional' : item.regime === 'lp' ? 'Lucro Presumido' : item.regime === 'lr' ? 'Lucro Real' : 'MEI'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button onClick={() => handleRemoveItem(setTaxRegimes, taxRegimes, index, 'client_tax_regime_history')} className="text-slate-400 hover:text-red-500 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 dark:text-slate-500 py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                    Nenhum histórico de regime tributário.
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3.4.4 Tabbar ‘Atividades’ */}
                    {activeTab === 'atividades' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                                <div className="md:col-span-2">
                                    <Select
                                        label="Ordem"
                                        value={tempActivity.order_type}
                                        onChange={e => setTempActivity({ ...tempActivity, order_type: e.target.value })}
                                        options={[
                                            { value: 'principal', label: 'Principal' },
                                            { value: 'secundaria', label: 'Secundária' },
                                        ]}
                                    />
                                </div>
                                <Input
                                    label="CNAE"
                                    placeholder="6920-6/0"
                                    containerClassName="md:col-span-2"
                                    value={tempActivity.cnae_code}
                                    onChange={e => setTempActivity({ ...tempActivity, cnae_code: e.target.value })}
                                />
                                <Input
                                    label="Descrição do CNAE"
                                    placeholder="Contabilidade"
                                    containerClassName="md:col-span-8"
                                    value={tempActivity.cnae_description}
                                    onChange={e => setTempActivity({ ...tempActivity, cnae_description: e.target.value })}
                                />
                                <div className="md:col-span-12 flex justify-end">
                                    <Button size="sm" icon={<Plus size={16} />} onClick={handleAddActivity}>Adicionar CNAE</Button>
                                </div>
                            </div>

                            {activities.length > 0 ? (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Ordem</th>
                                                <th className="px-4 py-3">CNAE</th>
                                                <th className="px-4 py-3">Descrição</th>
                                                <th className="px-4 py-3 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {activities.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${item.order_type === 'principal' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                            {item.order_type === 'principal' ? 'Principal' : 'Secundária'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono">{item.cnae_code}</td>
                                                    <td className="px-4 py-3">{item.cnae_description}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button onClick={() => handleRemoveItem(setActivities, activities, index, 'client_activities')} className="text-slate-400 hover:text-red-500 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 dark:text-slate-500 py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                    Nenhuma atividade cadastrada.
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3.4.5 Tabbar ‘Acessos’ */}
                    {activeTab === 'acessos' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                                <Input
                                    label="Nome do Acesso"
                                    placeholder="Simples, NFS-e..."
                                    value={tempAccess.access_name}
                                    onChange={e => setTempAccess({ ...tempAccess, access_name: e.target.value })}
                                />
                                <Input
                                    label="Usuário"
                                    value={tempAccess.username}
                                    onChange={e => setTempAccess({ ...tempAccess, username: e.target.value })}
                                />
                                <Input
                                    label="Senha (Visível)"
                                    value={tempAccess.password}
                                    onChange={e => setTempAccess({ ...tempAccess, password: e.target.value })}
                                />
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Link de Acesso</label>
                                    <div className="flex gap-2">
                                        <input
                                            className="w-full h-10 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 underline"
                                            placeholder="https://"
                                            value={tempAccess.access_url}
                                            onChange={e => setTempAccess({ ...tempAccess, access_url: e.target.value })}
                                        />
                                        <button className="p-2 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Abrir Link">
                                            <ExternalLink size={16} className="text-slate-500 dark:text-slate-400" />
                                        </button>
                                    </div>
                                </div>
                                <div className="lg:col-span-4 flex justify-end">
                                    <Button size="sm" icon={<Plus size={16} />} onClick={handleAddAccess}>Adicionar Acesso</Button>
                                </div>
                            </div>

                            {accesses.length > 0 ? (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Acesso</th>
                                                <th className="px-4 py-3">Usuário</th>
                                                <th className="px-4 py-3">Senha</th>
                                                <th className="px-4 py-3">Link</th>
                                                <th className="px-4 py-3 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {accesses.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.access_name}</td>
                                                    <td className="px-4 py-3">{item.username}</td>
                                                    <td className="px-4 py-3 font-mono text-xs">{item.password}</td>
                                                    <td className="px-4 py-3">
                                                        {item.access_url && (
                                                            <a href={item.access_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                                Link <ExternalLink size={12} />
                                                            </a>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button onClick={() => handleRemoveItem(setAccesses, accesses, index, 'client_accesses')} className="text-slate-400 hover:text-red-500 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 dark:text-slate-500 py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                    Nenhum acesso cadastrado.
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3.4.6 Tabbar ‘Certificado’ */}
                    {activeTab === 'certificado' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                                <Select
                                    label="Modelo"
                                    value={tempCertificate.model}
                                    onChange={e => setTempCertificate({ ...tempCertificate, model: e.target.value })}
                                    options={[
                                        { value: 'ecnpj_a1', label: 'eCNPJ - A1' },
                                        { value: 'ecnpj_a3', label: 'eCNPJ - A3' },
                                        { value: 'ecpf_a1', label: 'eCPF - A1' },
                                        { value: 'ecpf_a3', label: 'eCPF - A3' },
                                    ]}
                                />
                                <Input
                                    label="Expira em"
                                    type="date"
                                    value={tempCertificate.expiration_date}
                                    onChange={e => setTempCertificate({ ...tempCertificate, expiration_date: e.target.value })}
                                />
                                <Input
                                    label="Senha (Visível)"
                                    type="text"
                                    value={tempCertificate.password}
                                    onChange={e => setTempCertificate({ ...tempCertificate, password: e.target.value })}
                                />
                                <Select
                                    label="Signatário"
                                    value={tempCertificate.signatory}
                                    onChange={e => setTempCertificate({ ...tempCertificate, signatory: e.target.value })}
                                    options={[
                                        { value: 'propria', label: 'Própria Empresa' },
                                        { value: 'socio', label: 'Sócio Administrador' },
                                        { value: 'procurador', label: 'Procurador' },
                                    ]}
                                />
                                <div className="lg:col-span-4 flex justify-end">
                                    <Button size="sm" icon={<Plus size={16} />} onClick={handleAddCertificate}>Adicionar Certificado</Button>
                                </div>
                            </div>

                            {certificates.length > 0 ? (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Modelo</th>
                                                <th className="px-4 py-3">Validade</th>
                                                <th className="px-4 py-3">Senha</th>
                                                <th className="px-4 py-3">Signatário</th>
                                                <th className="px-4 py-3 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {certificates.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                        {item.model === 'ecnpj_a1' ? 'eCNPJ - A1' : item.model === 'ecnpj_a3' ? 'eCNPJ - A3' : item.model === 'ecpf_a1' ? 'eCPF - A1' : 'eCPF - A3'}
                                                    </td>
                                                    <td className="px-4 py-3">{item.expiration_date}</td>
                                                    <td className="px-4 py-3 font-mono text-xs">{item.password}</td>
                                                    <td className="px-4 py-3">
                                                        {item.signatory === 'propria' ? 'Própria Empresa' : item.signatory === 'socio' ? 'Sócio Administrador' : 'Procurador'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button onClick={() => handleRemoveItem(setCertificates, certificates, index, 'client_certificates')} className="text-slate-400 hover:text-red-500 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 dark:text-slate-500 py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                    Nenhum certificado cadastrado.
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3.4.7 Tabbar ‘Licenças’ */}
                    {activeTab === 'licencas' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                                <Input
                                    label="Nome da Licença"
                                    placeholder="Alvará, Vigilância..."
                                    value={tempLicense.license_name}
                                    onChange={e => setTempLicense({ ...tempLicense, license_name: e.target.value })}
                                />
                                <Input
                                    label="Número da Licença"
                                    value={tempLicense.number}
                                    onChange={e => setTempLicense({ ...tempLicense, number: e.target.value })}
                                />
                                <Input
                                    label="Data de Validade"
                                    type="date"
                                    value={tempLicense.expiration_date}
                                    onChange={e => setTempLicense({ ...tempLicense, expiration_date: e.target.value })}
                                />
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Link de Acesso</label>
                                    <div className="flex gap-2">
                                        <input
                                            className="w-full h-10 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 underline"
                                            placeholder="https://"
                                            value={tempLicense.access_url}
                                            onChange={e => setTempLicense({ ...tempLicense, access_url: e.target.value })}
                                        />
                                        <button className="p-2 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Abrir Link">
                                            <ExternalLink size={16} className="text-slate-500 dark:text-slate-400" />
                                        </button>
                                    </div>
                                </div>
                                <div className="lg:col-span-4 flex justify-end">
                                    <Button size="sm" icon={<Plus size={16} />} onClick={handleAddLicense}>Adicionar Licença</Button>
                                </div>
                            </div>

                            {licenses.length > 0 ? (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Licença</th>
                                                <th className="px-4 py-3">Número</th>
                                                <th className="px-4 py-3">Validade</th>
                                                <th className="px-4 py-3">Link</th>
                                                <th className="px-4 py-3 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {licenses.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.license_name}</td>
                                                    <td className="px-4 py-3">{item.number}</td>
                                                    <td className="px-4 py-3">{item.expiration_date}</td>
                                                    <td className="px-4 py-3">
                                                        {item.access_url && (
                                                            <a href={item.access_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                                Link <ExternalLink size={12} />
                                                            </a>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button onClick={() => handleRemoveItem(setLicenses, licenses, index, 'client_licenses')} className="text-slate-400 hover:text-red-500 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 dark:text-slate-500 py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                    Nenhuma licença cadastrada.
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3.4.8 Tabbar ‘Legislação’ */}
                    {activeTab === 'legislacao' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                                <Input
                                    label="Descrição da Base Legal"
                                    placeholder="Artigo 18º da Lei..."
                                    containerClassName="md:col-span-7"
                                    value={tempLegislation.description}
                                    onChange={e => setTempLegislation({ ...tempLegislation, description: e.target.value })}
                                />
                                <div className="md:col-span-2">
                                    <Select
                                        label="Situação"
                                        value={tempLegislation.status}
                                        onChange={e => setTempLegislation({ ...tempLegislation, status: e.target.value })}
                                        options={[
                                            { value: 'vigente', label: 'Vigente' },
                                            { value: 'revogado', label: 'Revogado' },
                                        ]}
                                    />
                                </div>
                                <div className="md:col-span-3 flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Link de Acesso</label>
                                    <div className="flex gap-2">
                                        <input
                                            className="w-full h-10 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 underline"
                                            placeholder="https://"
                                            value={tempLegislation.access_url}
                                            onChange={e => setTempLegislation({ ...tempLegislation, access_url: e.target.value })}
                                        />
                                        <button className="p-2 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Abrir Link">
                                            <ExternalLink size={16} className="text-slate-500 dark:text-slate-400" />
                                        </button>
                                    </div>
                                </div>
                                <div className="md:col-span-12 flex justify-end">
                                    <Button size="sm" icon={<Plus size={16} />} onClick={handleAddLegislation}>Adicionar Legislação</Button>
                                </div>
                            </div>

                            {legislations.length > 0 ? (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Descrição</th>
                                                <th className="px-4 py-3">Situação</th>
                                                <th className="px-4 py-3">Link</th>
                                                <th className="px-4 py-3 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {legislations.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.description}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${item.status === 'vigente' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                                                            {item.status === 'vigente' ? 'Vigente' : 'Revogado'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {item.access_url && (
                                                            <a href={item.access_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                                Link <ExternalLink size={12} />
                                                            </a>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button onClick={() => handleRemoveItem(setLegislations, legislations, index, 'client_legislations')} className="text-slate-400 hover:text-red-500 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 dark:text-slate-500 py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                    Nenhuma legislação cadastrada.
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

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

export const Clients: React.FC = () => {
    const [viewState, setViewState] = useState<'list' | 'create' | 'edit'>('list');
    const [clients, setClients] = useState<Client[]>([]); // Use DB data
    const [loading, setLoading] = useState(true);
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

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('clients')
                .select('*, client_contacts(*)')
                .eq('org_id', user.id)
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
                        has_branches: c.has_branches,
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
                                                <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 bg-white dark:bg-slate-900 shadow-lg px-1 py-1 rounded-lg border border-slate-200 dark:border-slate-700 z-10 animate-in fade-in duration-200">
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
                )}
            </Card>
        </div>
    );
};
