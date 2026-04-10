import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X, User, Hash, ArrowRight, Loader2, TrendingUp, Play } from 'lucide-react';
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

const Search: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [videoResults, setVideoResults] = useState<VideoResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
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

                        <div className="bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-3xl p-6 border border-orange-500/30">
                            <h3 className="font-bold mb-2">Discover New Creators</h3>
                            <p className="text-gray-400 text-sm mb-4">
                                Explore the best talent across South Africa. From dance challenges to comedy skits.
                            </p>
                            <button className="bg-orange-500 text-white px-6 py-2 rounded-xl text-sm font-bold">
                                See More
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Search;
