import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface CameraRecorderProps {
  onVideoRecorded: (file: File, previewUrl: string) => void;
  onClose: () => void;
}

const CameraRecorder: React.FC<CameraRecorderProps> = ({ onVideoRecorded, onClose }) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasCamera, setHasCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    // Stop any existing stream first
    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode },
        audio: true
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setHasCamera(true);
      setError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setHasCamera(false);
      setError('Camera access denied or not available');
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => { stopCamera(); };
  }, [startCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9,opus'
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const file = new File([blob], `recording_${Date.now()}.webm`, { type: 'video/webm' });
      const previewUrl = URL.createObjectURL(blob);
      onVideoRecorded(file, previewUrl);
      setIsRecording(false);
      setRecordingTime(0);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000);
    setIsRecording(true);
    setRecordingTime(0);
  }, [onVideoRecorded]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const toggleCamera = () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!hasCamera) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-6"
      >
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
            <X className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Camera Not Available</h3>
          <p className="text-gray-400 mb-6">{error || 'Please allow camera access to record videos'}</p>
          <button
            onClick={startCamera}
            className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium"
          >
            Try Again
          </button>
          <button
            onClick={onClose}
            className="block w-full mt-4 text-gray-400 py-2"
          >
            Go Back
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black z-50"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute top-0 left-0 right-0 p-4 pt-12 flex items-center justify-between">
        <button onClick={onClose} className="p-2 bg-black/30 rounded-full">
          <X className="w-6 h-6 text-white" />
        </button>

        {isRecording && (
          <div className="flex items-center gap-2 bg-red-500/80 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white font-medium">{formatTime(recordingTime)}</span>
          </div>
        )}

        <button onClick={toggleCamera} className="p-2 bg-black/30 rounded-full">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 flex flex-col items-center">
        <p className="text-white/70 text-sm mb-4">
          {isRecording ? 'Release to stop recording' : 'Hold to record'}
        </p>

        <div className="flex items-center gap-8">
          <div className="w-16" />

          <motion.button
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            whileTap={{ scale: 0.9 }}
            className={`relative w-20 h-20 rounded-full border-4 ${isRecording
              ? 'border-red-500 bg-red-500'
              : 'border-white bg-white/20'
              }`}
          >
            {isRecording && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="absolute inset-2 bg-red-500 rounded-full"
              />
            )}
          </motion.button>

          <button
            onClick={() => navigate('/app/upload')}
            className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center"
          >
            <UploadIcon className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

export default CameraRecorder;