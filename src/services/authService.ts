import { supabase } from '../lib/supabase';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  is_creator: boolean;
  verified_badge: boolean;
  subscription: 'free' | 'premium' | 'creator-boost';
  earnings: number;
  language: string;
  notifications_enabled: boolean;
  data_saving_mode: boolean;
  is_private_account: boolean;
  allow_comments_on_videos: boolean;
  created_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  username: string;
  displayName: string;
  phone?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

/**
 * Sign up a new user with email and password
 */
export const signUp = async (data: SignUpData) => {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        username: data.username,
        display_name: data.displayName,
      }
    }
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Failed to create user');

  // 2. Create user profile in public.users table
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      username: data.username.replace('@', ''),
      display_name: data.displayName,
      bio: 'New to Mzansi Videos',
      language: 'en',
      email: data.email,
      followers_count: 0,
      following_count: 0,
      is_creator: false,
      verified_badge: false,
      subscription: 'free',
      earnings: 0,
      notifications_enabled: true,
      data_saving_mode: false,
      is_private_account: false,
      allow_comments_on_videos: true,
      account_status: 'active',
    });

  if (profileError) {
    console.error('Profile creation error:', profileError);
    // Don't throw - auth user was created successfully
  }

  return authData;
};

/**
 * Sign in an existing user with email and password
 */
export const signIn = async (data: SignInData) => {
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) throw error;
  return authData;
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Resend confirmation email
 */
export const resendConfirmationEmail = async (email: string) => {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
  });
  if (error) throw error;
  return true;
};

/**
 * Reset password - sends reset email
 */
export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/onboarding/auth?reset=true`,
  });
  if (error) throw error;
  return true;
};

/**
 * Update password (when user has reset token)
 */
export const updatePassword = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
  return true;
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

/**
 * Get user profile from public.users table
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('Profile fetch timed out');
    } else {
      console.error('Error fetching profile:', err);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

/**
 * Get current session
 */
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/app`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error) throw error;
  return data;
};

/**
 * Sign in with Apple OAuth
 */
export const signInWithApple = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${window.location.origin}/app`,
    },
  });
  if (error) throw error;
  return data;
};

/**
 * Handle OAuth callback - create user profile if needed
 */
export const handleOAuthCallback = async (userId: string) => {
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (!existingUser) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const username = `user_${userId.slice(0, 8)}`;
      await supabase.from('users').insert({
        id: userId,
        username,
        display_name: user.user_metadata?.full_name || username,
        bio: 'New to Mzansi Videos',
        language: 'en',
        email: user.email,
        followers_count: 0,
        following_count: 0,
        is_creator: false,
        verified_badge: false,
        subscription: 'free',
        earnings: 0,
        notifications_enabled: true,
        data_saving_mode: false,
        is_private_account: false,
        allow_comments_on_videos: true,
        account_status: 'active',
        avatar_url: user.user_metadata?.avatar_url || null,
      });
    }
  }
  return true;
};
