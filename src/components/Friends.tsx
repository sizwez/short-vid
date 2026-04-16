import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Search, Users, UserCheck, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../hooks/useApp';
import { useToast } from './ToastContainer';

interface UserProfile {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    followers_count: number;
}

const Friends: React.FC = () => {
    const { user } = useApp();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<'friends' | 'suggestions'>('friends');
    const [friends, setFriends] = useState<UserProfile[]>([]);
    const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
    const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [searching, setSearching] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchFriends = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            // Get users that the current user follows
            const { data, error } = await supabase
                .from('follows')
                .select('following_id, users!follows_following_id_fkey(id, username, display_name, avatar_url, followers_count)')
                .eq('follower_id', user.id);

            if (error) throw error;
            const mapped = (data || []).map((d: any) => ({
                id: d.users?.id || d.following_id,
                username: d.users?.username || 'Unknown',
                display_name: d.users?.display_name || '',
                avatar_url: d.users?.avatar_url || null,
                followers_count: d.users?.followers_count || 0,
            }));
            setFriends(mapped);
            setFollowedIds(new Set(mapped.map((f: UserProfile) => f.id)));
        } catch (err) {
            console.error('Error fetching friends:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const fetchSuggestions = useCallback(async () => {
        if (!user) return;
        try {
            // Get users the current user is NOT following (excluding self)
            const { data, error } = await supabase
                .from('users')
                .select('id, username, display_name, avatar_url, followers_count')
                .neq('id', user.id)
                .limit(20);

            if (error) throw error;
            // Filter out already followed users
            const filtered = (data || []).filter(
                (u: UserProfile) => !followedIds.has(u.id)
            );
            setSuggestions(filtered);
        } catch (err) {
            console.error('Error fetching suggestions:', err);
        }
    }, [user, followedIds]);

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    useEffect(() => {
        if (activeTab === 'suggestions' && user) {
            fetchSuggestions();
        }
    }, [activeTab, user, fetchSuggestions]);

    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        try {
            setSearching(true);
            const { data, error } = await supabase
                .from('users')
                .select('id, username, display_name, avatar_url, followers_count')
                .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
                .neq('id', user?.id || '')
                .limit(10);

            if (error) throw error;
            setSearchResults(data || []);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setSearching(false);
        }
    }, [searchQuery, user]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                handleSearch();
            } else {
                setSearchResults([]);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery, handleSearch]);

    const toggleFollow = async (targetId: string) => {
        if (!user) {
            showToast('error', 'Please login to follow users');
            return;
        }
        setActionLoading(targetId);
        try {
            const isFollowing = followedIds.has(targetId);
            if (isFollowing) {
                const { error } = await supabase
                    .from('follows')
                    .delete()
                    .eq('follower_id', user.id)
                    .eq('following_id', targetId);
                if (error) throw error;
                setFollowedIds(prev => {
                    const next = new Set(prev);
                    next.delete(targetId);
                    return next;
                });
                setFriends(prev => prev.filter(f => f.id !== targetId));
                showToast('success', 'Unfollowed');
            } else {
                const { error } = await supabase
                    .from('follows')
                    .insert({ follower_id: user.id, following_id: targetId });
                if (error) throw error;
                setFollowedIds(prev => {
                    const next = new Set(prev);
                    next.add(targetId);
                    return next;
                });
                // Add to friends list
                const suggestion = suggestions.find(s => s.id === targetId);
                if (suggestion) {
                    setFriends(prev => [suggestion, ...prev]);
                }
                showToast('success', 'Following!');
            }
            // Refresh suggestions
            if (activeTab === 'suggestions') {
                fetchSuggestions();
            }
        } catch (err) {
            console.error('Follow error:', err);
            showToast('error', 'Failed to update follow status');
        } finally {
            setActionLoading(null);
        }
    };

    const renderUserCard = (u: UserProfile, index: number, showFollowButton: boolean) => {
        const isFollowing = followedIds.has(u.id);
        const isLoading = actionLoading === u.id;

        return (
            <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="flex items-center gap-3 bg-white/5 rounded-2xl p-3 hover:bg-white/10 transition-colors"
            >
                <div
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-lg font-bold overflow-hidden cursor-pointer shrink-0"
                    onClick={() => navigate(`/app/profile/${u.id}`)}
                >
                    {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                        (u.username || u.display_name || '?')[0].toUpperCase()
                    )}
                </div>
                <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/app/profile/${u.id}`)}
                >
                    <p className="font-semibold text-sm truncate">{u.display_name || u.username}</p>
                    <p className="text-xs text-gray-500 truncate">@{u.username}</p>
                </div>
                {showFollowButton && (
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleFollow(u.id); }}
                        disabled={isLoading}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${isFollowing
                            ? 'bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400'
                            : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                            }`}
                    >
                        {isLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isFollowing ? (
                            <>
                                <UserCheck className="w-3 h-3" />
                                Following
                            </>
                        ) : (
                            <>
                                <UserPlus className="w-3 h-3" />
                                Follow
                            </>
                        )}
                    </button>
                )}
                {!showFollowButton && (
                    <button
                        onClick={() => navigate(`/app/profile/${u.id}`)}
                        className="px-3 py-1.5 bg-white/10 rounded-full text-xs font-semibold hover:bg-white/20 transition-colors"
                    >
                        View
                    </button>
                )}
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen bg-black text-white px-4 pt-4 pb-32">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Friends</h1>
                <button
                    onClick={() => setActiveTab('suggestions')}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                    <UserPlus className="w-5 h-5" />
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search people..."
                    className="w-full bg-white/10 rounded-xl pl-10 pr-4 py-3 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
                {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => { setActiveTab('friends'); setSearchQuery(''); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeTab === 'friends'
                        ? 'bg-orange-500 text-white'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                >
                    <UserCheck className="w-4 h-4" />
                    My Friends
                    {friends.length > 0 && (
                        <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
                            {friends.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => { setActiveTab('suggestions'); setSearchQuery(''); }}
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
                    <p className="text-gray-500 mt-4 text-sm">Loading...</p>
                </div>
            ) : searchQuery.trim() ? (
                /* Search Results */
                searchResults.length > 0 ? (
                    <div className="space-y-3">
                        {searchResults.map((u, i) => renderUserCard(u, i, true))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Search className="w-16 h-16 text-gray-600 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-400 mb-2">No results found</h3>
                        <p className="text-sm text-gray-600 max-w-xs">
                            Try searching for a different username or name.
                        </p>
                    </div>
                )
            ) : activeTab === 'friends' ? (
                /* My Friends Tab */
                friends.length > 0 ? (
                    <div className="space-y-3">
                        {friends.map((friend, i) => renderUserCard(friend, i, true))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Users className="w-16 h-16 text-gray-600 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-400 mb-2">No friends yet</h3>
                        <p className="text-sm text-gray-600 max-w-xs mb-6">
                            Start connecting with people by following them!
                        </p>
                        <button
                            onClick={() => setActiveTab('suggestions')}
                            className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-2.5 rounded-full text-sm font-semibold"
                        >
                            Discover People
                        </button>
                    </div>
                )
            ) : (
                /* Suggestions Tab */
                suggestions.length > 0 ? (
                    <div className="space-y-3">
                        {suggestions.map((s, i) => renderUserCard(s, i, true))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <UserCheck className="w-16 h-16 text-gray-600 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-400 mb-2">You're following everyone!</h3>
                        <p className="text-sm text-gray-600 max-w-xs">
                            You're already following all suggested users. Check back later for new people.
                        </p>
                    </div>
                )
            )}
        </div>
    );
};

export default Friends;