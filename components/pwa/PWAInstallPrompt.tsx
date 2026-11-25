import React, { useState, useEffect } from 'react';
import {
  Download,
  Share,
  PlusSquare,
  X,
  Smartphone,
  CheckCircle2,
  MoreVertical,
  Zap,
  BellRing,
  Maximize2,
  Copy,
  Check,
  ArrowLeft,
  Compass,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Tooltip } from '../ui/Tooltip';

interface PWAInstallPromptProps {
  forceOpen?: boolean;
  onCloseForce?: () => void;
}

const DISMISS_STORAGE_KEY = 'task_account_pwa_dismissed';
const DISMISS_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 dias

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  forceOpen = false,
  onCloseForce,
}) => {
  const {
    canInstall,
    isStandalone,
    isIOS,
    isIOSSafari,
    isMobile,
    isInstalled,
    installApp,
    hasNativePrompt,
  } = usePWAInstall();

  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'promo' | 'ios' | 'manual' | 'success'>('promo');
  const [iconLoadError, setIconLoadError] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setViewMode(isIOS ? 'ios' : 'promo');
      setIsOpen(true);
      return;
    }

    if (isStandalone || isInstalled) {
      setIsOpen(false);
      return;
    }

    // Exibe automaticamente apenas em dispositivos móveis (Android / iOS)
    if (!isMobile || (!canInstall && !isIOS)) {
      return;
    }

    try {
      const dismissedAt = localStorage.getItem(DISMISS_STORAGE_KEY);
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10);
        if (!Number.isNaN(elapsed) && elapsed < DISMISS_COOLDOWN_MS) {
          return;
        }
      }
    } catch {
      // Ignora erros de acesso ao localStorage em navegação restrita
    }

    const timer = setTimeout(() => {
      setViewMode('promo');
      setIsOpen(true);
    }, 1600);

    return () => clearTimeout(timer);
  }, [canInstall, isStandalone, isIOS, isMobile, isInstalled, forceOpen]);

  const handleDismiss = () => {
    setIsOpen(false);
    setViewMode('promo');
    setLinkCopied(false);
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString());
    } catch {
      // Ignora falha de escrita em storage
    }
    onCloseForce?.();
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setViewMode('ios');
      return;
    }

    const res = await installApp();
    if (res === 'accepted') {
      setViewMode('success');
      setTimeout(() => {
        setIsOpen(false);
        setViewMode('promo');
        onCloseForce?.();
      }, 2400);
    } else if (res === 'ios') {
      setViewMode('ios');
    } else {
      setViewMode('manual');
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      setLinkCopied(false);
    }
  };

  if (!isOpen && !forceOpen) return null;
  if (isStandalone && !forceOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-end justify-center sm:justify-end pointer-events-none sm:p-5"
      role="dialog"
      aria-modal="false"
      aria-labelledby="pwa-install-title"
    >
      {/* Backdrop sutil apenas no mobile para destacar o Bottom Sheet */}
      <div
        onClick={handleDismiss}
        aria-hidden="true"
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px] sm:hidden pointer-events-auto animate-in fade-in duration-200"
      />

      {/* Bottom Sheet (Mobile) / Popover Card (Tablet/Desktop quando forceOpen) */}
      <div className="relative w-full sm:w-[400px] pointer-events-auto animate-in fade-in slide-in-from-bottom-6 duration-300">
        <div className="bg-white/95 dark:bg-slate-900/95 glass-surface backdrop-blur-xl border-t sm:border border-slate-200/90 dark:border-slate-700/80 rounded-t-3xl sm:rounded-2xl p-5 pb-6 sm:p-5 shadow-[0_-16px_50px_rgba(15,23,42,0.22)] sm:shadow-[0_24px_60px_rgba(15,23,42,0.28)] dark:shadow-[0_-16px_50px_rgba(0,0,0,0.7)] text-slate-900 dark:text-slate-100">
          {/* Alça estilo App Sheet no Mobile */}
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-4 sm:hidden" />

          {/* Header estilo App Store */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative w-[52px] h-[52px] rounded-2xl bg-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-1 ring-black/10 dark:ring-white/15 shrink-0 overflow-hidden">
                {!iconLoadError ? (
                  <img
                    src="/pwa-192x192.png"
                    alt="Ícone Task Account"
                    onError={() => setIconLoadError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Zap size={26} className="fill-slate-950 stroke-slate-950" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-500/30">
                    <Sparkles size={10} />
                    App Oficial
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Pronto
                  </span>
                </div>
                <h3
                  id="pwa-install-title"
                  className="font-bold text-base text-slate-900 dark:text-white truncate mt-1"
                >
                  Task Account
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Acesso rápido • {isIOS ? 'iPhone / iPad (iOS)' : 'Android & Mobile'}
                </p>
              </div>
            </div>

            <Tooltip content="Fechar" position="left">
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Fechar aviso de instalação"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 glass-control-pill transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </Tooltip>
          </div>

          {/* Conteúdo dinâmico */}
          {viewMode === 'success' && (
            <div className="mt-4 flex items-center gap-3 p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-sm">Aplicativo instalado!</p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                  Procure o ícone do Task Account na tela inicial do seu celular.
                </p>
              </div>
            </div>
          )}

          {viewMode === 'ios' && (
            <div className="mt-4 space-y-3">
              {!isIOSSafari && (
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
                  <div className="flex items-start gap-2">
                    <Compass size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      Para instalar no iPhone ou iPad, abra este endereço no navegador <strong>Safari</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-amber-300/80 dark:border-amber-500/40 text-amber-800 dark:text-amber-200 font-semibold text-xs hover:bg-amber-100/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    {linkCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    <span>{linkCopied ? 'Link copiado! Cole no Safari' : 'Copiar link para abrir no Safari'}</span>
                  </button>
                </div>
              )}

              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                Siga os passos abaixo no <strong>Safari</strong> para adicionar à sua tela inicial:
              </p>

              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/70 glass-card-inset rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-700/60 text-xs">
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-bold shrink-0">
                    1
                  </span>
                  <span className="flex-1">
                    Toque no botão <strong>Compartilhar</strong> na barra do Safari
                  </span>
                  <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-200/70 dark:border-sky-500/30 shrink-0">
                    <Share size={15} />
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-bold shrink-0">
                    2
                  </span>
                  <span className="flex-1">
                    Role e toque em <strong>Adicionar à Tela de Início</strong>
                  </span>
                  <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-500/30 shrink-0">
                    <PlusSquare size={15} />
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-bold shrink-0">
                    3
                  </span>
                  <span className="flex-1">
                    Confirme tocando em <strong>Adicionar</strong> no canto superior direito
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] shrink-0">
                    Adicionar
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setViewMode('promo')}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-colors cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          )}

          {viewMode === 'manual' && (
            <div className="mt-4 space-y-3">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                Para instalar manualmente pelo navegador do seu celular:
              </p>

              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/70 glass-card-inset rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-700/60 text-xs">
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-bold shrink-0">
                    1
                  </span>
                  <span className="flex-1">
                    Toque no menu <strong>(três pontos ⋮)</strong> do navegador
                  </span>
                  <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200/70 dark:border-amber-500/30 shrink-0">
                    <MoreVertical size={15} />
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-bold shrink-0">
                    2
                  </span>
                  <span className="flex-1">
                    Selecione <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>
                  </span>
                  <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-500/30 shrink-0">
                    <PlusSquare size={15} />
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setViewMode('promo')}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-colors cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          )}

          {viewMode === 'promo' && (
            <div className="mt-4 space-y-3.5">
              <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Instale o <strong>Task Account</strong> na sua tela inicial para abrir mais rápido, em tela cheia e receber notificações em tempo real.
              </p>

              {/* Micro-benefícios */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center text-center gap-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 glass-card-inset border border-slate-200/70 dark:border-slate-700/50">
                  <Zap size={14} className="text-amber-500" />
                  <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                    Acesso em 1 toque
                  </span>
                </div>
                <div className="flex flex-col items-center text-center gap-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 glass-card-inset border border-slate-200/70 dark:border-slate-700/50">
                  <Maximize2 size={14} className="text-indigo-500 dark:text-indigo-400" />
                  <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                    Modo Tela Cheia
                  </span>
                </div>
                <div className="flex flex-col items-center text-center gap-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 glass-card-inset border border-slate-200/70 dark:border-slate-700/50">
                  <BellRing size={14} className="text-emerald-500 dark:text-emerald-400" />
                  <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                    Alertas Push
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-0.5">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  {isIOS ? (
                    <>
                      <Smartphone size={17} />
                      <span>Instalar no iPhone</span>
                    </>
                  ) : (
                    <>
                      <Download size={17} />
                      <span>{hasNativePrompt ? 'Instalar Agora' : 'Instalar Aplicativo'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="py-3 px-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Agora não
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
