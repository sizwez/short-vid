import { supabase } from './supabase';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, string>;
}

export const requestNotificationPermission = async (userId: string): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notifications');
    return false;
  }

  const permission = await Notification.requestPermission();
  
  if (permission === 'granted') {
    await supabase
      .from('users')
      .update({ notifications_enabled: true })
      .eq('id', userId);
    return true;
  }
  
  return false;
};

export const showLocalNotification = (title: string, body: string, icon?: string, data?: Record<string, string>) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: icon || '/vite.svg',
      badge: '/vite.svg',
      data,
      tag: data?.type || 'default',
    });
  }
};

export const notificationService = {
  async enableForUser(userId: string): Promise<boolean> {
    return requestNotificationPermission(userId);
  },

  async disableForUser(userId: string): Promise<void> {
    await supabase
      .from('users')
      .update({ notifications_enabled: false })
      .eq('id', userId);
  },

  async checkPermissionStatus(): Promise<NotificationPermission | 'default'> {
    if (!('Notification' in window)) {
      return 'default';
    }
    return Notification.permission;
  }
};