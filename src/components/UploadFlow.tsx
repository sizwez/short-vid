import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Upload, ArrowLeft, Hash, X, Camera, Scissors } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContainer';
import { moderateVideoUpload } from '../lib/moderation';
import VideoTrim from './VideoTrim';
import { useUpload } from '../context/UploadContext';
import { generateVideoThumbnail } from '../lib/videoUtils';

interface UploadVideoProps {
  data: any;
  updateData: (data: Partial<any>) => void;
}

const UploadVideo: React.FC<UploadVideoProps> = ({ data, updateData }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [showTrim, setShowTrim] = useState(false);

  const handleVideoSelect = (file: File) => {
    _uploadCompleted = false;
    // Validate video file
    const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB (Supported by Firebase)
    const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/3gpp'];

    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast('error', 'Unsupported video format. Please use MP4, WebM, MOV, AVI, or 3GP.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast('error', 'Video file is too large. Maximum size is 200MB.');
      return;
    }

    if (file.size < 1024) {
      showToast('error', 'Video file appears to be empty or corrupted.');
      return;
    }

    if (data.previewUrl) {
      URL.revokeObjectURL(data.previewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    updateData({ file, previewUrl });
    setIsUploading(false);
  };

  const handleRemoveVideo = () => {
    if (data.previewUrl) {
      URL.revokeObjectURL(data.previewUrl);
    }
    updateData({ file: null, previewUrl: null });
  };

  const handleTrimComplete = (blob: Blob, file: File) => {
    if (data.previewUrl) {
      URL.revokeObjectURL(data.previewUrl);
    }
    const previewUrl = URL.createObjectURL(blob);
    updateData({ file, previewUrl });
    setShowTrim(false);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/app')}
            className="p-2"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">{data.replyToVideoId ? 'Reply to' : 'Upload Video'}</h1>
          <button
            onClick={() => navigate('settings')}
            disabled={!data.title || !data.file}
            className="text-orange-500 font-medium disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>

        <div className="space-y-6">
          {data.replyToVideo && (
            <div className="bg-gray-900 rounded-xl p-3 flex items-center gap-3 border border-gray-800">
              <div className="w-16 h-20 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                <video
                  src={data.replyToVideo.video_url}
                  className="w-full h-full object-cover"
                  muted
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">Replying to @{data.replyToVideo.users?.username}</p>
                <p className="text-gray-400 text-xs truncate">{data.replyToVideo.title}</p>
              </div>
              <button
                onClick={() => updateData({ replyToVideoId: null, replyToVideo: null })}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="aspect-[9/16] bg-gray-900 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-700 overflow-hidden relative">
            {data.previewUrl ? (
              <>
                <video
                  src={data.previewUrl}
                  controls
                  className="w-full h-full object-cover"
                  playsInline
                >
                  Your browser does not support the video tag.
                </video>
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  <button
                    onClick={() => setShowTrim(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-1"
                  >
                    <Scissors className="w-4 h-4" />
                    Trim
                  </button>
                  <button
                    onClick={handleRemoveVideo}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">Drag and drop video or choose an option</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => navigate('/app/camera')}
                    className="flex items-center justify-center gap-2 bg-orange-500 text-white py-3 px-6 rounded-xl font-medium hover:bg-orange-600 transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    Record Video
                  </button>
                  <button
                    onClick={() => {
                      setIsUploading(true);
                      document.getElementById('video-upload')?.click();
                      setTimeout(() => setIsUploading(false), 2000);
                    }}
                    disabled={isUploading}
                    className="text-orange-500 font-medium disabled:text-gray-500"
                  >
                    {isUploading ? 'Uploading...' : 'Browse Gallery'}
                  </button>
                  <input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleVideoSelect(file);
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => updateData({ title: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
              placeholder="Add a catchy title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={data.description}
              onChange={(e) => updateData({ description: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none h-24 resize-none"
              placeholder="Tell viewers about your video..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Hashtags</label>
            <div className="flex items-center bg-gray-900 border border-gray-700 rounded-xl py-3 px-4">
              <Hash className="w-5 h-5 text-gray-400 mr-2" />
              <input
                type="text"
                value={data.hashtags}
                onChange={(e) => updateData({ hashtags: e.target.value })}
                className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                placeholder="#mzansi #dance #comedy"
              />
            </div>
          </div>
        </div>
        {showTrim && data.previewUrl && (
          <VideoTrim
            videoSrc={data.previewUrl}
            onTrimComplete={handleTrimComplete}
            onCancel={() => setShowTrim(false)}
          />
        )}
      </div>
    </div>
  );
};

interface UploadSettingsProps {
  data: any;
  updateData: (data: Partial<any>) => void;
  isPosting: boolean;
  setIsPosting: (val: boolean) => void;
  uploadProgress: number;
  setUploadProgress: (val: number) => void;
  resetUpload: () => void;
}

// Module-level flags that survive React state resets and HMR
let _uploadActive = false;
let _uploadCompleted = false;


const UploadSettings: React.FC<UploadSettingsProps> = ({ 
  data, 
  updateData, 
  isPosting, 
  setIsPosting, 
  uploadProgress, 
  setUploadProgress,
  resetUpload
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowStitch, setAllowStitch] = useState(true);

  // Redirect back if file state is lost — but NOT during an active upload or after successful completion
  useEffect(() => {
    if (!data.file && !isPosting && !_uploadActive && !_uploadCompleted) {
      console.warn('UploadFlow: State lost or file missing. Redirecting to upload root.');
      navigate('/app/upload', { replace: true });
    }
  }, [data.file, navigate, isPosting]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isPosting || _uploadActive) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isPosting]);

  const handlePost = async () => {
    if (isPosting || _uploadActive) return;
    if (!data.file) {
      showToast('error', 'Video file is missing.');
      navigate('/app/upload');
      return;
    }

    // Capture the file in a local variable so HMR state resets can't null it
    const videoFile = data.file;
    const videoTitle = data.title;
    const videoDescription = data.description;
    const videoHashtags = data.hashtags;
    const videoReplyToId = data.replyToVideoId;

    console.log('UploadFlow: Starting post process...');
    setIsPosting(true);
    _uploadActive = true;

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        showToast('error', 'Please login to upload');
        navigate('/onboarding/auth');
        return;
      }

      // 3. Cloudinary Unsigned Upload
      console.log('UploadFlow: Initializing Cloudinary upload...');
      
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        showToast('error', 'Cloudinary configuration missing in .env');
        setIsPosting(false);
        _uploadActive = false;
        return;
      }

      const hashtagsArray = videoHashtags.split(/[\s,#]+/).filter((tag: string) => tag.length > 0).map((tag: string) => tag.replace(/^#/, '').toLowerCase());
      const moderationResult = moderateVideoUpload(videoTitle, videoDescription, hashtagsArray);

      if (!moderationResult.isAllowed) {
        showToast('error', moderationResult.reason || 'Content not allowed');
        setIsPosting(false);
        _uploadActive = false;
        return;
      }

      setUploadProgress(1);

      // Helper to upload to Cloudinary using XHR for progress tracking
      const uploadToCloudinary = (file: File | Blob, isVideo: boolean): Promise<string> => {
        return new Promise((resolve, reject) => {
          const url = `https://api.cloudinary.com/v1_1/${cloudName}/${isVideo ? 'video' : 'image'}/upload`;
          const xhr = new XMLHttpRequest();
          const formData = new FormData();

          formData.append('file', file);
          formData.append('upload_preset', uploadPreset);
          formData.append('folder', isVideo ? 'videos' : 'thumbnails');

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && isVideo) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(progress);
            }
          });

          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                resolve(response.secure_url);
              } else {
                const error = JSON.parse(xhr.responseText);
                reject(new Error(error.error?.message || 'Upload failed'));
              }
            }
          };

          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.open('POST', url, true);
          xhr.send(formData);
        });
      };

      console.log('UploadFlow: Generating thumbnail...');
      let thumbnailUrl = '';
      try {
        const thumbnailBlob = await generateVideoThumbnail(videoFile);
        thumbnailUrl = await uploadToCloudinary(thumbnailBlob, false);
        console.log('UploadFlow: Thumbnail uploaded:', thumbnailUrl);
      } catch (thumbErr) {
        console.error('Thumbnail upload skipped:', thumbErr);
      }

      console.log('UploadFlow: Uploading video...');
      const videoUrl = await uploadToCloudinary(videoFile, true);
      console.log('UploadFlow: Video uploaded:', videoUrl);

      setUploadProgress(99);

      const videoInsertData: any = {
        user_id: user.id,
        title: videoTitle,
        caption: videoDescription,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        hashtags: hashtagsArray,
        likes: 0,
        comments: 0,
        views: 0,
        shares: 0,
        saves: 0,
        is_public: true,
        is_active: true,
        allow_comments: allowComments,
        allow_duet: allowDuet,
        allow_stitch: allowStitch,
        created_at: new Date().toISOString()
      };

      if (videoReplyToId) {
        videoInsertData.reply_to_video_id = videoReplyToId;
      }

      const { error: dbError } = await supabase.from('videos').insert([videoInsertData]);
      if (dbError) throw dbError;
      
      setUploadProgress(100);
      showToast('success', 'Video posted successfully!');
      _uploadCompleted = true;
      resetUpload();
      navigate('/app');
    } catch (err: any) {
      console.error('UploadFlow failure:', err);
      showToast('error', `Upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsPosting(false);
      _uploadActive = false;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('..')} className="p-2"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-semibold">Upload Settings</h1>
          <button onClick={handlePost} disabled={isPosting || _uploadActive} className="text-orange-500 font-medium disabled:text-gray-500">
            {isPosting ? 'Posting...' : 'Post'}
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900 rounded-xl p-4">
            <h3 className="font-medium mb-4">Privacy</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span>Allow comments</span>
                <input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} className="w-5 h-5 text-orange-500 rounded" />
              </label>
              <label className="flex items-center justify-between">
                <span>Allow duet</span>
                <input type="checkbox" checked={allowDuet} onChange={(e) => setAllowDuet(e.target.checked)} className="w-5 h-5 text-orange-500 rounded" />
              </label>
              <label className="flex items-center justify-between">
                <span>Allow stitch</span>
                <input type="checkbox" checked={allowStitch} onChange={(e) => setAllowStitch(e.target.checked)} className="w-5 h-5 text-orange-500 rounded" />
              </label>
            </div>
          </div>

          {(isPosting || _uploadActive) && (
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Uploading Video...</span>
                <span className="text-orange-500 font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          )}

          <button onClick={handlePost} disabled={isPosting || _uploadActive} className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:bg-gray-700">
            {isPosting ? 'Uploading Video...' : 'Post Video'}
          </button>
        </div>
      </div>
    </div>
  );
};

const UploadFlow: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const replyToId = searchParams.get('reply_to');
  const { videoData, updateVideoData, isPosting, setIsPosting, uploadProgress, setUploadProgress, resetUpload } = useUpload();

  useEffect(() => {
    if (replyToId && !videoData.replyToVideoId) {
      updateVideoData({ replyToVideoId: replyToId });
      fetchReplyToVideo(replyToId);
    }
  }, [replyToId]);

  const fetchReplyToVideo = async (videoId: string) => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title, video_url, users:user_id (username, display_name)')
        .eq('id', videoId)
        .single();
      if (error) throw error;
      updateVideoData({ replyToVideo: data });
    } catch (err) {
      console.error('Error fetching reply video:', err);
    }
  };

  return (
    <Routes>
      <Route path="/" element={<UploadVideo data={videoData} updateData={updateVideoData} />} />
      <Route path="/settings" element={
        <UploadSettings 
          data={videoData} 
          updateData={updateVideoData}
          isPosting={isPosting}
          setIsPosting={setIsPosting}
          uploadProgress={uploadProgress}
          setUploadProgress={setUploadProgress}
          resetUpload={resetUpload}
        />
      } />
    </Routes>
  );
};

export default UploadFlow;
