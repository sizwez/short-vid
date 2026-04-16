import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Search, Users, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../hooks/useApp';

interface Friend {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
}

const Friends: React.FC = () => {
    const { user } = useApp();
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'friends' | 'suggestions'>('friends');

    useEffect(() => {
        if (!user) return;
        fetchFriends();
    }, [user]);

    const fetchFriends = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('friends')
                .select('friend_id, profiles!friends_friend_id_fkey(id, username, full_name, avatar_url)')
                .eq('user_id', user.id)
                .eq('status', 'accepted');

            if (error) throw error;
            const mapped = (data || []).map((d: any) => ({
                id: d.profiles?.id || d.friend_id,
                username: d.profiles?.username || 'Unknown',
                full_name: d.profiles?.full_name || '',
                avatar_url: d.profiles?.avatar_url || null,
            }));
            setFriends(mapped);
        } catch (err) {
            console.error('Error fetching friends:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white px-4 pt-4 pb-32">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Friends</h1>
                <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                    <UserPlus className="w-5 h-5" />
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search friends..."
                    className="w-full bg-white/10 rounded-xl pl-10 pr-4 py-3 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('friends')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeTab === 'friends'
                            ? 'bg-orange-500 text-white'
                            : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                >
                    <UserCheck className="w-4 h-4" />
                    My Friends
                </button>
                <button
                    onClick={() => setActiveTab('suggestions')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeTab === 'suggestions'
                            ? 'bg-orange-500 text-white'
                            : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                >
                    <Users className="w-4 h-4" />
                    Suggestions
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-10 h-10 rounded-full border-4 border-orange-500 border-t-transparent animate-spin opacity-50" />
                    <p className="text-gray-500 mt-4 text-sm">Loading friends...</p>
                </div>
            ) : activeTab === 'friends' ? (
                friends.length > 0 ? (
                    <div className="space-y-3">
                        {friends.map((friend, i) => (
                            <motion.div
                                key={friend.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center gap-3 bg-white/5 rounded-2xl p-3 hover:bg-white/10 transition-colors"
                            >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-lg font-bold overflow-hidden">
                                    {friend.avatar_url ? (
                                        <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        (friend.username || friend.full_name || '?')[0].toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">{friend.full_name || friend.username}</p>
                                    <p className="text-xs text-gray-500 truncate">@{friend.username}</p>
                                </div>
                                <button className="px-3 py-1.5 bg-white/10 rounded-full text-xs font-semibold hover:bg-white/20 transition-colors">
                                    View
                                </button>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Users className="w-16 h-16 text-gray-600 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-400 mb-2">No friends yet</h3>
                        <p className="text-sm text-gray-600 max-w-xs">
                            Start connecting with people by sending friend requests!
                        </p>
                    </div>
                )
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <UserPlus className="w-16 h-16 text-gray-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">Find friends</h3>
                    <p className="text-sm text-gray-600 max-w-xs">
                        Search for users by username to send them a friend request.
                    </p>
                </div>
            )}
        </div>
    );
};

export default Friends;