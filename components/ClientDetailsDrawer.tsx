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
  LayoutList
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

  const copyToClipboard = (text: string, fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyFeedback(fieldId);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  if (!shouldRender || !client) return null;

  const InfoField = ({ label, value, id, valueClassName = "text-sm" }: { label: string; value: string; id: string; valueClassName?: string }) => (
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
      <span className={`${valueClassName} font-bold text-slate-700 dark:text-slate-200 break-words leading-tight`}>
        {value || '---'}
      </span>
    </div>
  );

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
            {openSections.info && (
              <div className="p-4 pt-0 grid grid-cols-1 gap-3 animate-in fade-in duration-300">
                <InfoField label="Razão Social" value={client.companyName} id="comp-name" />
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Nome Fantasia" value={client.tradeName} id="trade-name" />
                  <InfoField label="Documento (CNPJ/CPF)" value={client.document} id="doc" valueClassName="text-[13px]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Situação" value={client.status} id="status" />
                  <InfoField label="Segmento" value={client.segment} id="segment" />
                </div>
              </div>
            )}
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
            {openSections.address && (
              <div className="p-4 pt-0 grid grid-cols-1 gap-3 animate-in fade-in duration-300">
                <InfoField label="CEP" value={client.zip_code || ''} id="cep" />
                <InfoField label="Logradouro" value={`${client.street || ''}${client.street_number ? `, ${client.street_number}` : ''}`} id="street" />
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Bairro" value={client.neighborhood || ''} id="neighborhood" />
                  <InfoField label="Cidade/UF" value={`${client.city || ''} / ${client.state || ''}`} id="city" />
                </div>
                {client.complement && <InfoField label="Complemento" value={client.complement} id="complement" />}
              </div>
            )}
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
            {openSections.partner && (
              <div className="p-4 pt-0 grid grid-cols-1 gap-3 animate-in fade-in duration-300">
                <InfoField label="Nome do Sócio" value={client.admin_partner_name || ''} id="partner-name" />
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="CPF" value={client.admin_partner_cpf || ''} id="partner-cpf" />
                  <InfoField label="Data de Nasc." value={client.admin_partner_birthdate ? new Date(client.admin_partner_birthdate).toLocaleDateString('pt-BR') : ''} id="partner-birth" />
                </div>
              </div>
            )}
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
            {openSections.inscriptions && (
              <div className="p-4 pt-0 grid grid-cols-1 gap-2 animate-in fade-in duration-300">
                {inscriptions.length > 0 ? inscriptions.map((insc, idx) => (
                  <div key={idx} className="flex flex-col p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 cursor-pointer" onClick={(e) => copyToClipboard(insc.number, `insc-${idx}`, e)}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase">{insc.type}</span>
                      {copyFeedback === `insc-${idx}` && <span className="text-[9px] font-bold text-emerald-500">Copiado!</span>}
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1">{insc.number}</span>
                    {insc.observation && <span className="text-[10px] text-slate-400 mt-1">{insc.observation}</span>}
                  </div>
                )) : (
                  <div className="text-center py-4 text-slate-400 text-xs italic">Nenhuma inscrição cadastrada</div>
                )}
              </div>
            )}
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
            {openSections.contacts && (
              <div className="p-4 pt-0 grid grid-cols-1 gap-2 animate-in fade-in duration-300">
                {contacts.length > 0 ? contacts.map((cont, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={12} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{cont.name}</span>
                      {cont.is_main && <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded uppercase font-black">Principal</span>}
                    </div>
                    {cont.email && (
                      <div className="flex items-center justify-between group cursor-pointer" onClick={(e) => copyToClipboard(cont.email, `cont-e-${idx}`, e)}>
                        <div className="flex items-center gap-2">
                          <Mail size={12} className="text-slate-400" />
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{cont.email}</span>
                        </div>
                        {copyFeedback === `cont-e-${idx}` && <span className="text-[9px] font-bold text-emerald-500">Copiado!</span>}
                      </div>
                    )}
                    {(cont.phone_mobile || cont.phone_fixed) && (
                      <div className="flex flex-col gap-1.5">
                        {cont.phone_mobile && (
                          <div className="flex items-center justify-between group cursor-pointer" onClick={(e) => copyToClipboard(cont.phone_mobile, `cont-m-${idx}`, e)}>
                            <div className="flex items-center gap-2">
                              <Phone size={12} className="text-slate-400" />
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{cont.phone_mobile} (Cel)</span>
                            </div>
                            {copyFeedback === `cont-m-${idx}` && <span className="text-[9px] font-bold text-emerald-500">Copiado!</span>}
                          </div>
                        )}
                        {cont.phone_fixed && (
                          <div className="flex items-center justify-between group cursor-pointer" onClick={(e) => copyToClipboard(cont.phone_fixed, `cont-f-${idx}`, e)}>
                            <div className="flex items-center gap-2">
                              <Phone size={12} className="text-slate-400" />
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{cont.phone_fixed} (Fixo)</span>
                            </div>
                            {copyFeedback === `cont-f-${idx}` && <span className="text-[9px] font-bold text-emerald-500">Copiado!</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="text-center py-4 text-slate-400 text-xs italic">Nenhum contato cadastrado</div>
                )}
              </div>
            )}
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
            {openSections.certificate && (
              <div className="p-4 pt-0 grid grid-cols-1 gap-2 animate-in fade-in duration-300">
                {certificates.length > 0 ? certificates.map((cert, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-500" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tighter">{cert.model}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Vencimento</span>
                        <span className={`text-sm font-bold ${new Date(cert.expires_at || cert.expiration_date) < new Date() ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>
                          {cert.expires_at || cert.expiration_date ? new Date(cert.expires_at || cert.expiration_date).toLocaleDateString('pt-BR') : '---'}
                        </span>
                      </div>
                      <div 
                        className="flex flex-col gap-1 cursor-pointer group"
                        onClick={(e) => copyToClipboard(cert.password || '', `cert-p-${idx}`, e)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-slate-400 uppercase">Senha</span>
                          {copyFeedback === `cert-p-${idx}` && <span className="text-[9px] font-bold text-emerald-500">Copiado!</span>}
                        </div>
                        <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md w-fit">
                          {cert.password || '---'}
                        </span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-slate-400 text-xs italic">Nenhum certificado cadastrado</div>
                )}
              </div>
            )}
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
            {openSections.activities && (
              <div className="p-4 pt-0 grid grid-cols-1 gap-2 animate-in fade-in duration-300">
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
            )}
          </div>

        </div>
      </div>
    </>,
    document.body
  );
};
