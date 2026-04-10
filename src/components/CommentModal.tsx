import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Heart } from 'lucide-react';

interface Comment {
    id: string;
    user: {
        username: string;
        avatar: string;
    };
    text: string;
    likes: number;
    timestamp: string;
    isLiked: boolean;
}

interface CommentModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoId: string;
    commentCount: number;
}

const CommentModal: React.FC<CommentModalProps> = ({ isOpen, onClose, commentCount }) => {
    const [comments, setComments] = useState<Comment[]>([
        {
            id: '1',
            user: {
                username: 'thabo_za',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=thabo',
            },
            text: 'This is fire! 🔥',
            likes: 24,
            timestamp: '2h ago',
            isLiked: false,
        },
        {
            id: '2',
            user: {
                username: 'nomsa_m',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nomsa',
            },
            text: 'Mzansi represent! 🇿🇦',
            likes: 15,
            timestamp: '1h ago',
            isLiked: true,
        },
    ]);
    const [newComment, setNewComment] = useState('');

    const handleSubmitComment = () => {
        if (!newComment.trim()) return;

        const comment: Comment = {
            id: Date.now().toString(),
            user: {
                username: 'you',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=you',
            },
            text: newComment,
            likes: 0,
            timestamp: 'Just now',
            isLiked: false,
        };

        setComments([comment, ...comments]);
        setNewComment('');
    };

    const handleLikeComment = (commentId: string) => {
        setComments(comments.map(comment => {
            if (comment.id === commentId) {
                return {
                    ...comment,
                    isLiked: !comment.isLiked,
                    likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
                };
            }
            return comment;
        }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 flex items-end justify-center z-50 sm:items-center"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md h-[80vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-800">
                            <h3 className="text-lg font-bold text-white">
                                {commentCount} Comments
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        {/* Comments List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex space-x-3">
                                    <img
                                        src={comment.user.avatar}
                                        alt={comment.user.username}
                                        className="w-10 h-10 rounded-full flex-shrink-0"
                                    />
                                    <div className="flex-1">
                                        <div className="bg-gray-800 rounded-2xl px-4 py-2">
                                            <p className="text-white font-semibold text-sm">
                                                {comment.user.username}
                                            </p>
                                            <p className="text-gray-300 text-sm mt-1">{comment.text}</p>
                                        </div>
                                        <div className="flex items-center space-x-4 mt-2 px-2">
                                            <span className="text-gray-500 text-xs">{comment.timestamp}</span>
                                            <button
                                                onClick={() => handleLikeComment(comment.id)}
                                                className="flex items-center space-x-1"
                                            >
                                                <Heart
                                                    className={`w-4 h-4 ${comment.isLiked ? 'text-red-500 fill-red-500' : 'text-gray-500'
                                                        }`}
                                                />
                                                <span className="text-gray-500 text-xs">{comment.likes}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Comment Input */}
                        <div className="p-4 border-t border-gray-800">
                            <div className="flex items-center space-x-3">
                                <img
                                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=you"
                                    alt="You"
                                    className="w-10 h-10 rounded-full flex-shrink-0"
                                />
                                <div className="flex-1 flex items-center bg-gray-800 rounded-full px-4 py-2">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
                                        placeholder="Add a comment..."
                                        className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
                                    />
                                    <button
                                        onClick={handleSubmitComment}
                                        disabled={!newComment.trim()}
                                        className={`ml-2 ${newComment.trim()
                                            ? 'text-orange-500 hover:text-orange-400'
                                            : 'text-gray-600'
                                            } transition-colors`}
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
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
