import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Clock, Trophy, ArrowLeft, Plus, Check } from 'lucide-react';
import { useToast } from './ToastContainer';
import { supabase } from '../lib/supabase';
import { useApp } from '../hooks/useApp';

interface Challenge {
  id: string;
  name: string;
  hashtag: string;
  participants: number;
  videos: number;
  prize: number;
  endDate: Date;
  thumbnail: string;
  description: string;
}

const Challenges: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useApp();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'trending' | 'ending' | 'prize'>('all');
  const [joinedChallenges, setJoinedChallenges] = useState<Set<string>>(new Set());

  const fetchChallenges = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedChallenges: Challenge[] = (data || []).map(c => ({
        ...c,
        participants: 0,
        videos: 0,
        endDate: new Date(c.end_date)
      }));

      setChallenges(mappedChallenges);
    } catch (err) {
      console.error('Error fetching challenges:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUserParticipation = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('challenge_participants')
        .select('challenge_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setJoinedChallenges(new Set((data || []).map(p => p.challenge_id)));
    } catch (err) {
      console.error('Error fetching participation:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchChallenges();
    if (user?.id) {
      fetchUserParticipation();
    }
  }, [user?.id, fetchUserParticipation, fetchChallenges]);

  const handleCreateChallenge = () => {
    showToast('info', 'Challenge creation coming soon!');
  };

  const handleJoinChallenge = async (challengeId: string, challengeName: string) => {
    if (!user?.id) {
      showToast('error', 'Please login to join challenges');
      navigate('/onboarding/auth');
      return;
    }

    if (joinedChallenges.has(challengeId)) {
      showToast('info', `You've already joined ${challengeName}`);
      return;
    }

    try {
      const { error } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challengeId,
          user_id: user.id
        });

      if (error) throw error;

      setJoinedChallenges(new Set([...joinedChallenges, challengeId]));
      showToast('success', `Successfully joined ${challengeName}! 🎉`);
    } catch (err) {
      console.error('Error joining challenge:', err);
      showToast('error', 'Failed to join challenge');
    }
  };

  const filteredChallenges = challenges.filter(challenge => {
    switch (activeFilter) {
      case 'trending':
        return challenge.participants > 10000;
      case 'ending': {
        const daysUntilEnd = Math.ceil((challenge.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilEnd <= 3;
      }
      case 'prize':
        return challenge.prize > 10000;
      default:
        return true;
    }
  });

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between p-4 pt-12">
          <button className="p-2" onClick={() => navigate('/app')}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Challenges</h1>
          <button className="p-2" onClick={handleCreateChallenge}>
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div className="flex overflow-x-auto space-x-2 p-4 no-scrollbar">
          {['all', 'trending', 'ending', 'prize'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter as 'all' | 'trending' | 'ending' | 'prize')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === filter
                ? 'bg-orange-500 text-white'
                : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-4 p-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : filteredChallenges.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              No challenges found in this category.
            </div>
          ) : (
            filteredChallenges.map((challenge) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800"
              >
                <div className="relative h-40">
                  <img
                    src={challenge.thumbnail || 'https://images.unsplash.com/photo-1516280440614-37939bb911d5?w=400'}
                    alt={challenge.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center justify-between">
                      <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-lg font-bold">
                        #{challenge.hashtag}
                      </span>
                      <span className="flex items-center text-white font-bold">
                        <Trophy className="w-4 h-4 mr-1 text-yellow-500" />
                        R{challenge.prize.toLocaleString()}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mt-2">{challenge.name}</h3>
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                    {challenge.description}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-400 mb-6">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {challenge.participants.toLocaleString()} joined
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Ends {new Date(challenge.endDate).toLocaleDateString()}
                    </div>
                  </div>

                  <button
                    onClick={() => handleJoinChallenge(challenge.id, challenge.name)}
                    className={`w-full py-3 rounded-xl font-semibold transition-all ${joinedChallenges.has(challenge.id)
                      ? 'bg-green-500/20 text-green-500 cursor-default'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}
                  >
                    {joinedChallenges.has(challenge.id) ? (
                      <span className="flex items-center justify-center">
                        <Check className="w-5 h-5 mr-2" />
                        Already Joined
                      </span>
                    ) : 'Join Challenge'}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Challenges;