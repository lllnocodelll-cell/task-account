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
  Copy
} from 'lucide-react';

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

            <div className="mt-4 mb-2">
              <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest pl-1">Organização & Permissões</span>
            </div>

            <InfoField 
              label="Organização" 
              value={userProfile.org_name} 
              id="org" 
              icon={Building2}
            />

            <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-1.5">
                <Briefcase size={12} className="text-indigo-400" />
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nível de Acesso</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">
                  {userProfile.role}
                </span>
                {userProfile.role === 'gestor' ? (
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-widest">
                    Acesso Total
                  </span>
                ) : (
                  <span className="text-[9px] font-black text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/20 px-2 py-0.5 rounded uppercase tracking-widest">
                    Acesso Restrito
                  </span>
                )}
              </div>
            </div>

          </div>
          
        </div>
      </div>
    </>,
    document.body
  );
};
