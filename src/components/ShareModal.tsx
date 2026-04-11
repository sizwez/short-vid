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
            name: 'WhatsApp',
            icon: MessageCircle,
            color: 'bg-[#25D366]',
            action: () => {
                window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank');
                onClose();
            },
        },
        {
            name: 'Copy',
            icon: Copy,
            color: 'bg-white/10',
            action: handleCopyLink,
        },
        {
            name: 'Facebook',
            icon: Facebook,
            color: 'bg-[#1877F2]',
            action: () => {
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                onClose();
            },
        },
        {
            name: 'Twitter',
            icon: Twitter,
            color: 'bg-[#1DA1F2]',
            action: () => {
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
                onClose();
            },
        },
        {
            name: 'Email',
            icon: Mail,
            color: 'bg-[#EA4335]',
            action: () => {
                window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
                onClose();
            },
        },
        {
            name: 'Report',
            icon: Flag,
            color: 'bg-red-500/20',
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
                    className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end justify-center z-50 sm:items-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="glass rounded-t-[32px] sm:rounded-[40px] p-8 w-full max-w-md shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-white/10"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-bold text-white tracking-tight">Share vibe</h3>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-all duration-300"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="grid grid-cols-4 gap-y-8 gap-x-4 mb-10">
                            {shareOptions.map((option) => {
                                const Icon = option.icon;
                                return (
                                    <button
                                        key={option.name}
                                        onClick={option.action}
                                        className="flex flex-col items-center space-y-3 group"
                                    >
                                        <div className={`${option.color} p-4 rounded-[20px] shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1 group-active:scale-95 border border-white/5`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 group-hover:text-white transition-colors uppercase tracking-[0.15em]">{option.name}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="glass-light rounded-[24px] p-4 flex items-center space-x-4 mb-4 border border-white/5 shadow-inner">
                            <div className="bg-white/5 p-2 rounded-xl">
                                <Link className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            </div>
                            <p className="text-sm text-gray-300 flex-1 truncate font-medium">{url}</p>
                            <button
                                onClick={handleCopyLink}
                                className="bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-2.5 rounded-xl text-white font-bold text-xs hover:shadow-lg hover:shadow-pink-500/20 transition-all active:scale-95 uppercase tracking-wider"
                            >
                                Copy
                            </button>
                        </div>

                        {showReportOptions && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="mt-6 p-6 glass-light rounded-[28px] border border-red-500/20 shadow-2xl"
                            >
                                <div className="flex items-center justify-between mb-5">
                                    <h4 className="font-bold flex items-center text-red-400 uppercase tracking-wider text-xs">
                                        <AlertTriangle className="w-4 h-4 mr-2" />
                                        Report Content
                                    </h4>
                                    <button onClick={() => setShowReportOptions(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                                        <X className="w-4 h-4 text-gray-500" />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {reportReasons.map((reason) => (
                                        <button
                                            key={reason}
                                            onClick={() => handleReport(reason)}
                                            disabled={isReporting}
                                            className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all text-sm font-semibold border border-transparent hover:border-red-500/10 disabled:opacity-50"
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
