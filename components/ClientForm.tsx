import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Users,
    UserCheck,
    Calendar,
    Pencil,
    AlertCircle,
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
    CopyPlus,
    Phone,
    Search,
    Landmark,
    Key,
    Shield,
    FileCheck,
    BookOpen,
    Receipt,
    Star,
    ChevronDown
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input, Select, GroupedSelect, CopyButton, Textarea } from './ui/Input';
import { Modal } from './ui/Modal';
import { Tooltip } from './ui/Tooltip';
import { Notification, NotificationType } from './ui/Notification';
import { Client, Sector, TAX_REGIME_GROUPS, TAX_REGIME_LABELS } from '../types';
import { supabase } from '../utils/supabaseClient';
import { toTitleCase } from '../utils/stringUtils';
import { readA1Certificate, ExtractedCertificateData } from '../utils/certificateUtils';

// --- Interface for Segments ---
interface ClientSegment { id: string; name: string; description?: string; category?: string; }

// --- Interfaces for Sub-Tables ---
interface ClientInscription { id?: string; client_id?: string; type: string; custom_name?: string; number: string; observation?: string; }
interface ClientContact { id?: string; client_id?: string; name: string; email?: string; phone_fixed?: string; phone_mobile?: string; is_main?: boolean; }
interface ClientTaxRegime { id?: string; client_id?: string; start_date?: string; end_date?: string; regime: string; observation?: string; }
interface ClientActivity { id?: string; client_id?: string; order_type: string; cnae_code: string; cnae_description?: string; }
interface ClientAccess { id?: string; client_id?: string; access_name: string; username?: string; password?: string; access_url?: string; sector?: string; }
interface ClientCertificate { id?: string; client_id?: string; model: string; expires_at?: string; password?: string; signatory?: string; expiration_date?: string; }
interface ClientLicense { id?: string; client_id?: string; license_name: string; license_number?: string; expiry_date?: string; access_url?: string; number?: string; expiration_date?: string; }
interface ClientLegislation { id?: string; client_id?: string; description: string; status?: string; access_url?: string; }
interface ClientDfeSeries { id?: string; client_id?: string; dfe_type: string; series: string; issuer?: string; username?: string; password?: string; login_url?: string; }

type ClientTable =
    | 'client_inscriptions'
    | 'client_contacts'
    | 'client_tax_regime_history'
    | 'client_activities'
    | 'client_accesses'
    | 'client_certificates'
    | 'client_licenses'
    | 'client_legislations'
    | 'client_dfe_series';

