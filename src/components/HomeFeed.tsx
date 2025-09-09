import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share, Bookmark, DollarSign, Play, Wifi, WifiOff, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateVideoData } from '../utils/mockData';

interface Video {
  id: string;
  user: {
    id: string;
    username: string;
    avatar: string;
    isVerified: boolean;
  };
  caption: string;
  hashtags: string[];
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  tips: number;
  videoUrl: string;
  isLiked: boolean;
  isSaved: boolean;
  duration: number;
  views: string;
}

const VideoCard: React.FC<{ video: Video; isActive: boolean }> = ({ video, isActive }) => {
  const [isLiked, setIsLiked] = useState(video.isLiked);
  const [isSaved, setIsSaved] = useState(video.isSaved);
  const [likes, setLikes] = useState(video.likes);
  const [showTipModal, setShowTipModal] = useState(false);
  const { dataSavingMode } = useApp();

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikes(isLiked ? likes - 1 : likes + 1);
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
  };

  const handleTip = (amount: number) => {
    setShowTipModal(false);
    // Handle tip payment
  };

  return (
    <div className="relative h-screen w-full bg-gray-900 flex items-center justify-center">
      {/* Video placeholder */}
      <div className="relative w-full h-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600 flex items-center justify-center">
        {dataSavingMode && !isActive ? (
          <div className="text-center">
            <WifiOff className="w-16 h-16 text-white/50 mx-auto mb-4" />
            <p className="text-white/70">Data saving mode</p>
            <p className="text-white/50 text-sm">Tap to load video</p>
          </div>
        ) : (
          <div className="text-center">
            <Play className="w-20 h-20 text-white/80" />
            <p className="text-white/60 mt-4">{video.duration}s video</p>
          </div>
        )}
        
        {/* Video overlay info */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wifi className="w-5 h-5 text-white" />
            <span className="text-white text-sm">{video.views} views</span>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-orange-400" />
            <span className="text-white text-sm">Trending</span>
          </div>
        </div>
      </div>

      {/* User info and caption */}
      <div className="absolute bottom-24 left-4 right-20">
        <div className="flex items-center space-x-3 mb-4">
          <img
            src={video.user.avatar}
            alt={video.user.username}
            className="w-12 h-12 rounded-full border-2 border-white"
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-white font-semibold">{video.user.username}</span>
              {video.user.isVerified && (
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <button className="text-orange-500 text-sm font-medium">Follow</button>
          </div>
        </div>
        
        <p className="text-white mb-2">{video.caption}</p>
        <div className="flex flex-wrap gap-2">
          {video.hashtags.map((tag, index) => (
            <span key={index} className="text-orange-400 text-sm">#{tag}</span>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-32 right-4 space-y-6">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleLike}
          className="flex flex-col items-center"
        >
          <Heart
            className={`w-8 h-8 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`}
          />
          <span className="text-white text-sm mt-1">{likes.toLocaleString()}</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center"
        >
          <MessageCircle className="w-8 h-8 text-white" />
          <span className="text-white text-sm mt-1">{video.comments}</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center"
        >
          <Share className="w-8 h-8 text-white" />
          <span className="text-white text-sm mt-1">{video.shares}</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleSave}
          className="flex flex-col items-center"
        >
          <Bookmark
            className={`w-8 h-8 ${isSaved ? 'text-yellow-500 fill-yellow-500' : 'text-white'}`}
          />
          <span className="text-white text-sm mt-1">{video.saves}</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowTipModal(true)}
          className="flex flex-col items-center"
        >
          <DollarSign className="w-8 h-8 text-green-500" />
          <span className="text-white text-sm mt-1">Tip</span>
        </motion.button>
      </div>

      {/* Tip Modal */}
      <AnimatePresence>
        {showTipModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setShowTipModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-2xl p-6 m-4 max-w-sm w-full"
            >
              <h3 className="text-xl font-bold text-white mb-4 text-center">
                Tip {video.user.username}
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[5, 10, 20, 50, 100, 200].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleTip(amount)}
                    className="bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold transition-colors"
                  >
                    R{amount}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowTipModal(false)}
                className="w-full bg-gray-700 text-white py-3 rounded-xl font-medium"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdCard: React.FC = () => {
  return (
    <div className="relative h-screen w-full bg-blue-600 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="mb-4">
          <div className="w-20 h-20 bg-white/20 rounded-xl mx-auto flex items-center justify-center">
            <span className="text-2xl">📱</span>
          </div>
        </div>
        <h3 className="text-2xl font-bold mb-2">Download Our App</h3>
        <p className="text-white/80 mb-6">Get the best mobile experience</p>
        <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold">
          Download Now
        </button>
      </div>
      
      <div className="absolute top-4 right-4">
        <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">Ad</span>
      </div>
    </div>
  );
};

const HomeFeed: React.FC = () => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videos, setVideos] = useState<Video[]>([]);
  const [feedType, setFeedType] = useState<'trending' | 'local'>('trending');
  const { dataSavingMode, setDataSavingMode } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate mock videos
    const mockVideos = generateVideoData(20);
    setVideos(mockVideos);
  }, []);

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      const videoHeight = window.innerHeight;
      const newIndex = Math.round(scrollTop / videoHeight);
      setCurrentVideoIndex(newIndex);
    }
  };

  // Insert ads every 5 videos
  const feedItems = [];
  for (let i = 0; i < videos.length; i++) {
    feedItems.push({ type: 'video', data: videos[i] });
    if ((i + 1) % 5 === 0) {
      feedItems.push({ type: 'ad', data: null });
    }
  }

  return (
    <div className="relative h-screen">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center justify-between p-4 pt-12">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setFeedType('trending')}
              className={`px-4 py-2 rounded-full transition-colors ${
                feedType === 'trending'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Trending
            </button>
            <button
              onClick={() => setFeedType('local')}
              className={`px-4 py-2 rounded-full transition-colors ${
                feedType === 'local'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Local
            </button>
          </div>
          
          <button
            onClick={() => setDataSavingMode(!dataSavingMode)}
            className={`p-2 rounded-full ${
              dataSavingMode ? 'bg-orange-500' : 'bg-gray-700'
            }`}
          >
            {dataSavingMode ? <WifiOff className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Video Feed */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {feedItems.map((item, index) => (
          <div key={index} className="snap-start">
            {item.type === 'video' ? (
              <VideoCard
                video={item.data as Video}
                isActive={index === currentVideoIndex}
              />
            ) : (
              <AdCard />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomeFeed;
