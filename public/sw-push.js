// sw-push.js - Manipulador robusto de Web Push (Compatível com Declarative Web Push RFC 8030 + Legado)

self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Task Account',
    body: 'Você recebeu uma nova mensagem.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-badge.png',
    image: undefined,
    tag: 'task-account-chat',
    appBadge: 1,
    data: {
      url: '/?tab=chat'
    }
  };

  if (event.data) {
    try {
      const payload = event.data.json();

      // Suporte ao envelope Declarative Web Push (Safari/iOS 18.4+ RFC 8030)
      if (payload && payload.web_push === 8030 && payload.notification) {
        const n = payload.notification;
        notificationData = {
          ...notificationData,
          title: n.title || notificationData.title,
          body: n.body || notificationData.body,
          icon: n.icon || notificationData.icon,
          badge: n.badge || notificationData.badge,
          image: n.image || payload.image,
          tag: n.tag || notificationData.tag,
          appBadge: typeof n.app_badge === 'number' ? n.app_badge : (parseInt(n.app_badge, 10) || 1),
          data: {
            ...notificationData.data,
            ...(payload.data || {}),
            url: (payload.data && payload.data.url) || n.navigate || notificationData.data.url
          }
        };
      } else {
        notificationData = {
          ...notificationData,
          ...payload,
          data: {
            ...notificationData.data,
            ...(payload.data || {})
          }
        };
      }
    } catch (e) {
      const text = event.data.text();
      if (text) {
        notificationData.body = text;
      }
    }
  }

  const isClientDoc =
    notificationData.data?.eventType === 'client_document' ||
    notificationData.data?.tab === 'client-portal';

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/pwa-192x192.png',
    badge: '/pwa-badge.png',
    ...(notificationData.image ? { image: notificationData.image } : {}),
    tag: notificationData.tag || (isClientDoc ? 'client-docs' : 'task-account-chat'),
    renotify: true,
    silent: false,
    vibrate: [200, 100, 200],
    data: notificationData.data,
    actions: [
      isClientDoc
        ? { action: 'open_portal', title: 'Ver Documentos' }
        : { action: 'open_chat', title: 'Abrir Conversa' }
    ]
  };

  const handlePushPromise = (async () => {
    // Atualiza o badge numérico no ícone do PWA instalado (Android / iOS / Desktop)
    try {
      if (self.navigator && typeof self.navigator.setAppBadge === 'function') {
        const badgeNum = Number(notificationData.appBadge) || 1;
        await self.navigator.setAppBadge(badgeNum);
      }
    } catch (_) {
      // Ignora caso o navegador não suporte Badging API no SW
    }

    // Evita banner redundante somente se o usuário estiver ativamente focado na tela correspondente
    const expectedTabParam = isClientDoc ? 'tab=client-portal' : 'tab=chat';
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const isActivelyViewingTarget = clientList.some(
      (c) => c.focused && c.visibilityState === 'visible' && (c.url || '').includes(expectedTabParam)
    );

    if (isActivelyViewingTarget) {
      return;
    }

    await self.registration.showNotification(notificationData.title, options);
  })();

  event.waitUntil(handlePushPromise);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawTargetUrl = event.notification?.data?.url || '/?tab=chat';
  const targetUrl = new URL(rawTargetUrl, self.location.origin).href;
  const notificationData = event.notification?.data || {};

  event.waitUntil(
    (async () => {
      try {
        if (self.navigator && typeof self.navigator.clearAppBadge === 'function') {
          await self.navigator.clearAppBadge();
        }
      } catch (_) {}

      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const sameOriginClients = clientList.filter((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });

      const targetTabHint = notificationData?.tab === 'client-portal' || notificationData?.eventType === 'client_document'
        ? 'tab=client-portal'
        : 'tab=chat';

      const preferredClient =
        sameOriginClients.find((c) => c.focused) ||
        sameOriginClients.find((c) => (c.url || '').includes(targetTabHint)) ||
        sameOriginClients[0];

      if (preferredClient && 'focus' in preferredClient) {
        await preferredClient.focus();
        try {
          preferredClient.postMessage({
            type: 'PUSH_NOTIFICATION_CLICKED',
            data: notificationData
          });
        } catch (err) {
          console.warn('Erro ao enviar postMessage para o cliente:', err);
        }
        return;
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});

// Renovação automática se o navegador/SO rotacionar o token de assinatura em segundo plano
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const options = event.oldSubscription?.options;
        if (!options?.applicationServerKey) return;

        const newSubscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: options.applicationServerKey
        });

        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientList) {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
            subscription: newSubscription.toJSON()
          });
        }
      } catch (err) {
        console.warn('Falha ao renovar inscrição push no Service Worker:', err);
      }
    })()
  );
});
