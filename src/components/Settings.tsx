import React, { useState } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Shield, Bell, Globe, Wifi, HelpCircle, LogOut, ChevronRight, Key, Wallet, Trash2 } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { useToast } from './ToastContainer';
import { signOut, updateUserProfile } from '../services/authService';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { initializeFCMForUser, disableFCMForUser } from '../lib/fcmService';

const SettingsMain: React.FC = () => {
  const navigate = useNavigate();
  const {
    user, setUser,
    dataSavingMode, setDataSavingMode,
    isPrivateAccount,
    language
  } = useApp();
  const { showToast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleDataSaving = async () => {
    if (!user || isUpdating) return;
    setIsUpdating(true);
    const newValue = !dataSavingMode;
    try {
      await updateUserProfile(user.id, { data_saving_mode: newValue });
      setDataSavingMode(newValue);
      showToast('success', `Data saving mode ${newValue ? 'enabled' : 'disabled'}`);
    } catch {
      showToast('error', 'Failed to update setting');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      setUser(null);
      showToast('success', 'Logged out successfully');
      navigate('/onboarding');
    } catch {
      console.error('Logout error:');
      showToast('error', 'Failed to log out');
    } finally {
      setIsLoggingOut(false);
    }
  };

  interface SettingsItem {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
    badge: string | null;
    toggle?: boolean;
    value?: boolean;
    destructive?: boolean;
  }

  const settingsSections: { title: string; items: SettingsItem[] }[] = [
    {
      title: 'Account',
      items: [
        {
          icon: <User className="w-5 h-5" />,
          label: 'Edit Profile',
          onPress: () => navigate('/profile/settings'),
          badge: null
        },
        {
          icon: <Key className="w-5 h-5" />,
          label: 'Change Password',
          onPress: () => navigate('/onboarding/auth?reset=true'),
          badge: null
        },
        {
          icon: <Shield className="w-5 h-5" />,
          label: 'Privacy & Security',
          onPress: () => navigate('/settings/privacy'),
          badge: isPrivateAccount ? 'Private' : 'Public'
        },
        {
          icon: <Wallet className="w-5 h-5" />,
          label: 'Payout Method',
          onPress: () => navigate('/app/payment'),
          badge: null
        }
      ]
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: <Wifi className="w-5 h-5" />,
          label: 'Data Saving Mode',
          onPress: toggleDataSaving,
          badge: dataSavingMode ? 'On' : 'Off',
          toggle: true,
          value: dataSavingMode
        },
        {
          icon: <Bell className="w-5 h-5" />,
          label: 'Notifications',
          onPress: () => navigate('/settings/notifications'),
          badge: null,
        },
        {
          icon: <Globe className="w-5 h-5" />,
          label: 'Language',
          onPress: () => navigate('/settings/language'),
          badge: language === 'en' ? 'English' : language === 'zu' ? 'IsiZulu' : language === 'xh' ? 'IsiXhosa' : language
        }
      ]
    },
    {
      title: 'Support',
      items: [
        {
          icon: <HelpCircle className="w-5 h-5" />,
          label: 'Help Center',
          onPress: () => navigate('/settings/help'),
          badge: null
        }
      ]
    },
    {
      title: 'Actions',
      items: [
        {
          icon: <Trash2 className="w-5 h-5 text-red-500" />,
          label: 'Delete Account',
          onPress: () => navigate('/settings/delete-account'),
          badge: null,
          destructive: true
        },
        {
          icon: <LogOut className="w-5 h-5 text-red-500" />,
          label: isLoggingOut ? 'Logging out...' : 'Log Out',
          onPress: handleLogout,
          badge: null,
          destructive: true
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between p-4 pt-12 border-b border-gray-800">
          <button className="p-2" onClick={() => navigate('/app')}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Settings</h1>
          <div className="w-10"></div>
        </div>

        {user && (
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-gray-400 text-sm">@{user.username}</p>
              </div>
            </div>
          </div>
        )}

        {settingsSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-6">
            <h3 className="text-gray-400 text-sm font-medium px-4 mb-2 uppercase tracking-wider">
              {section.title}
            </h3>
            <div className="divide-y divide-gray-800">
              {section.items.map((item, itemIndex) => (
                <motion.button
                  key={itemIndex}
                  whileTap={{ scale: 0.98 }}
                  onClick={item.onPress}
                  className={`w-full flex items-center justify-between p-4 hover:bg-gray-900/50 transition-colors ${item.destructive ? 'text-red-500' : 'text-white'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {item.badge && (
                      <span className="text-gray-400 text-sm">{item.badge}</span>
                    )}
                    {item.toggle ? (
                      <div className={`w-12 h-6 rounded-full transition-colors ${item.value ? 'bg-orange-500' : 'bg-gray-600'
                        }`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${item.value ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                      </div>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PrivacySettings: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    isPrivateAccount, setIsPrivateAccount,
    allowCommentsOnVideos, setAllowCommentsOnVideos
  } = useApp();
  const { showToast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleSetting = async (label: string, currentValue: boolean, setter: (val: boolean) => void, DBKey: string) => {
    if (!user || isUpdating) return;
    setIsUpdating(true);
    const newValue = !currentValue;
    try {
      await updateUserProfile(user.id, { [DBKey]: newValue });
      setter(newValue);
      showToast('success', `${label} updated`);
    } catch {
      showToast('error', `Failed to update ${label}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button className="p-2" onClick={() => navigate('/settings')}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Privacy & Security</h1>
          <div className="w-10"></div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900 rounded-xl p-4">
            <h3 className="font-medium mb-4">Account Privacy</h3>
            <div className="space-y-4">
              <button
                onClick={() => toggleSetting('Private Account', isPrivateAccount, setIsPrivateAccount, 'is_private_account')}
                className="flex items-center justify-between w-full"
              >
                <div className="text-left">
                  <p className="font-medium">Private Account</p>
                  <p className="text-gray-400 text-sm">Only followers can see your content</p>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors ${isPrivateAccount ? 'bg-orange-500' : 'bg-gray-600'
                  }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isPrivateAccount ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                </div>
              </button>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-4">
            <h3 className="font-medium mb-4">Content Interactions</h3>
            <div className="space-y-4">
              {[
                { label: 'Allow Comments', value: allowCommentsOnVideos, setter: setAllowCommentsOnVideos, dbKey: 'allow_comments_on_videos' },
                { label: 'Allow Duets', value: true, setter: () => { }, dbKey: '' },
                { label: 'Allow Stitch', value: true, setter: () => { }, dbKey: '' }
              ].map((setting, index) => (
                <button
                  key={index}
                  onClick={() => setting.dbKey && toggleSetting(setting.label, setting.value, setting.setter, setting.dbKey)}
                  className="flex items-center justify-between w-full"
                >
                  <span className="font-medium">{setting.label}</span>
                  <div className={`w-12 h-6 rounded-full transition-colors ${setting.value ? 'bg-orange-500' : 'bg-gray-600'
                    }`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${setting.value ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, notificationsEnabled = true, setNotificationsEnabled } = useApp();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button className="p-2" onClick={() => navigate('/settings')}>
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold">Notifications</h1>
            <div className="w-10"></div>
          </div>
          <div className="text-center py-10">
            <p className="text-gray-400">Please sign in to view notification settings</p>
          </div>
        </div>
      </div>
    );
  }

  const handleToggleNotifications = async () => {
    if (!user || isLoading) return;
    setIsLoading(true);
    try {
      if (!notificationsEnabled) {
        const token = await initializeFCMForUser(user.id);
        if (!token) {
          showToast('error', 'Please allow notifications in your browser settings');
          setIsLoading(false);
          return;
        }
      } else {
        await disableFCMForUser(user.id);
      }
      await updateUserProfile(user.id, { notifications_enabled: !notificationsEnabled });
      setNotificationsEnabled(!notificationsEnabled);
      showToast('success', `Notifications ${!notificationsEnabled ? 'enabled' : 'disabled'}`);
    } catch {
      showToast('error', 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button className="p-2" onClick={() => navigate('/settings')}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Notifications</h1>
          <div className="w-10"></div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl p-4">
            <button
              onClick={handleToggleNotifications}
              className="flex items-center justify-between w-full"
            >
              <div className="text-left">
                <p className="font-medium">Push Notifications</p>
                <p className="text-gray-400 text-sm">Receive notifications on your device</p>
              </div>
              <div className={`w-12 h-6 rounded-full transition-colors ${notificationsEnabled ? 'bg-orange-500' : 'bg-gray-600'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>

          <div className="bg-gray-900 rounded-xl p-4">
            <h3 className="font-medium mb-4">Notification Types</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Likes</p>
                  <p className="text-gray-400 text-sm">When someone likes your video</p>
                </div>
                <div className="w-10 h-5 bg-orange-500 rounded-full">
                  <div className="w-4 h-4 bg-white rounded-full translate-x-5" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Comments</p>
                  <p className="text-gray-400 text-sm">When someone comments on your video</p>
                </div>
                <div className="w-10 h-5 bg-orange-500 rounded-full">
                  <div className="w-4 h-4 bg-white rounded-full translate-x-5" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New Followers</p>
                  <p className="text-gray-400 text-sm">When someone follows you</p>
                </div>
                <div className="w-10 h-5 bg-orange-500 rounded-full">
                  <div className="w-4 h-4 bg-white rounded-full translate-x-5" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Shares</p>
                  <p className="text-gray-400 text-sm">When your video is shared</p>
                </div>
                <div className="w-10 h-5 bg-orange-500 rounded-full">
                  <div className="w-4 h-4 bg-white rounded-full translate-x-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeleteAccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useApp();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user || isDeleting) return;
    setIsDeleting(true);
    try {
      // Use server endpoint instead of exposing admin API to client
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        showToast('error', 'Please login to delete your account');
        return;
      }

      const { data } = await axios.post('/api/account/delete', {
        userId: user.id
      }, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (data.success) {
        setUser(null);
        showToast('success', 'Account deleted');
        navigate('/onboarding');
      } else {
        showToast('error', data.error || 'Failed to delete account');
      }
    } catch (err) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      showToast('error', axiosErr?.response?.data?.error || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button className="p-2" onClick={() => navigate('/settings')}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Delete Account</h1>
          <div className="w-10"></div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 text-center">
          <Trash2 className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Delete Your Account?</h2>
          <p className="text-gray-400 mb-6">
            This action cannot be undone. All your videos, likes, comments, and followers will be permanently deleted.
          </p>

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-red-400 font-medium">Are you sure?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 bg-gray-700 text-white py-3 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => navigate('/settings')}
            className="w-full mt-4 text-gray-400 py-2"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

const Settings: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<SettingsMain />} />
      <Route path="/privacy" element={<PrivacySettings />} />
      <Route path="/notifications" element={<NotificationSettings />} />
      <Route path="/delete-account" element={<DeleteAccountSettings />} />
    </Routes>
  );
};

export default Settings;