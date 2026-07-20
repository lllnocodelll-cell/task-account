import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Pencil, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  User,
  Building2,
  ScanFace,
  Copy,
  Loader2,
  FileText,
  ExternalLink,
  HardDrive,
  Crown,
  Landmark
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

interface UserProfile {
  id: string;
  full_name: string | null;
  role: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  avatar_url: string | null;
  org_name: string | null;
  job_title?: string | null;
  client_ids?: string[];
  org_id?: string | null;
}

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onEditProfile: () => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  isOpen,
  onClose,
  userProfile,
  onEditProfile
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [officeDetails, setOfficeDetails] = useState<any | null>(null);
  const [loadingOffice, setLoadingOffice] = useState(false);

  useEffect(() => {
    if (isOpen && userProfile?.role === 'cliente' && userProfile.client_ids && userProfile.client_ids.length > 0) {
      const fetchDrawerCompanies = async () => {
        try {
          setLoadingCompanies(true);
          const { data, error } = await supabase
            .from('clients')
            .select('id, company_name, trade_name, document, city, state, establishment_type, status')
            .in('id', userProfile.client_ids || []);
          
          if (error) throw error;
          setCompanies(data || []);
        } catch (err) {
          console.error('Erro ao buscar empresas no drawer:', err);
        } finally {
          setLoadingCompanies(false);
        }
      };
      fetchDrawerCompanies();
    }
  }, [isOpen, userProfile]);

  // Buscar dados do escritório
  useEffect(() => {
    if (isOpen && userProfile?.org_id) {
      const fetchOffice = async () => {
        try {
          setLoadingOffice(true);
          const { data, error } = await (supabase as any)
            .from('office_details')
            .select('company_name, document, city, state, plan_name, plan_value, storage_limit_gb, storage_used_bytes, contract_url')
            .eq('org_id', userProfile.org_id!)
            .maybeSingle();
          
          if (error) throw error;
          setOfficeDetails(data);
        } catch (err) {
          console.error('Erro ao buscar escritório no drawer:', err);
        } finally {
          setLoadingOffice(false);
        }
      };
      fetchOffice();
    }
  }, [isOpen, userProfile]);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleTransitionEnd = () => {
    if (!isVisible) setShouldRender(false);
  };

  const copyToClipboard = (text: string | null | undefined, fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyFeedback(fieldId);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  if (!shouldRender || !userProfile) return null;

  const InfoField = ({ 
    label, 
    value, 
    id, 
    icon: Icon 
  }: { 
    label: string; 
    value: string | null | undefined; 
    id: string;
    icon: React.ElementType;
  }) => {
    return (
      <div 
        className="flex flex-col gap-1.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer group relative overflow-hidden"
        onClick={(e) => copyToClipboard(value, id, e)}
      >
        {/* Background icon decoration */}
        <div className="absolute -right-2 -bottom-2 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-300">
          <Icon size={64} />
        </div>

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-1.5">
            <Icon size={12} className="text-indigo-400" />
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</span>
          </div>
          <div className="flex items-center gap-1">
            {copyFeedback === id ? (
              <span className="text-[9px] font-bold text-emerald-500 animate-in fade-in slide-in-from-right-1">Copiado!</span>
            ) : (
              <Copy size={10} className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 break-words leading-tight relative z-10">
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
        className={`fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl z-[9999] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25, 0.1, 0.25, 1)] border-l border-white/20 dark:border-slate-800/50 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-lg flex-shrink-0 shadow-sm">
              <ScanFace size={18} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex flex-col text-left">
              <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                Meu Perfil
              </h1>
              <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onEditProfile();
                onClose();
              }}
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
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          {/* Avatar & Identity Section */}
          <div className="flex flex-col items-center text-center mt-2 mb-8 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <div className="w-28 h-28 rounded-full bg-indigo-600 flex items-center justify-center text-4xl text-white font-bold border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden relative mb-4 ring-4 ring-indigo-50 dark:ring-indigo-900/30">
              {userProfile.avatar_url ? (
                <img src={userProfile.avatar_url} alt={userProfile.full_name || 'User'} className="w-full h-full object-cover" />
              ) : (
                (userProfile.full_name || 'U').substring(0, 2).toUpperCase()
              )}
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {userProfile.full_name || 'Usuário'}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                {userProfile.job_title || 'Usuário'}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 gap-3 animate-in slide-in-from-bottom-8 duration-700 fade-in">
            
            <div className="mb-2">
              <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest pl-1">Informações de Contato</span>
            </div>

            <InfoField 
              label="E-mail de Acesso" 
              value={userProfile.email} 
              id="email" 
              icon={Mail}
            />
            
            <div className="grid grid-cols-2 gap-3">
              <InfoField 
                label="Telefone" 
                value={userProfile.phone} 
                id="phone" 
                icon={Phone}
              />
              <InfoField 
                label="Localização" 
                value={userProfile.location} 
                id="location" 
                icon={MapPin}
              />
            </div>



            {/* Seção: Escritório */}
            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-5">
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest pl-1">Escritório</span>
              </div>

              {loadingOffice ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                  <Loader2 size={18} className="animate-spin mb-1 text-indigo-500" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Buscando dados...</span>
                </div>
              ) : !officeDetails ? (
                <div className="py-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Dados do escritório ainda não cadastrados.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <InfoField
                    label="Razão Social"
                    value={officeDetails.company_name}
                    id="office-name"
                    icon={Building2}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <InfoField
                      label="CNPJ"
                      value={officeDetails.document}
                      id="office-doc"
                      icon={Landmark}
                    />
                    <InfoField
                      label="Localidade"
                      value={officeDetails.city && officeDetails.state ? `${officeDetails.city}/${officeDetails.state}` : officeDetails.city || '---'}
                      id="office-city"
                      icon={MapPin}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Seção: Plano & Contrato */}
            {officeDetails && !loadingOffice && (
              <div className="mt-4">
                <div className="mb-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-5">
                  <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest pl-1">Plano & Contrato</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 space-y-4">
                  {/* Plano e Valor */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/10 to-sky-500/10 border border-indigo-200/50 dark:border-indigo-500/20">
                        <Crown size={16} className="text-indigo-500" />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Plano Atual</span>
                        <span className="text-sm font-black bg-gradient-to-r from-indigo-500 to-sky-400 bg-clip-text text-transparent leading-tight">
                          {officeDetails.plan_name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Mensal</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {officeDetails.plan_name === 'Elite'
                          ? 'Consulta'
                          : `R$ ${Number(officeDetails.plan_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Barra de Storage */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <HardDrive size={11} className="text-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Armazenamento</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {(officeDetails.storage_used_bytes / (1024 * 1024 * 1024)).toFixed(2)} / {officeDetails.storage_limit_gb} GB
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (officeDetails.storage_used_bytes / (officeDetails.storage_limit_gb * 1024 * 1024 * 1024)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Contrato */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-1.5">
                      <FileText size={12} className="text-slate-400" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Contrato</span>
                    </div>
                    {officeDetails.contract_url ? (
                      <a
                        href={officeDetails.contract_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-full transition-all shadow-sm active:scale-95"
                      >
                        <FileText size={10} /> Ver PDF <ExternalLink size={9} />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Não anexado</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {userProfile.role === 'cliente' && (
              <div className="mt-4">
                <div className="mb-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-5">
                  <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest pl-1">Minhas Empresas</span>
                  <span className="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {companies.length}
                  </span>
                </div>

                {loadingCompanies ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                    <Loader2 size={18} className="animate-spin mb-1 text-indigo-500" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Buscando empresas...</span>
                  </div>
                ) : companies.length === 0 ? (
                  <div className="py-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Nenhuma empresa vinculada.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {companies.map((company: any) => {
                      const typeStyle = (company.establishment_type || '').toLowerCase() === 'matriz'
                        ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 border border-violet-100 dark:border-violet-500/20'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20';
                      
                      const statusStyle = company.status === 'Ativo'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20';

                      return (
                        <div key={company.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 flex flex-col gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 leading-snug truncate" title={company.company_name}>
                                {company.company_name}
                              </h4>
                              {company.trade_name && (
                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 truncate" title={company.trade_name}>
                                  {company.trade_name}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {company.establishment_type && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${typeStyle}`}>
                                  {company.establishment_type}
                                </span>
                              )}
                              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${statusStyle}`}>
                                {company.status || 'Ativo'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <div>
                              <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">CNPJ</span>
                              <span className="font-mono text-slate-700 dark:text-slate-350 select-all">{company.document || '---'}</span>
                            </div>
                            <div>
                              <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Localidade</span>
                              <span className="text-slate-700 dark:text-slate-350 truncate block" title={company.city}>{company.city && company.state ? `${company.city}-${company.state}` : company.city || '---'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
