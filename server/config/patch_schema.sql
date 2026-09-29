-- ==========================================================
-- CampusSphere - Supabase PostgreSQL Schema Sync / Migration
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/iqyqmkmkddxlhcfzxuya/sql
-- ==========================================================

-- 1. Add user profile fields used by signup and teacher availability
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stream VARCHAR(255),
  ADD COLUMN IF NOT EXISTS availability JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Add missing columns to assignments table
ALTER TABLE public.assignments 
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_assignments_group ON public.assignments(group_id);

-- 3. Add sender_role column to messages table
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS sender_role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (sender_role IN ('student', 'teacher'));

-- 4. Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_group ON public.announcements(group_id);

-- 5. Enable Supabase Realtime for announcements
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Persist OTP state across Vercel serverless function instances
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  email VARCHAR(255) PRIMARY KEY,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_sent_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Persist verified signup data across Vercel serverless function instances
CREATE TABLE IF NOT EXISTS public.verified_signup_verifications (
  email VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  stream VARCHAR(255),
  availability JSONB NOT NULL DEFAULT '[]'::jsonb,
  role VARCHAR(50) NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Refresh PostgREST after applying the schema changes
NOTIFY pgrst, 'reload schema';
