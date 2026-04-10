import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Upload, ArrowLeft, Hash, X, Camera, Scissors } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContainer';
import { moderateVideoUpload } from '../lib/moderation';
import VideoTrim from './VideoTrim';

interface VideoData {
  title: string;
  description: string;
  hashtags: string;
  file: File | null;
  previewUrl: string | null;
  replyToVideoId?: string | null;
  replyToVideo?: {
    id: string;
    title: string;
    video_url: string;
    users: {
      username: string;
      display_name: string;
    } | null;
  } | null;
}

interface UploadVideoProps {
  data: VideoData;
  updateData: (data: Partial<VideoData>) => void;
}

const UploadVideo: React.FC<UploadVideoProps> = ({ data, updateData }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [showTrim, setShowTrim] = useState(false);

  const handleVideoSelect = (file: File) => {
    // Validate video file
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/3gpp'];

    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast('error', 'Unsupported video format. Please use MP4, WebM, MOV, AVI, or 3GP.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast('error', 'Video file is too large. Maximum size is 100MB.');
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
  data: VideoData;
}

const UploadSettings: React.FC<UploadSettingsProps> = ({ data }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowStitch, setAllowStitch] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handlePost = async () => {
    if (!data.file) return;

    setIsPosting(true);
    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        showToast('error', 'Please login to upload videos');
        navigate('/onboarding/auth');
        return;
      }

      const hashtagsArray = data.hashtags
        .split(/[\s,#]+/)
        .filter(tag => tag.length > 0)
        .map(tag => tag.replace(/^#/, '').toLowerCase());

      const moderationResult = moderateVideoUpload(
        data.title,
        data.description,
        hashtagsArray
      );

      if (!moderationResult.isAllowed) {
        showToast('error', moderationResult.reason || 'Content not allowed');
        setIsPosting(false);
        return;
      }

      setUploadProgress(20);

      // 1. Upload video to Storage
      const fileExt = data.file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = fileName;

      // Simulated progress since Supabase JS client v2 doesn't have an easy progress callback for standard uploads without XHR
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, data.file);

      clearInterval(progressInterval);
      if (uploadError) throw uploadError;
      setUploadProgress(95);

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      // 4. Insert Metadata to Database with user_id
      const videoData: Record<string, unknown> = {
        user_id: user.id,
        title: data.title,
        caption: data.description,
        video_url: publicUrl,
        hashtags: hashtagsArray,
        likes: 0,
        comments: 0,
        views: 0,
        shares: 0,
        saves: 0,
        is_public: true,
        is_active: true,
        created_at: new Date().toISOString()
      };

      if (data.replyToVideoId) {
        videoData.reply_to_video_id = data.replyToVideoId;
      }

      const { error: dbError } = await supabase
        .from('videos')
        .insert([videoData]);

      if (dbError) throw dbError;
      setUploadProgress(100);

      showToast('success', 'Video uploaded successfully!');
      navigate('/app');

    } catch (err) {
      console.error('Upload failed:', err);
      showToast('error', `Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('..')}
            className="p-2"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Upload Settings</h1>
          <button
            onClick={handlePost}
            disabled={isPosting}
            className="text-orange-500 font-medium disabled:text-gray-500"
          >
            {isPosting ? 'Posting...' : 'Post'}
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900 rounded-xl p-4">
            <h3 className="font-medium mb-4">Privacy</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span>Allow comments</span>
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={(e) => setAllowComments(e.target.checked)}
                  className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span>Allow duet</span>
                <input
                  type="checkbox"
                  checked={allowDuet}
                  onChange={(e) => setAllowDuet(e.target.checked)}
                  className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span>Allow stitch</span>
                <input
                  type="checkbox"
                  checked={allowStitch}
                  onChange={(e) => setAllowStitch(e.target.checked)}
                  className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                />
              </label>
            </div>
          </div>

          {isPosting && (
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Uploading Video...</span>
                <span className="text-orange-500 font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-orange-500 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <button
            onClick={handlePost}
            disabled={isPosting}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
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
  const [videoData, setVideoData] = useState<VideoData>({
    title: '',
    description: '',
    hashtags: '',
    file: null,
    previewUrl: null,
    replyToVideoId: replyToId || null,
    replyToVideo: null
  });

  useEffect(() => {
    if (location.state?.file && location.state?.previewUrl) {
      setVideoData(prev => ({
        ...prev,
        file: location.state.file,
        previewUrl: location.state.previewUrl
      }));
    }
  }, [location.state]);

  useEffect(() => {
    if (replyToId) {
      fetchReplyToVideo(replyToId);
    }
  }, [replyToId]);

  const fetchReplyToVideo = async (videoId: string) => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          video_url,
          users:user_id (
            username,
            display_name
          )
        `)
        .eq('id', videoId)
        .single();

      if (error) throw error;

      const processedData = {
        ...data,
        users: Array.isArray(data.users) ? data.users[0] : data.users
      };

      setVideoData(prev => ({ ...prev, replyToVideo: processedData }));
    } catch (err) {
      console.error('Error fetching reply video:', err);
    }
  };

  const updateData = (newData: Partial<VideoData>) => {
    setVideoData(prev => ({ ...prev, ...newData }));
  };

  return (
    <Routes>
      <Route path="/" element={<UploadVideo data={videoData} updateData={updateData} />} />
      <Route path="/settings" element={<UploadSettings data={videoData} />} />
    </Routes>
  );
};

export default UploadFlow;