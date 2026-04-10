import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Heart, MessageCircle, Share2, Bookmark, Play, RefreshCw, X, Send, Loader2, Video, Reply } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from './ToastContainer';
import ShareModal from './ShareModal';
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

interface VideoWithUser extends Video {
  users: Video['users'];
}

interface CommentWithUser extends Comment {
  user: Comment['user'];
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

interface CommentModalProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
}

interface Reply {
  commentId: string;
  username: string;
}

const CommentModal: React.FC<CommentModalProps> = ({ videoId, isOpen, onClose, currentUserId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<Reply | null>(null);
  const { showToast } = useToast();

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
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
        .eq('video_id', videoId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      const processedComments = (data || []).map(comment => ({
        ...comment,
        user: Array.isArray(comment.user) ? comment.user[0] : comment.user
      }));
      setComments(processedComments as CommentWithUser[]);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, videoId, fetchComments]);

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentUserId) return;
    setIsPosting(true);
    try {
      const commentContent = replyTo
        ? `@${replyTo.username} ${newComment.trim()}`
        : newComment.trim();

      const { error } = await supabase
        .from('comments')
        .insert({
          video_id: videoId,
          user_id: currentUserId,
          content: commentContent
        });

      if (error) throw error;
      setNewComment('');
      setReplyTo(null);
      fetchComments();
      showToast('success', 'Comment posted!');
    } catch (err) {
      console.error('Error posting comment:', err);
      showToast('error', 'Failed to post comment');
    } finally {
      setIsPosting(false);
    }
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyTo({ commentId, username });
    setNewComment(`@${username} `);
  };

  const cancelReply = () => {
    setReplyTo(null);
    setNewComment('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-gray-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">Comments</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No comments yet. Be the first!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center flex-shrink-0">
                  {comment.user?.avatar_url ? (
                    <img src={comment.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-white font-bold">
                      {comment.user?.username?.charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white">
                    <span className="font-semibold">@{comment.user?.username || 'user'}</span>{' '}
                    <span className="text-gray-300">{comment.content}</span>
                  </p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-gray-500 text-xs">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                    {currentUserId && comment.user?.id !== currentUserId && (
                      <button
                        onClick={() => handleReply(comment.id, comment.user?.username || 'user')}
                        className="text-gray-500 text-xs hover:text-orange-500"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-700">
          {replyTo && (
            <div className="flex items-center justify-between mb-2 bg-gray-800 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-400">
                Replying to <span className="text-orange-500">@{replyTo.username}</span>
              </span>
              <button onClick={cancelReply} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyTo ? `Reply to @${replyTo.username}...` : (currentUserId ? "Add a comment..." : "Login to comment")}
              className="flex-1 bg-gray-800 rounded-full py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={!currentUserId || isPosting}
              onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
            />
            <button
              onClick={handlePostComment}
              disabled={!newComment.trim() || !currentUserId || isPosting}
              className="bg-orange-500 p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const HomeFeed = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedVideos, setSavedVideos] = useState<Set<string>>(new Set());
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [commentModalVideo, setCommentModalVideo] = useState<string | null>(null);
  const [shareModalData, setShareModalData] = useState<{ isOpen: boolean; video: Video | null }>({
    isOpen: false,
    video: null
  });
  const [activeTab, setActiveTab] = useState<'friends' | 'following' | 'discover'>('friends');
  const [activeUsers, setActiveUsers] = useState<Array<{ id: string; username: string; display_name: string; avatar_url: string }>>([]);
  const [showQuickAction, setShowQuickAction] = useState<{ user: typeof activeUsers[0] | null; x: number; y: number }>({ user: null, x: 0, y: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const { showToast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchVideos(activeTab);
    await fetchUserInteractions();
    await fetchActiveUsers();
    setIsRefreshing(false);
  };

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchUserInteractions = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const { data: saves } = await supabase
        .from('saves')
        .select('video_id')
        .eq('user_id', currentUserId);

      setSavedVideos(new Set((saves || []).map(s => s.video_id)));

      const { data: likes } = await supabase
        .from('likes')
        .select('video_id')
        .eq('user_id', currentUserId);

      setLikedVideos(new Set((likes || []).map(l => l.video_id)));
    } catch (err) {
      console.error('Error fetching interactions:', err);
    }
  }, [currentUserId]);

  const fetchActiveUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = following?.map(f => f.following_id) || [];
      if (followingIds.length === 0) {
        setActiveUsers([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', followingIds)
        .limit(10);

      setActiveUsers(profiles || []);
    } catch (err) {
      console.error('Error fetching active users:', err);
    }
  };

  const handleUserClick = (user: typeof activeUsers[0], event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setShowQuickAction({
      user,
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const navigate = useNavigate();

  const fetchVideos = useCallback(async (tab: 'friends' | 'following' | 'discover' = 'friends') => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
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
        .eq('is_public', true)
        .eq('is_active', true);

      if (tab === 'following' && currentUserId) {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId);
        const followingIds = following?.map(f => f.following_id) || [];
        if (followingIds.length > 0) {
          query = query.in('user_id', followingIds);
        } else {
          setVideos([]);
          setLoading(false);
          return;
        }
      } else if (tab === 'friends') {
        if (currentUserId) {
          // Safe parameterized queries instead of string interpolation
          const [followingRes, followersRes] = await Promise.all([
            supabase.from('follows').select('following_id').eq('follower_id', currentUserId),
            supabase.from('follows').select('follower_id').eq('following_id', currentUserId)
          ]);
          const friendIds = new Set([
            ...(followingRes.data?.map(f => f.following_id) || []),
            ...(followersRes.data?.map(f => f.follower_id) || [])
          ].filter(id => id !== currentUserId));
          if (friendIds.size > 0) {
            query = query.in('user_id', Array.from(friendIds));
          } else {
            setVideos([]);
            setLoading(false);
            return;
          }
        } else {
          setVideos([]);
          setLoading(false);
          return;
        }
      }

      const { data, error: fetchError } = await query
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (fetchError) throw fetchError;

      const processedVideos = (data || []).map(video => ({
        ...video,
        users: Array.isArray(video.users) ? video.users[0] : video.users
      }));

      // Stable shuffle for discover tab using a seed based on current timestamp
      // (changes on refresh but not on re-renders)
      if (tab === 'discover' && processedVideos.length > 1) {
        const seed = Date.now();
        for (let i = processedVideos.length - 1; i > 0; i--) {
          const j = Math.abs(Math.imul(i + seed, 2654435761)) % (i + 1);
          [processedVideos[i], processedVideos[j]] = [processedVideos[j], processedVideos[i]];
        }
      }

      setHasMore(data && data.length === PAGE_SIZE);
      setVideos(processedVideos as VideoWithUser[]);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const setupRealtimeSubscription = useCallback(() => {
    const channel = supabase
      .channel('videos-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'videos'
        },
        () => fetchVideos()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchVideos]);

  // Effects must come AFTER all useCallback definitions to avoid temporal dead zone
  useEffect(() => {
    getCurrentUser();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [setupRealtimeSubscription]);

  useEffect(() => {
    if (currentUserId) {
      fetchUserInteractions();
    }
  }, [currentUserId, fetchUserInteractions]);

  useEffect(() => {
    fetchVideos(activeTab);
  }, [activeTab, fetchVideos]);

  useEffect(() => {
    fetchActiveUsers();
  }, [currentUserId]);

  const handleLike = async (videoId: string) => {
    if (!currentUserId) {
      showToast('error', 'Please login to like videos');
      return;
    }

    const wasLiked = likedVideos.has(videoId);
    // Optimistic update
    setLikedVideos(prev => {
      const next = new Set(prev);
      if (wasLiked) next.delete(videoId);
      else next.add(videoId);
      return next;
    });

    try {
      if (wasLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('video_id', videoId);
      } else {
        await supabase
          .from('likes')
          .insert({ user_id: currentUserId, video_id: videoId });
      }
      fetchVideos();
    } catch (err) {
      // Rollback on failure
      setLikedVideos(prev => {
        const next = new Set(prev);
        if (wasLiked) next.add(videoId);
        else next.delete(videoId);
        return next;
      });
      showToast('error', 'Failed to update like');
    }
  };

  const handleSave = async (videoId: string) => {
    if (!currentUserId) {
      showToast('error', 'Please login to save videos');
      return;
    }

    const wasSaved = savedVideos.has(videoId);
    // Optimistic update
    setSavedVideos(prev => {
      const next = new Set(prev);
      if (wasSaved) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
    showToast('success', wasSaved ? 'Removed from saved' : 'Video saved!');

    try {
      if (wasSaved) {
        await supabase
          .from('saves')
          .delete()
          .eq('user_id', currentUserId)
          .eq('video_id', videoId);
      } else {
        await supabase
          .from('saves')
          .insert({ user_id: currentUserId, video_id: videoId });
      }
      fetchVideos();
    } catch (err) {
      // Rollback on failure
      setSavedVideos(prev => {
        const next = new Set(prev);
        if (wasSaved) next.add(videoId);
        else next.delete(videoId);
        return next;
      });
      showToast('error', 'Failed to update save');
    }
  };

  const incrementView = async (videoId: string) => {
    try {
      await supabase.rpc('increment_video_view', { v_id: videoId });
    } catch (err) {
      console.error('Error incrementing view:', err);
      captureError(err instanceof Error ? err : new Error(String(err)), { videoId });
    }
  };

  const handleVideoPlay = (video: Video) => {
    trackVideoPlay(video.id, video.title);
    incrementView(video.id);
  };

  const handleShare = (video: Video) => {
    setShareModalData({ isOpen: true, video: video });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black">
        <div className="w-16 h-16 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="w-32 h-4 bg-gray-800 rounded animate-pulse" />
          <p className="text-white/50 text-sm">Loading videos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white px-4">
        <p className="text-red-500 text-lg mb-4">⚠️ Error loading videos</p>
        <button onClick={() => fetchVideos(activeTab)} className="flex items-center gap-2 bg-pink-500 px-6 py-3 rounded-full hover:bg-pink-600">
          <RefreshCw className="w-5 h-5" /> Retry
        </button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
            <Play className="w-12 h-12 text-white/40 ml-1" />
          </div>
        </motion.div>
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-semibold mb-2"
        >
          Your space is waiting.
        </motion.h2>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-white/40 text-center mb-8 text-sm"
        >
          Share your first moment or invite friends.
        </motion.p>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-3 w-full max-w-[200px]"
        >
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => window.location.href = '/app/upload'}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 rounded-full font-medium shadow-lg shadow-purple-500/20"
          >
            Upload Video
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Join me on Mzansi Videos',
                  text: 'Check out Mzansi Videos - the vibe of South Africa!',
                  url: window.location.origin
                });
              } else {
                navigator.clipboard.writeText(window.location.origin);
                showToast('success', 'Link copied!');
              }
            }}
            className="w-full bg-white/5 px-6 py-3 rounded-full font-medium border border-white/10"
          >
            Invite Friends
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {isRefreshing && (
        <div className="fixed top-12 left-0 right-0 z-40 flex items-center justify-center py-2 bg-orange-500/20">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent" />
          <span className="text-orange-500 text-sm ml-2">Refreshing...</span>
        </div>
      )}
      <div className="fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl">
        <div className="flex justify-center items-center gap-8 py-3">
          <button
            onClick={() => setActiveTab('friends')}
            className={`relative text-[15px] font-medium py-1 px-3 transition-all duration-300 ${activeTab === 'friends' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            {activeTab === 'friends' && (
              <motion.div
                layoutId="tabIndicator"
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}
            Friends
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`relative text-[15px] font-medium py-1 px-3 transition-all duration-300 ${activeTab === 'following' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            {activeTab === 'following' && (
              <motion.div
                layoutId="tabIndicator"
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}
            Following
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`relative text-[15px] font-medium py-1 px-3 transition-all duration-300 ${activeTab === 'discover' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            {activeTab === 'discover' && (
              <motion.div
                layoutId="tabIndicator"
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}
            Discover
          </button>
        </div>
      </div>
      {activeUsers.length > 0 && (
        <div className="fixed top-10 left-0 right-0 z-40 bg-black/90 backdrop-blur-sm py-1">
          <div className="flex items-center gap-3 px-4 overflow-x-auto scrollbar-hide">
            <span className="text-gray-400 text-[11px] font-medium whitespace-nowrap">Active Now</span>
            <div className="flex gap-2.5">
              {activeUsers.map((user) => (
                <motion.div
                  key={user.id}
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center gap-1 cursor-pointer"
                  onClick={(e) => handleUserClick(user, e)}
                >
                  <div className="relative">
                    <img
                      src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}&background=random`}
                      alt={user.username}
                      className="w-9 h-9 rounded-full border border-white/10"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div
        className="h-screen overflow-y-scroll snap-y snap-mandatory bg-black scrollbar-hide pt-14"
        onTouchStart={(e) => {
          if (e.touches[0].clientY < 100) {
            setTouchStartY(e.touches[0].clientY);
          }
        }}
        onTouchEnd={(e) => {
          if (touchStartY !== null && e.changedTouches[0].clientY - touchStartY > 100) {
            handleRefresh();
          }
          setTouchStartY(null);
        }}
      >
        {videos.map((video, index) => (
          <div key={video.id} className="relative h-screen snap-start flex items-center justify-center">
            <video
              src={video.video_url}
              className="absolute inset-0 w-full h-full object-contain bg-black"
              loop
              autoPlay={index === 0}
              playsInline
              controls
              poster={video.thumbnail_url}
              onPlay={() => handleVideoPlay(video)}
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute bottom-28 left-4 right-24 text-white pointer-events-auto">
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-3 mb-3 cursor-pointer"
                  onClick={() => window.location.href = `/app/profile/${video.users?.id}`}
                >
                  <img
                    src={video.users?.avatar_url || `https://ui-avatars.com/api/?name=${video.users?.username || 'User'}&background=random`}
                    alt={video.users?.username}
                    className="w-11 h-11 rounded-full border border-white/20"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[15px]">{video.users?.display_name || video.users?.username}</span>
                      {video.users?.verified_badge && (
                        <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1 rounded">✓</span>
                      )}
                    </div>
                    <span className="text-white/50 text-[12px]">@{video.users?.username}</span>
                  </div>
                </motion.div>
                <h3 className="text-white font-medium text-[15px] mb-1.5 line-clamp-2">{video.title}</h3>
                <p className="text-white/60 text-[13px] mb-2 line-clamp-2">{video.caption}</p>
                <div className="flex flex-wrap gap-1.5">
                  {video.hashtags?.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-pink-400 text-[12px] font-medium">#{tag}</span>
                  ))}
                </div>
              </div>

              <div className="absolute bottom-24 right-2 flex flex-col items-center gap-5 pointer-events-auto">
                <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center">
                  <button
                    onClick={() => handleLike(video.id)}
                    className={`p-3 rounded-full transition-all duration-300 ${likedVideos.has(video.id)
                      ? 'text-red-500 bg-red-500/10'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <Heart className={`w-7 h-7 ${likedVideos.has(video.id) ? 'fill-current' : ''}`} />
                  </button>
                  <span className="text-white/80 text-xs font-medium mt-1">{video.likes}</span>
                </motion.div>
                <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center">
                  <button
                    onClick={() => setCommentModalVideo(video.id)}
                    className="p-3 rounded-full text-white/90 hover:bg-white/10 transition-all duration-300"
                  >
                    <MessageCircle className="w-7 h-7" />
                  </button>
                  <span className="text-white/80 text-xs font-medium mt-1">{video.comments}</span>
                </motion.div>
                <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center">
                  <button
                    onClick={() => handleShare(video)}
                    className="p-3 rounded-full text-white/90 hover:bg-white/10 transition-all duration-300"
                  >
                    <Share2 className="w-7 h-7" />
                  </button>
                  <span className="text-white/80 text-xs font-medium mt-1">{video.shares}</span>
                </motion.div>
                <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      if (!currentUserId) {
                        showToast('error', 'Please login to reply');
                        return;
                      }
                      window.location.href = '/app/upload?reply_to=' + video.id;
                    }}
                    className="p-3 rounded-full text-white/90 hover:bg-white/10 transition-all duration-300"
                  >
                    <Reply className="w-7 h-7" />
                  </button>
                  <span className="text-white/80 text-xs font-medium mt-1">Reply</span>
                </motion.div>
                <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center">
                  <button
                    onClick={() => window.location.href = '/app/upload?reply_to=' + video.id}
                    className="p-2.5 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 hover:opacity-90 transition-all duration-300 shadow-lg shadow-purple-500/20"
                  >
                    <Play className="w-5 h-5 text-white" />
                  </button>
                  <span className="text-white/80 text-xs font-medium mt-1">Duet</span>
                </motion.div>
                <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center">
                  <button
                    onClick={() => handleSave(video.id)}
                    className={`p-3 rounded-full transition-all duration-300 ${savedVideos.has(video.id)
                      ? 'text-yellow-400 bg-yellow-400/10'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <Bookmark className={`w-7 h-7 ${savedVideos.has(video.id) ? 'fill-current' : ''}`} />
                  </button>
                  <span className="text-white/80 text-xs font-medium mt-1">{video.saves}</span>
                </motion.div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <CommentModal
        videoId={commentModalVideo || ''}
        isOpen={!!commentModalVideo}
        onClose={() => setCommentModalVideo(null)}
        currentUserId={currentUserId}
      />
      {shareModalData.isOpen && shareModalData.video && (
        <ShareModal
          isOpen={shareModalData.isOpen}
          onClose={() => setShareModalData({ isOpen: false, video: null })}
          url={`${window.location.origin}/app/video/${shareModalData.video.id}?ref=${currentUserId || 'anonymous'}`}
          title={shareModalData.video.title}
          videoId={shareModalData.video.id}
        />
      )}
      {showQuickAction.user && (
        <div
          className="fixed z-50 bg-gray-900 rounded-xl p-4 shadow-xl border border-gray-700"
          style={{
            left: Math.min(showQuickAction.x, window.innerWidth - 160),
            top: showQuickAction.y,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <img
              src={showQuickAction.user.avatar_url || `https://ui-avatars.com/api/?name=${showQuickAction.user.username}&background=random`}
              alt={showQuickAction.user.username}
              className="w-10 h-10 rounded-full"
            />
            <span className="text-white font-semibold">@{showQuickAction.user.username}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/app/messages?user=${showQuickAction.user?.id}`)}
              className="flex-1 flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-lg"
            >
              <MessageCircle className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={() => {
                showToast('info', 'Video call coming soon!');
                setShowQuickAction({ user: null, x: 0, y: 0 });
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg"
            >
              <Video className="w-4 h-4" />
              Call
            </button>
          </div>
          <button
            onClick={() => setShowQuickAction({ user: null, x: 0, y: 0 })}
            className="absolute top-2 right-2 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {showQuickAction.user && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowQuickAction({ user: null, x: 0, y: 0 })}
        />
      )}
    </>
  );
};

export default HomeFeed;