export const ClientForm: React.FC<{ onBack: () => void; initialData?: Client | null; isViewOnly?: boolean; userProfile: any }> = ({ onBack, initialData, isViewOnly = false, userProfile }) => {
    const isEditing = !!initialData;
    const [readOnly, setReadOnly] = useState(isViewOnly);
    const [loading, setLoading] = useState(false);
    const [personType, setPersonType] = useState(initialData?.person_type || 'juridica');
    const [activeTab, setActiveTab] = useState('inscricoes');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false);
    const [certFile, setCertFile] = useState<File | null>(null);
    const [extractingCert, setExtractingCert] = useState(false);
    const [extractedCertData, setExtractedCertData] = useState<ExtractedCertificateData | null>(null);
    const [isCertModalOpen, setIsCertModalOpen] = useState(false);
    const [certError, setCertError] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ show: boolean; message: string; type: NotificationType }>({
        show: false,
        message: '',
        type: 'info'
    });

    const showNotify = (message: string, type: NotificationType = 'info') => {
        setNotification({ show: true, message, type });
    };

    // Main Client Data State
    const [formData, setFormData] = useState({
        code: initialData?.code || '',
        companyName: initialData?.companyName || '',
        tradeName: initialData?.tradeName || '',
        document: initialData?.document || '',
        status: (initialData?.status as 'Ativo' | 'Inativo') || 'Ativo',
        segment: initialData?.segment || '',
        admin_partner_name: initialData?.admin_partner_name || '',
        admin_partner_cpf: initialData?.admin_partner_cpf || '',
        admin_partner_birthdate: initialData?.admin_partner_birthdate || '',
        constitution_date: initialData?.constitution_date || '',
        entry_date: initialData?.entry_date || '',
        exit_date: initialData?.exit_date || '',
        establishment_type: (initialData as any)?.establishment_type || 'matriz',
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
    const [dfeSeries, setDfeSeries] = useState<ClientDfeSeries[]>([]);
    const [sectorsList, setSectorsList] = useState<Sector[]>([]);
    const [segments, setSegments] = useState<ClientSegment[]>([]);
    const [segmentOpen, setSegmentOpen] = useState(false);
    const [segmentSearch, setSegmentSearch] = useState('');
    const segmentDropdownRef = useRef<HTMLDivElement>(null);
    const segmentButtonRef = useRef<HTMLButtonElement>(null);
    const [segmentPos, setSegmentPos] = useState({ top: 0, left: 0, width: 0 });

    // --- Temporary Input State for Tabs ---
    const [tempInscription, setTempInscription] = useState<Partial<ClientInscription>>({ type: 'Municipal' });
    const [tempContact, setTempContact] = useState<Partial<ClientContact>>({});
    const [tempRegime, setTempRegime] = useState<Partial<ClientTaxRegime>>({ regime: 'simples' });
    const [tempActivity, setTempActivity] = useState<Partial<ClientActivity>>({ order_type: 'principal' });
    const [tempAccess, setTempAccess] = useState<Partial<ClientAccess>>({ sector: '' });
    const [tempCertificate, setTempCertificate] = useState<Partial<ClientCertificate>>({ model: 'ecnpj_a1', signatory: 'propria' });
    const [tempLicense, setTempLicense] = useState<Partial<ClientLicense>>({});
    const [tempLegislation, setTempLegislation] = useState<Partial<ClientLegislation>>({ status: 'vigente' });
    const [tempDfeSerie, setTempDfeSerie] = useState<Partial<ClientDfeSeries>>({ dfe_type: 'NF-e' });

    const [otherInscriptionType, setOtherInscriptionType] = useState(false);
    const [isFormExpanded, setIsFormExpanded] = useState(false);

    // Reset form expansion when changing tabs
    useEffect(() => {
        setIsFormExpanded(false);
    }, [activeTab]);

    // --- Load Sub-Data on Edit or Fetch Next Code on Create ---
    useEffect(() => {
        const fetchSectors = async () => {
            if (!userProfile?.org_id) return;
            const { data } = await supabase.from('sectors').select('*').eq('org_id', userProfile.org_id).order('name');
            if (data) {
                const formatted = data.map((s: any) => ({ ...s, costCenter: s.cost_center }));
                setSectorsList(formatted as Sector[]);
            }
        };
        fetchSectors();

        const fetchSegments = async () => {
            const { data } = await (supabase.from('client_segments') as any)
                .select('id, name, category')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (data) setSegments(data as unknown as ClientSegment[]);
        };
        fetchSegments();

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

                    const { data: dfe } = await supabase.from('client_dfe_series').select('*').eq('client_id', initialData.id);
                    if (dfe) setDfeSeries(dfe);
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

    // --- Click-outside e scroll para fechar dropdown de segmento ---
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                segmentDropdownRef.current && !segmentDropdownRef.current.contains(e.target as Node) &&
                segmentButtonRef.current && !segmentButtonRef.current.contains(e.target as Node)
            ) {
                setSegmentOpen(false);
                setSegmentSearch('');
            }
        };
        const onScroll = (e: Event) => {
            // Ignora scroll que ocorre dentro do próprio painel do dropdown
            if (segmentDropdownRef.current && segmentDropdownRef.current.contains(e.target as Node)) return;
            setSegmentOpen(false);
            setSegmentSearch('');
        };
        document.addEventListener('mousedown', handler);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            document.removeEventListener('mousedown', handler);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, []);

    // --- External API Search ---
    const handleSearchCNPJ = async () => {
        if (personType !== 'juridica' || !formData.document) return;
        
        // Remove tudo que não for número
        const cnpj = formData.document.replace(/\D/g, '');
        if (cnpj.length !== 14) {
            showNotify('Por favor, informe um CNPJ válido contendo 14 dígitos.', 'error');
            return;
        }

        try {
            setIsSearchingCNPJ(true);
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('CNPJ não encontrado.');
                }
                throw new Error('Erro ao buscar CNPJ.');
            }
            
            const data = await response.json();
            
            // Formatando o CEP se vier sem hífen
            const returnedCep = data.cep ? data.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2') : formData.cep;
            
            setFormData(prev => ({
                ...prev,
                companyName: toTitleCase(data.razao_social) || prev.companyName,
                tradeName: toTitleCase(data.nome_fantasia || data.razao_social) || prev.tradeName,
                cep: returnedCep,
                street: toTitleCase(data.logradouro) || prev.street,
                number: data.numero || prev.number,
                complement: toTitleCase(data.complemento) || prev.complement,
                neighborhood: toTitleCase(data.bairro) || prev.neighborhood,
                city: toTitleCase(data.municipio) || prev.city,
                state: data.uf || prev.state,
                constitution_date: data.data_inicio_atividade || prev.constitution_date
            }));

        } catch (error: any) {
            showNotify(error.message || 'Erro ao conectar-se à BrasilAPI.', 'error');
        } finally {
            setIsSearchingCNPJ(false);
        }
    };

    // --- Handlers ---
    const handleAddInscription = () => {
        if (!tempInscription.number) return showNotify('Preencha o número da inscrição', 'warning');
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
        if (!tempContact.name) return showNotify('Preencha o nome do contato', 'warning');
        let newContact = { ...tempContact } as ClientContact;

        if (contacts.length === 0 && editingIndex === null) {
            newContact.is_main = true;
        }

        if (editingIndex !== null) {
            const newList = [...contacts];
            newList[editingIndex] = { ...newList[editingIndex], ...newContact } as ClientContact;
            setContacts(newList);
            setEditingIndex(null);
        } else {
            setContacts([...contacts, newContact]);
        }
        setTempContact({});
    };

    const handleToggleMainContact = (index: number) => {
        if (readOnly) return;
        const newList = contacts.map((c, i) => ({
            ...c,
            is_main: i === index ? !c.is_main : false
        }));
        setContacts(newList);
    };
    const handleAddRegime = () => {
        if (!tempRegime.regime) return showNotify('Selecione um regime', 'warning');
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
        if (!tempActivity.cnae_code) return showNotify('Preencha o código CNAE', 'warning');
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
        if (!tempAccess.access_name) return showNotify('Preencha o nome do acesso', 'warning');
        if (editingIndex !== null) {
            const newList = [...accesses];
            newList[editingIndex] = { ...newList[editingIndex], ...tempAccess } as ClientAccess;
            setAccesses(newList);
            setEditingIndex(null);
        } else {
            setAccesses([...accesses, tempAccess as ClientAccess]);
        }
        setTempAccess({ sector: '' });
    };
    const handleAddCertificate = () => {
        if (!tempCertificate.model) return showNotify('Selecione o modelo', 'warning');
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

    const handleExtractCertificate = async () => {
        if (!certFile) return setCertError("Selecione um arquivo de certificado (.pfx ou .p12).");
        if (!tempCertificate.password) return setCertError("Informe a senha do certificado para extrair os dados.");

        try {
            setExtractingCert(true);
            const data = await readA1Certificate(certFile, tempCertificate.password);
            
            const validToDate = new Date(data.validTo).toISOString().split('T')[0];

            setTempCertificate(prev => ({
                ...prev,
                model: 'ecnpj_a1',
                expiration_date: validToDate
            }));

            setExtractedCertData(data);
            setIsCertModalOpen(true);
            
            setCertFile(null); 
            const fileInput = document.getElementById('certFileInput') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

        } catch (error: any) {
            setCertError(error.message);
        } finally {
            setExtractingCert(false);
        }
    };

    const handleAddLicense = () => {
        if (!tempLicense.license_name) return showNotify('Preencha o nome da licença', 'warning');
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
        if (!tempLegislation.description) return showNotify('Preencha a descrição', 'warning');
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

    const handleAddDfeSerie = () => {
        if (!tempDfeSerie.dfe_type || !tempDfeSerie.series) return showNotify('Preencha o tipo e a série do DF-e', 'warning');
        if (dfeSeries.length >= 15 && editingIndex === null) return showNotify('Limite máximo de 15 registros de Séries DF-e atingido.', 'warning');
        if (editingIndex !== null) {
            const newList = [...dfeSeries];
            newList[editingIndex] = { ...newList[editingIndex], ...tempDfeSerie } as ClientDfeSeries;
            setDfeSeries(newList);
            setEditingIndex(null);
        } else {
            setDfeSeries([...dfeSeries, tempDfeSerie as ClientDfeSeries]);
        }
        setTempDfeSerie({ dfe_type: 'NF-e', series: '', issuer: '', username: '', password: '', login_url: '' });
    };

    const handleRemoveItem = async (listSetter: any, list: any[], index: number, table: ClientTable) => {
        const item = list[index];
        if (item.id) {
            if (confirm('Deseja realmente excluir este item? Esta ação não pode ser desfeita.')) {
                const { error } = await supabase.from(table).delete().eq('id', item.id);
                if (error) {
                    showNotify('Erro ao excluir item: ' + error.message, 'error');
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
                establishment_type: formData.establishment_type,
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

            const processItems = async (table: ClientTable, items: any[], prepareFn: (i: any) => any) => {
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
            await processItems('client_tax_regime_history', taxRegimes, i => ({ 
                ...i, 
                client_id: clientId,
                start_date: i.start_date || null,
                end_date: i.end_date || null
            }));
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
            await processItems('client_dfe_series', dfeSeries, i => ({ ...i, client_id: clientId }));

            showNotify('Cliente salvo com sucesso!', 'success');
            setTimeout(onBack, 1500);
        } catch (error: any) {
            console.error('Error saving client:', error);
            showNotify('Erro ao salvar cliente: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const getDocumentLabel = () => {
        if (personType === 'fisica') return 'CPF';
        if (personType === 'juridica') return 'CNPJ';
        return 'Estrangeiro';
    };

    const formatDocument = (v: string, type: string) => {
        if (!v) return '';
        if (type === 'fisica') {
            v = v.replace(/\D/g, "");
            if (v.length > 11) v = v.substring(0, 11);
            if (v.length <= 3) return v;
            if (v.length <= 6) return `${v.substring(0, 3)}.${v.substring(3)}`;
            if (v.length <= 9) return `${v.substring(0, 3)}.${v.substring(3, 6)}.${v.substring(6)}`;
            return `${v.substring(0, 3)}.${v.substring(3, 6)}.${v.substring(6, 9)}-${v.substring(9)}`;
        }
        if (type === 'juridica') {
            // Nova regra Receita Federal (CNPJ Alfanumérico): Permite Letras e Números (A-Z, 0-9)
            v = v.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
            if (v.length > 14) v = v.substring(0, 14);
            if (v.length <= 2) return v;
            if (v.length <= 5) return `${v.substring(0, 2)}.${v.substring(2)}`;
            if (v.length <= 8) return `${v.substring(0, 2)}.${v.substring(2, 5)}.${v.substring(5)}`;
            if (v.length <= 12) return `${v.substring(0, 2)}.${v.substring(2, 5)}.${v.substring(5, 8)}/${v.substring(8)}`;
            return `${v.substring(0, 2)}.${v.substring(2, 5)}.${v.substring(5, 8)}/${v.substring(8, 12)}-${v.substring(12)}`;
        }
        return v; // Estrangeiro
    };

    const formatPhone = (v: string, type: 'fixed' | 'mobile') => {
        if (!v) return '';
        v = v.replace(/\D/g, "");
        if (type === 'fixed') {
            if (v.length > 10) v = v.substring(0, 10);
            if (v.length <= 2) return v;
            if (v.length <= 6) return `(${v.substring(0, 2)}) ${v.substring(2)}`;
            return `(${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
        } else {
            if (v.length > 11) v = v.substring(0, 11);
            if (v.length <= 2) return v;
            if (v.length <= 7) return `(${v.substring(0, 2)}) ${v.substring(2)}`;
            return `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
        }
    };

    const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatDocument(e.target.value, personType);
        setFormData({ ...formData, document: formatted });
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
        { id: 'dfe', label: 'Séries DF-e' },
    ];

    // Agrupa segmentos por categoria preservando a ordem dos sort_order
    const groupedSegments = segments.reduce((acc, seg) => {
        const cat = seg.category || 'Outros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(seg);
        return acc;
    }, {} as Record<string, ClientSegment[]>);

    // Filtra segmentos com base na busca
    const filteredGroupedSegments = segmentSearch.trim()
        ? Object.entries(groupedSegments).reduce((acc, [cat, segs]) => {
            const q = segmentSearch.toLowerCase();
            const matching = segs.filter(s =>
                s.name.toLowerCase().includes(q) || cat.toLowerCase().includes(q)
            );
            if (matching.length > 0) acc[cat] = matching;
            return acc;
          }, {} as Record<string, ClientSegment[]>)
        : groupedSegments;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 shrink-0">
                <div className="flex items-center gap-3 mb-2 md:mb-0">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
                        <CopyPlus size={18} className="text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                            {readOnly ? `Visualizando Cliente` : isEditing ? `Editar Cliente` : 'Cadastro de Clientes'}
                        </h1>
                        <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
                        {(readOnly || isEditing) && (formData.tradeName || formData.companyName) && (
                            <span className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tight">
                                {formData.tradeName || formData.companyName}
                            </span>
                        )}
                    </div>
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
            <Card title="Dados Iniciais" titleClassName="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]" collapsible>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-2">
                        <Input
                            label="Código"
                            placeholder="000000"
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                            disabled={readOnly}
                        />
                    </div>
                    <div className="md:col-span-2">
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
                    </div>
                    <div className="flex items-end gap-2 md:col-span-4">
                        <Input
                            label={getDocumentLabel()}
                            copyable
                            containerClassName="flex-1"
                            value={formData.document}
                            onChange={handleDocumentChange}
                            disabled={readOnly}
                        />
                        {!readOnly && personType === 'juridica' && (
                                <Tooltip content="Buscar dados na Receita Federal" position="bottom">
                                    <button 
                                        type="button"
                                        onClick={handleSearchCNPJ}
                                        disabled={isSearchingCNPJ}
                                        className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-95"
                                    >
                                        {isSearchingCNPJ ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                                    </button>
                                </Tooltip>
                        )}
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-4">
                        <div className="flex items-center h-5">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Situação</label>
                        </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center h-5">
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Estabelecimento</label>
                            </div>
                            <div className="flex bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700 h-10">
                                <button
                                    type="button"
                                    onClick={() => !readOnly && setFormData({ ...formData, establishment_type: 'matriz' })}
                                    className={`flex-1 flex items-center justify-center gap-2 rounded text-xs font-medium transition-colors ${formData.establishment_type === 'matriz' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'} ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                                    disabled={readOnly}
                                >
                                    <Building2 size={14} /> Matriz
                                </button>
                                <button
                                    type="button"
                                    onClick={() => !readOnly && setFormData({ ...formData, establishment_type: 'filial' })}
                                    className={`flex-1 flex items-center justify-center gap-2 rounded text-xs font-medium transition-colors ${formData.establishment_type === 'filial' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'} ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                                    disabled={readOnly}
                                >
                                    <GitMerge size={14} /> Filial
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5" ref={segmentDropdownRef}>
                            <div className="flex items-center h-5">
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Segmento</label>
                            </div>
                            {/* Trigger button */}
                            <button
                                ref={segmentButtonRef}
                                type="button"
                                disabled={readOnly}
                                onClick={() => {
                                    if (readOnly) return;
                                    if (!segmentOpen && segmentButtonRef.current) {
                                        const r = segmentButtonRef.current.getBoundingClientRect();
                                        setSegmentPos({ top: r.bottom + 6, left: r.left, width: r.width });
                                    }
                                    setSegmentOpen(prev => !prev);
                                }}
                                className={`h-10 w-full flex items-center justify-between gap-2 rounded-lg border px-3 text-sm transition-colors text-left ${
                                    segmentOpen
                                        ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                                        : 'border-slate-200 dark:border-slate-700'
                                } bg-white dark:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed`}
                            >
                                <span className={formData.segment ? 'text-slate-900 dark:text-white truncate' : 'text-slate-400 dark:text-slate-500'}>
                                    {formData.segment || 'Selecione o segmento...'}
                                </span>
                                <ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform duration-200 ${segmentOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {/* Dropdown panel — via Portal para escapar do overflow:hidden do Card */}
                            {segmentOpen && createPortal(
                                <div
                                    ref={segmentDropdownRef}
                                    style={{ position: 'fixed', top: segmentPos.top, left: segmentPos.left, width: segmentPos.width, zIndex: 9999 }}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden"
                                >
                                    {/* Search input */}
                                    <div className="p-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                                        <div className="relative">
                                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Buscar segmento ou categoria..."
                                                value={segmentSearch}
                                                onChange={e => setSegmentSearch(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                    {/* Options list */}
                                    <div className="max-h-64 overflow-y-auto">
                                        {Object.keys(filteredGroupedSegments).length === 0 ? (
                                            <div className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                                                Nenhum segmento encontrado para &quot;{segmentSearch}&quot;
                                            </div>
                                        ) : (
                                            Object.entries(filteredGroupedSegments).map(([cat, segs]) => (
                                                <div key={cat}>
                                                    <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-200 dark:bg-slate-800 sticky top-0">
                                                        {cat}
                                                    </div>
                                                    {segs.map(s => (
                                                        <button
                                                            key={s.id}
                                                            type="button"
                                                            onMouseDown={e => {
                                                                e.preventDefault();
                                                                setFormData(prev => ({ ...prev, segment: s.name }));
                                                                setSegmentOpen(false);
                                                                setSegmentSearch('');
                                                            }}
                                                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                                                formData.segment === s.name
                                                                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium'
                                                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                            }`}
                                                        >
                                                            {s.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>,
                                document.body
                            )}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input type="date" label="Data de Const." value={formData.constitution_date} onChange={e => setFormData({ ...formData, constitution_date: e.target.value })} disabled={readOnly} />
                        <Input type="date" label="Data Entrada" value={formData.entry_date} onChange={e => setFormData({ ...formData, entry_date: e.target.value })} disabled={readOnly} />
                        <Input type="date" label="Data Saída" value={formData.exit_date} onChange={e => setFormData({ ...formData, exit_date: e.target.value })} disabled={readOnly} />
                    </div>
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
            <Card title="Endereço" titleClassName="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]" collapsible>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <Input
                        label="CEP"
                        placeholder="00000-000"
                        copyable
                        containerClassName="md:col-span-2"
                        value={formData.cep}
                        onChange={e => setFormData({ ...formData, cep: e.target.value })}
                        disabled={readOnly}
                    />
                    <Input
                        label="Logradouro"
                        copyable
                        containerClassName="md:col-span-8"
                        value={formData.street}
                        onChange={e => setFormData({ ...formData, street: e.target.value })}
                        disabled={readOnly}
                    />
                    <Input
                        label="Número"
                        copyable
                        containerClassName="md:col-span-2"
                        value={formData.number}
                        onChange={e => setFormData({ ...formData, number: e.target.value })}
                        disabled={readOnly}
                    />

                    <Input
                        label="Complemento"
                        copyable
                        containerClassName="md:col-span-3"
                        value={formData.complement}
                        onChange={e => setFormData({ ...formData, complement: e.target.value })}
                        disabled={readOnly}
                    />
                    <Input
                        label="Bairro"
                        copyable
                        containerClassName="md:col-span-3"
                        value={formData.neighborhood}
                        onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                        disabled={readOnly}
                    />
                    <Input
                        label="Cidade"
                        copyable
                        containerClassName="md:col-span-4"
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        disabled={readOnly}
                    />
                    <Input
                        label="UF"
                        copyable
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
                                    setTempAccess({ sector: '' });
                                    setTempCertificate({ model: 'ecnpj_a1', signatory: 'propria', expires_at: '', password: '' });
                                    setTempLicense({});
                                    setTempLegislation({ status: 'vigente', description: '', access_url: '' });
                                    setOtherInscriptionType(false);
                                }}
                                className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-800/30' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
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
                            <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <FileText className="w-5 h-5 text-indigo-500 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-900 dark:text-white">Inscrições</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Centralize e gerencie as inscrições fiscais da empresa em todas as esferas (Municipal, Estadual, Federal, Conselho de Classe e outros).</p>
                                    </div>
                                </div>
                                {!readOnly && (
                                    <button
                                        onClick={() => setIsFormExpanded(!isFormExpanded)}
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 ${
                                            isFormExpanded 
                                            ? 'bg-zinc-500/80 text-white shadow-[0_0_10px_rgba(113,113,122,0.3)] hover:shadow-[0_0_15px_rgba(113,113,122,0.5)]' 
                                            : 'bg-emerald-500/80 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                        }`}
                                        title={isFormExpanded ? "Recolher Formulário" : "Expandir Formulário"}
                                    >
                                        {isFormExpanded ? <ChevronDown className="rotate-180 transition-transform duration-300" size={18} /> : <Plus size={18} />}
                                    </button>
                                )}
                            </div>
                            {isFormExpanded && !readOnly && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
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
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {inscriptions.map((item, index) => (
                                            <div 
                                                key={index}
                                                className="group relative bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-indigo-500/30 transition-all duration-300 animate-in fade-in zoom-in-95"
                                            >
                                                {/* Header: Tipo e Ações */}
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                                            <Shield size={14} />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                            Inscrição {item.type}
                                                        </span>
                                                    </div>
                                                    {!readOnly && (
                                                        <div className="flex items-center gap-1">
                                                            <button 
                                                                onClick={() => { 
                                                                    setTempInscription(item); 
                                                                    setOtherInscriptionType(!['Municipal', 'Estadual', 'Suframa', 'Nire'].includes(item.type)); 
                                                                    setEditingIndex(index); 
                                                                }} 
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                                                                title="Editar"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleRemoveItem(setInscriptions, inscriptions, index, 'client_inscriptions')} 
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                                title="Remover"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Body: Número */}
                                                <div className="flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100/50 dark:border-slate-700/30 mb-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Número</span>
                                                        <span className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tight">
                                                            {item.number}
                                                        </span>
                                                    </div>
                                                    <CopyButton text={item.number || ''} className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700" />
                                                </div>

                                                {/* Footer: Observação */}
                                                {item.observation && (
                                                    <div className="flex gap-1.5 items-start mt-2 px-1">
                                                        <div className="mt-1 w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight italic">
                                                            {item.observation}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end px-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                                            {inscriptions.length}/15 cadastradas
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-100 dark:border-slate-800/50 rounded-2xl bg-slate-50/30 dark:bg-slate-900/20 text-center animate-in fade-in duration-500">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-3">
                                        <FileText size={24} />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Nenhuma inscrição adicionada</p>
                                    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">Adicione as inscrições municipais, estaduais ou outras para este cliente.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3.4.2 Tabbar ‘Contatos’ */}
                    {activeTab === 'contatos' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <Users className="w-5 h-5 text-indigo-500 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-900 dark:text-white">Contatos</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie os principais contatos da empresa.</p>
                                    </div>
                                </div>
                                {!readOnly && (
                                    <button
                                        onClick={() => setIsFormExpanded(!isFormExpanded)}
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 ${
                                            isFormExpanded 
                                            ? 'bg-zinc-500/80 text-white shadow-[0_0_10px_rgba(113,113,122,0.3)] hover:shadow-[0_0_15px_rgba(113,113,122,0.5)]' 
                                            : 'bg-emerald-500/80 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                        }`}
                                        title={isFormExpanded ? "Recolher Formulário" : "Expandir Formulário"}
                                    >
                                        {isFormExpanded ? <ChevronDown className="rotate-180 transition-transform duration-300" size={18} /> : <Plus size={18} />}
                                    </button>
                                )}
                            </div>
                            {isFormExpanded && !readOnly && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
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
                                        onChange={e => setTempContact({ ...tempContact, phone_fixed: formatPhone(e.target.value, 'fixed') })}
                                    />
                                    <Input
                                        label="Celular"
                                        value={tempContact.phone_mobile}
                                        onChange={e => setTempContact({ ...tempContact, phone_mobile: formatPhone(e.target.value, 'mobile') })}
                                    />
                                    <div className="lg:col-span-4 flex justify-end gap-2 mt-2">
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
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {contacts.map((item, index) => (
                                            <div 
                                                key={index}
                                                className={`group relative bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm border rounded-2xl p-4 shadow-sm transition-all duration-300 animate-in fade-in zoom-in-95 ${item.is_main ? 'border-amber-500/30 ring-1 ring-amber-500/10 shadow-amber-500/5' : 'border-slate-200/60 dark:border-slate-800/60'}`}
                                            >
                                                {/* Header: Avatar, Nome e Ações */}
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 shadow-sm ${item.is_main ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
                                                            {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <h5 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate tracking-tight">
                                                                    {item.name}
                                                                </h5>
                                                                {item.is_main && (
                                                                    <Tooltip content="Contato Principal" position="top">
                                                                        <Star size={12} className="text-amber-500 fill-current" />
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                                                                Contato
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {!readOnly && (
                                                        <div className="flex items-center gap-1">
                                                            <button 
                                                                onClick={() => { setTempContact(item); setEditingIndex(index); }} 
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                                                                title="Editar"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleRemoveItem(setContacts, contacts, index, 'client_contacts')} 
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                                title="Remover"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Body: Dados de Contato */}
                                                <div className="space-y-2 mb-4">
                                                    {item.email && (
                                                        <div className="flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100/50 dark:border-slate-700/30">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <Mail size={12} className="text-slate-400 shrink-0" />
                                                                <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate font-medium">{item.email}</span>
                                                            </div>
                                                            <CopyButton text={item.email} className="h-6 w-6 rounded-md bg-white dark:bg-slate-800 shadow-xs border border-slate-100 dark:border-slate-700" />
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {item.phone_fixed && (
                                                            <div className="flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100/50 dark:border-slate-700/30">
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <Phone size={11} className="text-slate-400 shrink-0" />
                                                                    <span className="text-[10px] text-slate-600 dark:text-slate-300 truncate font-bold">{item.phone_fixed}</span>
                                                                </div>
                                                                <CopyButton text={item.phone_fixed} className="h-6 w-6 rounded-md bg-white dark:bg-slate-800 shadow-xs border border-slate-100 dark:border-slate-700" />
                                                            </div>
                                                        )}
                                                        {item.phone_mobile && (
                                                            <div className="flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100/50 dark:border-slate-700/30">
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <Activity size={11} className="text-slate-400 shrink-0" />
                                                                    <span className="text-[10px] text-slate-600 dark:text-slate-300 truncate font-bold">{item.phone_mobile}</span>
                                                                </div>
                                                                <CopyButton text={item.phone_mobile} className="h-6 w-6 rounded-md bg-white dark:bg-slate-800 shadow-xs border border-slate-100 dark:border-slate-700" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Footer: Toggle Principal */}
                                                {!readOnly && (
                                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
                                                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">ID: {index + 1}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleMainContact(index)}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${item.is_main 
                                                                ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20' 
                                                                : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700 hover:border-amber-400 hover:text-amber-500'
                                                            }`}
                                                        >
                                                            <Star size={11} fill={item.is_main ? "currentColor" : "none"} />
                                                            {item.is_main ? 'Principal' : 'Tornar Principal'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end px-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                                            {contacts.length}/15 cadastrados
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-100 dark:border-slate-800/50 rounded-2xl bg-slate-50/30 dark:bg-slate-900/20 text-center animate-in fade-in duration-500">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-3">
                                        <Users size={24} />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Nenhum contato adicionado</p>
                                    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">Gerencie os principais contatos desta empresa para facilitar a comunicação.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3.4.3 Tabbar ‘Regime Tributário’ */}
                    {activeTab === 'regime' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <Landmark className="w-5 h-5 text-indigo-500 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-900 dark:text-white">Regime Tributário</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Controle e monitore o histórico de enquadramentos tributários e garanta a conformidade fiscal ao longo dos anos.</p>
                                    </div>
                                </div>
                                {!readOnly && (
                                    <button
                                        onClick={() => setIsFormExpanded(!isFormExpanded)}
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 ${
                                            isFormExpanded 
                                            ? 'bg-zinc-500/80 text-white shadow-[0_0_10px_rgba(113,113,122,0.3)] hover:shadow-[0_0_15px_rgba(113,113,122,0.5)]' 
                                            : 'bg-emerald-500/80 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                        }`}
                                        title={isFormExpanded ? "Recolher Formulário" : "Expandir Formulário"}
                                    >
                                        {isFormExpanded ? <ChevronDown className="rotate-180 transition-transform duration-300" size={18} /> : <Plus size={18} />}
                                    </button>
                                )}
                            </div>
                            {isFormExpanded && !readOnly && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
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
                                    <GroupedSelect
                                        label="Regime Tributário"
                                        value={tempRegime.regime}
                                        onChange={value => setTempRegime({ ...tempRegime, regime: value })}
                                        groups={TAX_REGIME_GROUPS}
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
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {taxRegimes.map((item, index) => (
                                            <div 
                                                key={index}
                                                className="group relative bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in zoom-in-95"
                                            >
                                                {/* Header: Regime e Ações */}
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-indigo-100 dark:border-indigo-800/50 self-start">
                                                            {TAX_REGIME_LABELS[item.regime] || item.regime}
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                                            Regime Tributário
                                                        </span>
                                                    </div>
                                                    {!readOnly && (
                                                        <div className="flex items-center gap-1">
                                                            <button 
                                                                onClick={() => { setTempRegime(item); setEditingIndex(index); }} 
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                                                                title="Editar"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleRemoveItem(setTaxRegimes, taxRegimes, index, 'client_tax_regime_history')} 
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                                title="Remover"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Body: Vigência (Timeline) */}
                                                <div className="flex items-center gap-4 bg-slate-50/50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100/50 dark:border-slate-700/30 mb-3">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20" />
                                                        <div className="w-0.5 h-4 bg-slate-200 dark:bg-slate-700 rounded-full" />
                                                        <div className={`w-2 h-2 rounded-full shadow-sm ${item.end_date ? 'bg-red-400 shadow-red-500/20' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                                    </div>
                                                    <div className="flex flex-col gap-3 flex-1">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Início em</span>
                                                            <span className="text-xs font-black text-slate-700 dark:text-slate-200">{item.start_date || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Saída em</span>
                                                            <span className={`text-xs font-black ${item.end_date ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 italic font-medium'}`}>
                                                                {item.end_date || 'Vigente'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                                                        <Calendar size={16} className="text-slate-400" />
                                                    </div>
                                                </div>

                                                {/* Footer: Observação */}
                                                {item.observation && (
                                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50">
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight italic line-clamp-2">
                                                            "{item.observation}"
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end px-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                                            {taxRegimes.length}/15 cadastradas
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-100 dark:border-slate-800/50 rounded-2xl bg-slate-50/30 dark:bg-slate-900/20 text-center animate-in fade-in duration-500">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-3">
                                        <Landmark size={24} />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Nenhum histórico de regime</p>
                                    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">Mantenha o histórico de enquadramentos tributários atualizado para fins de conformidade.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3.4.4 Tabbar ‘Atividades’ */}
                    {activeTab === 'atividades' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <Activity className="w-5 h-5 text-indigo-500 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-900 dark:text-white">Atividades</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Registre as atividades econômicas (CNAE principal e secundárias).</p>
                                    </div>
                                </div>
                                {!readOnly && (
                                    <button
                                        onClick={() => setIsFormExpanded(!isFormExpanded)}
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 ${
                                            isFormExpanded 
                                            ? 'bg-zinc-500/80 text-white shadow-[0_0_10px_rgba(113,113,122,0.3)] hover:shadow-[0_0_15px_rgba(113,113,122,0.5)]' 
                                            : 'bg-emerald-500/80 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                        }`}
                                        title={isFormExpanded ? "Recolher Formulário" : "Expandir Formulário"}
                                    >
                                        {isFormExpanded ? <ChevronDown className="rotate-180 transition-transform duration-300" size={18} /> : <Plus size={18} />}
                                    </button>
                                )}
                            </div>
                            {isFormExpanded && !readOnly && (
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
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
                                        placeholder="6920-6/01"
                                        containerClassName="md:col-span-2"
                                        value={tempActivity.cnae_code}
                                        onChange={e => {
                                            let v = e.target.value.replace(/\D/g, "");
                                            if (v.length > 7) v = v.substring(0, 7);
                                            if (v.length > 5) v = `${v.substring(0, 4)}-${v.substring(4, 5)}/${v.substring(5)}`;
                                            else if (v.length > 4) v = `${v.substring(0, 4)}-${v.substring(4)}`;
                                            setTempActivity({ ...tempActivity, cnae_code: v });
                                        }}
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
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {[...activities].sort((a, b) => a.order_type === 'principal' ? -1 : 1).map((item) => {
                                            const originalIndex = activities.findIndex(a => a === item);
                                            return (
                                                <div 
                                                    key={originalIndex}
                                                    className={`group relative bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in zoom-in-95 ${item.order_type === 'principal' ? 'border-indigo-500/30 ring-1 ring-indigo-500/10 shadow-indigo-500/5' : 'border-slate-200/60 dark:border-slate-800/60'}`}
                                                >
                                                    {/* Header: Tipo e Ações */}
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex flex-col gap-1">
                                                            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border self-start ${item.order_type === 'principal' 
                                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/50' 
                                                                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700'}`}
                                                            >
                                                                {item.order_type === 'principal' ? 'Atividade Principal' : 'Atividade Secundária'}
                                                            </div>
                                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                                                CNAE
                                                            </span>
                                                        </div>
                                                        {!readOnly && (
                                                            <div className="flex items-center gap-1">
                                                                <button 
                                                                    onClick={() => { setTempActivity(item); setEditingIndex(originalIndex); }} 
                                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                                                                    title="Editar"
                                                                >
                                                                    <Pencil size={14} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleRemoveItem(setActivities, activities, originalIndex, 'client_activities')} 
                                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                                    title="Remover"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Body: CNAE Code + Description (Combined Copy) */}
                                                    <div className="flex items-start justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100/50 dark:border-slate-700/30">
                                                        <div className="flex flex-col gap-1 min-w-0">
                                                            <span className="text-sm font-black text-slate-800 dark:text-slate-200 font-mono tracking-wider">
                                                                {item.cnae_code}
                                                            </span>
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight font-medium line-clamp-3">
                                                                {item.cnae_description || 'Sem descrição'}
                                                            </p>
                                                        </div>
                                                        <CopyButton 
                                                            text={`${item.cnae_code}${item.cnae_description ? '\n' + item.cnae_description : ''}`} 
                                                            className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 shrink-0 mt-0.5" 
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-end px-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                                            {activities.length}/15 cadastradas
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-100 dark:border-slate-800/50 rounded-2xl bg-slate-50/30 dark:bg-slate-900/20 text-center animate-in fade-in duration-500">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-3">
                                        <Activity size={24} />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Nenhuma atividade adicionada</p>
                                    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">Adicione os códigos CNAE principal e secundários deste cliente.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3.4.5 Tabbar ‘Acessos’ */}
                    {activeTab === 'acessos' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <Key className="w-5 h-5 text-indigo-500 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-900 dark:text-white">Acessos</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Centralize os acessos dos principais portais, como: empregador web, sistemas de gestão, portais de serviços do contribuinte e muito mais.</p>
                                    </div>
                                </div>
                                {!readOnly && (
                                    <button
                                        onClick={() => setIsFormExpanded(!isFormExpanded)}
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 ${
                                            isFormExpanded 
                                            ? 'bg-zinc-500/80 text-white shadow-[0_0_10px_rgba(113,113,122,0.3)] hover:shadow-[0_0_15px_rgba(113,113,122,0.5)]' 
                                            : 'bg-emerald-500/80 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                        }`}
                                        title={isFormExpanded ? "Recolher Formulário" : "Expandir Formulário"}
                                    >
                                        {isFormExpanded ? <ChevronDown className="rotate-180 transition-transform duration-300" size={18} /> : <Plus size={18} />}
                                    </button>
                                )}
                            </div>
                            {isFormExpanded && !readOnly && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <Input
                                        label="Nome do Acesso"
                                        placeholder="Simples, NFS-e..."
                                        containerClassName="lg:col-span-1"
                                        value={tempAccess.access_name}
                                        onChange={e => setTempAccess({ ...tempAccess, access_name: e.target.value })}
                                    />
                                    <Select
                                        label="Setor do Acesso"
                                        value={tempAccess.sector || ''}
                                        onChange={e => setTempAccess({ ...tempAccess, sector: e.target.value })}
                                        options={[
                                            { value: '', label: 'Sem Setor' },
                                            ...sectorsList.map(s => ({ value: s.name, label: s.name }))
                                        ]}
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
                                        <div className="flex items-center h-5">
                                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Link de Acesso</label>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                className="w-full h-10 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 underline"
                                                placeholder="https://"
                                                value={tempAccess.access_url}
                                                onChange={e => setTempAccess({ ...tempAccess, access_url: e.target.value })}
                                            />
                                            <button className="group/tooltip relative p-2 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                                <ExternalLink size={16} className="text-slate-500 dark:text-slate-400" />
                                                <div className="absolute top-full right-0 mt-2 hidden group-hover/tooltip:block w-max px-2 py-1 bg-slate-900 dark:bg-slate-800 text-white text-[10px] rounded shadow-lg z50 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                                                    Abrir Link
                                                    <div className="absolute bottom-full right-2 border-[3px] border-transparent border-b-slate-900 dark:border-b-slate-800" />
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="lg:col-span-5 flex justify-end gap-2 mt-2">
                                        {editingIndex !== null && (
                                            <Button size="sm" variant="secondary" onClick={() => { setEditingIndex(null); setTempAccess({ sector: '' }); }}>Cancelar</Button>
                                        )}
                                        <Button size="sm" icon={editingIndex !== null ? <Save size={16} /> : <Plus size={16} />} onClick={handleAddAccess}>
                                            {editingIndex !== null ? 'Salvar Edição' : 'Adicionar Acesso'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {accesses.length > 0 ? (
                                <div className="space-y-4 mt-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {accesses.map((item, index) => (
                                            <div 
                                                key={index}
                                                className="group relative bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in zoom-in-95"
                                            >
                                                {/* Header: Nome e Ações */}
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex flex-col gap-1 min-w-0">
                                                        <h5 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate tracking-tight">
                                                            {item.access_name}
                                                        </h5>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                                                                Credencial de Acesso
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {!readOnly && (
                                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                                            <button 
                                                                onClick={() => { setTempAccess(item); setEditingIndex(index); }} 
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                                                                title="Editar"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleRemoveItem(setAccesses, accesses, index, 'client_accesses')} 
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                                title="Remover"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Body: Usuário e Senha */}
                                                <div className="space-y-2 mb-4">
                                                    <div className="flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-700/30">
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Usuário</span>
                                                            <span className="text-xs text-slate-700 dark:text-slate-300 truncate font-bold">{item.username || '---'}</span>
                                                        </div>
                                                        {item.username && <CopyButton text={item.username} className="h-7 w-7 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700" />}
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-700/30">
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Senha</span>
                                                            <span className="text-xs text-slate-700 dark:text-slate-300 truncate font-mono font-black">{item.password || '---'}</span>
                                                        </div>
                                                        {item.password && <CopyButton text={item.password} className="h-7 w-7 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700" />}
                                                    </div>
                                                </div>

                                                {/* Footer: Setor e Link */}
                                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between gap-2">
                                                    {item.sector ? (
                                                        <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                                                            {item.sector}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9px] text-slate-300 italic">Sem setor</span>
                                                    )}
                                                    
                                                    {item.access_url && (
                                                        <a 
                                                            href={item.access_url} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all"
                                                        >
                                                            Acessar
                                                            <ExternalLink size={11} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end px-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                                            {accesses.length}/15 cadastrados
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-100 dark:border-slate-800/50 rounded-2xl bg-slate-50/30 dark:bg-slate-900/20 text-center animate-in fade-in duration-500 mt-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-3">
                                        <Key size={24} />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Nenhum acesso registrado</p>
                                    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">Armazene credenciais de portais governamentais e sistemas externos.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3.4.6 Tabbar ‘Certificado’ */}
                    {activeTab === 'certificado' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <Shield className="w-5 h-5 text-indigo-500 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-900 dark:text-white">Certificado Digital</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie modelos, senhas e signatários com alertas automáticos de vencimento para evitar interrupções.</p>
                                    </div>
                                </div>
                                {!readOnly && (
                                    <button
                                        onClick={() => setIsFormExpanded(!isFormExpanded)}
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 ${
                                            isFormExpanded 
                                            ? 'bg-zinc-500/80 text-white shadow-[0_0_10px_rgba(113,113,122,0.3)] hover:shadow-[0_0_15px_rgba(113,113,122,0.5)]' 
                                            : 'bg-emerald-500/80 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                        }`}
                                        title={isFormExpanded ? "Recolher Formulário" : "Expandir Formulário"}
                                    >
                                        {isFormExpanded ? <ChevronDown className="rotate-180 transition-transform duration-300" size={18} /> : <Plus size={18} />}
                                    </button>
                                )}
                            </div>
                            {isFormExpanded && !readOnly && (
                                <div className="space-y-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex flex-col md:flex-row items-end gap-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 rounded-lg">
                                        <div className="flex-1 w-full">
                                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Autopreenchimento A1 (.pfx/.p12)</label>
                                            <input 
                                                id="certFileInput"
                                                type="file" 
                                                accept=".pfx,.p12" 
                                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-r-none file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 dark:file:bg-indigo-900/30 dark:file:text-indigo-400 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg h-10 overflow-hidden"
                                                onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                                            />
                                        </div>
                                        <div className="flex-1 w-full">
                                            <Input
                                                label="Senha do Certificado"
                                                type="text"
                                                placeholder="Necessária para leitura"
                                                value={tempCertificate.password || ''}
                                                onChange={e => setTempCertificate({ ...tempCertificate, password: e.target.value })}
                                            />
                                        </div>
                                        <div className="w-full md:w-auto">
                                            <Button 
                                                variant="secondary" 
                                                onClick={handleExtractCertificate} 
                                                disabled={!certFile || !tempCertificate.password || extractingCert}
                                                icon={extractingCert ? <Loader2 size={16} className="animate-spin"/> : <Shield size={16}/>}
                                                className="w-full md:w-auto h-10 whitespace-nowrap"
                                            >
                                                {extractingCert ? 'Lendo...' : 'Extrair Dados A1'}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end pt-2 border-t border-slate-200 dark:border-slate-800">
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
                                            value={tempCertificate.expiration_date || tempCertificate.expires_at || ''}
                                            onChange={e => setTempCertificate({ ...tempCertificate, expiration_date: e.target.value, expires_at: e.target.value })}
                                        />
                                        <Input
                                            label="Senha (Visível)"
                                            type="text"
                                            value={tempCertificate.password || ''}
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
                                        <div className="lg:col-span-4 flex justify-end gap-2 mt-2">
                                            {editingIndex !== null && (
                                                <Button size="sm" variant="secondary" onClick={() => { setEditingIndex(null); setTempCertificate({ model: 'ecnpj_a1', signatory: 'propria', expiration_date: '', expires_at: '', password: '' }); setCertFile(null); }}>Cancelar</Button>
                                            )}
                                            <Button size="sm" icon={editingIndex !== null ? <Save size={16} /> : <Plus size={16} />} onClick={handleAddCertificate}>
                                                {editingIndex !== null ? 'Salvar Edição' : 'Adicionar Certificado'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {certificates.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {certificates.map((item, index) => {
                                            const expDate = item.expiration_date || item.expires_at;
                                            const daysRemaining = expDate ? Math.ceil((new Date(expDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                                            
                                            let statusColor = 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50';
                                            if (daysRemaining !== null) {
                                                if (daysRemaining <= 0) statusColor = 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50';
                                                else if (daysRemaining <= 30) statusColor = 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/50';
                                                else if (daysRemaining <= 90) statusColor = 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50';
                                            }

                                            const modelLabel = item.model === 'ecnpj_a1' ? 'eCNPJ - A1' : item.model === 'ecnpj_a3' ? 'eCNPJ - A3' : item.model === 'ecpf_a1' ? 'eCPF - A1' : 'eCPF - A3';

                                            return (
                                                <div 
                                                    key={index}
                                                    className="group relative bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in zoom-in-95"
                                                >
                                                    {/* Header: Modelo e Ações */}
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex flex-col gap-1 min-w-0">
                                                            <div className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-indigo-100 dark:border-indigo-800/50 self-start">
                                                                {modelLabel}
                                                            </div>
                                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                                                Certificado Digital
                                                            </span>
                                                        </div>
                                                        {!readOnly && (
                                                            <div className="flex items-center gap-1">
                                                                <button 
                                                                    onClick={() => { setTempCertificate({ ...item, expiration_date: item.expiration_date || item.expires_at }); setEditingIndex(index); }} 
                                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                                                                    title="Editar"
                                                                >
                                                                    <Pencil size={14} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleRemoveItem(setCertificates, certificates, index, 'client_certificates')} 
                                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                                    title="Remover"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Body: Vencimento */}
                                                    <div className={`flex items-center gap-4 p-3 rounded-xl border mb-3 ${statusColor}`}>
                                                        <div className="p-2 bg-white/50 dark:bg-slate-800/50 rounded-lg shadow-sm">
                                                            <Calendar size={18} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black uppercase tracking-tighter opacity-70">Expira em</span>
                                                            <span className="text-xs font-black">{expDate || 'Não informado'}</span>
                                                            {daysRemaining !== null && (
                                                                <span className="text-[8px] font-bold uppercase mt-0.5">
                                                                    {daysRemaining <= 0 ? 'Vencido' : `${daysRemaining} dias restantes`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Footer: Senha e Signatário */}
                                                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                                                        <div className="flex items-center justify-between gap-2 bg-slate-50/30 dark:bg-slate-800/20 p-2 rounded-lg border border-slate-100/50 dark:border-slate-700/20">
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Senha</span>
                                                                <span className="text-xs text-slate-700 dark:text-slate-300 truncate font-mono font-black">{item.password || '---'}</span>
                                                            </div>
                                                            {item.password && <CopyButton text={item.password} className="h-6 w-6 rounded-md bg-white dark:bg-slate-800 shadow-xs border border-slate-100 dark:border-slate-700" />}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 px-1">
                                                            <User size={10} className="text-slate-400" />
                                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                                                Signatário: <span className="font-bold text-slate-600 dark:text-slate-300">
                                                                    {item.signatory === 'propria' ? 'Empresa' : item.signatory === 'socio' ? 'Sócio' : 'Procurador'}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-end px-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                                            {certificates.length}/15 cadastrados
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-100 dark:border-slate-800/50 rounded-2xl bg-slate-50/30 dark:bg-slate-900/20 text-center animate-in fade-in duration-500">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-3">
                                        <Shield size={24} />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Nenhum certificado cadastrado</p>
                                    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">Mantenha o controle de vencimento dos certificados A1 e A3.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3.4.7 Tabbar ‘Licenças’ */}
                    {activeTab === 'licencas' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <FileCheck className="w-5 h-5 text-indigo-500 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-900 dark:text-white">Licenças</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Controle o ciclo de vida de alvarás de funcionamento, licenças ambientais (Cetesb) e sanitárias.</p>
                                    </div>
                                </div>
                                {!readOnly && (
                                    <button
                                        onClick={() => setIsFormExpanded(!isFormExpanded)}
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 ${
                                            isFormExpanded 
                                            ? 'bg-zinc-500/80 text-white shadow-[0_0_10px_rgba(113,113,122,0.3)] hover:shadow-[0_0_15px_rgba(113,113,122,0.5)]' 
                                            : 'bg-emerald-500/80 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                        }`}
                                        title={isFormExpanded ? "Recolher Formulário" : "Expandir Formulário"}
                                    >
                                        {isFormExpanded ? <ChevronDown className="rotate-180 transition-transform duration-300" size={18} /> : <Plus size={18} />}
                                    </button>
                                )}
                            </div>
                            {isFormExpanded && !readOnly && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
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
                                        <div className="flex items-center h-5">
                                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Link de Acesso</label>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                className="w-full h-10 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 underline"
                                                placeholder="https://"
                                                value={tempLicense.access_url}
                                                onChange={e => setTempLicense({ ...tempLicense, access_url: e.target.value })}
                                            />
                                            <button className="group/tooltip relative p-2 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                                <ExternalLink size={16} className="text-slate-500 dark:text-slate-400" />
                                                <div className="absolute top-full right-0 mt-2 hidden group-hover/tooltip:block w-max px-2 py-1 bg-slate-900 dark:bg-slate-800 text-white text-[10px] rounded shadow-lg z50 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                                                    Abrir Link
                                                    <div className="absolute bottom-full right-2 border-[3px] border-transparent border-b-slate-900 dark:border-b-slate-800" />
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="lg:col-span-4 flex justify-end gap-2 mt-2">
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
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {licenses.map((item, index) => {
                                            const expDate = item.expiration_date || item.expiry_date;
                                            const daysRemaining = expDate ? Math.ceil((new Date(expDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                                            
                                            let statusColor = 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50';
                                            if (daysRemaining !== null) {
                                                if (daysRemaining <= 0) statusColor = 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50';
                                                else if (daysRemaining <= 30) statusColor = 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/50';
                                                else if (daysRemaining <= 90) statusColor = 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50';
                                            }

                                            return (
                                                <div 
                                                    key={index}
                                                    className="group relative bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in zoom-in-95"
                                                >
                                                    {/* Header: Nome e Ações */}
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex flex-col gap-1 min-w-0">
                                                            <h5 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate tracking-tight">
                                                                {item.license_name}
                                                            </h5>
                                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                                Licença / Alvará
                                                            </span>
                                                        </div>
                                                        {!readOnly && (
                                                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                                                <button 
                                                                    onClick={() => { setTempLicense({ ...item, expiration_date: item.expiration_date || item.expiry_date, number: item.number || item.license_number }); setEditingIndex(index); }} 
                                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                                                                    title="Editar"
                                                                >
                                                                    <Pencil size={14} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleRemoveItem(setLicenses, licenses, index, 'client_licenses')} 
                                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                                    title="Remover"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Body: Número e Validade */}
                                                    <div className="space-y-3 mb-4">
                                                        <div className="flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-700/30">
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Número</span>
                                                                <span className="text-xs text-slate-700 dark:text-slate-300 truncate font-bold">{item.number || item.license_number || '---'}</span>
                                                            </div>
                                                            {(item.number || item.license_number) && <CopyButton text={(item.number || item.license_number) as string} className="h-7 w-7 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700" />}
                                                        </div>

                                                        <div className={`flex items-center gap-3 p-2.5 rounded-xl border ${statusColor}`}>
                                                            <Calendar size={14} className="shrink-0" />
                                                            <div className="flex flex-col">
                                                                <span className="text-[8px] font-black uppercase tracking-tighter opacity-70">Validade</span>
                                                                <span className="text-xs font-black">{expDate || 'Não informado'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Footer: Link */}
                                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/50 flex justify-end">
                                                        {item.access_url ? (
                                                            <a 
                                                                href={item.access_url} 
                                                                target="_blank" 
                                                                rel="noreferrer"
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all"
                                                            >
                                                                Ver Documento
                                                                <ExternalLink size={11} />
                                                            </a>
                                                        ) : (
                                                            <span className="text-[9px] text-slate-300 italic font-bold uppercase tracking-widest">Sem link</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-end px-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                                            {licenses.length}/15 cadastradas
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-100 dark:border-slate-800/50 rounded-2xl bg-slate-50/30 dark:bg-slate-900/20 text-center animate-in fade-in duration-500">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-3">
                                        <FileCheck size={24} />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Nenhuma licença cadastrada</p>
                                    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">Controle alvarás e licenças sanitárias ou ambientais.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3.4.8 Tabbar ‘Legislação’ */}
                    {activeTab === 'legislacao' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <BookOpen className="w-5 h-5 text-indigo-500 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-900 dark:text-white">Base Legal</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Documente as leis, normas tributárias e convenções sindicais que regem a operação do cliente.</p>
                                    </div>
                                </div>
                                {!readOnly && (
                                    <button
                                        onClick={() => setIsFormExpanded(!isFormExpanded)}
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 ${
                                            isFormExpanded 
                                            ? 'bg-zinc-500/80 text-white shadow-[0_0_10px_rgba(113,113,122,0.3)] hover:shadow-[0_0_15px_rgba(113,113,122,0.5)]' 
                                            : 'bg-emerald-500/80 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                        }`}
                                        title={isFormExpanded ? "Recolher Formulário" : "Expandir Formulário"}
                                    >
                                        {isFormExpanded ? <ChevronDown className="rotate-180 transition-transform duration-300" size={18} /> : <Plus size={18} />}
                                    </button>
                                )}
                            </div>
                            {isFormExpanded && !readOnly && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="md:col-span-1 lg:col-span-3">
                                        <Textarea
                                            label="Descrição da Legislação"
                                            placeholder="Ex: Lei 12.345..."
                                            value={tempLegislation.description}
                                            onChange={e => setTempLegislation({ ...tempLegislation, description: e.target.value })}
                                            rows={4}
                                        />
                                    </div>
                                    <div className="md:col-span-1 lg:col-span-1 flex flex-col gap-4">
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
                                    </div>
                                    <div className="lg:col-span-4 flex justify-end gap-2 mt-2">
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
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {legislations.map((item, index) => (
                                            <div 
                                                key={index}
                                                className="group relative bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in zoom-in-95"
                                            >
                                                {/* Header: Status e Ações */}
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex flex-col gap-1 min-w-0">
                                                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border self-start ${
                                                            item.status === 'vigente' 
                                                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50' 
                                                            : item.status === 'revogada'
                                                            ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/50'
                                                            : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/50'
                                                        }`}>
                                                            {item.status || 'vigente'}
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                                            Base Legal
                                                        </span>
                                                    </div>
                                                    {!readOnly && (
                                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                                            <button 
                                                                onClick={() => { setTempLegislation(item); setEditingIndex(index); }} 
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                                                                title="Editar"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleRemoveItem(setLegislations, legislations, index, 'client_legislations')} 
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                                title="Remover"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Body: Descrição */}
                                                <div className="flex items-start justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100/50 dark:border-slate-700/30 mb-4">
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium line-clamp-4">
                                                        {item.description}
                                                    </p>
                                                    <CopyButton text={item.description || ''} className="h-7 w-7 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 shrink-0" />
                                                </div>

                                                {/* Footer: Link */}
                                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/50 flex justify-end">
                                                    {item.access_url ? (
                                                        <a 
                                                            href={item.access_url} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all"
                                                        >
                                                            Consultar Lei
                                                            <ExternalLink size={11} />
                                                        </a>
                                                    ) : (
                                                        <span className="text-[9px] text-slate-300 italic font-bold uppercase tracking-widest">Sem link de referência</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end px-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                                            {legislations.length}/15 cadastradas
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-100 dark:border-slate-800/50 rounded-2xl bg-slate-50/30 dark:bg-slate-900/20 text-center animate-in fade-in duration-500">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-3">
                                        <BookOpen size={24} />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Nenhuma legislação cadastrada</p>
                                    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">Documente as leis e normas tributárias deste cliente.</p>
                                </div>
                            )}
                        </div>
                    )}
                    {/* 3.4.9 Tabbar 'Séries DF-e' */}
                    {activeTab === 'dfe' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <Receipt className="w-5 h-5 text-indigo-500 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-900 dark:text-white">Séries DF-e</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Organize os modelos e séries de Documentos Fiscais Eletrônicos vinculados aos seus respectivos emissores.</p>
                                    </div>
                                </div>
                                {!readOnly && (
                                    <button
                                        onClick={() => setIsFormExpanded(!isFormExpanded)}
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 ${
                                            isFormExpanded 
                                            ? 'bg-zinc-500/80 text-white shadow-[0_0_10px_rgba(113,113,122,0.3)] hover:shadow-[0_0_15px_rgba(113,113,122,0.5)]' 
                                            : 'bg-emerald-500/80 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                        }`}
                                        title={isFormExpanded ? "Recolher Formulário" : "Expandir Formulário"}
                                    >
                                        {isFormExpanded ? <ChevronDown className="rotate-180 transition-transform duration-300" size={18} /> : <Plus size={18} />}
                                    </button>
                                )}
                            </div>
                            {isFormExpanded && !readOnly && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="lg:col-span-12 mb-1">
                                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block">Tipo de DF-e</label>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { id: 'NFS-e', title: 'Nota Fiscal de Serviço Eletrônica' },
                                                { id: 'NF-e', title: 'Nota Fiscal Eletrônica - Mod: 55' },
                                                { id: 'NFC-e', title: 'Nota Fiscal de Consumidor Eletrônica - Mod: 65' },
                                                { id: 'BP-e', title: 'Bilhete de Passagem Eletrônico - Mod: 63' },
                                                { id: 'CT-e', title: 'Conhecimento de Transporte Eletrônico - Mod: 57' },
                                                { id: 'MDF-e', title: 'Manifesto Eletrônico de Documentos Fiscais - Mod: 58' },
                                                { id: 'NF3-e', title: 'Nota Fiscal de Energia Elétrica Eletrônica - Mod: 66' },
                                                { id: 'NFCom', title: 'Nota Fiscal de Serviço de Comunicação Eletrônica - Mod: 62' },
                                                { id: 'NFF', title: 'Nota Fiscal Fácil' },
                                                { id: 'DC-e', title: 'Declaração de Conteúdo Eletrônica' },
                                                { id: 'NFAG', title: 'Nota Fiscal de Água e Saneamento Eletrônica - Mod: 75' },
                                                { id: 'NF-e ABI', title: 'Nota Fiscal Eletrônica de Alienação de Bens Imóveis - Mod: 77' },
                                                { id: 'NFGas', title: 'Nota Fiscal Eletrônica do Gás - Mod: 76' }
                                            ].map((dfe) => (
                                                <button
                                                    key={dfe.id}
                                                    type="button"
                                                    onClick={() => setTempDfeSerie({ ...tempDfeSerie, dfe_type: dfe.id })}
                                                    className={`group relative py-1.5 px-3 rounded text-[10px] font-bold transition-all border ${tempDfeSerie.dfe_type === dfe.id
                                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 shadow-sm'
                                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                        }`}
                                                >
                                                    {dfe.id}
                                                    
                                                    {/* Tooltip CSS Customizado */}
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none whitespace-nowrap border border-slate-700">
                                                        {dfe.title}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="lg:col-span-2">
                                        <Input
                                            label="Série"
                                            placeholder="1"
                                            value={tempDfeSerie.series}
                                            onChange={e => setTempDfeSerie({ ...tempDfeSerie, series: e.target.value })}
                                        />
                                    </div>
                                    <div className="lg:col-span-3">
                                        <Input
                                            label="Emissor"
                                            placeholder="Sebrae"
                                            value={tempDfeSerie.issuer}
                                            onChange={e => setTempDfeSerie({ ...tempDfeSerie, issuer: e.target.value })}
                                            copyable
                                        />
                                    </div>
                                    <div className="lg:col-span-4">
                                        <Input
                                            label="Usuário"
                                            placeholder="admin"
                                            value={tempDfeSerie.username}
                                            onChange={e => setTempDfeSerie({ ...tempDfeSerie, username: e.target.value })}
                                            copyable
                                        />
                                    </div>
                                    <div className="lg:col-span-3">
                                        <Input
                                            label="Senha"
                                            placeholder="****"
                                            value={tempDfeSerie.password}
                                            onChange={e => setTempDfeSerie({ ...tempDfeSerie, password: e.target.value })}
                                            copyable
                                        />
                                    </div>
                                    <div className="lg:col-span-5">
                                        <Input
                                            label="URL Login"
                                            placeholder="https://emissor.com"
                                            value={tempDfeSerie.login_url}
                                            onChange={e => setTempDfeSerie({ ...tempDfeSerie, login_url: e.target.value })}
                                        />
                                    </div>
                                    
                                    <div className="lg:col-span-7 flex justify-end gap-2 h-10 mt-2">
                                        {editingIndex !== null && (
                                            <Button size="sm" variant="secondary" onClick={() => { setEditingIndex(null); setTempDfeSerie({ dfe_type: 'NF-e', series: '', issuer: '', username: '', password: '', login_url: '' }); }}>Cancelar</Button>
                                        )}
                                        <Button size="sm" icon={editingIndex !== null ? <Save size={16} /> : <Plus size={16} />} onClick={handleAddDfeSerie}>
                                            {editingIndex !== null ? 'Salvar Edição' : 'Adicionar DF-e'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {dfeSeries.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {dfeSeries.map((item, index) => (
                                            <div 
                                                key={index}
                                                className="group relative bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in zoom-in-95"
                                            >
                                                {/* Header: Tipo, Série e Ações */}
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex flex-col gap-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <div className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-indigo-100 dark:border-indigo-800/50">
                                                                {item.dfe_type}
                                                            </div>
                                                            <div className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md text-[9px] font-black border border-slate-200 dark:border-slate-700">
                                                                Série {item.series || '---'}
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                                            Emissor Fiscal
                                                        </span>
                                                    </div>
                                                    {!readOnly && (
                                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                                            <button 
                                                                onClick={() => { setTempDfeSerie(item); setEditingIndex(index); }} 
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                                                                title="Editar"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleRemoveItem(setDfeSeries, dfeSeries, index, 'client_dfe_series')} 
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                                title="Remover"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Body: Emissor e Credenciais */}
                                                <div className="space-y-2 mb-4">
                                                    <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-700/30">
                                                        <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                                                            <Building2 size={14} className="text-slate-400" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Emissor</span>
                                                            <span className="text-xs text-slate-700 dark:text-slate-300 truncate font-bold">{item.issuer || 'Não informado'}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="flex items-center justify-between gap-2 bg-slate-50/30 dark:bg-slate-800/20 p-2 rounded-lg border border-slate-100/50 dark:border-slate-700/20">
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Usuário</span>
                                                                <span className="text-xs text-slate-700 dark:text-slate-300 truncate font-medium">{item.username || '---'}</span>
                                                            </div>
                                                            {item.username && <CopyButton text={item.username} className="h-5 w-5 rounded bg-white dark:bg-slate-800 shadow-xs border border-slate-100 dark:border-slate-700" />}
                                                        </div>
                                                        <div className="flex items-center justify-between gap-2 bg-slate-50/30 dark:bg-slate-800/20 p-2 rounded-lg border border-slate-100/50 dark:border-slate-700/20">
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Senha</span>
                                                                <span className="text-xs text-slate-700 dark:text-slate-300 truncate font-mono font-black">{item.password || '---'}</span>
                                                            </div>
                                                            {item.password && <CopyButton text={item.password} className="h-5 w-5 rounded bg-white dark:bg-slate-800 shadow-xs border border-slate-100 dark:border-slate-700" />}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer: Link de Login */}
                                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/50">
                                                    {item.login_url ? (
                                                        <a 
                                                            href={item.login_url} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all"
                                                        >
                                                            Portal do Emissor
                                                            <ExternalLink size={11} />
                                                        </a>
                                                    ) : (
                                                        <div className="text-center py-1.5 text-[9px] text-slate-300 italic font-bold uppercase tracking-widest">
                                                            Sem link de login
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end px-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                                            {dfeSeries.length}/15 cadastradas
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-100 dark:border-slate-800/50 rounded-2xl bg-slate-50/30 dark:bg-slate-900/20 text-center animate-in fade-in duration-500">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-3">
                                        <Receipt size={24} />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Nenhuma série DF-e cadastrada</p>
                                    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">Organize as séries de NF-e, NFS-e e outros documentos fiscais.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {/* Modal de Sucesso - Leitura de Certificado */}
            <Modal
                isOpen={isCertModalOpen}
                onClose={() => setIsCertModalOpen(false)}
                title="Certificado Lido com Sucesso!"
                size="md"
            >
                {extractedCertData && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-lg mb-6">
                            <Shield className="w-6 h-6 shrink-0" />
                            <p className="text-sm font-medium">Os dados do arquivo selecionado foram extraídos e preenchidos no formulário automaticamente.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col">
                                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Empresa</span>
                                <span className="text-sm text-slate-900 dark:text-white font-semibold">{extractedCertData.companyName}</span>
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col">
                                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Documento Selecionado</span>
                                <span className="text-sm tracking-wide text-slate-900 dark:text-white font-semibold">{extractedCertData.document || 'Não localizado no certificado'}</span>
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col">
                                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Órgão Emissor</span>
                                <span className="text-sm text-slate-900 dark:text-white font-semibold">{extractedCertData.issuer}</span>
                            </div>

                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 flex flex-col">
                                <span className="text-xs text-indigo-500 font-medium uppercase tracking-wider mb-1">Data de Emissão e Vencimento</span>
                                <span className="text-base text-indigo-700 dark:text-indigo-400 font-bold tracking-tight">Válido de {new Date(extractedCertData.validFrom).toLocaleDateString()} até {new Date(extractedCertData.validTo).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <Button onClick={() => setIsCertModalOpen(false)}>Concluir</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal de Erro - Leitura de Certificado */}
            <Modal
                isOpen={!!certError}
                onClose={() => setCertError(null)}
                title="Não foi possível ler o certificado"
                size="md"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800 rounded-lg">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">{certError}</p>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <Button variant="secondary" onClick={() => setCertError(null)}>Entendi</Button>
                    </div>
                </div>
            </Modal>
            <Notification
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />

            {loading && (
                <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-6 p-10 rounded-2xl bg-slate-900/90 border border-indigo-500/30 shadow-2xl">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                            <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-b-violet-500/60 animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-semibold text-lg">
                                {isEditing ? 'Salvando alterações...' : 'Criando cliente...'}
                            </p>
                            <p className="text-slate-400 text-sm mt-1">Aguarde, estamos processando os dados.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
