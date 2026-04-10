import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Facebook, Twitter, MessageCircle, Mail, Link, Flag, AlertTriangle, Share2 } from 'lucide-react';
import { useToast } from './ToastContainer';
import { supabase } from '../lib/supabase';
import { useApp } from '../hooks/useApp';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    url: string;
    videoId: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, title, url, videoId }) => {
    const { showToast } = useToast();
    const { user } = useApp();
    const [showReportOptions, setShowReportOptions] = React.useState(false);
    const [isReporting, setIsReporting] = React.useState(false);

    const reportReasons = [
        'Inappropriate content',
        'Spam or misleading',
        'Harassment or bullying',
        'Violence or dangerous acts',
        'Intellectual property infringement',
        'Other'
    ];

    const canUseNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

    const handleNativeShare = async () => {
        try {
            await navigator.share({
                title: title,
                text: `Check out this video on Mzansi Videos`,
                url: url,
            });
            onClose();
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error('Share failed:', err);
            }
        }
    };

    const handleReport = async (reason: string) => {
        if (!user) {
            showToast('error', 'Please login to report content');
            return;
        }

        setIsReporting(true);
        try {
            const { error } = await supabase
                .from('reports')
                .insert({
                    reporter_id: user.id,
                    video_id: videoId,
                    reason,
                    status: 'pending'
                });

            if (error) throw error;

            showToast('success', 'Thank you for your report. We will review it shortly.');
            onClose();
        } catch (error) {
            console.error('Reporting error:', error);
            showToast('error', 'Failed to submit report');
        } finally {
            setIsReporting(false);
            setShowReportOptions(false);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(url);
            showToast('success', 'Link copied to clipboard!');
            onClose();
        } catch {
            showToast('error', 'Failed to copy link');
        }
    };

    const shareOptions = [
        ...(canUseNativeShare ? [{
            name: 'Share',
            icon: Share2,
            color: 'bg-gradient-to-r from-pink-500 to-purple-600',
            action: handleNativeShare,
        }] : []),
        {
            name: 'Copy Link',
            icon: Copy,
            color: 'bg-gray-700',
            action: handleCopyLink,
        },
        {
            name: 'WhatsApp',
            icon: MessageCircle,
            color: 'bg-green-500',
            action: () => {
                window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank');
                onClose();
            },
        },
        {
            name: 'Facebook',
            icon: Facebook,
            color: 'bg-blue-600',
            action: () => {
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                onClose();
            },
        },
        {
            name: 'Twitter',
            icon: Twitter,
            color: 'bg-sky-500',
            action: () => {
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
                onClose();
            },
        },
        {
            name: 'Email',
            icon: Mail,
            color: 'bg-orange-500',
            action: () => {
                window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
                onClose();
            },
        },
        {
            name: 'Report',
            icon: Flag,
            color: 'bg-red-600',
            action: () => setShowReportOptions(true),
        },
    ];

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
                        className="bg-gray-900 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">Share</h3>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            {shareOptions.map((option) => {
                                const Icon = option.icon;
                                return (
                                    <button
                                        key={option.name}
                                        onClick={option.action}
                                        className="flex flex-col items-center space-y-2 p-3 rounded-xl hover:bg-gray-800 transition-colors"
                                    >
                                        <div className={`${option.color} p-3 rounded-full`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <span className="text-xs text-gray-300">{option.name}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="bg-gray-800 rounded-xl p-3 flex items-center space-x-3 mb-6">
                            <Link className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <p className="text-sm text-gray-300 flex-1 truncate">{url}</p>
                            <button
                                onClick={handleCopyLink}
                                className="text-orange-500 font-medium text-sm hover:text-orange-400 transition-colors"
                            >
                                Copy
                            </button>
                        </div>

                        {showReportOptions && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mt-4 p-4 bg-gray-800 rounded-2xl border border-gray-700"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold flex items-center">
                                        <AlertTriangle className="w-4 h-4 text-orange-500 mr-2" />
                                        Report Video
                                    </h4>
                                    <button onClick={() => setShowReportOptions(false)}>
                                        <X className="w-4 h-4 text-gray-400" />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {reportReasons.map((reason) => (
                                        <button
                                            key={reason}
                                            onClick={() => handleReport(reason)}
                                            disabled={isReporting}
                                            className="w-full text-left p-3 rounded-xl hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
                                        >
                                            {reason}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ShareModal;
