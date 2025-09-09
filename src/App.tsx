import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import SplashScreen from './components/SplashScreen';
import OnboardingFlow from './components/OnboardingFlow';
import MainApp from './components/MainApp';
import './index.css';

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="min-h-screen bg-black">
          <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/onboarding/*" element={<OnboardingFlow />} />
            <Route path="/app/*" element={<MainApp />} />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;
