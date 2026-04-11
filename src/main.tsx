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
