import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Send, Loader2, MessageCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContainer';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  likes_count?: number;
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

import { createPortal } from 'react-dom';

const formatTimeAgo = (dateStr: string): string => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
};

const CommentModal: React.FC<CommentModalProps> = ({ isOpen, onClose, videoId, currentUserId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<Reply | null>(null);
  const [totalComments, setTotalComments] = useState(0);
  const { showToast } = useToast();
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error, count } = await supabase
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
        `, { count: 'exact' })
        .eq('video_id', videoId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      const processedComments = (data || []).map(comment => ({
        ...comment,
        user: Array.isArray(comment.user) ? comment.user[0] : comment.user
      }));
      setComments(processedComments as Comment[]);
      setTotalComments(count || 0);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      // Auto-focus comment input after modal opens
      setTimeout(() => inputRef.current?.focus(), 400);
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
      showToast('success', 'Comment posted! 🔥');
      
      // Scroll to top to see new comment
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 300);
    } catch (err) {
      console.error('Error posting comment:', err);
      showToast('error', 'Failed to post comment');
    } finally {
      setIsPosting(false);
    }
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyTo({ commentId, username });
    setNewComment('');
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyTo(null);
    setNewComment('');
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    // If dragged down more than 80px, close
    if (info.offset.y > 80) {
      onClose();
    }
  };

  if (!document.body) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] pointer-events-none">
          {/* Transparent backdrop - tapping closes but video stays visible */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 pointer-events-auto"
            onClick={onClose}
            style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6) 100%)' }}
          />

          {/* Comment Sheet - compact bottom half */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 flex flex-col touch-none pointer-events-auto"
            style={{ 
              maxHeight: '55vh',
              height: '55vh',
              background: 'linear-gradient(180deg, rgba(15,15,20,0.97) 0%, rgba(10,10,15,0.99) 100%)',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
            }}
          >
            {/* Drag Handle + Header */}
            <div className="flex-shrink-0 pt-2 pb-1 cursor-grab active:cursor-grabbing">
              <div 
                className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2"
                style={{ touchAction: 'none' }}
              />
              <div className="flex items-center justify-between px-5 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-bold text-white tracking-tight">
                    Comments
                  </h3>
                  <span className="text-[12px] text-gray-500 font-medium">
                    {totalComments > 0 ? `(${totalComments})` : ''}
                  </span>
                </div>
                <button 
                  onClick={onClose} 
                  className="p-1.5 hover:bg-white/10 rounded-full transition-all duration-200 text-gray-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Comments List */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4"
              style={{ 
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-700" />
                  <p className="text-gray-500 text-sm font-medium">No comments yet</p>
                  <p className="text-gray-600 text-xs mt-1">Be the first to drop a vibe 🎵</p>
                </div>
              ) : (
                comments.map((comment, index) => (
                  <motion.div 
                    key={comment.id} 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.25 }}
                    className="flex gap-2.5 group"
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/10">
                        <img
                          src={comment.user?.avatar_url || `https://ui-avatars.com/api/?name=${comment.user?.username || 'user'}&background=random&size=64`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[12px] font-bold text-white/80 truncate">
                          {comment.user?.display_name || comment.user?.username || 'user'}
                        </span>
                        <span className="text-[10px] text-gray-600 flex-shrink-0">
                          {formatTimeAgo(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-300 leading-relaxed mt-0.5 break-words">
                        {comment.content}
                      </p>
                      <div className="flex items-center gap-4 mt-1.5">
                        {currentUserId && comment.user?.id !== currentUserId && (
                          <button
                            onClick={() => handleReply(comment.id, comment.user?.username || 'user')}
                            className="text-[11px] font-semibold text-gray-500 hover:text-orange-400 transition-colors"
                          >
                            Reply
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Input Area - fixed at bottom of sheet */}
            <div 
              className="flex-shrink-0 border-t border-white/5"
              style={{ 
                background: 'rgba(10,10,15,0.95)',
                backdropFilter: 'blur(20px)',
                paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
              }}
            >
              {/* Reply indicator */}
              {replyTo && (
                <div className="flex items-center justify-between mx-4 mt-2 mb-1 bg-white/5 rounded-xl px-3 py-1.5 border border-white/5">
                  <span className="text-[11px] text-gray-400">
                    Replying to <span className="text-orange-400 font-bold">@{replyTo.username}</span>
                  </span>
                  <button onClick={cancelReply} className="text-gray-500 hover:text-white p-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2 px-4 py-2">
                {currentUserId ? (
                  <>
                    <textarea
                      ref={inputRef}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={replyTo ? `Reply to @${replyTo.username}...` : "Add a comment..."}
                      className="flex-1 bg-white/5 rounded-2xl py-2.5 px-4 text-white placeholder-gray-600 text-[13px] focus:outline-none focus:ring-1 focus:ring-orange-500/40 resize-none min-h-[38px] max-h-[80px] border border-white/5"
                      disabled={isPosting}
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handlePostComment();
                        }
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = Math.min(target.scrollHeight, 80) + 'px';
                      }}
                    />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handlePostComment}
                      disabled={!newComment.trim() || isPosting}
                      className={`p-2.5 rounded-full transition-all flex-shrink-0 ${
                        newComment.trim() 
                          ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/20' 
                          : 'bg-white/5 text-gray-600'
                      }`}
                    >
                      {isPosting ? (
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                      ) : (
                        <Send className="w-4.5 h-4.5" />
                      )}
                    </motion.button>
                  </>
                ) : (
                  <div className="w-full text-center py-2">
                    <span className="text-gray-500 text-sm">
                      <span className="text-orange-400 font-semibold cursor-pointer">Log in</span> to comment
                    </span>
                  </div>
                )}
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CommentModal;