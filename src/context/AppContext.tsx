import React, { createContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, Notification } from '../types';
import { supabase } from '../lib/supabase';
import { getUserProfile, onAuthStateChange } from '../services/authService';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  language: string;
  setLanguage: (language: string) => void;
  isAuthenticated: boolean;
  dataSavingMode: boolean;
  setDataSavingMode: (mode: boolean) => void;
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  isPrivateAccount: boolean;
  setIsPrivateAccount: (isPrivate: boolean) => void;
  allowCommentsOnVideos: boolean;
  setAllowCommentsOnVideos: (allow: boolean) => void;
  isLoading: boolean;
  authError: string | null;
  isOnline: boolean;
  pendingActions: PendingAction[];
  addPendingAction: (action: PendingAction) => void;
}

interface PendingAction {
  id: string;
  type: 'like' | 'save' | 'comment' | 'follow';
  data: Record<string, unknown>;
  timestamp: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export { AppContext };

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState('en');
  const [dataSavingMode, setDataSavingMode] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [allowCommentsOnVideos, setAllowCommentsOnVideos] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const isMounted = useRef(true);

  const isAuthenticated = user !== null;

  const addPendingAction = (action: PendingAction) => {
    setPendingActions(prev => [...prev, action]);
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && pendingActions.length > 0 && user) {
      const processPendingActions = async () => {
        for (const action of pendingActions) {
          try {
            if (action.type === 'like') {
              await supabase.from('likes').insert(action.data);
            } else if (action.type === 'save') {
              await supabase.from('saves').insert(action.data);
            } else if (action.type === 'comment') {
              await supabase.from('comments').insert(action.data);
            } else if (action.type === 'follow') {
              await supabase.from('follows').insert(action.data);
            }
          } catch (err) {
            console.error('Failed to process pending action:', err);
          }
        }
        setPendingActions([]);
      };
      processPendingActions();
    }
  }, [isOnline, pendingActions, user]);

  // Helper: set user state from a profile object
  const setUserFromProfile = (profile: NonNullable<Awaited<ReturnType<typeof getUserProfile>>>) => {
    setUser({
      id: profile.id,
      name: profile.display_name || profile.username,
      username: profile.username,
      avatar: profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.username}&background=random`,
      bio: profile.bio || '',
      followers: profile.followers_count,
      following: profile.following_count,
      isCreator: profile.is_creator,
      subscription: profile.subscription,
      earnings: profile.earnings,
      language: profile.language,
      notificationsEnabled: profile.notifications_enabled,
      dataSavingMode: profile.data_saving_mode,
      isPrivateAccount: profile.is_private_account,
      allowCommentsOnVideos: profile.allow_comments_on_videos,
    });
    setLanguage(profile.language);
    setDataSavingMode(profile.data_saving_mode);
    setNotificationsEnabled(profile.notifications_enabled);
    setIsPrivateAccount(profile.is_private_account);
    setAllowCommentsOnVideos(profile.allow_comments_on_videos);
  };

  // Helper: auto-create a profile row when one doesn't exist yet
  const ensureProfile = async (authUser: SupabaseUser) => {
    const meta = authUser.user_metadata || {};
    const username = meta.username || meta.display_name?.toLowerCase().replace(/\s+/g, '_') || authUser.email?.split('@')[0] || 'user';
    const displayName = meta.display_name || username;

    const { error } = await supabase.from('users').upsert(
      {
        id: authUser.id,
        username,
        display_name: displayName,
        bio: 'New to Mzansi Videos',
        email: authUser.email,
        followers_count: 0,
        following_count: 0,
        is_creator: false,
        verified_badge: false,
        subscription: 'free',
        earnings: 0,
        language: 'en',
        notifications_enabled: true,
        data_saving_mode: false,
        is_private_account: false,
        allow_comments_on_videos: true,
        account_status: 'active',
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error('Error creating profile:', error);
    }

    return getUserProfile(authUser.id);
  };

  // Helper: create a fallback user object when profile fetch fails
  const createFallbackUser = (authUser: SupabaseUser): User => ({
    id: authUser.id,
    name: authUser.user_metadata?.display_name || 'User',
    username: authUser.user_metadata?.username || 'user',
    avatar: authUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${authUser.id}&background=random`,
    bio: '',
    followers: 0,
    following: 0,
    isCreator: false,
    subscription: 'free',
    earnings: 0,
    language: 'en',
    notificationsEnabled: true,
    dataSavingMode: false,
    isPrivateAccount: false,
    allowCommentsOnVideos: true,
  });

  // Helper: load (or create) a profile and set state
  const loadProfile = async (authUser: SupabaseUser) => {
    try {
      const profilePromise = getUserProfile(authUser.id);
      
      const timeoutPromise = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 5000)
      );
      
      const profile = await Promise.race([profilePromise, timeoutPromise]);

      if (!profile) {
        console.log('No profile found or timeout, auto-creating one…');
        const newProfile = await ensureProfile(authUser);
        if (newProfile && isMounted.current) {
          setUserFromProfile(newProfile);
        } else if (isMounted.current) {
          setUser(createFallbackUser(authUser));
        }
      } else if (isMounted.current) {
        setUserFromProfile(profile);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      if (isMounted.current) {
        setUser(createFallbackUser(authUser));
      }
    }
  };

  // Restore session on mount and listen for auth changes
  useEffect(() => {
    isMounted.current = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user && isMounted.current) {
          await loadProfile(session.user);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted.current) {
          setAuthError('Failed to restore session');
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user && isMounted.current) {
        // Only load profile if user is not already set or it's a new session
        if (!user || user.id !== session.user.id) {
          await loadProfile(session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMounted.current) {
          setUser(null);
          setLanguage('en');
          setDataSavingMode(false);
          setNotificationsEnabled(true);
          setIsPrivateAccount(false);
          setAllowCommentsOnVideos(true);
          setNotifications([]);
        }
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        language,
        setLanguage,
        isAuthenticated,
        dataSavingMode,
        setDataSavingMode,
        notifications,
        setNotifications,
        notificationsEnabled,
        setNotificationsEnabled,
        isPrivateAccount,
        setIsPrivateAccount,
        allowCommentsOnVideos,
        setAllowCommentsOnVideos,
        isLoading,
        authError,
        isOnline,
        pendingActions,
        addPendingAction,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
