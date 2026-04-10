-- ================================================
-- MZANSI VIDEOS - DATABASE MIGRATIONS
-- Run these in your Supabase SQL Editor
-- ================================================

-- ================================================
-- STEP 1: Create Users Profile Table
-- ================================================
-- This extends the auth.users table with profile information

CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Anyone can view user profiles" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ================================================
-- STEP 2: Update Videos Table (if exists)
-- ================================================
-- Add user_id column if it doesn't exist

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'videos' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.videos ADD COLUMN user_id UUID REFERENCES public.users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'videos' AND column_name = 'moderation_status'
  ) THEN
    ALTER TABLE public.videos ADD COLUMN moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged'));
  END IF;
END $$;

-- Enable RLS on videos table
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Anyone can view public videos" ON public.videos;
DROP POLICY IF EXISTS "Users can insert own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can update own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete own videos" ON public.videos;

CREATE POLICY "Anyone can view public videos" ON public.videos
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own videos" ON public.videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos" ON public.videos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own videos" ON public.videos
  FOR DELETE USING (auth.uid() = user_id);

-- ================================================
-- STEP 3: Create Comments Table
-- ================================================

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Policies for comments
CREATE POLICY "Anyone can view comments" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

-- ================================================
-- STEP 4: Create Saves/Bookmarks Table
-- ================================================

CREATE TABLE IF NOT EXISTS public.saves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;

-- Policies for saves
CREATE POLICY "Users can view own saves" ON public.saves
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save videos" ON public.saves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave videos" ON public.saves
  FOR DELETE USING (auth.uid() = user_id);

-- ================================================
-- STEP 5: Create Follows Table
-- ================================================

CREATE TABLE IF NOT EXISTS public.follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Policies for follows
CREATE POLICY "Anyone can view follows" ON public.follows
  FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- ================================================
-- STEP 6: Create Indexes for Performance
-- ================================================

CREATE INDEX IF NOT EXISTS idx_videos_user_id ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON public.comments(video_id);
CREATE INDEX IF NOT EXISTS idx_saves_user_id ON public.saves(user_id);
CREATE INDEX IF NOT EXISTS idx_saves_video_id ON public.saves(video_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- ================================================
-- STEP 7: Create Function to Update Follower Counts
-- ================================================

CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for the followed user
    UPDATE public.users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    -- Increment following count for the follower
    UPDATE public.users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower count for the unfollowed user
    UPDATE public.users SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
    -- Decrement following count for the unfollower
    UPDATE public.users SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for follows
DROP TRIGGER IF EXISTS on_follow_change ON public.follows;
CREATE TRIGGER on_follow_change
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION update_follower_counts();

-- ================================================
-- STEP 8: Create Function to Update Video Stats
-- ================================================

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

-- Create trigger for comments
DROP TRIGGER IF EXISTS on_comment_change ON public.comments;
CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_video_comment_count();

-- ================================================
-- STEP 9: Video View Tracking
-- ================================================

-- Fix views column type if it's text
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'videos' AND column_name = 'views' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.videos ALTER COLUMN views TYPE INTEGER USING views::integer;
    ALTER TABLE public.videos ALTER COLUMN views SET DEFAULT 0;
  END IF;
END $$;

-- Create function to increment views
CREATE OR REPLACE FUNCTION increment_video_view(v_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.videos
  SET views = views + 1
  WHERE id = v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- STEP 10: Creator Analytics RPCs
-- ================================================

-- Function to get overall creator stats
CREATE OR REPLACE FUNCTION get_creator_stats(c_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_views', COALESCE(SUM(views), 0),
    'total_likes', COALESCE(SUM(likes), 0),
    'total_comments', COALESCE(SUM(comments), 0),
    'total_shares', COALESCE(SUM(shares), 0),
    'followers', (SELECT followers_count FROM public.users WHERE id = c_id),
    'earnings', (SELECT earnings FROM public.users WHERE id = c_id)
  ) INTO result
  FROM public.videos
  WHERE user_id = c_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- STEP 11: Challenges System
-- ================================================

CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hashtag TEXT UNIQUE NOT NULL,
  description TEXT,
  prize DECIMAL(10,2) DEFAULT 0,
  thumbnail TEXT,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view challenges" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Anyone can view participants" ON public.challenge_participants FOR SELECT USING (true);
CREATE POLICY "Users can join challenges" ON public.challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ================================================
-- STEP 12: Likes and Notifications System
-- ================================================

CREATE TABLE IF NOT EXISTS public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can like" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.likes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can see likes" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users can see their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

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

-- Trigger for like notification
CREATE OR REPLACE FUNCTION handle_new_like()
RETURNS TRIGGER AS $$
DECLARE
  v_owner UUID;
BEGIN
  SELECT user_id INTO v_owner FROM public.videos WHERE id = NEW.video_id;
  IF v_owner != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, video_id)
    VALUES (v_owner, NEW.user_id, 'like', NEW.video_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_notification
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION handle_new_like();

-- ================================================
-- STEP 13: Moderation and Reporting
-- ================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports" ON public.reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_creator = true -- For now, using is_creator as a proxy for admin
    )
  );

-- Function to handle video reporting and flagging
CREATE OR REPLACE FUNCTION handle_new_report()
RETURNS TRIGGER AS $$
BEGIN
  -- If a video gets more than 3 reports, flag it automatically
  IF (SELECT COUNT(*) FROM public.reports WHERE video_id = NEW.video_id) >= 3 THEN
    UPDATE public.videos SET moderation_status = 'flagged' WHERE id = NEW.video_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_report_added
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION handle_new_report();

-- ================================================
-- STEP 14: User Blocking
-- =============================================

CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can block others" ON public.blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can view their blocks" ON public.blocks
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock" ON public.blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- ================================================
-- STEP 15: Direct Messaging
-- ================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_1 UUID REFERENCES public.users(id) ON DELETE CASCADE,
  participant_2 UUID REFERENCES public.users(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_1, participant_2)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can see their own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can insert conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can see messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = messages.conversation_id AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = messages.conversation_id AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    ) AND auth.uid() = sender_id
  );

-- Function to update last message in conversation
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message = NEW.content,
      last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- ================================================
-- DONE! Your database is now ready.
-- ================================================

-- ================================================
-- STEP 10: User Devices (for Push Notifications)
-- ================================================

CREATE TABLE IF NOT EXISTS public.user_devices (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'android', 'ios')),
  is_active BOOLEAN DEFAULT true,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view user devices" ON public.user_devices
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own device" ON public.user_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device" ON public.user_devices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own device" ON public.user_devices
  FOR DELETE USING (auth.uid() = user_id);
