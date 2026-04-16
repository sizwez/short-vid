import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Settings, Play, Camera, DollarSign, User } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { useToast } from './ToastContainer';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';

interface Video {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  likes: number;
  views: number;
  created_at: string;
}

interface ProfileData {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
}

const ProfileMain: React.FC = () => {
  const navigate = useNavigate();
  const { userId: paramUserId } = useParams();
  const { user: currentUser } = useApp();
  const { showToast } = useToast();

  const [targetUser, setTargetUser] = useState<ProfileData | null>(null);
  const [userVideos, setUserVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  const isOwnProfile = !paramUserId || paramUserId === currentUser?.id;
  const targetId = paramUserId || currentUser?.id;

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', targetId)
        .single();

      if (error) throw error;
      setTargetUser(profile);

      if (currentUser && !isOwnProfile) {
        const { data: follow } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetId)
          .single();
        setIsFollowing(!!follow);
      }

      const { data: videos } = await supabase
        .from('videos')
        .select('id, title, video_url, thumbnail_url, likes, views, created_at')
        .eq('user_id', targetId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      setUserVideos(videos || []);
    } catch (err) {
      console.error('Error fetching profile:', err);
      showToast('error', 'Profile not found');
      navigate('/app');
    } finally {
      setIsLoading(false);
    }
  }, [targetId, currentUser, isOwnProfile, navigate, showToast]);

  useEffect(() => {
    if (targetId) {
      fetchProfile();
    }
  }, [targetId, fetchProfile]);

  const toggleFollow = async () => {
    if (!currentUser) {
      showToast('error', 'Please login to follow');
      return;
    }

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetId);
        setIsFollowing(false);
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: currentUser.id, following_id: targetId });
        setIsFollowing(true);
      }
      fetchProfile();
    } catch {
      showToast('error', 'Failed to update follow status');
    }
  };

  if (!targetId) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mb-6">
          <User className="w-12 h-12 text-gray-500" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Create a profile</h2>
        <p className="text-gray-400 text-sm mb-8 max-w-[280px] leading-relaxed">
          Sign up for an account to watch your favorite videos, comment, and connect with creators.
        </p>
        <button
          onClick={() => navigate('/onboarding/auth')}
          className="bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold py-3.5 px-10 rounded-full shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
        >
          Sign up / Log in
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">User not found</p>
          <button onClick={() => navigate('/app')} className="text-orange-500 font-medium">Go back Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl p-4 flex items-center justify-between">
        <button className="p-2 -ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold">@{targetUser.username}</h1>
        {isOwnProfile ? (
          <button className="p-2 -mr-2" onClick={() => navigate('/app/settings')}>
            <Settings className="w-6 h-6" />
          </button>
        ) : <div className="w-10" />}
      </div>

      <div className="px-4 pb-4">
        <div className="flex justify-center mb-4">
          <motion.div whileTap={{ scale: 0.95 }} className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 p-1">
              <div className="w-full h-full rounded-full bg-black overflow-hidden">
                {targetUser.avatar_url ? (
                  <img src={targetUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-3xl font-bold">
                      {targetUser.display_name?.charAt(0).toUpperCase() || targetUser.username?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="text-center mb-3">
          <h2 className="text-xl font-semibold">{targetUser.display_name}</h2>
          <p className="text-white/50 text-sm">@{targetUser.username}</p>
        </div>

        {targetUser.bio && (
          <p className="text-white/70 text-center text-sm mb-4 px-8">{targetUser.bio}</p>
        )}

        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <div className="text-lg font-bold">{targetUser.following_count || 0}</div>
            <div className="text-white/40 text-xs">Following</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{targetUser.followers_count || 0}</div>
            <div className="text-white/40 text-xs">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{userVideos.length}</div>
            <div className="text-white/40 text-xs">Videos</div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {isOwnProfile ? (
            <>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/app/profile/settings')}
                className="flex-1 bg-white/10 border border-white/10 py-2.5 rounded-full font-medium text-sm"
              >
                Edit Profile
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/app/creator-dashboard')}
                className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 py-2.5 rounded-full font-medium text-sm flex items-center justify-center gap-1"
              >
                <DollarSign className="w-4 h-4" />
                Earnings
              </motion.button>
            </>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={toggleFollow}
                className={`flex-1 py-2.5 rounded-full font-medium text-sm transition-all ${isFollowing
                    ? 'bg-white/10 border border-white/10 text-white'
                    : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                  }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/app/messages/${targetId}`)}
                className="flex-1 bg-white/10 border border-white/10 py-2.5 rounded-full font-medium text-sm"
              >
                Message
              </motion.button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-0.5">
        {userVideos.map((video, index) => (
          <VideoGridItem key={video.id} video={video} index={index} />
        ))}
      </div>

      {userVideos.length === 0 && (
        <div className="py-20 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <Play className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-white/40 text-sm">No videos yet</p>
        </div>
      )}
    </div>
  );
};

const VideoGridItem: React.FC<{ video: Video; index: number }> = ({ video, index }) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className="aspect-[9/16] bg-gray-900 relative cursor-pointer overflow-hidden"
      onMouseEnter={() => {
        videoRef.current?.play().catch(() => { });
      }}
      onMouseLeave={() => {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      }}
      onClick={() => navigate(`/app?video=${video.id}`)}
    >
      <video
        ref={videoRef}
        src={video.video_url}
        muted
        loop
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-medium">
        <Play className="w-3 h-3" />
        {video.views || 0}
      </div>
    </motion.div>
  );
};

const ProfileSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useApp();
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    username: user?.username || '',
    bio: user?.bio || ''
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary configuration missing in .env');
      }

      const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'avatars');

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const data = await response.json();
      setAvatarUrl(data.secure_url);
    } catch (err) {
      console.error('Upload error:', err);
      showToast('error', 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: formData.name,
          username: formData.username,
          bio: formData.bio,
          avatar_url: avatarUrl
        })
        .eq('id', user.id);

      if (error) throw error;

      setUser({ ...user, name: formData.name, username: formData.username, bio: formData.bio, avatar: avatarUrl });
      showToast('success', 'Profile updated!');
      navigate(-1);
    } catch (err) {
      console.error('Save error:', err);
      showToast('error', 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold">Edit Profile</h1>
        <div className="w-6" />
      </div>

      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 p-1">
            <div className="w-full h-full rounded-full bg-black overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-orange-500/20 text-orange-500 text-2xl font-bold">
                  {user?.username?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-pink-500 p-2 rounded-full cursor-pointer">
              <Camera className="w-4 h-4 text-white" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={isUploading} />
            </label>
          </div>
          {isUploading && <p className="text-sm text-gray-400 mt-2">Uploading...</p>}
        </div>
      </div>

      <div className="space-y-4">
        <input
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full bg-gray-900 p-4 rounded-xl border border-gray-800"
        />
        <input
          placeholder="Username"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          className="w-full bg-gray-900 p-4 rounded-xl border border-gray-800"
        />
        <textarea
          placeholder="Bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          className="w-full bg-gray-900 p-4 rounded-xl border border-gray-800 h-24 resize-none"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 py-4 rounded-xl font-semibold mt-8 disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
};

const Profile: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ProfileMain />} />
      <Route path="/:userId" element={<ProfileMain />} />
      <Route path="/settings" element={<ProfileSettings />} />
    </Routes>
  );
};

export default Profile;
