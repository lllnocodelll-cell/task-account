// sw-push.js - Manipulador robusto de Web Push (Compatível com Declarative Web Push RFC 8030 + Legado)

self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Task Account',
    body: 'Você recebeu uma nova mensagem.',
    icon: '/pwa-192x192.png',
    badge: '/favicon.png',
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

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/pwa-192x192.png',
    badge: notificationData.badge || '/favicon.png',
    tag: notificationData.tag || 'task-account-chat',
    renotify: true,
    silent: false,
    vibrate: [200, 100, 200],
    data: notificationData.data,
    actions: [
      { action: 'open_chat', title: 'Abrir Conversa' }
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

    // Evita banner redundante somente se o usuário estiver ativamente focado na tela de chat
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const isActivelyViewingChat = clientList.some(
      (c) => c.focused && c.visibilityState === 'visible' && (c.url || '').includes('tab=chat')
    );

    if (isActivelyViewingChat) {
      return;
    }

    await self.registration.showNotification(notificationData.title, options);
  })();

  event.waitUntil(handlePushPromise);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || '/?tab=chat';
  const notificationData = event.notification?.data || {};

  event.waitUntil(
    (async () => {
      try {
        if (self.navigator && typeof self.navigator.clearAppBadge === 'function') {
          await self.navigator.clearAppBadge();
        }
      } catch (_) {}

      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if ('focus' in client) {
          await client.focus();
          try {
            client.postMessage({
              type: 'PUSH_NOTIFICATION_CLICKED',
              data: notificationData
            });
          } catch (err) {
            console.warn('Erro ao enviar postMessage para o cliente:', err);
          }
          return;
        }
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
