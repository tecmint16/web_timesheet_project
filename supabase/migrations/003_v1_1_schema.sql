-- ============================================================
-- Migration 003: V1.1 — Normalized Master Data & Profile Update
-- Run in: Supabase Dashboard → SQL Editor
-- WARNING: This replaces master_projects with 3 normalized tables.
--          Back up data before running if you have existing data.
-- ============================================================

-- ─────────────────────────────────────────
-- 1. NEW MASTER TABLES
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code VARCHAR(50) NOT NULL UNIQUE,
  project_name VARCHAR(200) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clusters (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  cluster_name VARCHAR(200) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.applications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id   UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  app_code     VARCHAR(50) NOT NULL UNIQUE,
  app_name     VARCHAR(200) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────
-- 2. UPDATE profiles TABLE
-- ─────────────────────────────────────────

-- Add new columns (safe: does nothing if already exists)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number        VARCHAR(30),
  ADD COLUMN IF NOT EXISTS address             TEXT,
  ADD COLUMN IF NOT EXISTS project_id          UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cluster_id          UUID REFERENCES public.clusters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT true;

-- Update role enum to include PM/Staff (extend without breaking)
-- Note: Supabase uses TEXT-based enums. If role is already an enum type,
-- run: ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'PM';
--      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Staff';
-- If role is stored as varchar, no change needed.
-- For safety, let's just ensure the check works with existing data:
DO $$
BEGIN
  -- Attempt to add enum values if user_role type exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    BEGIN ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'PM';    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Staff';  EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- ─────────────────────────────────────────
-- 3. JUNCTION TABLE: profile_applications
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profile_applications (
  profile_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, application_id)
);

-- ─────────────────────────────────────────
-- 4. UPDATE timesheets TABLE
-- ─────────────────────────────────────────

-- Remove old project_id foreign key from timesheets (no longer needed)
ALTER TABLE public.timesheets
  DROP COLUMN IF EXISTS project_id,
  DROP COLUMN IF EXISTS short_hours_reason;

-- Add short_hours_reason back as nullable (still needed for soft warning)
ALTER TABLE public.timesheets
  ADD COLUMN IF NOT EXISTS short_hours_reason TEXT;

-- ─────────────────────────────────────────
-- 5. JUNCTION TABLE: timesheet_applications
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.timesheet_applications (
  timesheet_id   UUID NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  PRIMARY KEY (timesheet_id, application_id)
);

-- ─────────────────────────────────────────
-- 6. DROP OLD master_projects (if exists)
-- ─────────────────────────────────────────

-- Only drop if you had old data — this is safe after migration
DROP TABLE IF EXISTS public.master_projects CASCADE;

-- ─────────────────────────────────────────
-- 7. ENABLE RLS ON NEW TABLES
-- ─────────────────────────────────────────

ALTER TABLE public.projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clusters             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_applications ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated users (all master data)
CREATE POLICY "Authenticated can read projects"
  ON public.projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read clusters"
  ON public.clusters FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read applications"
  ON public.applications FOR SELECT TO authenticated USING (true);

-- Admin full CRUD on master data
CREATE POLICY "Admin full access to projects"
  ON public.projects FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin','Admin')));

CREATE POLICY "Admin full access to clusters"
  ON public.clusters FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin','Admin')));

CREATE POLICY "Admin full access to applications"
  ON public.applications FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin','Admin')));

-- profile_applications: admin full access, user reads own
CREATE POLICY "Users read own profile_applications"
  ON public.profile_applications FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Admin full access to profile_applications"
  ON public.profile_applications FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin','Admin')));

-- timesheet_applications: own data
CREATE POLICY "Users manage own timesheet_applications"
  ON public.timesheet_applications FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.timesheets
      WHERE id = timesheet_id AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Admin read all timesheet_applications"
  ON public.timesheet_applications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin','Admin')));

-- ─────────────────────────────────────────
-- 8. UPDATE TRIGGER for new users
--    Set must_change_password = true by default
-- ─────────────────────────────────────────

-- Update the existing trigger function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, leave_balance, must_change_password)
  VALUES (
    NEW.id,
    'user',
    12,
    true  -- force password change on first login
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
