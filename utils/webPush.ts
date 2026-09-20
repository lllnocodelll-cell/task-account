import { supabase } from './supabaseClient';
import { requestBrowserNotificationPermission } from './browserNotification';

/**
 * Utilitário para gerenciamento de Notificações Web Push PWA (Android e iOS 16.4+)
 */

const VAPID_PUBLIC_KEY = 
  import.meta.env.VITE_VAPID_PUBLIC_KEY || 
  'BOooEfOeJn4tUZYhXtnpzflJKtPQ6aiNuowyxSHQt6wveHw0oGEEp0vLN8-JT_0z0neBkfhj-i04Ur1UsPyHr9s';

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Identifica se o dispositivo é iOS (iPhone, iPad, iPod)
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Identifica se a aplicação está rodando em modo PWA Standalone (instalada na Tela de Início)
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as any).standalone) ||
    document.referrer.includes('android-app://')
  );
}

export type PushNotificationState = 
  | 'unsupported' 
  | 'needs_ios_install' 
  | 'denied' 
  | 'granted' 
  | 'default';

/**
 * Obtém o estado atual de suporte e permissão para notificações push no dispositivo
 */
export async function getPushNotificationState(): Promise<PushNotificationState> {
  if (typeof window === 'undefined') return 'unsupported';

  // No iOS, a Apple só permite Web Push se estiver instalado como PWA na Tela de Início
  if (isIOS() && !isStandalone()) {
    return 'needs_ios_install';
  }

  if (!isWebPushSupported()) {
    return 'unsupported';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  return 'default';
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
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    if (!registration || !registration.pushManager) {
      return false;
    }

    let subscription = await registration.pushManager.getSubscription();

    // Se não houver inscrição ativa ou a chave VAPID for diferente, criamos uma nova
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      } catch (err) {
        console.warn('PushManager.subscribe falhou ou foi bloqueado pelo navegador:', err);
        return false;
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
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Erro ao registrar inscrição Web Push:', error);
    return false;
  }
}

/**
 * Remove a inscrição Push do dispositivo atual e do banco de dados
 */
export async function unregisterPushSubscription(userId: string): Promise<boolean> {
  try {
    if (!isWebPushSupported()) return false;

    const registration = await navigator.serviceWorker.ready;
    if (!registration?.pushManager) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      if (userId && endpoint) {
        await (supabase as any)
          .from('user_push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', endpoint);
      }
    }

    return true;
  } catch (error) {
    console.error('Erro ao cancelar inscrição push:', error);
    return false;
  }
}

/**
 * Converte chave VAPID base64 para Uint8Array exigido pela Push API
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

/**
 * Invoca a Edge Function 'send-push' para disparar notificações Web Push em segundo plano
 */
export async function triggerPushNotification(params: {
  channelId?: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  recipientUserIds?: string[];
}): Promise<void> {
  try {
    await supabase.functions.invoke('send-push', {
      body: params
    });
  } catch (err) {
    console.warn('Falha silenciosa ao disparar push notification via Edge Function:', err);
  }
}
