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
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));

// A global fallback spinner class
const FallbackSpinner = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-black z-50">
    <div className="relative">
      {/* Outer glow */}
      <div className="absolute inset-0 bg-pink-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
      
      <div className="relative glass-card p-8 flex flex-col items-center justify-center border-white/5">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-t-pink-500 border-r-orange-500 border-b-transparent border-l-transparent" 
          />
        </div>
        <p className="mt-6 text-[10px] text-white/40 font-black tracking-[0.3em] uppercase animate-pulse">Mzansi Vibe</p>
      </div>
    </div>
  </div>
);

const AppContent = () => {
  const { isLoading, isAuthenticated } = useApp();

  return (
    <div className="min-h-screen bg-black">
      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[100]"
          >
            <SplashScreen />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Only render routes after loading is complete to prevent redirect flicker.
          The splash screen covers the UI during loading anyway, so there's no visual gap. */}
      {!isLoading && (
        <Suspense fallback={<FallbackSpinner />}>
          <Routes>
            <Route
              path="/"
              element={
                isAuthenticated ? <Navigate to="/app" replace /> : <Navigate to="/onboarding" replace />
              }
            />
            <Route path="/features" element={<FeatureCarousel />} />
            <Route path="/onboarding/*" element={<OnboardingFlow />} />
            <Route path="/app/*" element={<MainApp />} />
            <Route path="/admin" element={
              isAuthenticated && useApp().user?.isAdmin ? (
                <AdminDashboard />
              ) : (
                <Navigate to="/app" replace />
              )
            } />
          </Routes>
        </Suspense>
      )}
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppContent />
        </Router>
      </ToastProvider>
    </AppProvider>
  );
}

export default App;
