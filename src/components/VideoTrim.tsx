import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Pause } from 'lucide-react';

interface VideoTrimProps {
  videoSrc: string;
  onTrimComplete: (blob: Blob, file: File) => void;
  onCancel: () => void;
}

const VideoTrim: React.FC<VideoTrimProps> = ({ videoSrc, onTrimComplete, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setEndTime(Math.min(video.duration, 60));
      setStartTime(0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime >= endTime) {
        video.pause();
        video.currentTime = startTime;
        setIsPlaying(false);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [endTime, startTime]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.currentTime = startTime;
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTrim = async () => {
    setIsProcessing(true);
    try {
      const video = videoRef.current;
      if (!video) return;

      video.pause();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      const clipDuration = endTime - startTime;
      const maxDuration = 60;
      const finalDuration = Math.min(clipDuration, maxDuration);

      canvas.width = video.videoWidth || 1080;
      canvas.height = video.videoHeight || 1920;

      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const file = new File([blob], `trimmed_video_${Date.now()}.webm`, { type: 'video/webm' });
        onTrimComplete(blob, file);
        setIsProcessing(false);
      };

      mediaRecorder.start();

      video.currentTime = startTime;
      
      const drawFrame = () => {
        if (video.currentTime >= endTime || video.currentTime >= startTime + maxDuration) {
          mediaRecorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawFrame);
      };

      video.addEventListener('seeked', drawFrame, { once: true });
      video.play();

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, finalDuration * 1000);

    } catch (err) {
      console.error('Trim error:', err);
      setIsProcessing(false);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (value < endTime - 1) {
      setStartTime(value);
      if (videoRef.current) videoRef.current.currentTime = value;
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (value > startTime + 1 && value <= duration) {
      setEndTime(value);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      <div className="flex items-center justify-between p-4 pt-12 border-b border-gray-800">
        <button onClick={onCancel} className="p-2">
          <X className="w-6 h-6 text-white" />
        </button>
        <h2 className="text-lg font-semibold text-white">Trim Video</h2>
        <button 
          onClick={handleTrim}
          disabled={isProcessing}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : 'Done'}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <video
          ref={videoRef}
          src={videoSrc}
          className="max-h-[60vh] rounded-xl"
          playsInline
        />
      </div>

      <div className="p-6 bg-gray-900">
        <div className="flex items-center justify-center mb-4">
          <button
            onClick={togglePlay}
            className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-1" />
            )}
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Start: {formatTime(startTime)}</span>
            <span>Duration: {formatTime(endTime - startTime)}</span>
            <span>End: {formatTime(endTime)}</span>
          </div>

          <div className="relative h-12">
            <div className="absolute top-1/2 left-0 right-0 h-2 bg-gray-700 rounded-full -translate-y-1/2">
              <div 
                className="absolute h-full bg-orange-500 rounded-full"
                style={{ 
                  left: `${(startTime / duration) * 100}%`,
                  width: `${((endTime - startTime) / duration) * 100}%`
                }}
              />
            </div>
            
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={startTime}
              onChange={handleStartChange}
              className="absolute w-full h-12 opacity-0 cursor-pointer"
            />
            
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={endTime}
              onChange={handleEndChange}
              className="absolute w-full h-12 opacity-0 cursor-pointer"
            />

            <div 
              className="absolute top-1/2 w-6 h-6 bg-white rounded-full -translate-y-1/2 shadow-lg cursor-pointer"
              style={{ left: `calc(${(startTime / duration) * 100}% - 12px)` }}
            />
            <div 
              className="absolute top-1/2 w-6 h-6 bg-white rounded-full -translate-y-1/2 shadow-lg cursor-pointer"
              style={{ left: `calc(${(endTime / duration) * 100}% - 12px)` }}
            />
          </div>

          <p className="text-center text-gray-500 text-sm">
            Maximum clip length: 60 seconds
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default VideoTrim;