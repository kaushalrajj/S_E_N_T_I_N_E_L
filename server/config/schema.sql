-- ==========================================================
-- CampusSphere - Supabase PostgreSQL Database Schema
-- Complete Table Definitions, Foreign Keys & Row Level Security
-- ==========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    department VARCHAR(255),
    stream VARCHAR(255),
    availability JSONB NOT NULL DEFAULT '[]'::jsonb,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. COMPLAINTS / ADMIN-ASSIGNED TASKS TABLE
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'resolved')),
    assigned_teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. GROUPS TABLE (Managed by teachers)
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    group_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, student_id)
);

-- 5. ASSIGNMENTS TABLE (Created by teachers, scoped to groups, visible to group members)
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    file_url TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ANNOUNCEMENTS TABLE (Posted by teachers to groups)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. MARKS TABLE (Assigned by teachers to students)
CREATE TABLE IF NOT EXISTS public.marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    marks NUMERIC(5,2) NOT NULL,
    teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. MESSAGES TABLE (Bidirectional Student <-> Teacher communication)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    sender_role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (sender_role IN ('student', 'teacher')),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_dept ON public.users(department);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_student ON public.complaints(student_id);
CREATE INDEX IF NOT EXISTS idx_complaints_teacher ON public.complaints(assigned_teacher_id);
CREATE INDEX IF NOT EXISTS idx_groups_teacher ON public.groups(teacher_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_student ON public.group_members(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON public.assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_group ON public.assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_announcements_group ON public.announcements(group_id);
CREATE INDEX IF NOT EXISTS idx_marks_student ON public.marks(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_student ON public.messages(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_teacher ON public.messages(teacher_id);

-- Enable Realtime publication for Supabase
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.marks;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
  END IF;
END $$;

-- 9. INITIAL SEED DATA (Demo Accounts - password is "password123")
INSERT INTO public.users (id, name, email, role, department, password_hash)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Sarah Connor (Admin)', 'admin@admin.org', 'admin', 'Campus Administration', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe'),
  ('c0000000-0000-0000-0000-000000000002', 'Prof. Alan Turing', 'alan.turing@heritageit.edu.in', 'teacher', 'Computer Science', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe'),
  ('c0000000-0000-0000-0000-000000000003', 'Dr. Grace Hopper', 'grace.hopper@heritageit.edu.in', 'teacher', 'Software Engineering', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe'),
  ('c0000000-0000-0000-0000-000000000004', 'Dr. Nikola Tesla', 'nikola.tesla@heritageit.edu.in', 'teacher', 'Electrical Engineering', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe'),
  ('c0000000-0000-0000-0000-000000000005', 'Prof. Ada Lovelace', 'ada.lovelace@heritageit.edu.in', 'teacher', 'Mathematics', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe'),
  ('c0000000-0000-0000-0000-000000000006', 'Dr. Richard Feynman', 'richard.feynman@heritageit.edu.in', 'teacher', 'Physics', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe'),
  ('c0000000-0000-0000-0000-000000000007', 'Alex Johnson', 'alex.johnson@gmail.com', 'student', 'Computer Science', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe'),
  ('c0000000-0000-0000-0000-000000000008', 'Maya Patel', 'maya.patel@gmail.com', 'student', 'Software Engineering', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe'),
  ('c0000000-0000-0000-0000-000000000009', 'David Kim', 'david.kim@gmail.com', 'student', 'Computer Science', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe'),
  ('c0000000-0000-0000-0000-000000000010', 'Priya Sharma', 'priya.sharma@gmail.com', 'student', 'Electrical Engineering', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe'),
  ('c0000000-0000-0000-0000-000000000011', 'James Wilson', 'james.wilson@gmail.com', 'student', 'Mathematics', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe'),
  ('c0000000-0000-0000-0000-000000000012', 'Sofia Rodriguez', 'sofia.rodriguez@gmail.com', 'student', 'Physics', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe'),
  ('c0000000-0000-0000-0000-000000000013', 'Liam Chen', 'liam.chen@gmail.com', 'student', 'Computer Science', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe'),
  ('c0000000-0000-0000-0000-000000000014', 'Aisha Khan', 'aisha.khan@gmail.com', 'student', 'Software Engineering', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe')
ON CONFLICT (email) DO NOTHING;
