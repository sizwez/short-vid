import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, Music2, Volume2, VolumeX } from 'lucide-react';

interface VideoUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  verified_badge: boolean;
}

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
  hashtags: string[];
  users: VideoUser | null;
}

interface VideoItemProps {
  video: Video;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onLike: (id: string) => void;
  onComment: (id: string) => void;
  onShare: (video: Video) => void;
  onSave: (id: string) => void;
  isLiked: boolean;
  isSaved: boolean;
  onVideoPlay?: (video: Video) => void;
}

const VideoItem: React.FC<VideoItemProps> = ({
  video,
  isActive,
  isMuted,
  onToggleMute,
  onLike,
  onComment,
  onShare,
  onSave,
  isLiked,
  isSaved,
  onVideoPlay
}) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showHeart, setShowHeart] = useState(false);
  const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);

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
        onLike(video.id);
      }

      setTimeout(() => setShowHeart(false), 1000);
      lastTapRef.current = 0;
    } else {
      // Single tap - wait to see if second tap comes
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current !== 0 && Date.now() - lastTapRef.current >= 290) {
          onToggleMute();
          lastTapRef.current = 0;
        }
      }, 300);
    }
  }, [isLiked, onLike, onToggleMute, video.id]);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.warn("Video play failed:", error);
          });
        }
        if (onVideoPlay) onVideoPlay(video);
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isActive, video, onVideoPlay]);

  return (
    <div className="relative h-[100dvh] snap-start snap-always flex items-center justify-center bg-black overflow-hidden">
      {/* Video element */}
      <video
        ref={videoRef}
        src={video.video_url}
        className="absolute inset-0 w-full h-full object-contain"
        loop
        playsInline
        muted={isMuted}
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

      {/* Mute/Unmute Indicator */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: isMuted ? 0.8 : 0, scale: isMuted ? 1 : 0.5 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
        >
          <div className="bg-black/40 p-4 rounded-full backdrop-blur-sm">
            {isMuted ? <VolumeX className="w-8 h-8 text-white" /> : <Volume2 className="w-8 h-8 text-white" />}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Side Action Buttons */}
      <div className="absolute bottom-28 right-4 flex flex-col items-center gap-6">
        <motion.div
          className="relative group cursor-pointer"
          whileTap={{ scale: 0.8 }}
          onClick={() => video.users?.id && navigate(`/app/profile/${video.users.id}`)}
        >
          <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg">
            <img
              src={video.users?.avatar_url || `https://ui-avatars.com/api/?name=${video.users?.username || 'user'}&background=random`}
              alt=""
              className="w-full h-full rounded-full border-2 border-black object-cover"
            />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-pink-500 rounded-full w-5 h-5 flex items-center justify-center border-2 border-black">
            <span className="text-white text-xs font-bold">+</span>
          </div>
        </motion.div>

        {[
          { icon: Heart, count: video.likes, active: isLiked, color: 'text-red-500', action: () => onLike(video.id) },
          { icon: MessageCircle, count: video.comments, active: false, color: 'text-white', action: () => onComment(video.id) },
          { icon: Bookmark, count: video.saves, active: isSaved, color: 'text-yellow-500', action: () => onSave(video.id) },
          { icon: Share2, count: video.shares, active: false, color: 'text-white', action: () => onShare(video) }
        ].map((item, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1.5">
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={item.action}
              className={`p-3 rounded-full bg-black/20 backdrop-blur-lg border border-white/5 shadow-lg ${item.active ? item.color : 'text-white'}`}
            >
              <item.icon className={`w-7 h-7 ${item.active ? 'fill-current' : ''}`} />
            </motion.button>
            <span className="text-[11px] font-bold text-white shadow-sm">{item.count}</span>
          </div>
        ))}
      </div>

      {/* Video Info Overlay */}
      <div className="absolute bottom-28 left-4 right-24 text-white pointer-events-none">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="pointer-events-auto"
        >
          <h4
            className="font-bold text-lg flex items-center gap-2 cursor-pointer"
            onClick={() => video.users?.id && navigate(`/app/profile/${video.users.id}`)}
          >
            @{video.users?.username || 'user'}
            {video.users?.verified_badge && (
              <span className="bg-blue-500 rounded-full p-0.5"><div className="w-2 h-2 bg-white rounded-full" /></span>
            )}
          </h4>
          <p className="mt-2 text-sm leading-relaxed line-clamp-2 text-gray-100">
            {video.caption}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {video.hashtags?.map((tag, i) => (
              <span key={i} className="text-sm font-bold text-orange-400">#{tag}</span>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-white/50 bg-black/20 backdrop-blur-md w-fit px-3 py-1.5 rounded-full border border-white/5">
            <Music2 className="w-3 h-3 animate-pulse" />
            <span className="truncate max-w-[150px]">Original Sound - Mzansi Vibe</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default React.memo(VideoItem);
