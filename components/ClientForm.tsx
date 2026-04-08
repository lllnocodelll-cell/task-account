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
import { Input, Select, CopyButton, Textarea } from './ui/Input';
import { Modal } from './ui/Modal';
import { Client, Sector } from '../types';
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
            const { data } = await supabase
                .from('client_segments')
                .select('id, name, description, category')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (data) setSegments(data as ClientSegment[]);
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
            alert('Por favor, informe um CNPJ válido contendo 14 dígitos.');
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
            console.error('Erro na busca de CNPJ:', error);
            alert(error.message || 'Erro ao conectar-se à BrasilAPI.');
        } finally {
            setIsSearchingCNPJ(false);
        }
    };

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
            is_main: i === index
        }));
        setContacts(newList);
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
        setTempAccess({ sector: '' });
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

    const handleAddDfeSerie = () => {
        if (!tempDfeSerie.dfe_type || !tempDfeSerie.series) return alert('Preencha o tipo e a série do DF-e');
        if (dfeSeries.length >= 15 && editingIndex === null) return alert('Limite máximo de 15 registros de Séries DF-e atingido.');
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
            <Card title="Dados Iniciais" collapsible>
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
                            <button 
                                type="button"
                                onClick={handleSearchCNPJ}
                                disabled={isSearchingCNPJ}
                                title="Buscar dados na Receita Federal"
                                className="h-10 w-10 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 dark:hover:text-indigo-400 dark:hover:border-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                {isSearchingCNPJ ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-4">
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
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Estabelecimento</label>
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
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Segmento</label>
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
            <Card title="Endereço" collapsible>
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
                            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <FileText className="w-5 h-5 text-indigo-500 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">Inscrições</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Centralize e gerencie as inscrições fiscais da empresa em todas as esferas (Municipal, Estadual, Federal, Conselho de Classe e outros).</p>
                                </div>
                            </div>
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
                                        {inscriptions.length > 0 && (
                                            <tfoot className="bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
                                                <tr>
                                                    <td colSpan={readOnly ? 3 : 4} className="px-4 py-2 text-xs text-slate-500 text-right">
                                                        {inscriptions.length}/15 cadastradas
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
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
                            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <Users className="w-5 h-5 text-indigo-500 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">Contatos</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie os principais contatos da empresa.</p>
                                </div>
                            </div>
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
                                                <th className="px-4 py-3">Fixo</th>
                                                <th className="px-4 py-3">Celular</th>
                                                <th className="px-4 py-3 text-center">Principal</th>
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
                                                            <span>{item.phone_fixed}</span>
                                                            {item.phone_fixed && <CopyButton text={item.phone_fixed} className="opacity-0 group-hover/copy:opacity-100" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.phone_mobile}</span>
                                                            {item.phone_mobile && <CopyButton text={item.phone_mobile} className="opacity-0 group-hover/copy:opacity-100" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button 
                                                            type="button" 
                                                            disabled={readOnly}
                                                            onClick={() => handleToggleMainContact(index)}
                                                            className={`p-1.5 rounded-full transition-colors ${item.is_main ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-slate-300 dark:text-slate-600 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                            title={item.is_main ? "Contato Principal" : "Definir como Principal"}
                                                        >
                                                            <Star size={18} fill={item.is_main ? "currentColor" : "none"} />
                                                        </button>
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
                                        {contacts.length > 0 && (
                                            <tfoot className="bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
                                                <tr>
                                                    <td colSpan={readOnly ? 5 : 6} className="px-4 py-2 text-xs text-slate-500 text-right">
                                                        {contacts.length}/15 cadastradas
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
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
                            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <Landmark className="w-5 h-5 text-indigo-500 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">Regime Tributário</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Controle e monitore o histórico de enquadramentos tributários e garanta a conformidade fiscal ao longo dos anos.</p>
                                </div>
                            </div>
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
                                        {taxRegimes.length > 0 && (
                                            <tfoot className="bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
                                                <tr>
                                                    <td colSpan={readOnly ? 4 : 5} className="px-4 py-2 text-xs text-slate-500 text-right">
                                                        {taxRegimes.length}/15 cadastradas
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
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
                            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <Activity className="w-5 h-5 text-indigo-500 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">Atividades</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Registre as atividades econômicas (CNAE principal e secundárias).</p>
                                </div>
                            </div>
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
                                        {activities.length > 0 && (
                                            <tfoot className="bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
                                                <tr>
                                                    <td colSpan={readOnly ? 3 : 4} className="px-4 py-2 text-xs text-slate-500 text-right">
                                                        {activities.length}/15 cadastradas
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
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
                            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <Key className="w-5 h-5 text-indigo-500 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">Acessos</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Centralize os acessos dos principais portais, como: empregador web, sistemas de gestão, portais de serviços do contribuinte e muito mais.</p>
                                </div>
                            </div>
                            {!readOnly && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
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
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden mt-4">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Acesso</th>
                                                <th className="px-4 py-3">Setor</th>
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
                                                        {item.sector ? (
                                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-medium">
                                                                {item.sector}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 italic text-xs">N/A</span>
                                                        )}
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
                                        {accesses.length > 0 && (
                                            <tfoot className="bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
                                                <tr>
                                                    <td colSpan={readOnly ? 5 : 6} className="px-4 py-2 text-xs text-slate-500 text-right">
                                                        {accesses.length}/15 cadastradas
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
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
                            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <Shield className="w-5 h-5 text-indigo-500 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">Certificado Digital</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie modelos, senhas e signatários com alertas automáticos de vencimento para evitar interrupções.</p>
                                </div>
                            </div>
                            {!readOnly && (
                                <div className="space-y-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
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
                                        {certificates.length > 0 && (
                                            <tfoot className="bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
                                                <tr>
                                                    <td colSpan={readOnly ? 4 : 5} className="px-4 py-2 text-xs text-slate-500 text-right">
                                                        {certificates.length}/15 cadastradas
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
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
                            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <FileCheck className="w-5 h-5 text-indigo-500 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">Licenças</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Controle o ciclo de vida de alvarás de funcionamento, licenças ambientais (Cetesb) e sanitárias.</p>
                                </div>
                            </div>
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
                                        {licenses.length > 0 && (
                                            <tfoot className="bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
                                                <tr>
                                                    <td colSpan={readOnly ? 4 : 5} className="px-4 py-2 text-xs text-slate-500 text-right">
                                                        {licenses.length}/15 cadastradas
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
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
                            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <BookOpen className="w-5 h-5 text-indigo-500 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">Base Legal</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Documente as leis, normas tributárias e convenções sindicais que regem a operação do cliente.</p>
                                </div>
                            </div>
                            {!readOnly && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
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
                                        {legislations.length > 0 && (
                                            <tfoot className="bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
                                                <tr>
                                                    <td colSpan={readOnly ? 3 : 4} className="px-4 py-2 text-xs text-slate-500 text-right">
                                                        {legislations.length}/15 cadastradas
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 dark:text-slate-500 py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                    Nenhuma legislação cadastrada.
                                </div>
                            )}
                        </div>
                    )}
                    {/* 3.4.9 Tabbar 'Séries DF-e' */}
                    {activeTab === 'dfe' && (
                        <div className="space-y-6">
                            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <Receipt className="w-5 h-5 text-indigo-500 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">Séries DF-e</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Organize os modelos e séries de Documentos Fiscais Eletrônicos vinculados aos seus respectivos emissores.</p>
                                </div>
                            </div>
                            {!readOnly && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
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
                                    
                                    <div className="lg:col-span-7 flex justify-end gap-2 h-10">
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
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Tipo</th>
                                                <th className="px-4 py-3">Série</th>
                                                <th className="px-4 py-3">Emissor</th>
                                                <th className="px-4 py-3">Usuário</th>
                                                <th className="px-4 py-3">Senha</th>
                                                <th className="px-4 py-3">Link</th>
                                                {!readOnly && <th className="px-4 py-3 text-right">Ações</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {dfeSeries.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                        {item.dfe_type}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                                                        {item.series}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.issuer || '-'}</span>
                                                            {item.issuer && <CopyButton text={item.issuer} className="opacity-0 group-hover/copy:opacity-100" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.username || '-'}</span>
                                                            {item.username && <CopyButton text={item.username} className="opacity-0 group-hover/copy:opacity-100" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                                                        <div className="flex items-center gap-2 group/copy">
                                                            <span>{item.password || '-'}</span>
                                                            {item.password && <CopyButton text={item.password} className="opacity-0 group-hover/copy:opacity-100" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {item.login_url ? (
                                                            <a href={item.login_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                                Link <ExternalLink size={12} />
                                                            </a>
                                                        ) : '-'}
                                                    </td>
                                                    {!readOnly && (
                                                        <td className="px-4 py-3 text-right flex justify-end items-center gap-2">
                                                            <button onClick={() => { setTempDfeSerie(item); setEditingIndex(index); }} className="text-slate-400 hover:text-indigo-500 transition-colors">
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button onClick={() => handleRemoveItem(setDfeSeries, dfeSeries, index, 'client_dfe_series')} className="text-slate-400 hover:text-red-500 transition-colors">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                        {dfeSeries.length > 0 && (
                                            <tfoot className="bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
                                                <tr>
                                                    <td colSpan={readOnly ? 6 : 7} className="px-4 py-2 text-xs text-slate-500 text-right">
                                                        {dfeSeries.length}/15 cadastradas
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 dark:text-slate-500 py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                    Nenhuma série de DF-e cadastrada.
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
        </div>
    );
};
