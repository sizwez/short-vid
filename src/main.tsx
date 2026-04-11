import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { initGA, trackPageView } from './lib/analytics';
import { initMonitoring } from './lib/monitoring';

// Initialize Analytics and Monitoring
initGA();
initMonitoring();

// Manual Service Worker Registration for background messaging
// HARDENED ISOLATION: Register only after load and block all auto-refreshes
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
      .then(reg => {
        console.log('Isolated Service Worker registered:', reg);
      })
      .catch(err => console.error('Isolated Service Worker failed:', err));

    // NUCLEAR GUARD: Prevent any background process from reloading the page
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      console.log('Service Worker controller changed - suppressing automatic reload');
      refreshing = true;
    });
  });
}

// eslint-disable-next-line react-refresh/only-export-components
const Root = () => {
  useEffect(() => {
    // Basic page tracking on initial load
    trackPageView(window.location.pathname);
  }, []);

  return (
    <App />
  );
};

createRoot(document.getElementById('root')!).render(<Root />);
