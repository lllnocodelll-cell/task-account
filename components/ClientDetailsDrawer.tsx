import React, { useState, useEffect } from 'react';
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
  Copy,
  LayoutList,
  Calendar,
  LogIn,
  LogOut,
  Fingerprint
} from 'lucide-react';
import { Client } from '../types';
import { supabase } from '../utils/supabaseClient';

interface ClientDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onEdit: (client: Client) => void;
}

export const ClientDetailsDrawer: React.FC<ClientDetailsDrawerProps> = ({
  isOpen,
  onClose,
  client,
  onEdit
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Sub-data states
  const [inscriptions, setInscriptions] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    info: true,
    address: false,
    partner: false,
    inscriptions: true,
    contacts: true,
    certificate: true,
    activities: true
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
      const [insc, cont, cert, act] = await Promise.all([
        supabase.from('client_inscriptions').select('*').eq('client_id', client.id),
        supabase.from('client_contacts').select('*').eq('client_id', client.id),
        supabase.from('client_certificates').select('*').eq('client_id', client.id),
        supabase.from('client_activities').select('*').eq('client_id', client.id)
      ]);

      setInscriptions(insc.data || []);
      setContacts(cont.data || []);
      setCertificates(cert.data || []);
      setActivities(act.data || []);
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

  if (!shouldRender || !client) return null;

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
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
          
          {/* Section 01: Dados Iniciais */}
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleSection('info')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Seção 01</span>
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
                        {client.constitution_date ? new Date(client.constitution_date).toLocaleDateString('pt-BR') : '---'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 border-l border-slate-100 dark:border-slate-800 pl-3">
                      <div className="flex items-center gap-1 mb-0.5">
                        <LogIn size={10} className="text-emerald-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Entrada</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {client.entry_date ? new Date(client.entry_date).toLocaleDateString('pt-BR') : '---'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 border-l border-slate-100 dark:border-slate-800 pl-3">
                      <div className="flex items-center gap-1 mb-0.5">
                        <LogOut size={10} className="text-rose-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Saída</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {client.exit_date ? new Date(client.exit_date).toLocaleDateString('pt-BR') : '---'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 02: Endereço */}
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleSection('address')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Seção 02</span>
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
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleSection('partner')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Seção 03</span>
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
                        {client.admin_partner_birthdate ? new Date(client.admin_partner_birthdate).toLocaleDateString('pt-BR') : '---'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 04: Inscrições */}
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleSection('inscriptions')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Seção 04</span>
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
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleSection('contacts')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Seção 05</span>
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
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleSection('certificate')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Seção 06</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Certificado Digital</span>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${openSections.certificate ? 'rotate-180' : ''}`} size={16} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${openSections.certificate ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden">
                <div className="p-4 pt-0 grid grid-cols-1 gap-3">
                  {certificates.length > 0 ? certificates.map((cert, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 relative overflow-hidden group">
                      <div className="flex items-center gap-4">
                        {/* Modelo / Tipo */}
                        <div className="flex items-center gap-2.5 min-w-[85px]">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100/50 dark:border-emerald-500/20">
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
                        <div className="w-px h-8 bg-slate-200/60 dark:bg-slate-700/50" />

                        {/* Vencimento */}
                        <div className="flex-1 flex items-center gap-3 min-w-[100px]">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Vencimento</span>
                            <div className="flex items-center gap-2">
                              <Calendar size={12} className={new Date(cert.expires_at || cert.expiration_date) < new Date() ? 'text-rose-500' : 'text-indigo-400'} />
                              <span className={`text-[12px] font-bold leading-none ${new Date(cert.expires_at || cert.expiration_date) < new Date() ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>
                                {cert.expires_at || cert.expiration_date ? new Date(cert.expires_at || cert.expiration_date).toLocaleDateString('pt-BR') : '---'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Divisor */}
                        <div className="w-px h-8 bg-slate-200/60 dark:bg-slate-700/50" />

                        {/* Senha */}
                        <div 
                          className="flex flex-col gap-1 cursor-pointer min-w-[100px]"
                          onClick={(e) => copyToClipboard(cert.password || '', `cert-p-${idx}`, e)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Senha</span>
                            {copyFeedback === `cert-p-${idx}` && <span className="text-[9px] font-bold text-emerald-500 animate-in fade-in zoom-in">Copiado</span>}
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg group-hover:border-indigo-300 transition-all w-full shadow-sm">
                            <Fingerprint size={12} className="text-indigo-400" />
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
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleSection('activities')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Seção 07</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Atividades (CNAE)</span>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${openSections.activities ? 'rotate-180' : ''}`} size={16} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${openSections.activities ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden">
                <div className="p-4 pt-0 grid grid-cols-1 gap-2">
                  {activities.length > 0 ? activities.map((act, idx) => (
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

        </div>
      </div>
    </>,
    document.body
  );
};
