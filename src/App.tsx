import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './components/ToastContainer';
import { useApp } from './hooks/useApp';
import SplashScreen from './components/SplashScreen';
import './index.css';

// Lazy loaded components for code splitting
const OnboardingFlow = React.lazy(() => import('./components/OnboardingFlow'));
const FeatureCarousel = React.lazy(() => import('./components/FeatureCarousel'));
const MainApp = React.lazy(() => import('./components/MainApp'));

// A global fallback spinner class
const FallbackSpinner = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-black/95 backdrop-blur-sm z-50">
    <div className="relative">
      <div className="w-16 h-16 rounded-full border-4 border-orange-500/20" />
      <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
    </div>
    <p className="mt-4 text-gray-500 text-sm animate-pulse font-medium tracking-wider">LOADING...</p>
  </div>
);

const AppContent = () => {
  const { isLoading, isAuthenticated } = useApp();

  React.useEffect(() => {
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
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100]"
          >
            <SplashScreen />
          </motion.div>
        )}
      </AnimatePresence>

      <Suspense fallback={<FallbackSpinner />}>
        <Routes>
          <Route 
            path="/" 
            element={
              isLoading ? <div className="h-screen bg-black" /> : 
              isAuthenticated ? <Navigate to="/app" replace /> : <Navigate to="/onboarding" replace />
            } 
          />
          <Route path="/features" element={<FeatureCarousel />} />
          <Route path="/onboarding/*" element={<OnboardingFlow />} />
          <Route path="/app/*" element={<MainApp />} />
        </Routes>
      </Suspense>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <Router>
          <AppContent />
        </Router>
      </ToastProvider>
    </AppProvider>
  );
}

export default App;
