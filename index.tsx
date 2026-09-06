import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Registra o Service Worker do PWA com atualização automática
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] Nova versão do Task Account disponível.');
  },
  onOfflineReady() {
    console.log('[PWA] Task Account pronto para uso offline.');
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);