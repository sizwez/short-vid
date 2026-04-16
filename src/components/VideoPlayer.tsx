import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Heart, MessageCircle, Share2, Bookmark, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './ToastContainer';
import ShareModal from './ShareModal';
import CommentModal from './CommentModal';
import { useApp } from '../hooks/useApp';

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



const VideoPlayer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useApp();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 });
  const [optimisticLikes, setOptimisticLikes] = useState<number | null>(null);
  const lastTapRef = useRef<number>(0);

  const fetchVideo = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('videos')
        .select(`
          id,
          user_id,
          title,
          caption,
          video_url,
          thumbnail_url,
          likes,
          comments,
          shares,
          saves,
          views,
          hashtags,
          is_public,
          is_active,
          created_at,
          users:user_id (
            id,
            username,
            display_name,
            avatar_url,
            verified_badge
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      
      const processedVideo = {
        ...data,
        users: Array.isArray(data.users) ? data.users[0] : data.users
      };
      setVideo(processedVideo as Video);
      
      try {
        await supabase.rpc('increment_video_view', { v_id: id });
      } catch (rpcErr) {
        console.warn('View increment failed (Normal if RPC is missing):', rpcErr);
      }
      
      if (user) {
        await supabase.from('video_views').insert({
          user_id: user.id,
          video_id: id,
          watched_seconds: 0
        });
      }

      const refParam = searchParams.get('ref');
      if (refParam && refParam !== 'anonymous' && refParam !== user?.id) {
        await supabase.from('video_referrals').insert({
          video_id: id,
          referrer_user_id: refParam,
          referee_user_id: user?.id || null,
          referral_source: 'share'
        });
      }
    } catch (err) {
      console.error('Error fetching video:', err);
      setError('Video not found');
    } finally {
      setLoading(false);
    }
  }, [id, user, searchParams]);

  const fetchUserInteractions = useCallback(async () => {
    if (!user || !id) return;

    const [{ data: like }, { data: save }] = await Promise.all([
      supabase.from('likes').select('id').eq('user_id', user.id).eq('video_id', id).single(),
      supabase.from('saves').select('id').eq('user_id', user.id).eq('video_id', id).single()
    ]);

    setIsLiked(!!like);
    setIsSaved(!!save);
  }, [user, id]);



  useEffect(() => {
    fetchVideo();
  }, [fetchVideo]);

  useEffect(() => {
    if (user) {
      fetchUserInteractions();
    }
  }, [user, fetchUserInteractions]);

  const handleLike = async () => {
    if (!user) {
      showToast('error', 'Please login to like videos');
      return;
    }

    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setOptimisticLikes((prev) => {
      const base = prev ?? video?.likes ?? 0;
      return wasLiked ? base - 1 : base + 1;
    });

    try {
      if (wasLiked) {
        await supabase.from('likes').delete().eq('user_id', user.id).eq('video_id', id);
      } else {
        await supabase.from('likes').insert({ user_id: user.id, video_id: id });
      }
      // Refresh from server to get accurate count
      fetchVideo();
    } catch (err) {
      console.error('Like error:', err);
      // Revert on error
      setIsLiked(wasLiked);
      setOptimisticLikes(null);
    }
  };

  const handleDoubleTap = useCallback((e: React.MouseEvent<HTMLVideoElement>) => {
    const now = Date.now();
    const timeDiff = now - lastTapRef.current;
    
    if (timeDiff < 300 && timeDiff > 0) {
      // Double tap detected - like the video
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setHeartPosition({ x, y });
      setShowHeart(true);
      
      if (!isLiked) {
        handleLike();
      }
      
      setTimeout(() => setShowHeart(false), 1000);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [isLiked, handleLike]);

  const handleSave = async () => {
    if (!user) {
      showToast('error', 'Please login to save videos');
      return;
    }

    try {
      if (isSaved) {
        await supabase.from('saves').delete().eq('user_id', user.id).eq('video_id', id);
        setIsSaved(false);
        showToast('success', 'Removed from saved');
      } else {
        await supabase.from('saves').insert({ user_id: user.id, video_id: id });
        setIsSaved(true);
        showToast('success', 'Video saved!');
      }
    } catch (err) {
      console.error('Save error:', err);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <p className="text-red-500 mb-4">{error || 'Video not found'}</p>
        <button 
          onClick={() => navigate('/app')}
          className="bg-orange-500 px-6 py-2 rounded-full"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="relative h-screen">
        <video
          src={video.video_url}
          className="absolute inset-0 w-full h-full object-contain bg-black"
          controls
          autoPlay
          loop
          poster={video.thumbnail_url}
          onClick={handleDoubleTap}
        />

        {/* Double-tap Heart Animation */}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              initial={{ opacity: 1, scale: 0 }}
              animate={{ opacity: 1, scale: 1, y: -20 }}
              exit={{ opacity: 0, scale: 1.5, y: -60 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute pointer-events-none z-30"
              style={{ left: heartPosition.x - 40, top: heartPosition.y - 40 }}
            >
              <Heart className="w-20 h-20 text-red-500 fill-red-500 drop-shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 bg-black/40 rounded-full text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-20">
          <div className="flex items-end justify-between">
            <div className="flex-1 mr-4">
              <div 
                className="flex items-center gap-3 mb-3 cursor-pointer"
                onClick={() => navigate(`/app/profile/${video.users?.id}`)}
              >
                <img
                  src={video.users?.avatar_url || `https://ui-avatars.com/api/?name=${video.users?.username || 'User'}&background=random`}
                  alt={video.users?.username}
                  className="w-10 h-10 rounded-full border border-white/20"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white">{video.users?.display_name || video.users?.username}</span>
                    {video.users?.verified_badge && (
                      <span className="bg-blue-500/20 text-blue-400 text-xs px-1 rounded">✓</span>
                    )}
                  </div>
                  <span className="text-white/50 text-sm">@{video.users?.username}</span>
                </div>
              </div>
              <h3 className="text-white font-medium mb-1">{video.title}</h3>
              <p className="text-white/60 text-sm mb-2">{video.caption}</p>
              <div className="flex flex-wrap gap-2">
                {video.hashtags?.slice(0, 5).map((tag) => (
                  <span key={tag} className="text-pink-400 text-xs font-medium">#{tag}</span>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center">
                <button 
                  onClick={handleLike} 
                  className={`p-3 rounded-full ${isLiked ? 'text-red-500 bg-red-500/10' : 'text-white'}`}
                >
                  <Heart className={`w-7 h-7 ${isLiked ? 'fill-current' : ''}`} />
                </button>
                <span className="text-white/80 text-xs mt-1">{optimisticLikes ?? video.likes}</span>
              </motion.div>
              
              <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center">
                <button 
                  onClick={() => setShowComments(true)} 
                  className="p-3 rounded-full text-white"
                >
                  <MessageCircle className="w-7 h-7" />
                </button>
                <span className="text-white/80 text-xs mt-1">{video.comments}</span>
              </motion.div>
              
              <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center">
                <button 
                  onClick={handleSave} 
                  className={`p-3 rounded-full ${isSaved ? 'text-orange-500 bg-orange-500/10' : 'text-white'}`}
                >
                  <Bookmark className={`w-7 h-7 ${isSaved ? 'fill-current' : ''}`} />
                </button>
                <span className="text-white/80 text-xs mt-1">{video.saves}</span>
              </motion.div>
              
              <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center">
                <button 
                  onClick={() => setShareModalOpen(true)} 
                  className="p-3 rounded-full text-white"
                >
                  <Share2 className="w-7 h-7" />
                </button>
                <span className="text-white/80 text-xs mt-1">{video.shares}</span>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <CommentModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        videoId={id || ''}
        currentUserId={user?.id || null}
      />

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        url={`${window.location.origin}/app/video/${video.id}?ref=${user?.id || 'anonymous'}`}
        title={video.title}
        videoId={video.id}
      />
    </div>
  );
};

export default React.memo(VideoPlayer);
