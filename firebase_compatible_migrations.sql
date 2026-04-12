-- ================================================
-- MZANSI VIDEOS - FIREBASE COMPATIBLE MIGRATIONS
-- Run these in your Supabase SQL Editor
-- This version is designed to work with Firebase Auth
-- ================================================

-- DROP existing tables if you want to start fresh
DROP TABLE IF EXISTS public.user_devices CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.blocks CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.likes CASCADE;
DROP TABLE IF EXISTS public.challenge_participants CASCADE;
DROP TABLE IF EXISTS public.challenges CASCADE;
DROP TABLE IF EXISTS public.follows CASCADE;
DROP TABLE IF EXISTS public.saves CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.videos CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ================================================
-- STEP 1: Create Users Profile Table (Firebase Compatible)
-- ================================================

CREATE TABLE public.users (
  id TEXT PRIMARY KEY, -- Firebase UID (Text instead of UUID for flexibility)
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  is_creator BOOLEAN DEFAULT false,
  verified_badge BOOLEAN DEFAULT false,
  subscription TEXT DEFAULT 'free' CHECK (subscription IN ('free', 'premium', 'creator-boost')),
  earnings DECIMAL(10,2) DEFAULT 0,
  language TEXT DEFAULT 'en',
  notifications_enabled BOOLEAN DEFAULT true,
  data_saving_mode BOOLEAN DEFAULT false,
  is_private_account BOOLEAN DEFAULT false,
  allow_comments_on_videos BOOLEAN DEFAULT true,
  account_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- STEP 2: Create Videos Table
-- ================================================

CREATE TABLE public.videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  url TEXT NOT NULL,
  thumbnail TEXT,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- STEP 3: Create Comments Table
-- ================================================

CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- STEP 4: Create Saves Table
-- ================================================

CREATE TABLE public.saves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- ================================================
-- STEP 5: Create Follows Table
-- ================================================

CREATE TABLE public.follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id TEXT REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  following_id TEXT REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- ================================================
-- STEP 6: Create Likes Table
-- ================================================

CREATE TABLE public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- ================================================
-- STEP 7: Create Notifications Table
-- ================================================

CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  actor_id TEXT REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- STEP 8: Create Challenges Tables
-- ================================================

CREATE TABLE public.challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hashtag TEXT UNIQUE NOT NULL,
  description TEXT,
  prize DECIMAL(10,2) DEFAULT 0,
  thumbnail TEXT,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT REFERENCES public.users(id)
);

CREATE TABLE public.challenge_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- ================================================
-- STEP 9: User Devices Table
-- ================================================

CREATE TABLE public.user_devices (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'android', 'ios')),
  is_active BOOLEAN DEFAULT true,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- ================================================
-- STEP 10: Messaging System
-- ================================================

CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_1 TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  participant_2 TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_1, participant_2)
);

CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- STEP 11: Security (RLS)
-- NOTE: Since we use Firebase, we will start with 
-- permissive rules for authenticated anon users
-- ================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Simple Permissive Policies (Important: Adjust for production)
CREATE POLICY "Public read access" ON public.users FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.users FOR UPDATE USING (true);

CREATE POLICY "Public video read" ON public.videos FOR SELECT USING (true);
CREATE POLICY "Authenticated video insert" ON public.videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Personal video update" ON public.videos FOR UPDATE USING (true);

CREATE POLICY "Public comment read" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated comment insert" ON public.comments FOR INSERT WITH CHECK (true);

CREATE POLICY "Public like read" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Authenticated like insert" ON public.likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated like delete" ON public.likes FOR DELETE USING (true);

CREATE POLICY "Authenticated follow insert" ON public.follows FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated follow read" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Authenticated follow delete" ON public.follows FOR DELETE USING (true);

CREATE POLICY "User notification read" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "User notification update" ON public.notifications FOR UPDATE USING (true);

CREATE POLICY "User device sync" ON public.user_devices FOR ALL USING (true);

CREATE POLICY "Conversation access" ON public.conversations FOR SELECT USING (true);
CREATE POLICY "Message access" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Message send" ON public.messages FOR INSERT WITH CHECK (true);

-- ================================================
-- STEP 12: Automated Counts (Triggers)
-- ================================================

-- Trigger to update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE public.users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
    UPDATE public.users SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_change
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION update_follower_counts();

-- Trigger to update video likes count
CREATE OR REPLACE FUNCTION update_video_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET likes = likes + 1 WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos SET likes = GREATEST(0, likes - 1) WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION update_video_likes_count();

-- Trigger to update video comment count
CREATE OR REPLACE FUNCTION update_video_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET comments = comments + 1 WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos SET comments = GREATEST(0, comments - 1) WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_video_comment_count();

-- ================================================
-- DONE! Your Firebase-compatible database is ready.
-- ================================================
