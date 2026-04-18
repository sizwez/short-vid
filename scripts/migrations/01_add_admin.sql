-- Migration: Add is_admin column to users table
-- Run this in the Supabase SQL Editor

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Update RLS policies to allow admins to see everything in certain tables if needed
-- (Optional: add admin-specific policies here)
