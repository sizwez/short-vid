import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Globe, Mail, Phone, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

const languages = [
  { code: 'en', name: 'English', flag: '🇿🇦' },
  { code: 'zu', name: 'IsiZulu', flag: '🇿🇦' },
  { code: 'xh', name: 'IsiXhosa', flag: '🇿🇦' },
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'st', name: 'Sesotho', flag: '🇿🇦' }
];

const LanguageSelection: React.FC = () => {
  const navigate = useNavigate();
  const { setLanguage } = useApp();
  const [selectedLang, setSelectedLang] = useState('en');

  const handleContinue = () => {
    setLanguage(selectedLang);
    navigate('/onboarding/auth');
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto pt-20">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Globe className="w-16 h-16 text-orange-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Choose Your Language</h1>
          <p className="text-gray-400">Khetha ulimi lwakho / Kies jou taal</p>
        </motion.div>

        <div className="space-y-4 mb-12">
          {languages.map((lang, index) => (
            <motion.button
              key={lang.code}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedLang(lang.code)}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                selectedLang === lang.code
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="text-lg font-medium">{lang.name}</span>
                </div>
                {selectedLang === lang.code && (
                  <ChevronRight className="w-5 h-5 text-orange-500" />
                )}
              </div>
            </motion.button>
          ))}
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={handleContinue}
          className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg hover:bg-orange-600 transition-colors"
        >
          Continue
        </motion.button>
      </div>
    </div>
  );
};

const AuthScreen: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useApp();
  const [mode, setMode] = useState<'welcome' | 'login' | 'signup'>('welcome');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    name: '',
    username: ''
  });

  const handleLogin = () => {
    // Mock login - in real app, this would call an API
    setUser({
      id: '1',
      name: 'Thabo Mthembu',
      username: '@thabo_creates',
      avatar: 'https://img-wrapper.vercel.app/image?url=https://placehold.co/150x150/FF6B35/FFFFFF?text=TM',
      bio: 'Content creator from Johannesburg 🇿🇦',
      followers: 1250,
      following: 330,
      isCreator: true,
      subscription: 'free',
      earnings: 450.75,
      language: 'en'
    });
    navigate('/app');
  };

  const handleSignup = () => {
    // Mock signup - in real app, this would call an API
    setUser({
      id: '2',
      name: formData.name || 'New User',
      username: formData.username || '@newuser',
      avatar: 'https://img-wrapper.vercel.app/image?url=https://placehold.co/150x150/FF6B35/FFFFFF?text=NU',
      bio: 'New to Mzansi Videos',
      followers: 0,
      following: 0,
      isCreator: false,
      subscription: 'free',
      earnings: 0,
      language: 'en'
    });
    navigate('/app');
  };

  if (mode === 'welcome') {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-md mx-auto pt-20">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold mb-4">Welcome to Mzansi Videos</h1>
            <p className="text-gray-400 text-lg">Join the South African video revolution</p>
          </motion.div>

          <div className="space-y-4">
            <motion.button
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => setMode('signup')}
              className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg hover:bg-orange-600 transition-colors"
            >
              Create Account
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => setMode('login')}
              className="w-full border-2 border-gray-700 text-white py-4 rounded-xl font-semibold text-lg hover:border-gray-600 transition-colors"
            >
              Sign In
            </motion.button>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <p className="text-gray-400 mb-4">Or continue with</p>
              <div className="flex space-x-4">
                <button className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
                  Facebook
                </button>
                <button className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 transition-colors">
                  Google
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'login') {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-md mx-auto pt-20">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <button
              onClick={() => setMode('welcome')}
              className="text-gray-400 mb-6"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-gray-400">Sign in to your account</p>
          </motion.div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Email or Phone</label>
              <div className="relative">
                <Mail className="absolute left-3 top-4 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                  placeholder="Enter email or phone number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 px-4 pr-12 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-4 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg hover:bg-orange-600 transition-colors"
            >
              Sign In
            </button>

            <div className="text-center">
              <button className="text-orange-500 hover:text-orange-400">
                Forgot Password?
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto pt-20">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => setMode('welcome')}
            className="text-gray-400 mb-6"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold mb-2">Create Account</h1>
          <p className="text-gray-400">Join the Mzansi Videos community</p>
        </motion.div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 px-4 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 px-4 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
              placeholder="@username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-4 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-4 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                placeholder="+27 XX XXX XXXX"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 px-4 pr-12 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                placeholder="Create a password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-4 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            onClick={handleSignup}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg hover:bg-orange-600 transition-colors"
          >
            Create Account
          </button>

          <div className="text-center text-sm text-gray-400">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </div>
        </div>
      </div>
    </div>
  );
};

const OnboardingFlow: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LanguageSelection />} />
      <Route path="/auth" element={<AuthScreen />} />
    </Routes>
  );
};

export default OnboardingFlow;
