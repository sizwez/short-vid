import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Heart, MessageCircle, Share2, Bookmark, ArrowLeft, Loader2, X, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from './ToastContainer';
import ShareModal from './ShareModal';
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

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

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
      
      await supabase.rpc('increment_video_view', { v_id: id });
      
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

  const fetchComments = useCallback(async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('video_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const processedComments = (data || []).map(comment => ({
        ...comment,
        user: Array.isArray(comment.user) ? comment.user[0] : comment.user
      }));
      setComments(processedComments as Comment[]);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  }, [id]);

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

    try {
      if (isLiked) {
        await supabase.from('likes').delete().eq('user_id', user.id).eq('video_id', id);
        setIsLiked(false);
      } else {
        await supabase.from('likes').insert({ user_id: user.id, video_id: id });
        setIsLiked(true);
      }
      fetchVideo();
    } catch (err) {
      console.error('Like error:', err);
    }
  };

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

  const handlePostComment = async () => {
    if (!newComment.trim() || !user) return;
    
    setIsPosting(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          video_id: id,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;
      setNewComment('');
      fetchComments();
      fetchVideo();
      showToast('success', 'Comment posted!');
    } catch (err) {
      console.error('Error posting comment:', err);
      showToast('error', 'Failed to post comment');
    } finally {
      setIsPosting(false);
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
        />
        
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
                <span className="text-white/80 text-xs mt-1">{video.likes}</span>
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

      {showComments && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/80" onClick={() => setShowComments(false)}>
          <div 
            className="bg-gray-900 w-full rounded-t-3xl max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-white font-bold">Comments</h3>
              <button onClick={() => setShowComments(false)} className="p-2">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No comments yet. Be the first!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                      {comment.user?.avatar_url ? (
                        <img src={comment.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white text-sm">
                          {comment.user?.username?.charAt(0).toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">
                        <span className="font-semibold">@{comment.user?.username || 'user'}</span>{' '}
                        {comment.content}
                      </p>
                      <span className="text-gray-500 text-xs">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-700">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={user ? "Add a comment..." : "Login to comment"}
                  className="flex-1 bg-gray-800 rounded-full py-2 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={!user || isPosting}
                  onKeyPress={(e) => e.key === 'Enter' && handlePostComment()}
                />
                <button
                  onClick={handlePostComment}
                  disabled={!newComment.trim() || !user || isPosting}
                  className="bg-orange-500 p-2 rounded-full disabled:opacity-50"
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
