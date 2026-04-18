import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CreditCard, Smartphone, DollarSign, Check, Loader2, X, Wallet, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { trackPayment } from '../lib/analytics';
import { captureError } from '../lib/monitoring';

const ModeBadge: React.FC = () => {
    const isTestMode = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY?.startsWith('pk_test');
    
    if (!isTestMode) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start space-x-3"
        >
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
                <p className="text-amber-500 font-bold text-sm uppercase tracking-wider">Test Mode Active</p>
                <p className="text-white/40 text-xs">You are using Paystack Test Keys. Real payments will not be processed. Update to Live keys in .env for production.</p>
            </div>
        </motion.div>
    );
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
};

const PaymentMethod: React.FC = () => {
    const navigate = useNavigate();
    const [selectedMethod, setSelectedMethod] = useState<'card' | 'mobile' | 'bank'>('card');
    // ... rest

    const paymentMethods = [
        {
            id: 'card',
            icon: <CreditCard className="w-6 h-6" />,
            title: 'Credit/Debit Card',
            description: 'Visa, Mastercard, & AMEX supported'
        },
        {
            id: 'mobile',
            icon: <Smartphone className="w-6 h-6" />,
            title: 'Mobile Portals',
            description: 'VodaPay, M-Pesa, & Capitec Pay'
        },
        {
            id: 'bank',
            icon: <DollarSign className="w-6 h-6" />,
            title: 'EFT Transfer',
            description: 'Secure OZOW or direct deposit'
        }
    ];

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 pb-24 font-['Outfit'] overflow-x-hidden">
            <motion.div 
                initial="hidden" 
                animate="visible" 
                variants={containerVariants}
                className="max-w-md mx-auto"
            >
                <header className="flex items-center justify-between mb-10 pt-4">
                    <motion.button 
                        variants={itemVariants}
                        whileTap={{ scale: 0.9 }}
                        className="p-3 glass-light rounded-2xl" 
                        onClick={() => navigate('/app')}
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </motion.button>
                    <motion.h1 variants={itemVariants} className="text-2xl font-bold tracking-tight">Mzansi Pay</motion.h1>
                    <motion.div variants={itemVariants} className="w-12 h-12 glass rounded-2xl flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-orange-500" />
                    </motion.div>
                </header>

                <motion.div variants={itemVariants} className="mb-8">
                    <ModeBadge />
                    <p className="text-white/60 text-sm font-medium uppercase tracking-widest mb-2">Secure Checkout</p>
                    <h2 className="text-3xl font-extrabold mb-6">Choose method</h2>
                </motion.div>

                <div className="space-y-4 mb-12">
                    {paymentMethods.map((method) => (
                        <motion.button
                            key={method.id}
                            variants={itemVariants}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedMethod(method.id as 'card' | 'mobile' | 'bank')}
                            className={`w-full p-5 rounded-[24px] border transition-all duration-500 relative overflow-hidden group ${
                                selectedMethod === method.id
                                ? 'glass border-orange-500/50 ring-1 ring-orange-500/20'
                                : 'glass-light border-white/5 hover:border-white/10'
                            }`}
                        >
                            {selectedMethod === method.id && (
                                <motion.div 
                                    layoutId="activeGlow"
                                    className="absolute inset-0 bg-orange-500/5 blur-xl" 
                                />
                            )}
                            <div className="flex items-center space-x-5 relative z-10">
                                <div className={`p-4 rounded-2xl transition-all duration-300 ${
                                    selectedMethod === method.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-white/5 text-white/40 group-hover:bg-white/10'
                                }`}>
                                    {method.icon}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className={`font-bold text-lg transition-colors ${selectedMethod === method.id ? 'text-white' : 'text-white/60'}`}>{method.title}</p>
                                    <p className="text-white/40 text-sm">{method.description}</p>
                                </div>
                                <AnimatePresence>
                                    {selectedMethod === method.id && (
                                        <motion.div 
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                        >
                                            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                                                <Check className="w-4 h-4 text-white stroke-[3px]" />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.button>
                    ))}
                </div>

                <div className="fixed bottom-8 left-6 right-6 max-w-md mx-auto">
                    <motion.button
                        variants={itemVariants}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/app/payment/details')}
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 py-5 rounded-[24px] font-bold text-lg shadow-2xl shadow-orange-500/20 flex items-center justify-center space-x-2 group active:scale-95 transition-all"
                    >
                        <span>Continue to Details</span>
                        <Zap className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                </div>
            </motion.div>
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
        if (!numAmount || numAmount <= 0) return;
        
        if (numAmount < 10) {
            alert('Minimum payment amount is R10');
            return;
        }

        setProcessing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                alert('Please login to make a payment');
                setProcessing(false);
                return;
            }

            const { data } = await axios.post('/api/paystack/initialize', {
                amount: Math.round(numAmount * 100) 
            }, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (data.status) {
                trackPayment(numAmount);
                window.location.href = data.data.authorization_url;
            } else {
                alert('Initialization failed: ' + (data.message || 'Error'));
            }
        } catch (err) {
            captureError(err instanceof Error ? err : new Error(String(err)));
            alert('Payment failed to initialize.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 font-['Outfit']">
            <motion.div 
                initial="hidden" animate="visible" variants={containerVariants}
                className="max-w-md mx-auto"
            >
                <header className="flex items-center justify-between mb-10 pt-4">
                    <motion.button 
                        variants={itemVariants}
                        whileTap={{ scale: 0.9 }}
                        className="p-3 glass-light rounded-2xl" 
                        onClick={() => navigate('/app/payment')}
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </motion.button>
                    <motion.h1 variants={itemVariants} className="text-2xl font-bold tracking-tight">Payment</motion.h1>
                    <div className="w-12" />
                </header>

                <ModeBadge />

                <motion.div variants={itemVariants} className="glass rounded-[32px] p-8 mb-8 border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent">
                    <label className="block text-white/50 text-sm font-bold uppercase tracking-widest mb-4">Enter Amount</label>
                    <div className="relative">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-5xl font-extrabold text-orange-500">R</span>
                        <input
                            type="number"
                            autoFocus
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0"
                            className="w-full bg-transparent border-none p-0 pl-10 text-6xl font-extrabold text-white focus:outline-none focus:ring-0 placeholder:text-white/10"
                        />
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex items-center space-x-3 p-4 glass-light rounded-2xl mb-8">
                    <ShieldCheck className="w-6 h-6 text-green-500" />
                    <p className="text-sm text-white/60">Your payment is secured by Paystack with 256-bit encryption.</p>
                </motion.div>

                <motion.button
                    variants={itemVariants}
                    onClick={handlePayment}
                    disabled={processing || !amount}
                    className="w-full bg-orange-500 text-white py-5 rounded-[24px] font-bold text-lg hover:bg-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-3 shadow-xl shadow-orange-500/10"
                >
                    {processing ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>Securing...</span>
                        </>
                    ) : (
                        <span>Pay R{amount || '0'} Now</span>
                    )}
                </motion.button>
            </motion.div>
        </div>
    );
};

