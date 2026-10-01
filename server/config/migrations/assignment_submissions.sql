-- Run once in the SAME Supabase project used by the backend.
-- Safe to rerun. Existing assignments/users are preserved.
BEGIN;

ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 4194304),
  storage_public_id TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT assignment_submissions_once UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON public.assignment_submissions(student_id);

-- Custom app JWTs are verified by Express. Browser/anon clients must never
-- access this table directly or through the app's public realtime channel.
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assignment_submissions FROM anon, authenticated;
GRANT SELECT, INSERT ON public.assignment_submissions TO service_role;
REVOKE UPDATE, DELETE ON public.assignment_submissions FROM service_role;

CREATE OR REPLACE FUNCTION public.guard_assignment_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  assignment_row public.assignments%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Already submitted. A submission cannot be replaced.';
  END IF;

  SELECT * INTO assignment_row FROM public.assignments WHERE id = NEW.assignment_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Assignment not found.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.student_id AND role = 'student') THEN
    RAISE EXCEPTION 'Only students can submit assignments.';
  END IF;
  IF assignment_row.group_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.group_members WHERE group_id = assignment_row.group_id AND student_id = NEW.student_id
  ) THEN
    RAISE EXCEPTION 'You are not a member of this group.';
  END IF;
  NEW.submitted_at := clock_timestamp();
  IF assignment_row.due_date IS NOT NULL AND NEW.submitted_at >= assignment_row.due_date THEN
    RAISE EXCEPTION 'Submission closed: the deadline has passed.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_assignment_submission ON public.assignment_submissions;
CREATE TRIGGER guard_assignment_submission
BEFORE INSERT OR UPDATE ON public.assignment_submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_assignment_submission();

NOTIFY pgrst, 'reload schema';
COMMIT;
