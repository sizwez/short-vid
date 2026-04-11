import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, DollarSign, Play, Eye, Heart, MessageCircle, BarChart3, Download, CreditCard, Wallet, AlertCircle, CheckCircle, TrendingUp, Clock, ArrowUpRight, Banknote } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContainer';

interface VideoStats {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views: number;
  likes: number;
  comments: number;
  created_at: string;
}

interface CreatorEarnings {
  total_views: number;
  monthly_views: number;
  monthly_earnings: number;
  total_earnings: number;
  unpaid_earnings: number;
  eligible_for_monetization: boolean;
}

interface PayoutMethod {
  id: string;
  account_type: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  paystack_recipient_code: string;
  verified: boolean;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  created_at: string;
  processed_at: string | null;
}

const CreatorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const { showToast } = useToast();

  const [earnings, setEarnings] = useState<CreatorEarnings | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod | null>(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [recentVideos, setRecentVideos] = useState<VideoStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  const PAYOUT_THRESHOLD = 20;

  const fetchCreatorData = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const [{ data: earningsData }, { data: payoutData }, { data: withdrawals }, { data: videosData }] = await Promise.all([
        supabase.rpc('get_creator_earnings', { c_id: user.id }),
        supabase.from('paystack_recipients').select('*').eq('user_id', user.id).eq('is_active', true).single(),
        supabase.from('withdrawal_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('videos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
      ]);

      if (earningsData) {
        setEarnings(earningsData as CreatorEarnings);
      }

      setPayoutMethod(payoutData || null);
      setWithdrawalRequests(withdrawals || []);
      setRecentVideos(videosData || []);

    } catch (err) {
      console.error('Error fetching creator data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchCreatorData();
    }
  }, [user?.id, fetchCreatorData]);

  const handleRequestWithdrawal = async () => {
    if (!earnings || earnings.unpaid_earnings < 1) {
      showToast('error', 'No earnings available for withdrawal');
      return;
    }

    if (!payoutMethod) {
      showToast('error', 'Please connect a payout method first');
      setShowPayoutModal(true);
      return;
    }

    try {
      const { error } = await supabase.from('withdrawal_requests').insert({
        user_id: user?.id,
        amount: earnings.unpaid_earnings,
        currency: 'ZAR',
        status: 'pending',
        payment_method: payoutMethod.account_type,
        payment_details: {
          recipient_code: payoutMethod.paystack_recipient_code,
          bank_name: payoutMethod.bank_name,
          account_number: payoutMethod.account_number
        }
      });

      if (error) throw error;

      showToast('success', 'Withdrawal request submitted!');
      fetchCreatorData();
      setShowPayoutModal(false);
    } catch (err) {
      console.error('Withdrawal error:', err);
      showToast('error', 'Failed to submit withdrawal request');
    }
  };

  const pendingPayout = withdrawalRequests.find(w => w.status === 'pending');
  const totalPaid = withdrawalRequests
    .filter(w => w.status === 'completed')
    .reduce((sum, w) => sum + Number(w.amount), 0);

  const progressPercent = Math.min((earnings?.unpaid_earnings || 0) / PAYOUT_THRESHOLD * 100, 100);

  if (!user?.isCreator) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Creator Dashboard</h1>
          <p className="text-gray-400 mb-6">
            You need to be a creator to access this dashboard. Upgrade your account to start earning!
          </p>
          <button
            onClick={() => navigate('/app/payment')}
            className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
          >
            Become a Creator
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24 font-['Outfit']">
      <div className="max-w-md mx-auto">
        {/* Transparent Header */}
        <div className="flex items-center justify-between px-6 py-8">
          <button className="p-3 glass rounded-2xl hover:bg-white/10 transition-all" onClick={() => navigate('/app')}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Earnings Centre</h1>
          <button className="p-3 glass rounded-2xl hover:bg-white/10 transition-all" onClick={fetchCreatorData}>
            <Download className={`w-5 h-5 ${isLoading ? 'animate-spin text-orange-500' : 'text-white/60'}`} />
          </button>
        </div>

        {/* Main Balance Card */}
        <div className="px-6 mb-8">
          <div className="relative overflow-hidden group">
             {/* Background Glow */}
             <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-600/20 rounded-full blur-[100px]" />
             <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-pink-600/20 rounded-full blur-[100px]" />
             
             <div className="relative glass-light rounded-[32px] p-8 border border-white/5 overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2 bg-white/5 py-2 px-4 rounded-full border border-white/5">
                    <Wallet className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-bold uppercase tracking-widest text-white/60">Available Balance</span>
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>

                <div className="space-y-1 mb-8">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white/40">R</span>
                    <motion.span 
                      key={earnings?.unpaid_earnings}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-6xl font-black tracking-tighter"
                    >
                      {earnings?.unpaid_earnings?.toFixed(2) || '0.00'}
                    </motion.span>
                  </div>
                  <p className="text-white/30 text-sm font-medium">Approx. ${((earnings?.unpaid_earnings || 0) * 0.055).toFixed(2)} USD</p>
                </div>

                {earnings && earnings.unpaid_earnings >= 1 ? (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRequestWithdrawal}
                    disabled={!payoutMethod}
                    className="w-full bg-orange-500 text-white py-5 rounded-2xl font-bold shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {payoutMethod ? (
                      <>
                        <span>Withdraw Funds</span>
                        <ArrowUpRight className="w-5 h-5" />
                      </>
                    ) : 'Connect Payout Method'}
                  </motion.button>
                ) : (
                  <div className="w-full bg-white/5 border border-white/5 text-white/40 py-5 rounded-2xl font-bold text-center">
                    Earnings below threshold
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* Payout Progress */}
        <div className="px-6 mb-8">
          <div className="glass-light rounded-3xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/50 text-xs font-bold uppercase tracking-widest">Next Payout Goal</span>
              <span className="text-orange-400 text-sm font-black">
                {progressPercent.toFixed(0)}%
              </span>
            </div>
            <div className="h-4 bg-white/5 rounded-full overflow-hidden p-1">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className="h-full bg-gradient-to-r from-orange-500 via-pink-500 to-orange-400 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.4)]"
              />
            </div>
            <div className="flex justify-between mt-4">
              <span className="text-[10px] font-bold text-white/20 uppercase">R0 MIN</span>
              <span className="text-[10px] font-bold text-white/20 uppercase">R{PAYOUT_THRESHOLD} TARGET</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-6 mb-8 grid grid-cols-2 gap-4">
            <div className="glass-light rounded-3xl p-6 border border-white/5 group">
              <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                <Eye className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-2xl font-black tracking-tight">{earnings?.monthly_views?.toLocaleString() || 0}</div>
              <div className="text-white/30 text-xs font-bold uppercase tracking-tighter mt-1">Monthly Views</div>
            </div>
            
            <div className="glass-light rounded-3xl p-6 border border-white/5 group">
              <div className="w-10 h-10 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-2xl font-black tracking-tight">
                ${((earnings?.monthly_earnings || 0) * 0.055).toFixed(2)}
              </div>
              <div className="text-white/30 text-xs font-bold uppercase tracking-tighter mt-1">EST. Revenue</div>
            </div>
        </div>

        {/* Payout Method Section */}
        <div className="px-6 mb-8">
          <div className="glass-light rounded-[32px] p-8 border border-white/5">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-xl">
                 <Banknote className="w-5 h-5 text-orange-500" />
              </div>
              Settlement Account
            </h3>
            
            {payoutMethod ? (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 group relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center border border-white/10">
                       <CreditCard className="w-6 h-6 text-white/60" />
                    </div>
                    <div>
                      <p className="font-bold text-white">{payoutMethod.bank_name}</p>
                      <p className="text-white/40 text-xs font-medium">
                        •••• {payoutMethod.account_number?.slice(-4)}
                      </p>
                    </div>
                  </div>
                  {payoutMethod.verified && (
                    <div className="bg-green-500/20 p-1.5 rounded-full">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                   <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Default Payout</span>
                   <span className="text-xs font-bold text-orange-500/80">Manage</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-white/30 text-sm leading-relaxed mb-4">
                  Connect your South African bank account or mobile money wallet to receive real-time settlements.
                </p>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/app/payment')}
                  className="w-full bg-white text-black py-5 rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-3"
                >
                  <CreditCard className="w-5 h-5" />
                  Link Bank Account
                </motion.button>
              </div>
            )}
          </div>
        </div>

        {/* Payout History */}
        {withdrawalRequests.length > 0 && (
          <div className="px-6 mb-12">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
               <div className="p-2 bg-pink-500/10 rounded-xl">
                  <Clock className="w-5 h-5 text-pink-500" />
               </div>
               Transaction Log
            </h3>
            <div className="space-y-3">
              {withdrawalRequests.map((req, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={req.id} 
                  className="glass-light rounded-3xl p-5 flex items-center justify-between border border-white/0 hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      req.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                      req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {req.status === 'completed' ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="font-bold text-lg leading-none mb-1">R{Number(req.amount).toFixed(2)}</p>
                      <p className="text-white/30 text-xs font-medium">
                        {new Date(req.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    req.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {req.status}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowPayoutModal(false)}>
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Connect Payout Method</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/app/payment')}
                className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center"
              >
                <Banknote className="w-5 h-5 mr-2" />
                Connect Bank Account
              </button>
              <button
                onClick={() => navigate('/app/payment')}
                className="w-full bg-gray-800 text-white py-4 rounded-xl font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center"
              >
                <Wallet className="w-5 h-5 mr-2" />
                Connect PayPal
              </button>
            </div>
            <button
              onClick={() => setShowPayoutModal(false)}
              className="w-full mt-4 text-gray-400 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorDashboard;
