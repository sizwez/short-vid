import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search as SearchIcon, X, User, Hash, ArrowRight, Loader2, TrendingUp, Play, UserPlus, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContainer';
import EmptyState from './EmptyState';

interface SearchResult {
    id: string;
    type: 'user' | 'hashtag';
    title: string;
    subtitle?: string;
    image?: string | null;
}

interface VideoResult {
    id: string;
    title: string;
    thumbnail_url: string | null;
    video_url: string;
    views: number;
    user: {
        username: string;
        display_name: string;
        avatar_url: string;
    } | null;
}

interface SuggestedCreator {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    followers_count: number;
}

const Search: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [videoResults, setVideoResults] = useState<VideoResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [suggestedCreators, setSuggestedCreators] = useState<SuggestedCreator[]>([]);
    const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
    const [followLoading, setFollowLoading] = useState<string | null>(null);
    const trendingTags = ['amapiano', 'mzansi', 'vula_vala', 'caspernyovest', 'braai_vibes'];

    const handleSearch = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Search Users
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id, username, display_name, avatar_url')
                .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
                .limit(5);

            if (userError) throw userError;

            // 2. Search Videos
            const { data: videos, error: videoError } = await supabase
                .from('videos')
                .select('id, title, thumbnail_url, video_url, views, users:user_id(username, display_name, avatar_url)')
                .or(`title.ilike.%${query}%,caption.ilike.%${query}%`)
                .eq('is_public', true)
                .eq('is_active', true)
                .limit(12);

            if (videoError) throw videoError;

            const processedVideos: VideoResult[] = (videos || []).map((v: Record<string, unknown>) => ({
                id: v.id as string,
                title: v.title as string,
                thumbnail_url: v.thumbnail_url as string | null,
                video_url: v.video_url as string,
                views: v.views as number,
                user: Array.isArray(v.users) ? v.users[0] : (v.users as VideoResult['user'])
            }));
            setVideoResults(processedVideos);

            // 3. Search Hashtags (from videos table)
            const { data: tagVideos, error: tagError } = await supabase
                .from('videos')
                .select('hashtags')
                .contains('hashtags', [query.toLowerCase()])
                .limit(5);

            if (tagError) throw tagError;

            const userResults: SearchResult[] = (users || []).map(u => ({
                id: u.id,
                type: 'user',
                title: u.display_name || u.username,
                subtitle: `@${u.username}`,
                image: u.avatar_url
            }));

            const uniqueTags = new Set<string>();
            (tagVideos || []).forEach(v => {
                v.hashtags?.forEach((tag: string) => {
                    if (tag.toLowerCase().includes(query.toLowerCase())) {
                        uniqueTags.add(tag);
                    }
                });
            });

            const tagResults: SearchResult[] = Array.from(uniqueTags).map(tag => ({
                id: tag,
                type: 'hashtag',
                title: `#${tag}`,
                subtitle: 'Trending'
            }));

            setResults([...userResults, ...tagResults]);
        } catch (err) {
            console.error('Search error:', err);
            showToast('error', 'Search failed');
        } finally {
            setIsLoading(false);
        }
    }, [query, showToast]);

    // Fetch suggested creators on mount
    useEffect(() => {
        const fetchCreators = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                let followed: string[] = [];
                if (user) {
                    const { data: followsData } = await supabase
                        .from('follows')
                        .select('following_id')
                        .eq('follower_id', user.id);
                    followed = (followsData || []).map(f => f.following_id);
                    setFollowedIds(new Set(followed));
                }
                const { data: creators, error } = await supabase
                    .from('users')
                    .select('id, username, display_name, avatar_url, followers_count')
                    .neq('id', user?.id || '')
                    .limit(15);
                if (error) throw error;
                const filtered = (creators || []).filter(c => !followed.includes(c.id));
                setSuggestedCreators(filtered);
            } catch (err) {
                console.error('Error fetching creators:', err);
            }
        };
        fetchCreators();
    }, []);

    const toggleFollow = async (targetId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { showToast('error', 'Login to follow'); return; }
        setFollowLoading(targetId);
        try {
            const isFollowing = followedIds.has(targetId);
            if (isFollowing) {
                const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
                if (error) throw error;
                setFollowedIds(prev => { const n = new Set(prev); n.delete(targetId); return n; });
                showToast('success', 'Unfollowed');
            } else {
                const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
                if (error) throw error;
                setFollowedIds(prev => { const n = new Set(prev); n.add(targetId); return n; });
                showToast('success', 'Following!');
            }
            setSuggestedCreators(prev => prev.filter(c => !followedIds.has(c.id) || c.id === targetId));
        } catch (err) {
            console.error('Follow error:', err);
            showToast('error', 'Failed to update follow');
        } finally {
            setFollowLoading(null);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) {
                handleSearch();
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query, handleSearch]);

    return (
        <div className="min-h-screen bg-black text-white p-6">
            <div className="max-w-md mx-auto">
                <div className="relative mb-8 pt-8">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search creators or hashtags..."
                        className="w-full bg-gray-900 border border-gray-800 rounded-2xl py-4 pl-12 pr-12 text-white focus:border-orange-500 focus:outline-none transition-colors"
                        autoFocus
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-800 rounded-full"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                        <p className="text-gray-400">Searching Mzansi...</p>
                    </div>
                ) : query && results.length > 0 ? (
                    <div className="space-y-4">
                        {results.map((result, idx) => (
                            <button
                                key={`${result.type}-${result.id}-${idx}`}
                                onClick={() => {
                                    if (result.type === 'user') {
                                        navigate(`/app/profile/${result.id}`);
                                    } else {
                                        showToast('info', `Filtering by #${result.id} is coming soon!`);
                                    }
                                }}
                                className="w-full flex items-center justify-between p-4 bg-gray-900 hover:bg-gray-800 rounded-2xl transition-colors group"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                                        {result.type === 'user' ? (
                                            result.image ? (
                                                <img src={result.image} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-6 h-6 text-gray-500" />
                                            )
                                        ) : (
                                            <Hash className="w-6 h-6 text-orange-500" />
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-bold group-hover:text-orange-500 transition-colors">
                                            {result.title}
                                        </h4>
                                        <p className="text-gray-400 text-sm">{result.subtitle}</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-orange-500 transform group-hover:translate-x-1 transition-all" />
                            </button>
                        ))}

                        {videoResults.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-lg font-bold mb-4">Videos</h3>
                                <div className="grid grid-cols-3 gap-1">
                                    {videoResults.map((video) => (
                                        <button
                                            key={video.id}
                                            onClick={() => navigate(`/app/video/${video.id}`)}
                                            className="relative aspect-[9/16] bg-gray-900 rounded-lg overflow-hidden"
                                        >
                                            {video.thumbnail_url ? (
                                                <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Play className="w-8 h-8 text-gray-600" />
                                                </div>
                                            )}
                                            <div className="absolute bottom-1 left-1 right-1 text-xs text-white bg-black/50 px-1 rounded">
                                                {video.views?.toLocaleString()} views
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : query ? (
                    <EmptyState
                        type="search"
                        title={`No results for "${query}"`}
                        description="Try searching for something different or check your spelling"
                    />
                ) : (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center">
                                <TrendingUp className="w-5 h-5 text-orange-500 mr-2" />
                                Trending Hashtags
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {trendingTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setQuery(tag)}
                                        className="bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Suggested Creators */}
                        {suggestedCreators.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold mb-4 flex items-center">
                                    <UserPlus className="w-5 h-5 text-orange-500 mr-2" />
                                    Discover Creators
                                </h3>
                                <div className="space-y-3">
                                    {suggestedCreators.map((creator, idx) => (
                                        <motion.div
                                            key={creator.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="flex items-center gap-3 bg-gray-900 hover:bg-gray-800 rounded-2xl p-3 transition-colors"
                                        >
                                            <div
                                                className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-lg font-bold overflow-hidden cursor-pointer shrink-0"
                                                onClick={() => navigate(`/app/profile/${creator.id}`)}
                                            >
                                                {creator.avatar_url ? (
                                                    <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    (creator.username || '?')[0].toUpperCase()
                                                )}
                                            </div>
                                            <div
                                                className="flex-1 min-w-0 cursor-pointer"
                                                onClick={() => navigate(`/app/profile/${creator.id}`)}
                                            >
                                                <p className="font-semibold text-sm truncate">{creator.display_name || creator.username}</p>
                                                <p className="text-xs text-gray-500 truncate">@{creator.username}</p>
                                            </div>
                                            <button
                                                onClick={() => toggleFollow(creator.id)}
                                                disabled={followLoading === creator.id}
                                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${followedIds.has(creator.id)
                                                        ? 'bg-white/10 text-white'
                                                        : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                                                    }`}
                                            >
                                                {followLoading === creator.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : followedIds.has(creator.id) ? (
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
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {suggestedCreators.length === 0 && (
                            <div className="bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-3xl p-6 border border-orange-500/30 text-center">
                                <UserCheck className="w-10 h-10 text-orange-500 mx-auto mb-3" />
                                <h3 className="font-bold mb-2">You're following everyone!</h3>
                                <p className="text-gray-400 text-sm">
                                    Check back later for new creators to follow.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Search;
