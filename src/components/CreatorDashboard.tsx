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
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between p-4 pt-12">
          <button className="p-2" onClick={() => navigate('/app')}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Earnings</h1>
          <button className="p-2" onClick={fetchCreatorData}>
            <Download className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="px-4 mb-4">
          <div className="bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/80 text-sm">Available Balance</span>
              <div className="bg-white/20 px-3 py-1 rounded-full">
                <span className="text-xs font-medium">R{earnings?.unpaid_earnings?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
            <div className="text-4xl font-bold mb-1">
              R{earnings?.unpaid_earnings?.toFixed(2) || '0.00'}
            </div>
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>${((earnings?.unpaid_earnings || 0) * 0.055).toFixed(2)} USD</span>
            </div>

            {earnings && earnings.unpaid_earnings >= 1 && (
              <button
                onClick={handleRequestWithdrawal}
                disabled={!payoutMethod}
                className="w-full mt-4 bg-white text-orange-600 py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {payoutMethod ? 'Withdraw Funds' : 'Connect Payout Method'}
              </button>
            )}
          </div>
        </div>

        <div className="px-4 mb-4">
          <div className="bg-gray-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">Progress to next payout</span>
              <span className="text-orange-400 text-sm font-medium">
                R{(PAYOUT_THRESHOLD - (earnings?.unpaid_earnings || 0)).toFixed(2)} to go
              </span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className="h-full bg-gradient-to-r from-orange-500 to-pink-500"
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>R0</span>
              <span>R{PAYOUT_THRESHOLD}</span>
            </div>
          </div>
        </div>

        <div className="px-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-blue-500" />
                <span className="text-gray-400 text-xs">This Month</span>
              </div>
              <div className="text-xl font-bold">{earnings?.monthly_views?.toLocaleString() || 0}</div>
              <div className="text-gray-500 text-xs">total views</div>
            </div>
            
            <div className="bg-gray-900 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span className="text-gray-400 text-xs">Estimated</span>
              </div>
              <div className="text-xl font-bold">
                ${((earnings?.monthly_earnings || 0) * 0.055).toFixed(2)}
              </div>
              <div className="text-gray-500 text-xs">this month</div>
            </div>
          </div>
        </div>

        <div className="px-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-gray-400 text-xs">Pending</span>
              </div>
              <div className="text-xl font-bold">
                {pendingPayout ? `R${Number(pendingPayout.amount).toFixed(2)}` : 'R0.00'}
              </div>
              <div className="text-gray-500 text-xs">
                {pendingPayout ? 'Processing' : 'No pending'}
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-gray-400 text-xs">Total Paid</span>
              </div>
              <div className="text-xl font-bold">R{totalPaid.toFixed(2)}</div>
              <div className="text-gray-500 text-xs">all time</div>
            </div>
          </div>
        </div>

        <div className="px-4 mb-4">
          <div className="bg-gray-900 rounded-xl p-4">
            <h3 className="font-semibold mb-4 flex items-center">
              <Wallet className="w-5 h-5 mr-2" />
              Payout Method
            </h3>
            
            {payoutMethod ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-400 font-medium flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    Connected
                  </span>
                  {payoutMethod.verified && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <p className="text-white font-medium">{payoutMethod.bank_name}</p>
                <p className="text-gray-400 text-sm">
                  {payoutMethod.account_type === 'bank_transfer' ? 'Bank Transfer' : 'Mobile Money'} •••• {payoutMethod.account_number?.slice(-4)}
                </p>
                <p className="text-gray-400 text-sm mt-1">{payoutMethod.account_name}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm mb-4">
                  Connect a payout method to receive your earnings
                </p>
                <button
                  onClick={() => navigate('/app/payment')}
                  className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  Connect Bank Account
                </button>
                <button
                  onClick={() => navigate('/app/payment')}
                  className="w-full bg-gray-800 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Wallet className="w-5 h-5" />
                  Connect Pay</button>
              Pal
                </div>
            )}
          </div>
        </div>

        {withdrawalRequests.length > 0 && (
          <div className="px-4 mb-4">
            <h3 className="font-semibold mb-4 flex items-center">
              <ArrowUpRight className="w-5 h-5 mr-2" />
              Payout History
            </h3>
            <div className="space-y-2">
              {withdrawalRequests.map((req) => (
                <div key={req.id} className="bg-gray-900 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      req.status === 'completed' ? 'bg-green-500/20' :
                      req.status === 'pending' ? 'bg-yellow-500/20' :
                      'bg-red-500/20'
                    }`}>
                      {req.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : req.status === 'pending' ? (
                        <Clock className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">R{Number(req.amount).toFixed(2)}</p>
                      <p className="text-gray-400 text-sm">
                        {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    req.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {req.status === 'completed' ? 'Paid' : req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 mb-4">
          <div className="bg-gray-900 rounded-xl p-4">
            <h3 className="font-semibold mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Performance
            </h3>
            <div className="h-32 bg-gradient-to-t from-orange-500/20 to-transparent rounded-lg flex items-end justify-around p-2">
              {[65, 80, 45, 90, 70, 85, 60].map((height, i) => (
                <div
                  key={i}
                  className="w-8 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="flex justify-around text-xs text-gray-400 mt-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <span key={day}>{day}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 mb-4">
          <h3 className="font-semibold mb-4">Recent Videos</h3>
          <div className="space-y-3">
            {recentVideos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-900 rounded-xl p-4"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-16 bg-gray-800 rounded flex items-center justify-center overflow-hidden">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Play className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1 truncate max-w-[200px]">{video.title}</h4>
                    <div className="flex items-center space-x-4 text-xs text-gray-400">
                      <span className="flex items-center">
                        <Eye className="w-3 h-3 mr-1" />
                        {video.views >= 1000 ? `${(video.views / 1000).toFixed(1)}K` : video.views}
                      </span>
                      <span className="flex items-center">
                        <Heart className="w-3 h-3 mr-1" />
                        {video.likes}
                      </span>
                      <span className="flex items-center">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        {video.comments}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
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
