// public/sw.js

// Ouve o evento de Push vindo do servidor (FCM/Apple)
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json(); // Nosso "Payload Cego" (sem dados sensíveis)
    
    const options = {
      body: data.body || "Você tem uma nova notificação.",
      icon: '/icon-192x192.png', // Adicione o logo da clínica na pasta public
      badge: '/badge-72x72.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/' // Para onde ir ao clicar
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "Clínica", options)
    );
  }
});

// Ouve o clique na notificação
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Fecha a notificação no celular

  // Tenta focar em uma aba já aberta, senão abre uma nova
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        let client = windowClients[i];
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});