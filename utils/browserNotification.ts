/**
 * Utilitário para gerenciamento de notificações da Web Notification API nativa.
 * Permite alertar o usuário mesmo quando a aba do navegador não está em foco.
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

export function sendBrowserNotification(title: string, options?: { body?: string; tag?: string; onClick?: () => void }) {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  try {
    // Apenas dispara se o documento estiver oculto ou fora de foco para não ser redundante com o som/toast
    const isDocHidden = typeof document !== 'undefined' && document.hidden;
    if (!isDocHidden) {
      return;
    }

    const n = new Notification(title, {
      body: options?.body,
      tag: options?.tag || 'task-account-alert',
      icon: '/favicon.ico',
      badge: '/favicon.ico'
    });

    if (options?.onClick) {
      n.onclick = () => {
        window.focus();
        options.onClick?.();
        n.close();
      };
    }
  } catch {
    // Silencioso em caso de bloqueio
  }
}
