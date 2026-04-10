import { supabase } from './supabase';
import { requestFCMToken, onFCMMessage, getMessagingInstance } from '../firebase.config';

export interface FCMTokenPayload {
  token: string;
  userId: string;
  platform: 'web' | 'android' | 'ios';
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  data?: Record<string, string>;
  tag?: string;
}

export const fcmService = {
  async initialize(userId: string): Promise<string | null> {
    try {
      const token = await requestFCMToken();

      if (token) {
        await this.saveToken(token, userId);
        this.listenForForegroundMessages();
        if (import.meta.env.DEV) console.log('FCM initialized successfully');
        return token;
      }

      return null;
    } catch (error) {
      console.error('Failed to initialize FCM:', error);
      return null;
    }
  },

  async saveToken(fcmToken: string, userId: string): Promise<void> {
    try {
      await supabase
        .from('user_devices')
        .upsert({
          user_id: userId,
          fcm_token: fcmToken,
          platform: 'web',
          last_active: new Date().toISOString(),
          is_active: true
        }, { onConflict: 'user_id,platform' });

      if (import.meta.env.DEV) console.log('FCM token saved to database');
    } catch (error) {
      console.error('Failed to save FCM token:', error);
    }
  },

  async removeToken(userId: string): Promise<void> {
    try {
      await supabase
        .from('user_devices')
        .delete()
        .eq('user_id', userId)
        .eq('platform', 'web');

      if (import.meta.env.DEV) console.log('FCM token removed');
    } catch (error) {
      console.error('Failed to remove FCM token:', error);
    }
  },

  listenForForegroundMessages(): () => void {
    return onFCMMessage((payload) => {
      this.handleForegroundMessage(payload);
    });
  },

  handleForegroundMessage(payload: unknown): void {
    const message = payload as {
      notification?: { title?: string; body?: string; image?: string };
      data?: Record<string, string>;
    };

    if (message.notification) {
      const { title, body, image } = message.notification;

      if (Notification.permission === 'granted') {
        new Notification(title || 'Mzansi Videos', {
          body: body || '',
          icon: image || '/vite.svg',
          badge: '/vite.svg',
          tag: message.data?.type || 'default',
          data: message.data,
        });
      }
    }
  },

  subscribeToTopic(_token: string, topic: string): void {
    // TODO: Implement server-side topic subscription via FCM Admin SDK
    // For now, topic subscriptions are not available on the client side
    if (import.meta.env.DEV) console.log(`Topic subscription requested: ${topic} (not yet implemented)`);
  },

  unsubscribeFromTopic(_token: string, topic: string): void {
    // TODO: Implement server-side topic unsubscription via FCM Admin SDK
    if (import.meta.env.DEV) console.log(`Topic unsubscription requested: ${topic} (not yet implemented)`);
  },

  isSupported(): boolean {
    return !!(getMessagingInstance() && 'serviceWorker' in navigator);
  },

  async getPermissionStatus(): Promise<NotificationPermission | 'unsupported'> {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  },

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
};

export const initializeFCMForUser = async (userId: string): Promise<string | null> => {
  return fcmService.initialize(userId);
};

export const disableFCMForUser = async (userId: string): Promise<void> => {
  return fcmService.removeToken(userId);
};