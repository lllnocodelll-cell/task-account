import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone, CheckCircle2, MoreVertical, Info } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallPromptProps {
  forceOpen?: boolean;
  onCloseForce?: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ forceOpen = false, onCloseForce }) => {
  const { canInstall, isStandalone, isIOS, isInstalled, installApp, hasNativePrompt } = usePWAInstall();
  const [isOpen, setIsOpen] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      if (isIOS) {
        setShowIosGuide(true);
      }
      setIsOpen(true);
      return;
    }

    // Se já estiver instalado ou em modo standalone, não mostra
    if (isStandalone || isInstalled) {
      setIsOpen(false);
      return;
    }

    // Verifica se usuário dispensou recentemente (últimos 3 dias)
    const dismissedAt = localStorage.getItem('task_account_pwa_dismissed');
    if (dismissedAt) {
      const timeDiff = Date.now() - parseInt(dismissedAt, 10);
      if (timeDiff < 3 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Delay suave para não incomodar imediatamente ao carregar a página
    const timer = setTimeout(() => {
      if (canInstall) {
        setIsOpen(true);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [canInstall, isStandalone, isInstalled, forceOpen, isIOS]);

  const handleDismiss = () => {
    setIsOpen(false);
    setShowIosGuide(false);
    setShowManualGuide(false);
    localStorage.setItem('task_account_pwa_dismissed', Date.now().toString());
    if (onCloseForce) onCloseForce();
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide(true);
      return;
    }

    const res = await installApp();
    if (res === 'accepted') {
      setIsSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        if (onCloseForce) onCloseForce();
      }, 2500);
    } else if (res === 'ios') {
      setShowIosGuide(true);
    } else if (res === 'unsupported' || res === 'dismissed') {
      setShowManualGuide(true);
    }
  };

  if (!isOpen && !forceOpen) return null;
  if (isStandalone && !forceOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] z-[9999] animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 dark:bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl text-white">
        {/* Header com botão fechar */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/60 p-1.5 flex items-center justify-center shrink-0 shadow-inner">
              <img
                src="/1.1 Logo Dark.png"
                alt="Task Account"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Aplicativo</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-slate-100">
                Instalar Task Account
              </h3>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo */}
        {isSuccess ? (
          <div className="mt-4 flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
            <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold">Aplicativo instalado!</p>
              <p className="text-xs text-emerald-400/80">Você já pode acessá-lo diretamente da sua tela de início.</p>
            </div>
          </div>
        ) : showIosGuide ? (
          <div className="mt-3.5 space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              Para instalar no seu iPhone ou iPad pelo Safari:
            </p>
            <div className="space-y-2 bg-slate-800/80 rounded-xl p-3 border border-slate-700/50 text-xs">
              <div className="flex items-center gap-2.5 text-slate-200">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-[10px] font-bold">1</span>
                <span>Toque no botão de <strong>Compartilhar</strong></span>
                <Share size={15} className="text-sky-400 ml-auto" />
              </div>
              <div className="flex items-center gap-2.5 text-slate-200">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-[10px] font-bold">2</span>
                <span>Role para baixo e toque em <strong>Adicionar à Tela de Início</strong></span>
                <PlusSquare size={15} className="text-emerald-400 ml-auto" />
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors text-center"
            >
              Entendido
            </button>
          </div>
        ) : showManualGuide ? (
          <div className="mt-3.5 space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              Para adicionar o atalho à sua tela inicial:
            </p>
            <div className="space-y-2 bg-slate-800/80 rounded-xl p-3 border border-slate-700/50 text-xs">
              <div className="flex items-center gap-2.5 text-slate-200">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-[10px] font-bold">1</span>
                <span>Toque no menu <strong>(três pontos ⋮)</strong> do navegador</span>
                <MoreVertical size={15} className="text-amber-400 ml-auto" />
              </div>
              <div className="flex items-center gap-2.5 text-slate-200">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-[10px] font-bold">2</span>
                <span>Selecione <strong>Adicionar à tela inicial</strong> ou <strong>Instalar app</strong></span>
                <PlusSquare size={15} className="text-emerald-400 ml-auto" />
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[11px] text-indigo-300">
              <Info size={14} className="text-indigo-400 shrink-0 mt-0.5" />
              <span>Em produção com <strong>HTTPS</strong>, o botão instala com 1 clique. Em desenvolvimento via IP (HTTP), navegadores exigem adicionar pelo menu ⋮ por segurança.</span>
            </div>
            <button
              onClick={handleDismiss}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors text-center"
            >
              Entendido
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              Adicione o Task Account à sua tela inicial para acesso rápido, navegação em tela cheia e notificações instantâneas.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleInstallClick}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
              >
                {isIOS ? (
                  <>
                    <Smartphone size={16} />
                    <span>Ver como Adicionar</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Instalar Aplicativo</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDismiss}
                className="py-2.5 px-3 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
              >
                Depois
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
