import React, { useState } from 'react';
import { Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Globe, Mail, Phone, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { useToast } from './ToastContainer';
import { signIn, signUp, resendConfirmationEmail, resetPassword, updatePassword, signInWithGoogle, signInWithApple } from '../services/authService';
import { trackSignup } from '../lib/analytics';
import { captureError } from '../lib/monitoring';

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
              className={`w-full p-4 rounded-xl border-2 transition-all ${selectedLang === lang.code
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

// Sub-components for Auth Modes
const WelcomeScreen: React.FC<{ onModeChange: (mode: any) => void }> = ({ onModeChange }) => {
  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="text-center h-full flex flex-col justify-center"
    >
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to Mzansi Videos</h1>
        <p className="text-gray-400 text-lg">Join the South African video revolution</p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => onModeChange('signup')}
          className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg hover:bg-orange-600 transition-all active:scale-[0.98]"
        >
          Create Account
        </button>

        <button
          onClick={() => onModeChange('login')}
          className="w-full border-2 border-gray-700 text-white py-4 rounded-xl font-semibold text-lg hover:border-gray-600 transition-all active:scale-[0.98]"
        >
          Sign In
        </button>

        <div className="text-center pt-8">
          <p className="text-gray-400 mb-4">Or continue with</p>
          <div className="flex space-x-4">
            <button
              onClick={async () => {
                try {
                  await signInWithGoogle();
                } catch {
                  // Error handled by service
                }
              }}
              className="flex-1 bg-white text-black py-3 rounded-xl font-medium hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button
              onClick={async () => {
                try {
                  await signInWithApple();
                } catch {
                  // Error handled by service
                }
              }}
              className="flex-1 bg-black text-white py-3 rounded-xl font-medium border border-gray-700 hover:bg-gray-900 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Apple
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const LoginScreen: React.FC<{
  formData: any;
  setFormData: any;
  isLoading: boolean;
  onLogin: () => void;
  onModeChange: (mode: any) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  resendVisible: boolean;
  resending: boolean;
  onResend: () => void;
}> = ({ formData, setFormData, isLoading, onLogin, onModeChange, showPassword, setShowPassword, resendVisible, resending, onResend }) => {
  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <div className="mb-8 pt-8">
        <button
          onClick={() => onModeChange('welcome')}
          className="text-gray-400 mb-6 flex items-center hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5 rotate-180 mr-1" /> Back
        </button>
        <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
        <p className="text-gray-400">Sign in to your account</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-4 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-all"
              placeholder="Enter your email"
              disabled={isLoading}
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
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 px-4 pr-12 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-all"
              placeholder="Enter your password"
              disabled={isLoading}
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
          onClick={onLogin}
          disabled={isLoading}
          className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg hover:bg-orange-600 transition-all active:scale-[0.98] disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-orange-500/20"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </button>

        <button
          onClick={() => onModeChange('forgot')}
          className="w-full text-gray-400 py-2 text-sm hover:text-white transition-colors"
        >
          Forgot Password?
        </button>

        {resendVisible && (
          <div className="mt-4 p-4 bg-orange-500/10 rounded-xl border border-orange-500/20 animate-fadeIn">
            <p className="text-sm text-gray-300 mb-2">Didn't receive the email?</p>
            <button
              onClick={onResend}
              disabled={resending}
              className="text-orange-500 font-bold hover:underline disabled:opacity-50"
            >
              {resending ? 'Resending...' : 'Resend Confirmation'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const SignupScreen: React.FC<{
  formData: any;
  setFormData: any;
  isLoading: boolean;
  onSignup: () => void;
  onModeChange: (mode: any) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
}> = ({ formData, setFormData, isLoading, onSignup, onModeChange, showPassword, setShowPassword }) => {
  return (
    <motion.div
      key="signup"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full overflow-y-auto max-h-[80vh] pr-2 pb-8 scrollbar-hide"
    >
      <div className="mb-8 pt-4">
        <button
          onClick={() => onModeChange('welcome')}
          className="text-gray-400 mb-6 flex items-center hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5 rotate-180 mr-1" /> Back
        </button>
        <h1 className="text-3xl font-bold mb-2">Create Account</h1>
        <p className="text-gray-400">Join the Mzansi Videos community</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">Full Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 px-4 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-all"
            placeholder="Enter your full name"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Username</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 px-4 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-all"
            placeholder="@username (optional)"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email *</label>
          <div className="relative">
            <Mail className="absolute left-3 top-4 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-all"
              placeholder="Enter your email"
              disabled={isLoading}
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
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-all"
              placeholder="+27 XX XXX XXXX (optional)"
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Password *</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 px-4 pr-12 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-all"
              placeholder="Create a password (min 6 characters)"
              disabled={isLoading}
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
          onClick={onSignup}
          disabled={isLoading}
          className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg hover:bg-orange-600 transition-all active:scale-[0.98] disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-orange-500/20"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </button>

        <div className="text-center text-xs text-gray-500 pt-2 pb-4">
          By signing up, you agree to our <span className="text-orange-500 underline">Terms of Service</span> and <span className="text-orange-500 underline">Privacy Policy</span>
        </div>
      </div>
    </motion.div>
  );
};

const ForgotPasswordScreen: React.FC<{
  formData: any;
  setFormData: any;
  isLoading: boolean;
  onReset: () => void;
  onModeChange: (mode: any) => void;
}> = ({ formData, setFormData, isLoading, onReset, onModeChange }) => {
  return (
    <motion.div
      key="forgot"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <div className="mb-8 pt-8">
        <button
          onClick={() => onModeChange('login')}
          className="text-gray-400 mb-6 flex items-center hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5 rotate-180 mr-1" /> Back
        </button>
        <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
        <p className="text-gray-400">Enter your email to receive a reset link</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-4 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-all"
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>
        </div>

        <button
          onClick={onReset}
          disabled={isLoading}
          className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg hover:bg-orange-600 transition-all active:scale-[0.98] disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-orange-500/20"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            'Send Reset Link'
          )}
        </button>
      </div>
    </motion.div>
  );
};

const ResetPasswordScreen: React.FC<{
  formData: any;
  setFormData: any;
  isLoading: boolean;
  onUpdate: () => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
}> = ({ formData, setFormData, isLoading, onUpdate, showPassword, setShowPassword }) => {
  return (
    <motion.div
      key="reset"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <div className="mb-8 pt-20">
        <h1 className="text-3xl font-bold mb-2">New Password</h1>
        <p className="text-gray-400">Enter your new password</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">New Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 px-4 pr-12 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-all"
              placeholder="Enter new password"
              disabled={isLoading}
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
          onClick={onUpdate}
          disabled={isLoading}
          className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg hover:bg-orange-600 transition-all active:scale-[0.98] disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-orange-500/20"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Password'
          )}
        </button>
      </div>
    </motion.div>
  );
};

const VerifyScreen: React.FC<{
  email: string;
  onResend: () => void;
  onModeChange: (mode: any) => void;
  resending: boolean;
}> = ({ email, onResend, onModeChange, resending }) => {
  const { refreshVerificationStatus, showToast } = useApp();
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  const handleCheck = async () => {
    setChecking(true);
    try {
      const isVerified = await refreshVerificationStatus();
      if (isVerified) {
        showToast('success', 'Email verified! Welcome to Mzansi Videos');
        navigate('/app');
      } else {
        showToast('error', 'Email not verified yet. Please check your inbox.');
      }
    } catch (err) {
      showToast('error', 'Something went wrong. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <motion.div
      key="verify"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full text-center py-8"
    >
      <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 bg-green-500/10 rounded-full"
        />
        <Mail className="w-12 h-12 text-green-500" />
      </div>
      <h1 className="text-3xl font-bold mb-4">Check your Email!</h1>
      <p className="text-gray-400 mb-8 px-6 text-lg leading-relaxed">
        We've sent a special verification link to:<br />
        <span className="text-orange-500 font-bold block mt-2 text-xl">{email}</span>
      </p>
      <div className="space-y-4 px-4">
        <button
          onClick={handleCheck}
          disabled={checking}
          className="w-full bg-white text-black py-4 rounded-xl font-semibold hover:bg-gray-200 transition-all active:scale-[0.98] flex items-center justify-center shadow-lg"
        >
          {checking ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Checking status...
            </>
          ) : (
            'I have verified'
          )}
        </button>

        <button
          onClick={onResend}
          disabled={resending || checking}
          className="w-full bg-orange-500/20 text-orange-500 py-4 rounded-xl font-semibold hover:bg-orange-500/30 transition-all disabled:opacity-50 flex items-center justify-center border border-orange-500/30"
        >
          {resending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            'Resend Verification Email'
          )}
        </button>
        <button
          onClick={() => onModeChange('login')}
          className="w-full text-gray-500 py-2 font-medium hover:text-gray-300 transition-all"
        >
          Back to Login
        </button>
      </div>
    </motion.div>
  );
};

const AuthScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const { language } = useApp();
  const isResetMode = searchParams.get('reset') === 'true';
  const [mode, setMode] = useState<'welcome' | 'login' | 'signup' | 'forgot' | 'reset' | 'verify'>(isResetMode ? 'reset' : 'welcome');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendVisible, setResendVisible] = useState(false);
  const [resending, setResending] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    name: '',
    username: ''
  });

  const handleLogin = async () => {
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail || !formData.password) {
      showToast('error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    setResendVisible(false);
    try {
      await signIn({ email: trimmedEmail, password: formData.password });
      showToast('success', 'Welcome back!');
      navigate('/app');
    } catch (err: any) {
      console.error('Login error:', err);
      const message = err.message || 'Login failed';
      if (message.toLowerCase().includes('confirm') || message.toLowerCase().includes('verify')) {
        setResendVisible(true);
        showToast('error', 'Please confirm your email before signing in.');
      } else {
        showToast('error', message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) return;
    setResending(true);
    try {
      await resendConfirmationEmail(trimmedEmail);
      showToast('success', 'Confirmation email resent! Please check your inbox.');
      setResendVisible(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend email';
      showToast('error', message);
    } finally {
      setResending(false);
    }
  };

  const handleSignup = async () => {
    const trimmedEmail = formData.email.trim();
    const trimmedUsername = formData.username.trim().replace('@', '');
    const trimmedName = formData.name.trim();

    if (!trimmedEmail || !formData.password || !trimmedName) {
      showToast('error', 'Please fill in all required fields');
      return;
    }
    if (formData.password.length < 6) {
      showToast('error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const authData = await signUp({
        email: trimmedEmail,
        password: formData.password,
        username: trimmedUsername || trimmedName.toLowerCase().replace(/\s+/g, '_'),
        displayName: trimmedName,
        phone: formData.phone.trim(),
        language: language || 'en',
      });

      if (authData?.session) {
        showToast('success', 'Account created! Welcome to Mzansi Videos!');
        navigate('/app');
      } else {
        showToast('success', 'Verification email sent! Check your inbox.');
        setMode('verify');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      captureError(err instanceof Error ? err : new Error(String(err)), { method: 'signup' });
      
      let message = err.message || 'Signup failed. Please try again.';
      if (message.includes('already registered') || message.includes('taken')) {
        message = 'This email or username is already in use.';
      }
      
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      showToast('error', 'Please enter your email');
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword(trimmedEmail);
      showToast('success', 'Password reset link sent to your email');
      setMode('login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!formData.password) {
      showToast('error', 'Please enter a new password');
      return;
    }
    if (formData.password.length < 6) {
      showToast('error', 'Password must be at least 6 characters');
      return;
    }
    setIsLoading(true);
    try {
      await updatePassword(formData.password);
      showToast('success', 'Password updated successfully!');
      setMode('login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 overflow-x-hidden">
      <div className="max-w-md mx-auto min-h-[600px] flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {mode === 'welcome' && <WelcomeScreen key="welcome" onModeChange={setMode} />}
          {mode === 'login' && (
            <LoginScreen key="login"
              formData={formData}
              setFormData={setFormData}
              isLoading={isLoading}
              onLogin={handleLogin}
              onModeChange={setMode}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              resendVisible={resendVisible}
              resending={resending}
              onResend={handleResend}
            />
          )}
          {mode === 'signup' && (
            <SignupScreen key="signup"
              formData={formData}
              setFormData={setFormData}
              isLoading={isLoading}
              onSignup={handleSignup}
              onModeChange={setMode}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />
          )}
          {mode === 'forgot' && (
            <ForgotPasswordScreen key="forgot"
              formData={formData}
              setFormData={setFormData}
              isLoading={isLoading}
              onReset={handleForgotPassword}
              onModeChange={setMode}
            />
          )}
          {mode === 'reset' && (
            <ResetPasswordScreen key="reset"
              formData={formData}
              setFormData={setFormData}
              isLoading={isLoading}
              onUpdate={handleResetPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />
          )}
          {mode === 'verify' && (
            <VerifyScreen key="verify"
              email={formData.email}
              onResend={handleResend}
              onModeChange={setMode}
              resending={resending}
            />
          )}
        </AnimatePresence>
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
