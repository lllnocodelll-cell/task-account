import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellRing, Smartphone, Share, PlusSquare, X, ExternalLink, Copy } from 'lucide-react';
import {
  getPushNotificationState,
  registerPushSubscription,
  PushNotificationState
} from '../../utils/webPush';
import { useToast } from '../../contexts/ToastContext';
import { Tooltip } from '../ui/Tooltip';

interface PushNotificationBannerProps {
  userId: string;
  orgId?: string | null;
  className?: string;
  compact?: boolean;
}

export const PushNotificationBanner: React.FC<PushNotificationBannerProps> = ({
  userId,
  orgId,
  className = '',
  compact = false
}) => {
  const [pushState, setPushState] = useState<PushNotificationState>('unsupported');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('taskaccount_push_banner_dismissed') === 'true';
  });
  const [showIOSModal, setShowIOSModal] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const checkState = async () => {
      const state = await getPushNotificationState();
      setPushState(state);
    };
    checkState();
  }, [userId]);

  if (pushState === 'granted' || pushState === 'unsupported' || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('taskaccount_push_banner_dismissed', 'true');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      addToast('success', 'Link copiado', 'Cole no Safari ou Chrome para ativar as notificações no celular.');
    } catch {
      addToast('info', 'Abra no navegador', 'Use o menu do aplicativo para abrir no Safari ou Chrome.');
    }
  };

  const handleEnablePush = async () => {
    if (pushState === 'in_app_browser') {
      await handleCopyLink();
      return;
    }

    if (pushState === 'needs_ios_install') {
      setShowIOSModal(true);
      return;
    }

    if (pushState === 'needs_android_install') {
      addToast('info', 'Use o Aplicativo Instalado', 'Para evitar notificações duplicadas no navegador, abra o Task Account pelo ícone instalado na sua Tela Inicial.');
      return;
    }

    setIsSubscribing(true);
    try {
      const success = await registerPushSubscription(userId, orgId);
      if (success) {
        setPushState('granted');
        addToast('success', 'Notificações Ativadas', 'Você receberá alertas no seu celular mesmo com a tela bloqueada!');
      } else {
        if (Notification.permission === 'denied') {
          setPushState('denied');
          addToast('warning', 'Permissão Bloqueada', 'As notificações foram bloqueadas no seu navegador. Ative-as nas configurações do site.');
        } else {
          addToast('error', 'Atenção', 'Não foi possível ativar as notificações no momento.');
        }
      }
    } catch (err: any) {
      console.error('Erro ao ativar notificações push:', err);
      addToast('error', 'Erro', 'Erro ao solicitar permissão de notificações.');
    } finally {
      setIsSubscribing(false);
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center justify-between p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl ${className}`}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <BellRing size={16} />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Notificações no Celular
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {pushState === 'denied'
                ? 'Bloqueadas pelo navegador'
                : pushState === 'in_app_browser'
                  ? 'Abra no Safari ou Chrome para ativar'
                  : pushState === 'needs_android_install'
                    ? 'Abra pelo aplicativo instalado para ativar'
                    : 'Receba avisos com o celular bloqueado'}
            </p>
          </div>
        </div>
        {pushState !== 'denied' && (
          <button
            type="button"
            onClick={handleEnablePush}
            disabled={isSubscribing}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {pushState === 'in_app_browser' ? <Copy size={13} /> : <Bell size={13} />}
            <span>
              {pushState === 'in_app_browser'
                ? 'Copiar Link'
                : isSubscribing
                  ? 'Ativando...'
                  : 'Ativar'}
            </span>
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={`relative overflow-hidden p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent dark:from-indigo-950/50 dark:via-purple-950/30 border border-indigo-200/70 dark:border-indigo-800/60 shadow-xs ${className}`}>
        <div className="absolute top-2.5 right-2.5">
          <Tooltip content="Fechar aviso" position="left">
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              aria-label="Fechar aviso"
            >
              <X size={15} />
            </button>
          </Tooltip>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 pr-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 rounded-xl shadow-xs shrink-0 mt-0.5 sm:mt-0">
              {pushState === 'in_app_browser' ? (
                <ExternalLink size={20} />
              ) : (
                <BellRing size={20} className="animate-pulse" />
              )}
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>
                  {pushState === 'in_app_browser'
                    ? 'Abra no Safari ou Chrome para Notificações'
                    : 'Ativar Notificações no Celular'}
                </span>
                <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300">
                  PWA
                </span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed max-w-xl">
                {pushState === 'in_app_browser'
                  ? 'Você abriu o portal pelo navegador interno de outro app (ex.: WhatsApp/Instagram). Abra no Safari ou Chrome e adicione à Tela Inicial para receber alertas.'
                  : pushState === 'needs_ios_install'
                    ? 'No iPhone, adicione o aplicativo à Tela de Início para poder receber avisos em tempo real.'
                    : pushState === 'needs_android_install'
                      ? 'Instale e abra o Task Account pelo ícone da sua Tela Inicial para centralizar as notificações apenas no aplicativo.'
                      : 'Receba alertas instantâneos de mensagens e novidades no seu smartphone mesmo com a tela bloqueada.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={isSubscribing}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {pushState === 'in_app_browser' ? (
                <>
                  <Copy size={15} />
                  <span>Copiar Link</span>
                </>
              ) : pushState === 'needs_ios_install' ? (
                <>
                  <Smartphone size={15} />
                  <span>Como Ativar no iPhone</span>
                </>
              ) : pushState === 'needs_android_install' ? (
                <>
                  <Smartphone size={15} />
                  <span>Abrir pelo App Instalado</span>
                </>
              ) : (
                <>
                  <Bell size={15} />
                  <span>{isSubscribing ? 'Ativando...' : 'Ativar Notificações'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal explicativo para iOS / iPhone */}
      {showIOSModal && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 mx-auto mb-4 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-900 shadow-sm">
              <Smartphone size={28} />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Ativar Notificações no iPhone
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
              O sistema iOS (Apple) requer que a aplicação seja adicionada à <strong>Tela de Início</strong> pelo Safari para permitir notificações push e avisos no ícone.
            </p>

            <div className="text-left space-y-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6">
              <div className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <p>No Safari do iPhone, toque no botão <strong>Compartilhar</strong> <Share size={13} className="inline mx-0.5 text-indigo-500" /> na barra inferior.</p>
              </div>
              <div className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <p>Role para baixo e selecione <strong>Adicionar à Tela de Início</strong> <PlusSquare size={13} className="inline mx-0.5 text-indigo-500" />.</p>
              </div>
              <div className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                <p>Abra o app pelo ícone criado na tela inicial e toque em <strong>Ativar Notificações</strong>.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-95 transition-opacity cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
