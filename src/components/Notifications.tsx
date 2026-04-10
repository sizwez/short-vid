import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Heart, MessageCircle, UserPlus, Bell, Clock, X, MessageSquare, Share2, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../hooks/useApp';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'share' | 'earnings';
  actor_id: string;
  user_id: string;
  video_id?: string;
  read: boolean;
  created_at: string;
  message?: string;
  amount?: number;
  actor?: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Notifications error:', error);
          setNotifications([]);
          setLoading(false);
          return;
        }

        const notificationsWithActors = await Promise.all(
          (data || []).map(async (notif) => {
            if (notif.actor_id) {
              const { data: actorData } = await supabase
                .from('users')
                .select('username, display_name, avatar_url')
                .eq('id', notif.actor_id)
                .single();
              return { ...notif, actor: actorData || null };
            }
            return { ...notif, actor: null };
          })
        );

        setNotifications(notificationsWithActors);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Set up real-time subscription
    const notificationChannel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const newNotification = payload.new as Notification;
          // Fetch actor details for the new notification
          const { data: actorData } = await supabase
            .from('users')
            .select('username, display_name, avatar_url')
            .eq('id', newNotification.actor_id)
            .single();

          setNotifications(prev => [{ ...newNotification, actor: actorData || undefined }, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
    };
  }, [user?.id]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'share':
        return <Share2 className="w-5 h-5 text-purple-500" />;
      case 'earnings':
        return <DollarSign className="w-5 h-5 text-green-400" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const clearAllNotifications = async () => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setNotifications([]);
    } catch (err) {
      console.error('Error clearing all notifications:', err);
    }
  };

  const filteredNotifications = notifications.filter(notif =>
    filter === 'all' || !notif.read
  );

  const unreadCount = notifications.filter(notif => !notif.read).length;

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read && user?.id) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notification.id);

        if (error) throw error;
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, read: true } : n))
        );
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }

    // Logic for navigation can be added here (e.g., to video or profile)
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pt-12 border-b border-gray-800 bg-black sticky top-0 z-10">
          <button className="p-2" onClick={() => navigate('/app')}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-6">
            <button
              onClick={() => navigate('/app/notifications')}
              className={`flex flex-col items-center ${location.pathname.includes('notifications') ? 'text-orange-500' : 'text-gray-400'}`}
            >
              <div className="relative">
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />}
              </div>
              <span className="text-[10px] font-bold mt-1">Activity</span>
            </button>
            <button
              onClick={() => navigate('/app/messages')}
              className={`flex flex-col items-center ${location.pathname.includes('messages') ? 'text-orange-500' : 'text-gray-400'}`}
            >
              <MessageSquare className="w-6 h-6" />
              <span className="text-[10px] font-bold mt-1">Chats</span>
            </button>
          </div>
          <button
            className="p-2 text-gray-400 hover:text-white transition-colors"
            onClick={clearAllNotifications}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!user?.id ? (
          <div className="text-center py-16 px-6">
            <Bell className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">Please sign in to view notifications</p>
          </div>
        ) : (
          <>
        {/* Filter Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-4 font-medium transition-colors ${filter === 'all'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-400'
              }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 py-4 font-medium transition-colors relative ${filter === 'unread'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-400'
              }`}
          >
            Unread
          </button>
        </div>

        {/* Actions */}
        {unreadCount > 0 && (
          <div className="p-4 bg-gray-900/50 border-b border-gray-800">
            <button
              onClick={markAllAsRead}
              className="text-orange-500 font-medium text-sm"
            >
              Mark all as read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="divide-y divide-gray-800">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 px-6"
              >
                <Bell className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
              </motion.div>
            ) : (
              filteredNotifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 flex items-start space-x-3 transition-colors ${!notif.read ? 'bg-orange-500/5' : 'hover:bg-gray-900/50'
                    } cursor-pointer`}
                >
                  <div className="relative">
                    <img
                      src={notif.actor?.avatar_url || 'https://via.placeholder.com/40'}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover border border-gray-800"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-1 border border-gray-800">
                      {getNotificationIcon(notif.type)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {notif.type === 'earnings' ? (
                      <p className="text-sm leading-relaxed">
                        <span className="font-bold text-green-400">You've earned </span>
                        <span className="font-bold text-white">${notif.amount?.toFixed(2) || '0.00'}</span>
                        <span className="text-gray-300 ml-1">this month!</span>
                      </p>
                    ) : (
                      <p className="text-sm leading-relaxed">
                        <span className="font-bold text-white">{notif.actor?.display_name || 'Someone'}</span>
                        <span className="text-gray-300 ml-1">
                          {notif.type === 'like' && 'liked your video'}
                          {notif.type === 'comment' && `commented: "${notif.message || '...'}"`}
                          {notif.type === 'follow' && 'started following you'}
                          {notif.type === 'share' && 'shared your video'}
                        </span>
                      </p>
                    )}
                    <div className="flex items-center mt-1 text-xs text-gray-500 space-x-2">
                      <Clock className="w-3 h-3" />
                      <span>{formatDistanceToNow(new Date(notif.created_at))} ago</span>
                    </div>
                  </div>

                  {!notif.read && (
                    <div className="w-2.5 h-2.5 bg-orange-500 rounded-full flex-shrink-0 self-center"></div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Notifications;