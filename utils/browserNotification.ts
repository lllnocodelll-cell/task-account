/**
 * Utilitário para gerenciamento de notificações da Web Notification API nativa.
 * Usa prioritariamente ServiceWorkerRegistration.showNotification() para compatibilidade
 * com Android Chrome PWA (onde `new Notification()` lança Illegal constructor).
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

export async function sendBrowserNotification(
  title: string,
  options?: {
    body?: string;
    tag?: string;
    icon?: string;
    url?: string;
    channelId?: string;
    force?: boolean;
    onClick?: () => void;
  }
) {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  try {
    const isDocHidden = typeof document !== 'undefined' && document.hidden;
    if (!isDocHidden && !options?.force) {
      return;
    }

    const notifOptions: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
      body: options?.body,
      tag: options?.tag || 'task-account-alert',
      renotify: true,
      icon: options?.icon || '/pwa-192x192.png',
      badge: '/favicon.png',
      vibrate: [200, 100, 200],
      data: {
        url: options?.url || (options?.channelId ? `/?tab=chat&channelId=${options.channelId}` : '/?tab=chat'),
        channelId: options?.channelId
      }
    };

    // No Android/PWA instalado, `new Notification()` falha — usar o Service Worker é obrigatório
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, notifOptions);
        return;
      }
    }

    const n = new Notification(title, notifOptions);
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
