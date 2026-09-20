// sw-push.js - Manipulador de eventos de Notificação Web Push para o PWA

self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Task Account',
    body: 'Você recebeu uma nova mensagem.',
    icon: '/pwa-192x192.png',
    badge: '/favicon.png',
    tag: 'task-account-chat',
    data: {
      url: '/?tab=chat'
    }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        ...notificationData,
        ...payload,
        data: {
          ...notificationData.data,
          ...(payload.data || {})
        }
      };
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
    vibrate: [200, 100, 200],
    data: notificationData.data,
    actions: [
      { action: 'open_chat', title: 'Abrir Conversa' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || '/?tab=chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se houver uma janela já aberta, foca nela e avisa para abrir o chat
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          try {
            client.postMessage({
              type: 'PUSH_NOTIFICATION_CLICKED',
              data: event.notification.data
            });
          } catch (err) {
            console.warn('Erro ao enviar postMessage para o cliente:', err);
          }
          return;
        }
      }

      // Se não houver janela aberta, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
