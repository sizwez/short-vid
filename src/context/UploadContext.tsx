import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface VideoData {
  file: File | null;
  previewUrl: string | null;
  title: string;
  description: string;
  hashtags: string;
  replyToVideoId: string | null;
  replyToVideo: any | null;
}

const initialVideoData: VideoData = {
  file: null,
  previewUrl: null,
  title: '',
  description: '',
  hashtags: '',
  replyToVideoId: null,
  replyToVideo: null,
};

interface UploadContextType {
  videoData: VideoData;
  setVideoData: (data: VideoData) => void;
  updateVideoData: (data: Partial<VideoData>) => void;
  resetUpload: () => void;
  isPosting: boolean;
  setIsPosting: (isPosting: boolean) => void;
  uploadProgress: number;
  setUploadProgress: (progress: number) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};

export const UploadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [videoData, setVideoData] = useState<VideoData>(initialVideoData);
  const [isPosting, setIsPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Persistence logic for metadata
  useEffect(() => {
    const saved = localStorage.getItem('upload_metadata');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setVideoData(prev => ({
          ...prev,
          title: parsed.title || '',
          description: parsed.description || '',
          hashtags: parsed.hashtags || '',
          replyToVideoId: parsed.replyToVideoId || null
        }));
      } catch (e) {
        console.error('Failed to parse saved metadata', e);
      }
    }
  }, []);

  useEffect(() => {
    const { file, previewUrl, ...meta } = videoData;
    localStorage.setItem('upload_metadata', JSON.stringify(meta));
  }, [videoData.title, videoData.description, videoData.hashtags, videoData.replyToVideoId]);

  const updateVideoData = (newData: Partial<VideoData>) => {
    setVideoData(prev => ({ ...prev, ...newData }));
  };

  const resetUpload = () => {
    setVideoData({
      file: null,
      previewUrl: null,
      title: '',
      description: '',
      hashtags: '',
      replyToVideoId: null,
      replyToVideo: null
    });
    setUploadProgress(0);
    localStorage.removeItem('upload_metadata');
  };

  return (
    <UploadContext.Provider value={{ 
      videoData, 
      setVideoData, 
      updateVideoData, 
      resetUpload,
      isPosting,
      setIsPosting,
      uploadProgress,
      setUploadProgress
    }}>
      {children}
    </UploadContext.Provider>
  );
};
