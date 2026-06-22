/* eslint-disable no-undef */
/**
 * Handler FCM carregado pelo service worker do Workbox (vite-plugin-pwa).
 * Mantém a config alinhada com `src/lib/firebase.ts`.
 */
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyAlfuN-ClRQnwGUSA8o4IlrUbG873WZDRI',
  authDomain: 'emerson-1e6d2.firebaseapp.com',
  projectId: 'emerson-1e6d2',
  storageBucket: 'emerson-1e6d2.firebasestorage.app',
  messagingSenderId: '927933111658',
  appId: '1:927933111658:web:b0ac5cf6de0fcbc5c11913',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Guia da Zen'
  const options = {
    body: payload.notification?.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {},
    tag: payload.data?.type || 'zen-notification',
  }
  return self.registration.showNotification(title, options)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
      return undefined
    }),
  )
})
