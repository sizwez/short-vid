-- Run this in the Supabase SQL Editor
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- We don't need this trigger because the frontend application
-- (authService.ts) handles the profile creation safely!
