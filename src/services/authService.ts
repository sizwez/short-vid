import { supabase } from '../lib/supabase';
import { captureError } from '../lib/monitoring';

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
  language?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

/**
 * Sign up a new user with Supabase Auth
 */
export const signUp = async (data: SignUpData) => {
  // 1. Sign up with Supabase Auth
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        username: data.username.replace('@', ''),
        display_name: data.displayName,
      }
    }
  });

  if (signUpError) throw signUpError;
  if (!authData.user) throw new Error('Sign up failed: No user returned');

  // 2. Profile is automatically created via DB trigger if you set it up,
  // but here we'll do it manually to ensure consistency with existing code
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      username: data.username.replace('@', ''),
      display_name: data.displayName,
      email: data.email,
      bio: 'New to Mzansi Videos',
      language: data.language || 'en',
    });

  if (profileError) {
    console.error('Profile creation error during signup:', profileError);
    captureError(profileError instanceof Error ? profileError : new Error(String(profileError)), { 
      context: 'signup_profile_creation',
      userId: authData.user.id 
    });
  }

  return { user: authData.user, session: authData.session };
};

/**
 * Sign in an existing user with Supabase
 */
export const signIn = async (data: SignInData) => {
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) throw error;
  return { user: authData.user, session: authData.session };
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
    email,
  });
  if (error) throw error;
  return true;
};

/**
 * Reset password - sends reset email
 */
export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
  return true;
};

/**
 * Update password
 */
export const updatePassword = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });
  if (error) throw error;
  return true;
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

/**
 * Get user profile from public.users table (Supabase)
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // PGRST116 is 'no rows found'
        console.error('Error fetching profile:', error);
      }
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching profile:', err);
    return null;
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
 * Subscribe to auth state changes using Supabase
 */
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  
  return () => subscription.unsubscribe();
};

/**
 * Get current session helper
 */
export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

/**
 * Sign in with Google OAuth (Supabase)
 */
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
  return data;
};

/**
 * Sign in with Apple OAuth (Supabase)
 */
export const signInWithApple = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
  return data;
};

/**
 * Handle OAuth callback - create user profile if needed
 */
export const handleOAuthCallback = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (!existingUser) {
    const username = user.user_metadata?.username || `user_${user.id.slice(0, 8)}`;
    const display_name = user.user_metadata?.display_name || username;

    await supabase.from('users').insert({
      id: user.id,
      username,
      display_name,
      email: user.email,
      bio: 'New to Mzansi Videos',
      avatar_url: user.user_metadata?.avatar_url || null,
    });
  }
  return true;
};
