import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const isConfigValid = firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'your_api_key' && 
  firebaseConfig.apiKey !== 'AIzaSyD-EXAMPLE';

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

if (isConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
  }
}

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;

if (app && typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      try {
        getAnalytics(app);
      } catch (e) {
        console.warn('Analytics init failed:', e);
      }
    }
  }).catch(() => {});
}

export const getMessagingInstance = (): Messaging | null => {
  if (!app) return null;
  
  if (!messaging) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.warn('Firebase Messaging not available:', error);
      return null;
    }
  }
  return messaging;
};

export const requestFCMToken = async (): Promise<string | null> => {
  const messagingInstance = getMessagingInstance();
  if (!messagingInstance) {
    console.log('FCM not available');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.log('FCM VAPID key not configured');
      return null;
    }

    const token = await getToken(messagingInstance, { vapidKey });
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

export const onFCMMessage = (callback: (payload: unknown) => void) => {
  const messagingInstance = getMessagingInstance();
  if (!messagingInstance) return () => {};

  return onMessage(messagingInstance, (payload) => {
    callback(payload);
  });
};

export default app;
