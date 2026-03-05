import React, { useState, useEffect } from 'react';
import {
    Users,
    UserCheck,
    Calendar,
    Pencil,
    Plus,
    Trash2,
    ExternalLink,
    Save,
    Loader2,
    MapPin,
    User,
    Activity,
    GitMerge,
    FileText,
    Building2,
    Mail,
    Phone
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input, Select, CopyButton } from './ui/Input';
import { Client } from '../types';
import { supabase } from '../utils/supabaseClient';

// --- Interfaces for Sub-Tables ---
interface ClientInscription { id?: string; client_id?: string; type: string; custom_name?: string; number: string; observation?: string; }
interface ClientContact { id?: string; client_id?: string; name: string; email?: string; phone_fixed?: string; phone_mobile?: string; }
interface ClientTaxRegime { id?: string; client_id?: string; start_date?: string; end_date?: string; regime: string; observation?: string; }
interface ClientActivity { id?: string; client_id?: string; order_type: string; cnae_code: string; cnae_description?: string; }
interface ClientAccess { id?: string; client_id?: string; access_name: string; username?: string; password?: string; access_url?: string; }
interface ClientCertificate { id?: string; client_id?: string; model: string; expires_at?: string; password?: string; signatory?: string; expiration_date?: string; }
interface ClientLicense { id?: string; client_id?: string; license_name: string; license_number?: string; expiry_date?: string; access_url?: string; number?: string; expiration_date?: string; }
interface ClientLegislation { id?: string; client_id?: string; description: string; status?: string; access_url?: string; }

type ClientTable =
    | 'client_inscriptions'
    | 'client_contacts'
    | 'client_tax_regime_history'
    | 'client_activities'
    | 'client_accesses'
    | 'client_certificates'
    | 'client_licenses'
    | 'client_legislations';

