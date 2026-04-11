import React from 'react';
import { motion } from 'framer-motion';
import { Search, Users, Video, MessageCircle, Heart, Bell, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  type: 'search' | 'followers' | 'following' | 'videos' | 'comments' | 'likes' | 'notifications' | 'messages';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  type, 
  title, 
  description, 
  actionLabel, 
  onAction 
}) => {
  const getConfig = () => {
    switch (type) {
      case 'search':
        return {
          icon: Search,
          defaultTitle: 'No results found',
          defaultDescription: 'Try searching for something else or check your spelling',
          color: 'from-gray-500 to-gray-600'
        };
      case 'followers':
        return {
          icon: Users,
          defaultTitle: 'No followers yet',
          defaultDescription: 'Share your profile to get your first followers!',
          color: 'from-blue-500 to-purple-500'
        };
      case 'following':
        return {
          icon: Users,
          defaultTitle: 'Not following anyone',
          defaultDescription: 'Discover creators to follow and see their content here',
          color: 'from-green-500 to-teal-500'
        };
      case 'videos':
        return {
          icon: Video,
          defaultTitle: 'Be the Trendsetter',
          defaultDescription: 'Mzansi is waiting for your vibe. Be the first to start the trend!',
          color: 'from-orange-500 to-pink-600'
        };
      case 'comments':
        return {
          icon: MessageCircle,
          defaultTitle: 'No comments yet',
          defaultDescription: 'Be the first to leave a comment!',
          color: 'from-orange-500 to-red-500'
        };
      case 'likes':
        return {
          icon: Heart,
          defaultTitle: 'No likes yet',
          defaultDescription: 'Your likes will appear here',
          color: 'from-red-500 to-pink-500'
        };
      case 'notifications':
        return {
          icon: Bell,
          defaultTitle: 'No notifications',
          defaultDescription: 'When someone interacts with you, you\'ll see it here',
          color: 'from-yellow-500 to-orange-500'
        };
      case 'messages':
        return {
          icon: MessageCircle,
          defaultTitle: 'No messages yet',
          defaultDescription: 'Start a conversation with a creator!',
          color: 'from-purple-500 to-pink-500'
        };
      default:
        return {
          icon: Search,
          defaultTitle: 'Nothing here',
          defaultDescription: 'Nothing to show',
          color: 'from-gray-500 to-gray-600'
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
        className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center mb-6 shadow-lg`}
      >
        <Icon className="w-10 h-10 text-white" />
      </motion.div>
      
      <h3 className="text-xl font-bold text-white mb-2">
        {title || config.defaultTitle}
      </h3>
      
      <p className="text-gray-400 text-center mb-6 max-w-xs">
        {description || config.defaultDescription}
      </p>
      
      {actionLabel && onAction && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-full font-medium hover:bg-orange-600 transition-colors"
        >
          {actionLabel}
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      )}
    </motion.div>
  );
};

export default EmptyState;