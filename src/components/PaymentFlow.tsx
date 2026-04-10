import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Smartphone, DollarSign, Check, Loader2, X } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { trackPayment } from '../lib/analytics';
import { captureError } from '../lib/monitoring';

const PaymentMethod: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'mobile' | 'bank'>('card');

  const paymentMethods = [
    {
      id: 'card',
      icon: <CreditCard className="w-6 h-6" />,
      title: 'Credit/Debit Card',
      description: 'Visa, Mastercard, etc.'
    },
    {
      id: 'mobile',
      icon: <Smartphone className="w-6 h-6" />,
      title: 'Mobile Money',
      description: 'VodaPay, M-Pesa, etc.'
    },
    {
      id: 'bank',
      icon: <DollarSign className="w-6 h-6" />,
      title: 'Bank Transfer',
      description: 'Direct bank deposit'
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button className="p-2" onClick={() => navigate('/app')}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Payment Method</h1>
          <div className="w-10"></div>
        </div>

        <div className="space-y-4 mb-8">
          {paymentMethods.map((method) => (
            <motion.button
              key={method.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedMethod(method.id as 'card' | 'mobile' | 'bank')}
              className={`w-full p-4 rounded-xl border-2 transition-all ${selectedMethod === method.id
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-gray-700 hover:border-gray-600'
                }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${selectedMethod === method.id ? 'bg-orange-500' : 'bg-gray-800'
                  }`}>
                  {method.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold">{method.title}</p>
                  <p className="text-gray-400 text-sm">{method.description}</p>
                </div>
                {selectedMethod === method.id && (
                  <Check className="w-6 h-6 text-orange-500" />
                )}
              </div>
            </motion.button>
          ))}
        </div>

        <button
          onClick={() => navigate('/app/payment/details')}
          className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const PaymentDetails: React.FC = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const { user } = useApp();

  const handlePayment = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return;
    }
    if (numAmount < 10) {
      alert('Minimum payment amount is R10');
      return;
    }
    if (numAmount > 50000) {
      alert('Maximum payment amount is R50,000');
      return;
    }

    setProcessing(true);
    try {
      // Get the current user's auth token for server-side verification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('Please login to make a payment');
        setProcessing(false);
        return;
      }

      const { data } = await axios.post('/api/paystack/initialize', {
        amount: Math.round(numAmount * 100) // kobo
      }, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (data.status) {
        trackPayment(numAmount);
        window.open(data.data.authorization_url, '_blank');
      } else {
        alert('Failed to initialize payment: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)));
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const message = axiosErr?.response?.data?.error || 'Failed to initialize payment. Please try again.';
      alert(message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button className="p-2" onClick={() => navigate('/app/payment')}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Payment Details</h1>
          <div className="w-10"></div>
        </div>

        <div className="mb-8">
          <label className="block text-gray-400 text-sm mb-2">Amount (ZAR)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 100"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        <button
          onClick={handlePayment}
          disabled={processing || !amount}
          className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
        >
          {processing && <Loader2 className="w-5 h-5 animate-spin" />}
          <span>{processing ? 'Processing...' : 'Pay Now'}</span>
        </button>
      </div>
    </div>
  );
};

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [noReference, setNoReference] = useState(false);

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = new URLSearchParams(window.location.search).get('reference');
      if (!reference) {
        setNoReference(true);
        setLoading(false);
        return;
      }
      try {
        // Get the current user's auth token for server-side verification
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          return;
        }

        const { data } = await axios.post('/api/paystack/verify', { reference }, {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        if (data.success) {
          setVerified(true);
        }
      } catch (err) {
        console.error('Payment verification failed:', err);
      }
      setLoading(false);
    };
    verifyPayment();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
        <p className="mt-4">Verifying payment...</p>
      </div>
    );
  }

  if (noReference) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold mb-2">No Payment Found</h1>
        <p className="text-gray-400 mb-8">Please complete a payment first.</p>
        <button
          onClick={() => navigate('/app/payment')}
          className="bg-orange-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-orange-600 transition-colors"
        >
          Make Payment
        </button>
      </div>
    );
  }

  if (!verified) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-6">
          <X className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Payment Failed</h1>
        <p className="text-gray-400 mb-8">There was an issue verifying your payment.</p>
        <button
          onClick={() => navigate('/app/payment')}
          className="bg-orange-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-orange-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6">
        <Check className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
      <p className="text-gray-400 mb-8">Thank you for supporting Mzansi Videos creators.</p>
      <button
        onClick={() => navigate('/app')}
        className="bg-orange-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-orange-600 transition-colors"
      >
        Return Home
      </button>
    </div>
  );
};

const PaymentFlow: React.FC = () => {
  useEffect(() => {
    // Track payment page visit
    // trackPageView('/payment');
  }, []);

  return (
    <Routes>
      <Route path="/" element={<PaymentMethod />} />
      <Route path="/details" element={<PaymentDetails />} />
      <Route path="/success" element={<PaymentSuccess />} />
    </Routes>
  );
};

export default PaymentFlow;