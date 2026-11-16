import { supabase } from './supabaseClient';
import { requestBrowserNotificationPermission } from './browserNotification';

/**
 * Utilitário para gerenciamento de Notificações Web Push PWA (Android e iOS 16.4+)
 */

const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BOooEfOeJn4tUZYhXtnpzflJKtPQ6aiNuowyxSHQt6wveHw0oGEEp0vLN8-JT_0z0neBkfhj-i04Ur1UsPyHr9s';

const PUSH_SUBSCRIBED_FLAG_KEY = 'taskaccount_push_subscribed';

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
 * Identifica se a aplicação está rodando dentro de navegador embutido (WhatsApp, Instagram, Facebook, etc.)
 * onde a instalação de PWA e o Web Push não estão disponíveis.
 */
export function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /WhatsApp|FBAN|FBAV|Instagram|Line\/|MicroMessenger|\bwv\b/i.test(ua);
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
  | 'in_app_browser'
  | 'needs_ios_install'
  | 'denied'
  | 'granted'
  | 'default';

/**
 * Obtém o estado atual de suporte e permissão para notificações push no dispositivo
 */
export async function getPushNotificationState(): Promise<PushNotificationState> {
  if (typeof window === 'undefined') return 'unsupported';

  if (isInAppBrowser() && !isStandalone()) {
    return 'in_app_browser';
  }

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

export function hasActivePushSubscriptionFlag(): boolean {
  try {
    return typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted' &&
      window.localStorage.getItem(PUSH_SUBSCRIBED_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

async function saveSubscriptionToDatabase(
  userId: string,
  orgId: string | null | undefined,
  subscriptionJSON: PushSubscriptionJSON
): Promise<boolean> {
  const endpoint = subscriptionJSON.endpoint;
  const p256dh = subscriptionJSON.keys?.p256dh || '';
  const auth = subscriptionJSON.keys?.auth || '';

  if (!endpoint || !p256dh || !auth) {
    return false;
  }

  const { error } = await (supabase as any)
    .from('user_push_subscriptions')
    .upsert(
      {
        user_id: userId,
        org_id: orgId || null,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'endpoint' }
    );

  if (error) {
    console.warn('Erro ao persistir inscrição push no Supabase:', error.message);
    return false;
  }

  try {
    window.localStorage.setItem(PUSH_SUBSCRIBED_FLAG_KEY, 'true');
  } catch {
    // Ignora falha de localStorage
  }

  return true;
}

function keysMatchVapid(existingKey: ArrayBuffer | null | undefined, expected: Uint8Array): boolean {
  if (!existingKey) return true;
  const existingBytes = new Uint8Array(existingKey);
  if (existingBytes.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (existingBytes[i] !== expected[i]) return false;
  }
  return true;
}

async function ensureAndSyncSubscription(userId: string, orgId?: string | null): Promise<boolean> {
  const registration = await navigator.serviceWorker.ready;
  if (!registration || !registration.pushManager) {
    return false;
  }

  const expectedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  let subscription = await registration.pushManager.getSubscription();

  // Se a chave VAPID mudou desde a última inscrição, renova o endpoint
  if (subscription && !keysMatchVapid(subscription.options?.applicationServerKey, expectedKey)) {
    try {
      await subscription.unsubscribe();
    } catch {
      // Continua tentando criar nova assinatura
    }
    subscription = null;
  }

  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: expectedKey as unknown as BufferSource
      });
    } catch (err) {
      console.warn('PushManager.subscribe falhou ou foi bloqueado pelo navegador:', err);
      return false;
    }
  }

  return saveSubscriptionToDatabase(userId, orgId, subscription.toJSON());
}

/**
 * Sincroniza silenciosamente a inscrição no carregamento do app APENAS se o usuário já concedeu permissão.
 * Não dispara prompt de permissão sem gesto direto (evita bloqueio automático no iOS Safari / Android Chrome).
 */
export async function syncExistingPushSubscription(userId: string, orgId?: string | null): Promise<boolean> {
  if (!isWebPushSupported() || !userId) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    return await ensureAndSyncSubscription(userId, orgId);
  } catch (error) {
    console.warn('Erro ao sincronizar inscrição Web Push:', error);
    return false;
  }
}

/**
 * Registra ou atualiza a inscrição Push do usuário mediante gesto explícito (clique)
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

    return await ensureAndSyncSubscription(userId, orgId);
  } catch (error) {
    console.error('Erro ao registrar inscrição Web Push:', error);
    return false;
  }
}

/**
 * Registra listener no Service Worker para persistir tokens rotacionados em segundo plano
 */
export function listenPushSubscriptionChanges(userId: string, orgId?: string | null): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !userId) {
    return () => {};
  }

  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED' && event.data.subscription) {
      saveSubscriptionToDatabase(userId, orgId, event.data.subscription).catch(() => {});
    }
  };

  navigator.serviceWorker.addEventListener('message', onMessage);
  return () => navigator.serviceWorker.removeEventListener('message', onMessage);
}

/**
 * Atualiza o contador numérico no ícone do PWA instalado (Badging API)
 */
export async function updateAppBadge(count: number): Promise<void> {
  if (typeof navigator === 'undefined') return;
  try {
    const nav = navigator as any;
    if (count > 0 && typeof nav.setAppBadge === 'function') {
      await nav.setAppBadge(count);
    } else if (count <= 0 && typeof nav.clearAppBadge === 'function') {
      await nav.clearAppBadge();
    }
  } catch {
    // Navegador sem suporte à Badging API
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

    try {
      window.localStorage.removeItem(PUSH_SUBSCRIBED_FLAG_KEY);
    } catch {}

    return true;
  } catch (error) {
    console.error('Erro ao cancelar inscrição push:', error);
    return false;
  }
}

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
  isPrivate?: boolean;
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
