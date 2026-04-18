import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Delete } from 'lucide-react';

interface PinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

const PinInput: React.FC<PinInputProps> = ({ length = 4, value, onChange, disabled, error }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/\D/g, '').slice(0, length);
    onChange(newValue);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };
  
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-3 mb-2">
        {Array.from({ length }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ 
              scale: value.length === i ? 1.1 : 1,
              opacity: value.length >= i ? 1 : 0.5
            }}
            className={`w-12 h-14 rounded-xl flex items-center justify-center text-2xl font-bold transition-all ${
              error 
                ? 'bg-red-500/20 border-2 border-red-500' 
                : value.length > i 
                  ? 'bg-orange-500/20 border-2 border-orange-500' 
                  : 'bg-gray-800/50 border-2 border-gray-600'
            }`}
          >
            {value.length > i ? (
              <span className="text-white">•</span>
            ) : null}
          </motion.div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="absolute opacity-0 w-0 h-0"
        autoComplete="off"
      />
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-500 text-sm mt-2"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

interface PinSetupScreenProps {
  onComplete: (pin: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const PinSetupScreen: React.FC<PinSetupScreenProps> = ({ 
  onComplete, 
  onCancel,
  isLoading 
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (step === 'confirm' && confirmPin.length === 4) {
      if (confirmPin === pin) {
        onComplete(pin);
      } else {
        setError('PINs do not match. Try again.');
        setConfirmPin('');
        setPin('');
        setStep('create');
      }
    }
  }, [confirmPin, step, pin, onComplete]);
  
  const handlePinChange = (value: string) => {
    setError('');
    if (step === 'create') {
      setPin(value);
      if (value.length === 4) {
        setTimeout(() => setStep('confirm'), 300);
      }
    } else {
      setConfirmPin(value);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full text-center"
    >
      <div className="w-20 h-20 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-orange-500/30">
        <Shield className="w-10 h-10 text-orange-500" />
      </div>
      
      <h2 className="text-2xl font-bold mb-2">
        {step === 'create' ? 'Create Your PIN' : 'Confirm Your PIN'}
      </h2>
      <p className="text-gray-400 mb-8">
        {step === 'create' 
          ? 'Enter a 4-digit PIN to secure your account' 
          : 'Re-enter your PIN to confirm'}
      </p>
      
      <div className="mb-8">
        <PinInput
          value={step === 'create' ? pin : confirmPin}
          onChange={handlePinChange}
          disabled={isLoading}
          error={error}
        />
      </div>
      
      {onCancel && (
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-300 text-sm"
        >
          Cancel
        </button>
      )}
    </motion.div>
  );
};

interface PinGateScreenProps {
  onSuccess: () => void;
  onForgot?: () => void;
  isLoading?: boolean;
}

export const PinGateScreen: React.FC<PinGateScreenProps> = ({ 
  onSuccess, 
  onForgot,
  isLoading 
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  
  useEffect(() => {
    if (pin.length === 4) {
      verifyPin();
    }
  }, [pin]);
  
  const verifyPin = async () => {
    // This will be called from parent with actual verification
  };
  
  const handlePinChange = (value: string) => {
    setError('');
    setPin(value);
  };
  
  const handleVerificationResult = (result: { success: boolean; attemptsRemaining?: number; lockedUntil?: number }) => {
    if (result.success) {
      onSuccess();
    } else {
      setPin('');
      if (result.lockedUntil) {
        setLockedUntil(result.lockedUntil);
        setError('Too many attempts. Please wait.');
      } else if (result.attemptsRemaining !== undefined) {
        setAttemptsRemaining(result.attemptsRemaining);
        setError(`Incorrect PIN. ${result.attemptsRemaining} attempts remaining.`);
      } else {
        setError('Incorrect PIN');
      }
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full text-center"
    >
      <div className="w-20 h-20 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-orange-500/30">
        <Shield className="w-10 h-10 text-orange-500" />
      </div>
      
      <h2 className="text-2xl font-bold mb-2">Enter Your PIN</h2>
      <p className="text-gray-400 mb-8">Enter your 4-digit PIN to continue</p>
      
      <div className="mb-8">
        <PinInput
          value={pin}
          onChange={handlePinChange}
          disabled={isLoading || lockedUntil !== null}
          error={error}
        />
      </div>
      
      {onForgot && (
        <button
          onClick={onForgot}
          className="text-gray-500 hover:text-gray-300 text-sm"
        >
          Forgot PIN?
        </button>
      )}
    </motion.div>
  );
};

interface PinKeypadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onBiometric?: () => void;
  showBiometric?: boolean;
  disabled?: boolean;
}

export const PinKeypad: React.FC<PinKeypadProps> = ({
  onDigit,
  onDelete,
  onBiometric,
  showBiometric,
  disabled
}) => {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
  
  return (
    <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
      {digits.map((digit, i) => (
        <motion.button
          key={i}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (disabled) return;
            if (digit === '⌫') {
              onDelete();
            } else if (digit !== '') {
              onDigit(digit);
            }
          }}
          disabled={disabled || digit === ''}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium transition-all ${
            disabled 
              ? 'bg-gray-800/30 text-gray-600' 
              : digit === '⌫'
                ? 'bg-gray-800/50 hover:bg-gray-700/50 text-white'
                : 'bg-gray-800/50 hover:bg-gray-700/50 text-white active:bg-orange-500/20'
          }`}
        >
          {digit === '⌫' ? (
            <Delete className="w-6 h-6" />
          ) : (
            digit
          )}
        </motion.button>
      ))}
    </div>
  );
};

export default PinInput;