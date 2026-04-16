import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Play, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './ToastContainer';
import ShareModal from './ShareModal';
import CommentModal from './CommentModal';
import VideoItem from './VideoItem';
import SkeletonVideoItem from './SkeletonVideoItem';
import { trackVideoPlay } from '../lib/analytics';
import { captureError } from '../lib/monitoring';
import { useNavigate } from 'react-router-dom';

interface Video {
  id: string;
  user_id: string;
  title: string;
  caption: string;
  video_url: string;
  thumbnail_url: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  hashtags: string[];
  is_public: boolean;
  is_active: boolean;
  created_at: string;
  users: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    verified_badge: boolean;
  } | null;
}

interface HomeFeedProps {
  onCallUser?: (userId: string) => void;
}

const HomeFeed: React.FC<HomeFeedProps> = ({ onCallUser }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commentModalVideo, setCommentModalVideo] = useState<string | null>(null);
  const [shareModalData, setShareModalData] = useState<{ isOpen: boolean; video: Video | null }>({
    isOpen: false,
    video: null
  });
  const [activeTab, setActiveTab] = useState<'friends' | 'following' | 'discover'>('friends');
  const [activeUsers, setActiveUsers] = useState<Array<{ id: string; username: string; display_name: string; avatar_url: string }>>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [savedVideosSet, setSavedVideosSet] = useState<Set<string>>(new Set());
  const [likedVideosSet, setLikedVideosSet] = useState<Set<string>>(new Set());

  const fetchUserInteractions = useCallback(async (userId: string) => {
    try {
      const [{ data: saves }, { data: likes }] = await Promise.all([
        supabase.from('saves').select('video_id').eq('user_id', userId),
        supabase.from('likes').select('video_id').eq('user_id', userId)
      ]);
      setSavedVideosSet(new Set((saves || []).map(s => s.video_id)));
      setLikedVideosSet(new Set((likes || []).map(l => l.video_id)));
    } catch (err) {
      console.error('Error fetching interactions:', err);
    }
  }, []);

  const fetchVideos = useCallback(async (tab: typeof activeTab) => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;
      setCurrentUserId(userId);

      let query = supabase
        .from('videos')
        .select(`
          *,
          users:user_id (
            id,
            username,
            display_name,
            avatar_url,
            verified_badge
          )
        `)
        .eq('is_public', true)
        .eq('is_active', true);

      if (tab === 'following' && userId) {
        const { data: following } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
        const followingIds = following?.map(f => f.following_id) || [];
        if (followingIds.length > 0) query = query.in('user_id', followingIds);
        else { setVideos([]); setLoading(false); return; }
      } else if (tab === 'friends' && userId) {
        const [f1, f2] = await Promise.all([
          supabase.from('follows').select('following_id').eq('follower_id', userId),
          supabase.from('follows').select('follower_id').eq('following_id', userId)
        ]);
        const ids = new Set([...(f1.data?.map(f => f.following_id) || []), ...(f2.data?.map(f => f.follower_id) || [])]);
        if (ids.size > 0) query = query.in('user_id', Array.from(ids));
        else { setVideos([]); setLoading(false); return; }
      } else if ((tab === 'friends' || tab === 'following') && !userId) {
        setVideos([]); setLoading(false); return;
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false }).limit(20);
      if (fetchError) throw fetchError;

      const processed = (data || []).map(v => ({
        ...v,
        users: Array.isArray(v.users) ? v.users[0] : v.users
      }));
      setVideos(processed);
      if (userId) fetchUserInteractions(userId);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [fetchUserInteractions]);

  useEffect(() => {
    fetchVideos(activeTab);
  }, [activeTab, fetchVideos]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const index = Math.round(containerRef.current.scrollTop / window.innerHeight);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  }, [activeIndex]);

  const handleLike = async (videoId: string) => {
    if (!currentUserId) { showToast('error', 'Login to like'); return; }
    const wasLiked = likedVideosSet.has(videoId);
    setLikedVideosSet(prev => {
      const next = new Set(prev);
      if (wasLiked) next.delete(videoId); else next.add(videoId);
      return next;
    });
    try {
      if (wasLiked) {
        await supabase.from('likes').delete().eq('user_id', currentUserId).eq('video_id', videoId);
      } else {
        await supabase.from('likes').insert({ user_id: currentUserId, video_id: videoId });
      }
    } catch (err) {
      showToast('error', 'Failed to update like');
      fetchUserInteractions(currentUserId);
    }
  };

  const handleSave = async (videoId: string) => {
    if (!currentUserId) { showToast('error', 'Login to save'); return; }
    const wasSaved = savedVideosSet.has(videoId);
    setSavedVideosSet(prev => {
      const next = new Set(prev);
      if (wasSaved) next.delete(videoId); else next.add(videoId);
      return next;
    });
    try {
      if (wasSaved) {
        await supabase.from('saves').delete().eq('user_id', currentUserId).eq('video_id', videoId);
      } else {
        await supabase.from('saves').insert({ user_id: currentUserId, video_id: videoId });
      }
    } catch (err) {
      showToast('error', 'Failed to update save');
      fetchUserInteractions(currentUserId);
    }
  };

  const incrementView = async (videoId: string) => {
    try { 
      await supabase.rpc('increment_video_view', { v_id: videoId }); 
    } catch (err) { 
      console.warn('View increment failed:', err);
      captureError(err instanceof Error ? err : new Error(String(err)), { videoId }); 
    }
  };

  if (loading && videos.length === 0) {
    return (
      <div className="h-screen bg-black overflow-hidden">
        {[1, 2, 3].map((i) => (
          <SkeletonVideoItem key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-black overflow-hidden">
      {/* Header Tabs */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent pt-12 pb-6 px-4">
        <div className="flex justify-center items-center gap-8">
          {['friends', 'following', 'discover'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`relative text-[15px] font-bold capitalize transition-all duration-300 ${
                activeTab === tab ? 'text-white' : 'text-gray-400'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="tabIndicator"
                  className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Feed */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      >
        {videos.map((video, index) => (
          <VideoItem
            key={video.id}
            video={video}
            isActive={index === activeIndex}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
            onLike={handleLike}
            onComment={(id) => setCommentModalVideo(id)}
            onShare={(v) => setShareModalData({ isOpen: true, video: v })}
            onSave={handleSave}
            isLiked={likedVideosSet.has(video.id)}
            isSaved={savedVideosSet.has(video.id)}
            onVideoPlay={(v) => {
              trackVideoPlay(v.id, v.title);
              incrementView(v.id);
            }}
          />
        ))}

        {videos.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-10">
            <motion.div 
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="glass-card p-10 max-w-sm w-full flex flex-col items-center border-white/10 shadow-2xl relative overflow-hidden"
            >
               {/* Decorative background glow */}
               <div className="absolute -top-10 -right-10 w-24 h-24 bg-pink-500/20 blur-3xl rounded-full" />
               <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-orange-500/20 blur-3xl rounded-full" />

               <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-6 shadow-inner border border-white/5 animate-float">
                  <Play className="w-10 h-10 text-white/40 fill-white/10" />
               </div>
               
               <h2 className="text-2xl font-bold mb-3 tracking-tight">No vibes yet</h2>
               <p className="text-gray-400 text-sm mb-10 leading-relaxed">
                 The stage is empty. Follow more creators or join the discovery to fill your feed with Mzansi's finest!
               </p>
               
               <motion.button 
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={() => setActiveTab('discover')}
                 className="w-full py-4 bg-gradient-to-r from-pink-500 to-orange-500 rounded-2xl font-bold shadow-xl shadow-pink-500/20 text-white tracking-wide"
               >
                 Discover Creators
               </motion.button>
            </motion.div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {commentModalVideo && (
          <CommentModal
            isOpen={!!commentModalVideo}
            onClose={() => setCommentModalVideo(null)}
            videoId={commentModalVideo}
            currentUserId={currentUserId}
          />
        )}
      </AnimatePresence>

      <ShareModal
        isOpen={shareModalData.isOpen}
        onClose={() => setShareModalData({ isOpen: false, video: null })}
        video={shareModalData.video}
      />
    </div>
  );
};

export default HomeFeed;
