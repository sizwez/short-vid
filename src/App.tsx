import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './components/ToastContainer';
import './index.css';

// Lazy loaded components for code splitting
const SplashScreen = React.lazy(() => import('./components/SplashScreen'));
const OnboardingFlow = React.lazy(() => import('./components/OnboardingFlow'));
const FeatureCarousel = React.lazy(() => import('./components/FeatureCarousel'));
const MainApp = React.lazy(() => import('./components/MainApp'));

const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered:', registration);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

registerServiceWorker();

// A global fallback spinner class
const FallbackSpinner = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-black">
    <div className="w-12 h-12 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />
  </div>
);

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <Router>
          <div className="min-h-screen bg-black">
            <Suspense fallback={<FallbackSpinner />}>
              <Routes>
                <Route path="/" element={<SplashScreen />} />
                <Route path="/features" element={<FeatureCarousel />} />
                <Route path="/onboarding/*" element={<OnboardingFlow />} />
                <Route path="/app/*" element={<MainApp />} />
              </Routes>
            </Suspense>
          </div>
        </Router>
      </ToastProvider>
    </AppProvider>
  );
}

export default App;
