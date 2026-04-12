window.global = window;
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { initGA, trackPageView } from './lib/analytics';
import { initMonitoring } from './lib/monitoring';

// --- STABILITY CIRCUIT BREAKER ---
const BOOT_ID = Math.random().toString(36).substring(7);
console.log(`%c[SYSTEM] App Booting. ID: ${BOOT_ID}`, 'color: #00ff00; font-weight: bold;');

// Block rapid reloads for the first 5 seconds to break infinite loops.
// We intercept beforeunload instead of overriding the read-only location.reload.
let bootGuardActive = true;
setTimeout(() => {
  bootGuardActive = false;
  console.log('[SYSTEM] Boot Guard released');
}, 5000);

window.addEventListener('beforeunload', (e) => {
  if (bootGuardActive) {
    e.preventDefault();
    console.warn('[SYSTEM] Automatic reload blocked by Boot Guard');
  }
});
// ---------------------------------

// Initialize Analytics and Monitoring
initGA();
initMonitoring();

// Manual Service Worker Registration for background messaging
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
      .then(reg => {
        console.log(`[SYSTEM] Isolated SW Registered (ID: ${BOOT_ID})`, reg.scope);
      })
      .catch(err => console.error('[SYSTEM] SW Registration Failed', err));

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      console.log('[SYSTEM] SW Controller Change suppressed');
      refreshing = true;
    });
  });
}

const Root = () => {
  useEffect(() => {
    trackPageView(window.location.pathname);
  }, []);

  return <App />;
};

createRoot(document.getElementById('root')!).render(<Root />);
