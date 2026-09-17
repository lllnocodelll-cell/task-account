/**
 * Utilitário para gerenciamento de notificações da Web Notification API nativa.
 * Permite alertar o usuário mesmo quando a aba do navegador não está em foco ou no celular.
 */

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  } catch {
    return 'denied';
  }
}

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function sendBrowserNotification(
  title: string,
  options?: {
    body?: string;
    tag?: string;
    icon?: string;
    force?: boolean;
    onClick?: () => void;
  }
) {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  try {
    const isDocHidden = typeof document !== 'undefined' && document.hidden;
    // Se force for verdadeiro ou a página estiver em segundo plano, exibe a notificação
    if (!isDocHidden && !options?.force) {
      return;
    }

    const n = new Notification(title, {
      body: options?.body,
      tag: options?.tag || 'task-account-alert',
      icon: options?.icon || '/pwa-192x192.png',
      badge: '/favicon.png'
    });

    n.onclick = () => {
      try {
        window.focus();
      } catch {
        // Silencioso se o sistema impedir foco automático
      }
      options?.onClick?.();
      n.close();
    };
  } catch (err) {
    console.warn('Erro ao enviar notificação nativa:', err);
  }
}
