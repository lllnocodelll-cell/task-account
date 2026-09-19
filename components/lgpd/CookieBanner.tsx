import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, Settings, Check, X } from 'lucide-react';
import { LegalTabType } from './LegalModal';

interface CookieBannerProps {
  onOpenLegalModal: (tab: LegalTabType) => void;
}

const STORAGE_KEY = 'taskaccount_lgpd_consent_v1';

export const CookieBanner: React.FC<CookieBannerProps> = ({ onOpenLegalModal }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verifica se o usuário já salvou preferências
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Exibe após 1 segundo para uma transição suave pós-carregamento
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Permite que qualquer link (como o do rodapé) reabra o banner
  useEffect(() => {
    const handleReopen = () => setIsVisible(true);
    window.addEventListener('taskaccount_reopen_cookies', handleReopen);
    return () => window.removeEventListener('taskaccount_reopen_cookies', handleReopen);
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        necessary: true,
        analytics: true,
        security: true,
        timestamp: new Date().toISOString()
      })
    );
    setIsVisible(false);
  };

  const handleAcceptNecessaryOnly = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        necessary: true,
        analytics: false,
        security: true,
        timestamp: new Date().toISOString()
      })
    );
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Aviso de Privacidade e Cookies"
      className="fixed bottom-3 sm:bottom-6 left-3 sm:left-6 right-3 sm:right-6 z-40 max-w-4xl mx-auto animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#0F1422]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl shadow-slate-900/20 dark:shadow-black/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Texto e Ícone Informativo */}
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 dark:bg-yellow-400/10 border border-amber-500/20 dark:border-yellow-400/20 flex items-center justify-center text-amber-600 dark:text-yellow-400 shrink-0 mt-0.5 sm:mt-0">
            <ShieldCheck size={20} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Privacidade & Proteção de Dados (LGPD)
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold">
                Lei 13.709/18
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              Utilizamos cookies estritamente necessários e tecnologias seguras para assegurar o funcionamento da plataforma contábil e aprimorar sua experiência. Saiba mais em nossa{' '}
              <button
                type="button"
                onClick={() => onOpenLegalModal('privacy')}
                className="text-amber-600 dark:text-yellow-400 font-bold hover:underline cursor-pointer"
              >
                Política de Privacidade
              </button>{' '}
              e{' '}
              <button
                type="button"
                onClick={() => onOpenLegalModal('terms')}
                className="text-amber-600 dark:text-yellow-400 font-bold hover:underline cursor-pointer"
              >
                Termos de Uso
              </button>.
            </p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap sm:flex-nowrap justify-end">
          <button
            type="button"
            onClick={() => onOpenLegalModal('cookies')}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            title="Personalizar preferências de cookies"
          >
            <Settings size={13} />
            <span>Preferências</span>
          </button>

          <button
            type="button"
            onClick={handleAcceptNecessaryOnly}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/10 border border-slate-300/80 dark:border-white/15 transition-colors cursor-pointer text-center"
            title="Aceitar somente cookies necessários"
          >
            Apenas Necessários
          </button>

          <button
            type="button"
            onClick={handleAcceptAll}
            className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-black bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-md shadow-yellow-400/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            title="Aceitar todos os cookies"
          >
            <Check size={14} className="stroke-[3]" />
            <span>Aceitar Todos</span>
          </button>
        </div>

      </div>
    </aside>
  );
};
