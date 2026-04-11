import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Heart, Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContainer';

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
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  currentUserId: string | null;
}

interface Reply {
  commentId: string;
  username: string;
}

const CommentModal: React.FC<CommentModalProps> = ({ isOpen, onClose, videoId, currentUserId }) => {
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
      setComments(processedComments as Comment[]);
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end justify-center z-50 sm:items-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-t-[32px] sm:rounded-[40px] w-full max-w-lg h-[85vh] flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 backdrop-blur-md">
              <h3 className="text-xl font-bold text-white tracking-tight">Comments</h3>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all duration-300 text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No comments yet. Be the first!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3 group animate-fadeIn">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-br from-pink-500/50 to-orange-500/50 group-hover:from-pink-500 group-hover:to-orange-500 transition-all duration-500">
                        <img
                          src={comment.user?.avatar_url || `https://ui-avatars.com/api/?name=${comment.user?.username || 'user'}&background=random`}
                          alt=""
                          className="w-full h-full rounded-full border-2 border-black object-cover"
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="glass-light rounded-[20px] px-4 py-3 border border-white/5 group-hover:border-white/10 transition-colors">
                        <p className="text-xs font-bold text-orange-400 mb-1">@{comment.user?.username || 'user'}</p>
                        <p className="text-gray-200 text-sm leading-relaxed">{comment.content}</p>
                      </div>
                      <div className="flex items-center space-x-4 mt-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                        {currentUserId && comment.user?.id !== currentUserId && (
                          <button
                            onClick={() => handleReply(comment.id, comment.user?.username || 'user')}
                            className="hover:text-white transition-colors"
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

            {/* Input Area */}
            <div className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-xl">
              {replyTo && (
                <div className="flex items-center justify-between mb-3 bg-white/5 rounded-xl px-4 py-2 border border-white/10">
                  <span className="text-xs text-gray-400">
                    Replying to <span className="text-orange-500 font-bold">@{replyTo.username}</span>
                  </span>
                  <button onClick={cancelReply} className="text-gray-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <div className="flex-1 flex items-center glass-light rounded-full pl-4 pr-1 py-1 border border-white/10 focus-within:ring-2 focus-within:ring-orange-500/30 transition-all">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={replyTo ? `Reply to @${replyTo.username}...` : "Drop a vibe..."}
                    className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm py-2"
                    onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                    disabled={isPosting}
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handlePostComment}
                    disabled={!newComment.trim() || isPosting}
                    className={`p-2 rounded-full transition-all ${
                      newComment.trim() ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-600'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommentModal;