const PaymentSuccess: React.FC = () => {
    const navigate = useNavigate();
    const [verified, setVerified] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verify = async () => {
            const reference = new URLSearchParams(window.location.search).get('reference');
            if (!reference) {
                setLoading(false);
                return;
            }
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) return;

                const { data } = await axios.post('/api/paystack/verify', { reference }, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });
                if (data.success) setVerified(true);
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        verify();
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-['Outfit']">
            <div className="relative mb-8">
                <Loader2 className="w-16 h-16 animate-spin text-orange-500" />
                <div className="absolute inset-0 blur-2xl bg-orange-500/20" />
            </div>
            <h2 className="text-2xl font-bold animate-pulse">Verifying Payment</h2>
            <p className="text-white/40 mt-2">Connecting to Secure Gateway...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] p-6 flex flex-col items-center justify-center text-center font-['Outfit']">
            <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`w-28 h-28 rounded-full flex items-center justify-center mb-10 shadow-2xl ${
                    verified ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                }`}
            >
                {verified ? <Check className="w-14 h-14 stroke-[3px]" /> : <X className="w-14 h-14 stroke-[3px]" />}
            </motion.div>

            <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-4xl font-extrabold mb-4"
            >
                {verified ? 'Success!' : 'Failed'}
            </motion.h1>
            
            <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-white/60 text-lg mb-12 max-w-xs"
            >
                {verified ? 'Your balance has been updated instantly.' : 'Something went wrong with your transaction.'}
            </motion.p>

            <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                onClick={() => navigate('/app')}
                className="w-full max-w-xs bg-white text-black py-5 rounded-[24px] font-bold text-lg hover:bg-white/90 transition-all shadow-xl active:scale-95"
            >
                {verified ? 'Return Home' : 'Back to Wallet'}
            </motion.button>
        </div>
    );
};

const PaymentFlow: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<PaymentMethod />} />
            <Route path="/details" element={<PaymentDetails />} />
            <Route path="/success" element={<PaymentSuccess />} />
        </Routes>
    );
};

export default PaymentFlow;