export const ClientForm: React.FC<{ onBack: () => void; initialData?: Client | null; isViewOnly?: boolean; userProfile: any }> = ({ onBack, initialData, isViewOnly = false, userProfile }) => {
    const isEditing = !!initialData;
    const [readOnly, setReadOnly] = useState(isViewOnly);
    const [loading, setLoading] = useState(false);
    const [personType, setPersonType] = useState(initialData?.person_type || 'juridica');
    const [activeTab, setActiveTab] = useState('inscricoes');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

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

    // --- Load Sub-Data on Edit or Fetch Next Code on Create ---
    useEffect(() => {
        const loadInitialData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

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
            } else if (!isEditing) {
                // Fetch Next Code for New Client
                const { data, error } = await supabase
                    .from('clients')
                    .select('code')
                    .eq('org_id', userProfile.org_id)
                    .order('code', { ascending: false })
                    .limit(1);

                if (!error && data && data.length > 0) {
                    const lastCode = parseInt(data[0].code, 10);
                    if (!isNaN(lastCode)) {
                        const nextCode = (lastCode + 1).toString().padStart(6, '0');
                        setFormData(prev => ({ ...prev, code: nextCode }));
                    }
                } else if (!error && (!data || data.length === 0)) {
                    // First client
                    setFormData(prev => ({ ...prev, code: '000001' }));
                }
            }
        };
        loadInitialData();
    }, [isEditing, initialData]);

    // --- Handlers ---
    const handleAddInscription = () => {
        if (!tempInscription.number) return alert('Preencha o número da inscrição');
        if (editingIndex !== null) {
            const newList = [...inscriptions];
            newList[editingIndex] = { ...newList[editingIndex], ...tempInscription, type: otherInscriptionType ? tempInscription.custom_name || 'Outra' : tempInscription.type || 'Municipal' } as ClientInscription;
            setInscriptions(newList);
            setEditingIndex(null);
        } else {
            setInscriptions([...inscriptions, { ...tempInscription, type: otherInscriptionType ? tempInscription.custom_name || 'Outra' : tempInscription.type || 'Municipal' } as ClientInscription]);
        }
        setTempInscription({ type: 'Municipal', number: '', observation: '', custom_name: '' });
        setOtherInscriptionType(false);
    };
    const handleAddContact = () => {
        if (!tempContact.name) return alert('Preencha o nome do contato');
        if (editingIndex !== null) {
            const newList = [...contacts];
            newList[editingIndex] = { ...newList[editingIndex], ...tempContact } as ClientContact;
            setContacts(newList);
            setEditingIndex(null);
        } else {
            setContacts([...contacts, tempContact as ClientContact]);
        }
        setTempContact({});
    };
    const handleAddRegime = () => {
        if (!tempRegime.regime) return alert('Selecione um regime');
        if (editingIndex !== null) {
            const newList = [...taxRegimes];
            newList[editingIndex] = { ...newList[editingIndex], ...tempRegime } as ClientTaxRegime;
            setTaxRegimes(newList);
            setEditingIndex(null);
        } else {
            setTaxRegimes([...taxRegimes, tempRegime as ClientTaxRegime]);
        }
        setTempRegime({ regime: 'simples', start_date: '', end_date: '', observation: '' });
    };
    const handleAddActivity = () => {
        if (!tempActivity.cnae_code) return alert('Preencha o código CNAE');
        if (editingIndex !== null) {
            const newList = [...activities];
            newList[editingIndex] = { ...newList[editingIndex], ...tempActivity } as ClientActivity;
            setActivities(newList);
            setEditingIndex(null);
        } else {
            setActivities([...activities, tempActivity as ClientActivity]);
        }
        setTempActivity({ order_type: 'principal', cnae_code: '', cnae_description: '' });
    };
    const handleAddAccess = () => {
        if (!tempAccess.access_name) return alert('Preencha o nome do acesso');
        if (editingIndex !== null) {
            const newList = [...accesses];
            newList[editingIndex] = { ...newList[editingIndex], ...tempAccess } as ClientAccess;
            setAccesses(newList);
            setEditingIndex(null);
        } else {
            setAccesses([...accesses, tempAccess as ClientAccess]);
        }
        setTempAccess({});
    };
    const handleAddCertificate = () => {
        if (!tempCertificate.model) return alert('Selecione o modelo');
        if (editingIndex !== null) {
            const newList = [...certificates];
            newList[editingIndex] = { ...newList[editingIndex], ...tempCertificate } as ClientCertificate;
            setCertificates(newList);
            setEditingIndex(null);
        } else {
            setCertificates([...certificates, tempCertificate as ClientCertificate]);
        }
        setTempCertificate({ model: 'ecnpj_a1', signatory: 'propria', expires_at: '', password: '' });
    };
    const handleAddLicense = () => {
        if (!tempLicense.license_name) return alert('Preencha o nome da licença');
        if (editingIndex !== null) {
            const newList = [...licenses];
            newList[editingIndex] = { ...newList[editingIndex], ...tempLicense } as ClientLicense;
            setLicenses(newList);
            setEditingIndex(null);
        } else {
            setLicenses([...licenses, tempLicense as ClientLicense]);
        }
        setTempLicense({});
    };
    const handleAddLegislation = () => {
        if (!tempLegislation.description) return alert('Preencha a descrição');
        if (editingIndex !== null) {
            const newList = [...legislations];
            newList[editingIndex] = { ...newList[editingIndex], ...tempLegislation } as ClientLegislation;
            setLegislations(newList);
            setEditingIndex(null);
        } else {
            setLegislations([...legislations, tempLegislation as ClientLegislation]);
        }
        setTempLegislation({ status: 'vigente', description: '', access_url: '' });
    };

    const handleRemoveItem = async (listSetter: any, list: any[], index: number, table: ClientTable) => {
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

            const clientData = {
                org_id: userProfile.org_id,
                code: formData.code,
                company_name: formData.companyName,
                trade_name: formData.tradeName,
                document: formData.document,
                status: formData.status,
                segment: formData.segment,
                person_type: personType,
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

            const processItems = async (table: string, items: any[], prepareFn: (i: any) => any) => {
                const newItems = items.filter(i => !i.id).map(prepareFn);
                const existingItems = items.filter(i => i.id).map(i => ({ id: i.id, ...prepareFn(i) }));

                if (newItems.length > 0) {
                    const { error } = await (supabase.from(table) as any).insert(newItems);
                    if (error) console.error(`Error inserting new items in ${table}:`, error);
                }

                for (const item of existingItems) {
                    const { id, created_at, ...updateData } = item;
                    const { error } = await (supabase.from(table) as any).update(updateData).eq('id', id);
                    if (error) console.error(`Error updating item in ${table}:`, error);
                }
            };

            await processItems('client_inscriptions', inscriptions, i => ({ ...i, client_id: clientId }));
            await processItems('client_contacts', contacts, i => ({ ...i, client_id: clientId }));
            await processItems('client_tax_regime_history', taxRegimes, i => ({ ...i, client_id: clientId }));
            await processItems('client_activities', activities, i => ({ ...i, client_id: clientId }));
            await processItems('client_accesses', accesses, i => ({ ...i, client_id: clientId }));
            await processItems('client_certificates', certificates, i => ({
                client_id: clientId,
                model: i.model,
                expires_at: i.expiration_date || i.expires_at || null,
                password: i.password,
                signatory: i.signatory
            }));
            await processItems('client_licenses', licenses, i => ({
                client_id: clientId,
                license_name: i.license_name,
                license_number: i.number || i.license_number,
                expiry_date: i.expiration_date || i.expiry_date || null,
                access_url: i.access_url
            }));
            await processItems('client_legislations', legislations, i => ({ ...i, client_id: clientId }));

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
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {readOnly ? `Visualizando: ${formData.tradeName || formData.companyName}` : isEditing ? `Editando: ${formData.tradeName || formData.companyName}` : 'Cadastro de Cliente'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        {isEditing || readOnly ? `Código: ${formData.code}` : 'Preencha os dados para registrar um novo cliente'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={onBack}>Voltar</Button>
                    {readOnly ? (
                        <Button variant="primary" icon={<Pencil size={18} />} onClick={() => setReadOnly(false)}>
                            Editar
                        </Button>
                    ) : (
                        <Button icon={loading ? <Loader2 className="animate-spin" /> : <Save size={18} />} onClick={handleSave} disabled={loading}>
                            {isEditing ? 'Salvar Alterações' : 'Criar Cliente'}
                        </Button>
                    )}
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
                        disabled={readOnly}
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
                        disabled={readOnly}
                    />
                    <Input
                        label={getDocumentLabel()}
                        copyable
                        value={formData.document}
                        onChange={e => setFormData({ ...formData, document: e.target.value })}
                        disabled={readOnly}
                    />
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Situação</label>
                        <div className="flex bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700 h-10">
                            <button
                                type="button"
                                onClick={() => !readOnly && setFormData({ ...formData, status: 'Ativo' })}
                                className={`flex-1 rounded text-xs font-medium transition-colors ${formData.status === 'Ativo' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'} ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                                disabled={readOnly}
                            >
                                Ativo
                            </button>
                            <button
                                type="button"
                                onClick={() => !readOnly && setFormData({ ...formData, status: 'Inativo' })}
                                className={`flex-1 rounded text-xs font-medium transition-colors ${formData.status === 'Inativo' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'} ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                                disabled={readOnly}
                            >
                                Inativo
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <Input type="date" label="Data Constituição" value={formData.constitution_date} onChange={e => setFormData({ ...formData, constitution_date: e.target.value })} disabled={readOnly} />
                    <Input type="date" label="Data Entrada" value={formData.entry_date} onChange={e => setFormData({ ...formData, entry_date: e.target.value })} disabled={readOnly} />
                    <Input type="date" label="Data Saída" value={formData.exit_date} onChange={e => setFormData({ ...formData, exit_date: e.target.value })} disabled={readOnly} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <Input
                        label="Razão Social"
                        copyable
                        value={formData.companyName}
                        onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                        disabled={readOnly}
                    />
                    <Input
                        label="Nome Fantasia"
                        copyable
                        value={formData.tradeName}
                        onChange={e => setFormData({ ...formData, tradeName: e.target.value })}
                        disabled={readOnly}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                    <Select
                        label="Possui Filiais?"
                        value={formData.has_branches}
                        onChange={e => setFormData({ ...formData, has_branches: e.target.value })}
                        options={[{ value: 's', label: 'Sim' }, { value: 'n', label: 'Não' }]}
                        disabled={readOnly}
                    />
                    <Select
                        label="Segmento"
                        value={formData.segment}
                        onChange={e => setFormData({ ...formData, segment: e.target.value })}
                        options={[{ value: 'tec', label: 'Tecnologia' }, { value: 'varejo', label: 'Varejo' }]}
                        disabled={readOnly}
                    />
                </div>

                <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Sócio Administrador</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Input label="Nome" copyable value={formData.admin_partner_name} onChange={e => setFormData({ ...formData, admin_partner_name: e.target.value })} disabled={readOnly} />
                        <Input label="CPF" copyable value={formData.admin_partner_cpf} onChange={e => setFormData({ ...formData, admin_partner_cpf: e.target.value })} disabled={readOnly} />
                        <Input type="date" label="Data Nascimento" value={formData.admin_partner_birthdate} onChange={e => setFormData({ ...formData, admin_partner_birthdate: e.target.value })} disabled={readOnly} />
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
                        disabled={readOnly}
                    />
                    <Input
                        label="Logradouro"
                        containerClassName="md:col-span-8"
                        value={formData.street}
                        onChange={e => setFormData({ ...formData, street: e.target.value })}
                        disabled={readOnly}
                    />
                    <Input
                        label="Número"
                        containerClassName="md:col-span-2"
                        value={formData.number}
                        onChange={e => setFormData({ ...formData, number: e.target.value })}
                        disabled={readOnly}
                    />

                    <Input
                        label="Complemento"
                        containerClassName="md:col-span-3"
                        value={formData.complement}
                        onChange={e => setFormData({ ...formData, complement: e.target.value })}
                        disabled={readOnly}
                    />
                    <Input
                        label="Bairro"
                        containerClassName="md:col-span-3"
                        value={formData.neighborhood}
                        onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                        disabled={readOnly}
                    />
                    <Input
                        label="Cidade"
                        containerClassName="md:col-span-4"
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        disabled={readOnly}
                    />
                    <Input
                        label="UF"
                        containerClassName="md:col-span-2"
                        maxLength={2}
                        value={formData.state}
                        onChange={e => setFormData({ ...formData, state: e.target.value })}
                        disabled={readOnly}
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
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setEditingIndex(null);
                                    setTempInscription({ type: 'Municipal', number: '', observation: '', custom_name: '' });
                                    setTempContact({});
                                    setTempRegime({ regime: 'simples', start_date: '', end_date: '', observation: '' });
                                    setTempActivity({ order_type: 'principal', cnae_code: '', cnae_description: '' });
                                    setTempAccess({});
                                    setTempCertificate({ model: 'ecnpj_a1', signatory: 'propria', expires_at: '', password: '' });
                                    setTempLicense({});
                                    setTempLegislation({ status: 'vigente', description: '', access_url: '' });
                                    setOtherInscriptionType(false);
                                }}
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
                            {!readOnly && (
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
                                    <div className="md:col-span-3 flex justify-end gap-2">
                                        {editingIndex !== null && (
                                            <Button size="sm" variant="secondary" onClick={() => { setEditingIndex(null); setTempInscription({ type: 'Municipal', number: '', observation: '', custom_name: '' }); setOtherInscriptionType(false); }}>Cancelar</Button>
                                        )}
                                        <Button size="sm" icon={editingIndex !== null ? <Save size={16} /> : <Plus size={16} />} onClick={handleAddInscription}>
                                            {editingIndex !== null ? 'Salvar Edição' : 'Adicionar Inscrição'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {inscriptions.length > 0 ? (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Tipo</th>
                                                <th className="px-4 py-3">Número</th>
                                                <th className="px-4 py-3">Observação</th>
                                                {!readOnly && <th className="px-4 py-3 text-right">Ações</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {inscriptions.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.type}</span>
                                                            <CopyButton text={item.type || ''} className="opacity-0 group-hover/copy:opacity-100" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.number}</span>
                                                            <CopyButton text={item.number || ''} className="opacity-0 group-hover/copy:opacity-100" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.observation}</span>
                                                            {item.observation && <CopyButton text={item.observation} className="opacity-0 group-hover/copy:opacity-100" />}
                                                        </div>
                                                    </td>
                                                    {!readOnly && (
                                                        <td className="px-4 py-3 text-right flex justify-end items-center gap-2">
                                                            <button onClick={() => { setTempInscription(item); setOtherInscriptionType(!['Municipal', 'Estadual', 'Suframa', 'Nire'].includes(item.type)); setEditingIndex(index); }} className="text-slate-400 hover:text-indigo-500 transition-colors">
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button onClick={() => handleRemoveItem(setInscriptions, inscriptions, index, 'client_inscriptions')} className="text-slate-400 hover:text-red-500 transition-colors">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    )}
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
                            {!readOnly && (
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
                                    <div className="lg:col-span-4 flex justify-end gap-2">
                                        {editingIndex !== null && (
                                            <Button size="sm" variant="secondary" onClick={() => { setEditingIndex(null); setTempContact({}); }}>Cancelar</Button>
                                        )}
                                        <Button size="sm" icon={editingIndex !== null ? <Save size={16} /> : <Plus size={16} />} onClick={handleAddContact}>
                                            {editingIndex !== null ? 'Salvar Edição' : 'Adicionar Contato'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {contacts.length > 0 ? (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Nome</th>
                                                <th className="px-4 py-3">Email</th>
                                                <th className="px-4 py-3">Celular</th>
                                                <th className="px-4 py-3">Fixo</th>
                                                {!readOnly && <th className="px-4 py-3 text-right">Ações</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {contacts.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.name}</span>
                                                            <CopyButton text={item.name || ''} className="opacity-0 group-hover/copy:opacity-100" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.email}</span>
                                                            {item.email && <CopyButton text={item.email} className="opacity-0 group-hover/copy:opacity-100" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.phone_mobile}</span>
                                                            {item.phone_mobile && <CopyButton text={item.phone_mobile} className="opacity-0 group-hover/copy:opacity-100" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.phone_fixed}</span>
                                                            {item.phone_fixed && <CopyButton text={item.phone_fixed} className="opacity-0 group-hover/copy:opacity-100" />}
                                                        </div>
                                                    </td>
                                                    {!readOnly && (
                                                        <td className="px-4 py-3 text-right flex justify-end items-center gap-2">
                                                            <button onClick={() => { setTempContact(item); setEditingIndex(index); }} className="text-slate-400 hover:text-indigo-500 transition-colors">
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button onClick={() => handleRemoveItem(setContacts, contacts, index, 'client_contacts')} className="text-slate-400 hover:text-red-500 transition-colors">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    )}
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
                            {!readOnly && (
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
                                    <div className="md:col-span-3 flex justify-end gap-2">
                                        {editingIndex !== null && (
                                            <Button size="sm" variant="secondary" onClick={() => { setEditingIndex(null); setTempRegime({ regime: 'simples', start_date: '', end_date: '', observation: '' }); }}>Cancelar</Button>
                                        )}
                                        <Button size="sm" icon={editingIndex !== null ? <Save size={16} /> : <Plus size={16} />} onClick={handleAddRegime}>
                                            {editingIndex !== null ? 'Salvar Edição' : 'Adicionar Histórico'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {taxRegimes.length > 0 ? (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3 max-w-[100px]">Início</th>
                                                <th className="px-4 py-3 max-w-[100px]">Fim</th>
                                                <th className="px-4 py-3">Regime</th>
                                                <th className="px-4 py-3">Observação</th>
                                                {!readOnly && <th className="px-4 py-3 text-right">Ações</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {taxRegimes.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3 max-w-[100px]">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.start_date}</span>
                                                            {item.start_date && <CopyButton text={item.start_date} className="opacity-0 group-hover/copy:opacity-100" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 max-w-[100px]">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.end_date}</span>
                                                            {item.end_date && <CopyButton text={item.end_date} className="opacity-0 group-hover/copy:opacity-100" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.regime === 'simples' ? 'Simples Nacional' : item.regime === 'lp' ? 'Lucro Presumido' : item.regime === 'lr' ? 'Lucro Real' : 'MEI'}</span>
                                                            <CopyButton text={item.regime === 'simples' ? 'Simples Nacional' : item.regime === 'lp' ? 'Lucro Presumido' : item.regime === 'lr' ? 'Lucro Real' : 'MEI'} className="opacity-0 group-hover/copy:opacity-100" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-xs">{item.observation}</td>
                                                    {!readOnly && (
                                                        <td className="px-4 py-3 text-right flex justify-end items-center gap-2">
                                                            <button onClick={() => { setTempRegime(item); setEditingIndex(index); }} className="text-slate-400 hover:text-indigo-500 transition-colors">
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button onClick={() => handleRemoveItem(setTaxRegimes, taxRegimes, index, 'client_tax_regime_history')} className="text-slate-400 hover:text-red-500 transition-colors">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    )}
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
                            {!readOnly && (
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
                                    <div className="md:col-span-12 flex justify-end gap-2">
                                        {editingIndex !== null && (
                                            <Button size="sm" variant="secondary" onClick={() => { setEditingIndex(null); setTempActivity({ order_type: 'principal', cnae_code: '', cnae_description: '' }); }}>Cancelar</Button>
                                        )}
                                        <Button size="sm" icon={editingIndex !== null ? <Save size={16} /> : <Plus size={16} />} onClick={handleAddActivity}>
                                            {editingIndex !== null ? 'Salvar Edição' : 'Adicionar CNAE'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {activities.length > 0 ? (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Ordem</th>
                                                <th className="px-4 py-3">CNAE</th>
                                                <th className="px-4 py-3">Descrição</th>
                                                {!readOnly && <th className="px-4 py-3 text-right">Ações</th>}
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
                                                    <td className="px-4 py-3 font-mono">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.cnae_code}</span>
                                                            <CopyButton text={item.cnae_code || ''} className="opacity-0 group-hover/copy:opacity-100" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.cnae_description}</span>
                                                            {item.cnae_description && <CopyButton text={item.cnae_description} className="opacity-0 group-hover/copy:opacity-100" />}
                                                        </div>
                                                    </td>
                                                    {!readOnly && (
                                                        <td className="px-4 py-3 text-right flex justify-end items-center gap-2">
                                                            <button onClick={() => { setTempActivity(item); setEditingIndex(index); }} className="text-slate-400 hover:text-indigo-500 transition-colors">
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button onClick={() => handleRemoveItem(setActivities, activities, index, 'client_activities')} className="text-slate-400 hover:text-red-500 transition-colors">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    )}
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
                            {!readOnly && (
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
                                    <div className="lg:col-span-4 flex justify-end gap-2">
                                        {editingIndex !== null && (
                                            <Button size="sm" variant="secondary" onClick={() => { setEditingIndex(null); setTempAccess({}); }}>Cancelar</Button>
                                        )}
                                        <Button size="sm" icon={editingIndex !== null ? <Save size={16} /> : <Plus size={16} />} onClick={handleAddAccess}>
                                            {editingIndex !== null ? 'Salvar Edição' : 'Adicionar Acesso'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {accesses.length > 0 ? (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Acesso</th>
                                                <th className="px-4 py-3">Usuário</th>
                                                <th className="px-4 py-3">Senha</th>
                                                <th className="px-4 py-3">Link</th>
                                                {!readOnly && <th className="px-4 py-3 text-right">Ações</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {accesses.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.access_name}</span>
                                                            <CopyButton text={item.access_name || ''} className="opacity-0 group-hover/copy:opacity-100" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.username}</span>
                                                            {item.username && <CopyButton text={item.username} className="opacity-0 group-hover/copy:opacity-100" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.password}</span>
                                                            {item.password && <CopyButton text={item.password} className="opacity-0 group-hover/copy:opacity-100" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {item.access_url && (
                                                            <a href={item.access_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                                Link <ExternalLink size={12} />
                                                            </a>
                                                        )}
                                                    </td>
                                                    {!readOnly && (
                                                        <td className="px-4 py-3 text-right flex justify-end items-center gap-2">
                                                            <button onClick={() => { setTempAccess(item); setEditingIndex(index); }} className="text-slate-400 hover:text-indigo-500 transition-colors">
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button onClick={() => handleRemoveItem(setAccesses, accesses, index, 'client_accesses')} className="text-slate-400 hover:text-red-500 transition-colors">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    )}
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
                            {!readOnly && (
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
                                    <div className="lg:col-span-4 flex justify-end gap-2">
                                        {editingIndex !== null && (
                                            <Button size="sm" variant="secondary" onClick={() => { setEditingIndex(null); setTempCertificate({ model: 'ecnpj_a1', signatory: 'propria', expires_at: '', password: '' }); }}>Cancelar</Button>
                                        )}
                                        <Button size="sm" icon={editingIndex !== null ? <Save size={16} /> : <Plus size={16} />} onClick={handleAddCertificate}>
                                            {editingIndex !== null ? 'Salvar Edição' : 'Adicionar Certificado'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {certificates.length > 0 ? (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Modelo</th>
                                                <th className="px-4 py-3">Validade</th>
                                                <th className="px-4 py-3">Senha</th>
                                                <th className="px-4 py-3">Signatário</th>
                                                {!readOnly && <th className="px-4 py-3 text-right">Ações</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {certificates.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                        {item.model === 'ecnpj_a1' ? 'eCNPJ - A1' : item.model === 'ecnpj_a3' ? 'eCNPJ - A3' : item.model === 'ecpf_a1' ? 'eCPF - A1' : 'eCPF - A3'}
                                                    </td>
                                                    <td className="px-4 py-3">{item.expiration_date || item.expires_at}</td>
                                                    <td className="px-4 py-3 font-mono text-xs">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.password}</span>
                                                            {item.password && <CopyButton text={item.password} className="opacity-0 group-hover/copy:opacity-100" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {item.signatory === 'propria' ? 'Própria Empresa' : item.signatory === 'socio' ? 'Sócio Administrador' : 'Procurador'}
                                                    </td>
                                                    {!readOnly && (
                                                        <td className="px-4 py-3 text-right flex justify-end items-center gap-2">
                                                            <button onClick={() => { setTempCertificate({ ...item, expiration_date: item.expiration_date || item.expires_at }); setEditingIndex(index); }} className="text-slate-400 hover:text-indigo-500 transition-colors">
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button onClick={() => handleRemoveItem(setCertificates, certificates, index, 'client_certificates')} className="text-slate-400 hover:text-red-500 transition-colors">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    )}
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
                            {!readOnly && (
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
                                    <div className="lg:col-span-4 flex justify-end gap-2">
                                        {editingIndex !== null && (
                                            <Button size="sm" variant="secondary" onClick={() => { setEditingIndex(null); setTempLicense({}); }}>Cancelar</Button>
                                        )}
                                        <Button size="sm" icon={editingIndex !== null ? <Save size={16} /> : <Plus size={16} />} onClick={handleAddLicense}>
                                            {editingIndex !== null ? 'Salvar Edição' : 'Adicionar Licença'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {licenses.length > 0 ? (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Licença</th>
                                                <th className="px-4 py-3">Número</th>
                                                <th className="px-4 py-3">Validade</th>
                                                <th className="px-4 py-3">Link</th>
                                                {!readOnly && <th className="px-4 py-3 text-right">Ações</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {licenses.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.license_name}</span>
                                                            <CopyButton text={item.license_name || ''} className="opacity-0 group-hover/copy:opacity-100" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.number || item.license_number}</span>
                                                            {(item.number || item.license_number) && <CopyButton text={(item.number || item.license_number) as string} className="opacity-0 group-hover/copy:opacity-100" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">{item.expiration_date || item.expiry_date}</td>
                                                    <td className="px-4 py-3">
                                                        {item.access_url && (
                                                            <a href={item.access_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                                Link <ExternalLink size={12} />
                                                            </a>
                                                        )}
                                                    </td>
                                                    {!readOnly && (
                                                        <td className="px-4 py-3 text-right flex justify-end items-center gap-2">
                                                            <button onClick={() => { setTempLicense({ ...item, expiration_date: item.expiration_date || item.expiry_date, number: item.number || item.license_number }); setEditingIndex(index); }} className="text-slate-400 hover:text-indigo-500 transition-colors">
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button onClick={() => handleRemoveItem(setLicenses, licenses, index, 'client_licenses')} className="text-slate-400 hover:text-red-500 transition-colors">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    )}
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
                            {!readOnly && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                                    <div className="md:col-span-2">
                                        <Input
                                            label="Descrição da Legislação"
                                            placeholder="Ex: Lei 12.345..."
                                            value={tempLegislation.description}
                                            onChange={e => setTempLegislation({ ...tempLegislation, description: e.target.value })}
                                        />
                                    </div>
                                    <Select
                                        label="Status"
                                        value={tempLegislation.status}
                                        onChange={e => setTempLegislation({ ...tempLegislation, status: e.target.value })}
                                        options={[
                                            { value: 'vigente', label: 'Vigente' },
                                            { value: 'revogada', label: 'Revogada' },
                                            { value: 'suspensa', label: 'Suspensa' },
                                        ]}
                                    />
                                    <Input
                                        label="Link de Referência"
                                        placeholder="https://"
                                        value={tempLegislation.access_url}
                                        onChange={e => setTempLegislation({ ...tempLegislation, access_url: e.target.value })}
                                    />
                                    <div className="lg:col-span-4 flex justify-end gap-2">
                                        {editingIndex !== null && (
                                            <Button size="sm" variant="secondary" onClick={() => { setEditingIndex(null); setTempLegislation({ status: 'vigente', description: '', access_url: '' }); }}>Cancelar</Button>
                                        )}
                                        <Button size="sm" icon={editingIndex !== null ? <Save size={16} /> : <Plus size={16} />} onClick={handleAddLegislation}>
                                            {editingIndex !== null ? 'Salvar Edição' : 'Adicionar Legislação'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {legislations.length > 0 ? (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Descrição</th>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3">Link</th>
                                                {!readOnly && <th className="px-4 py-3 text-right">Ações</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {legislations.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.description}</span>
                                                            <CopyButton text={item.description || ''} className="opacity-0 group-hover/copy:opacity-100" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${item.status === 'vigente' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                                                            {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {item.access_url && (
                                                            <a href={item.access_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                                Link <ExternalLink size={12} />
                                                            </a>
                                                        )}
                                                    </td>
                                                    {!readOnly && (
                                                        <td className="px-4 py-3 text-right flex justify-end items-center gap-2">
                                                            <button onClick={() => { setTempLegislation(item); setEditingIndex(index); }} className="text-slate-400 hover:text-indigo-500 transition-colors">
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button onClick={() => handleRemoveItem(setLegislations, legislations, index, 'client_legislations')} className="text-slate-400 hover:text-red-500 transition-colors">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    )}
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
