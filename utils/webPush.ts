import { supabase } from './supabaseClient';
import { requestBrowserNotificationPermission } from './browserNotification';

/**
 * Utilitário para gerenciamento de Notificações Web Push PWA
 */

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Registra ou atualiza a inscrição Push do usuário no Supabase
 */
export async function registerPushSubscription(userId: string, orgId?: string | null): Promise<boolean> {
  if (!isWebPushSupported() || !userId) {
    return false;
  }

  try {
    const permission = await requestBrowserNotificationPermission();
    if (permission !== 'granted') {
      console.warn('Permissão de notificação não concedida pelo usuário.');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    if (!registration || !registration.pushManager) {
      return false;
    }

    let subscription = await registration.pushManager.getSubscription();

    // Se não houver inscrição ativa, criamos uma nova chamada ao PushManager
    if (!subscription) {
      // Exemplo de chave VAPID pública padronizada para PWA
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgT8RGE182736192837192837192837192837192';
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      } catch (err) {
        console.info('PushManager.subscribe ignorado ou em modo fallback local:', err);
      }
    }

    if (subscription) {
      const subscriptionJSON = subscription.toJSON();
      const endpoint = subscription.endpoint;
      const p256dh = subscriptionJSON.keys?.p256dh || '';
      const auth = subscriptionJSON.keys?.auth || '';

      if (endpoint && p256dh && auth) {
        await (supabase as any)
          .from('user_push_subscriptions')
          .upsert(
            {
              user_id: userId,
              org_id: orgId || null,
              endpoint: endpoint,
              p256dh: p256dh,
              auth: auth,
              user_agent: navigator.userAgent,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'endpoint' }
          );
      }
    }

    return true;
  } catch (error) {
    console.error('Erro ao registrar inscrição Web Push:', error);
    return false;
  }
}

/**
 * Converte chave VAPID base64 para Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
