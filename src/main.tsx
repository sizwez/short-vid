import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { registerSW } from 'virtual:pwa-register';
import { initGA, trackPageView } from './lib/analytics';
import { initMonitoring } from './lib/monitoring';

// Initialize Analytics and Monitoring
initGA();
initMonitoring();

// Manual Service Worker Registration for background messaging
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then(reg => console.log('Top-level Service Worker registered:', reg))
    .catch(err => console.error('Top-level Service Worker failed:', err));
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
