-- ============================================================
-- THE FLUID ENTERPRISE — Initial Schema Migration
-- Run this in Supabase SQL Editor (Project > SQL Editor > New Query)
-- ============================================================

-- ============================================================
-- STEP 1: Create ENUM types
-- ============================================================

CREATE TYPE public.user_role AS ENUM ('user', 'admin');
CREATE TYPE public.shift_type AS ENUM ('Morning', 'Evening', 'Night', 'WFH');
CREATE TYPE public.attendance_status AS ENUM ('Hadir', 'Izin', 'Sakit', 'Lembur');
CREATE TYPE public.leave_type AS ENUM ('Tahunan', 'Melahirkan', 'Khusus');
CREATE TYPE public.leave_status AS ENUM ('Draft', 'Pending_Approval', 'Approved', 'Rejected');

-- ============================================================
-- STEP 2: Table profiles
-- 1-to-1 with auth.users
-- ============================================================

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  npp           VARCHAR(50) UNIQUE,
  full_name     VARCHAR(150),
  role          public.user_role NOT NULL DEFAULT 'user',
  leave_balance INT NOT NULL DEFAULT 12,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Employee identity data, 1-to-1 with auth.users';

-- ============================================================
-- STEP 3: Table master_projects
-- Reference data managed by Admin
-- ============================================================

CREATE TABLE public.master_projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name VARCHAR(200) NOT NULL,
  project_code VARCHAR(50) NOT NULL UNIQUE,
  cluster_name VARCHAR(100) NOT NULL,
  app_name     VARCHAR(150) NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE public.master_projects IS 'Project reference data for timesheet dropdowns';

-- ============================================================
-- STEP 4: Table timesheets
-- Daily work log per employee
-- ============================================================

CREATE TABLE public.timesheets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date            DATE NOT NULL,
  shift_type          public.shift_type NOT NULL DEFAULT 'Morning',
  time_in             TIME NOT NULL,
  time_out            TIME NOT NULL,
  status              public.attendance_status NOT NULL DEFAULT 'Hadir',
  project_id          UUID REFERENCES public.master_projects(id) ON DELETE SET NULL,
  activity_desc       TEXT,
  short_hours_reason  TEXT,           -- Mandatory if work hours < 8
  is_locked           BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate entries per employee per date
  UNIQUE(profile_id, log_date)
);

CREATE INDEX idx_timesheets_profile_id ON public.timesheets(profile_id);
CREATE INDEX idx_timesheets_log_date   ON public.timesheets(log_date);
CREATE INDEX idx_timesheets_is_locked  ON public.timesheets(is_locked);

COMMENT ON TABLE public.timesheets IS 'Daily attendance and activity log';
COMMENT ON COLUMN public.timesheets.short_hours_reason IS 'Required when (time_out - time_in) < 8 hours';

-- ============================================================
-- STEP 5: Table leave_requests
-- Hybrid leave workflow
-- ============================================================

CREATE TABLE public.leave_requests (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type                  public.leave_type NOT NULL,
  start_date                  DATE NOT NULL,
  end_date                    DATE NOT NULL,
  total_days                  INT NOT NULL,
  address_phone_during_leave  VARCHAR(300) NOT NULL,
  description                 TEXT,
  pdf_generated_url           VARCHAR(500),    -- URL of system-generated PDF
  signed_scan_url             VARCHAR(500),    -- Supabase Storage path for signed scan
  status                      public.leave_status NOT NULL DEFAULT 'Draft',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT positive_days    CHECK (total_days > 0)
);

CREATE INDEX idx_leave_requests_profile_id ON public.leave_requests(profile_id);
CREATE INDEX idx_leave_requests_status     ON public.leave_requests(status);
CREATE INDEX idx_leave_requests_created_at ON public.leave_requests(created_at DESC);

COMMENT ON TABLE public.leave_requests IS 'Hybrid leave workflow: digital form → PDF generate → signed scan upload';

-- ============================================================
-- STEP 6: PostgreSQL Trigger
-- Auto-create profiles row when new auth.user is created
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'user')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 7: Row Level Security (RLS) Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests  ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- Helper function: get current user's role
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = auth.uid()
$$;

-- ----------------------------------------------------------------
-- PROFILES policies
-- ----------------------------------------------------------------

-- Users can view their own profile
CREATE POLICY "profiles: user can view own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile (limited fields via app logic)
CREATE POLICY "profiles: user can update own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin can view all profiles
CREATE POLICY "profiles: admin can view all"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'admin');

-- Admin can update all profiles
CREATE POLICY "profiles: admin can update all"
  ON public.profiles FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- Admin can insert profiles (manual creation)
CREATE POLICY "profiles: admin can insert"
  ON public.profiles FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

-- ----------------------------------------------------------------
-- MASTER_PROJECTS policies
-- ----------------------------------------------------------------

-- All authenticated users can read active projects (for dropdown)
CREATE POLICY "master_projects: authenticated can select"
  ON public.master_projects FOR SELECT
  TO authenticated
  USING (true);

-- Only admin can insert/update/delete
CREATE POLICY "master_projects: admin can insert"
  ON public.master_projects FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "master_projects: admin can update"
  ON public.master_projects FOR UPDATE
  USING (public.get_my_role() = 'admin');

CREATE POLICY "master_projects: admin can delete"
  ON public.master_projects FOR DELETE
  USING (public.get_my_role() = 'admin');

-- ----------------------------------------------------------------
-- TIMESHEETS policies
-- ----------------------------------------------------------------

-- User can view their own timesheets
CREATE POLICY "timesheets: user can select own"
  ON public.timesheets FOR SELECT
  USING (profile_id = auth.uid());

-- User can insert their own timesheets
CREATE POLICY "timesheets: user can insert own"
  ON public.timesheets FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- User can update their own UNLOCKED timesheets
CREATE POLICY "timesheets: user can update own unlocked"
  ON public.timesheets FOR UPDATE
  USING (profile_id = auth.uid() AND is_locked = false)
  WITH CHECK (profile_id = auth.uid());

-- User can delete their own UNLOCKED timesheets
CREATE POLICY "timesheets: user can delete own unlocked"
  ON public.timesheets FOR DELETE
  USING (profile_id = auth.uid() AND is_locked = false);

-- Admin can view all timesheets
CREATE POLICY "timesheets: admin can select all"
  ON public.timesheets FOR SELECT
  USING (public.get_my_role() = 'admin');

-- Admin can update all timesheets (e.g., lock for monthly recap)
CREATE POLICY "timesheets: admin can update all"
  ON public.timesheets FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- ----------------------------------------------------------------
-- LEAVE_REQUESTS policies
-- ----------------------------------------------------------------

-- User can view their own leave requests
CREATE POLICY "leave_requests: user can select own"
  ON public.leave_requests FOR SELECT
  USING (profile_id = auth.uid());

-- User can insert their own leave requests
CREATE POLICY "leave_requests: user can insert own"
  ON public.leave_requests FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- User can update their own DRAFT/pending leave requests
CREATE POLICY "leave_requests: user can update own draft"
  ON public.leave_requests FOR UPDATE
  USING (profile_id = auth.uid() AND status IN ('Draft', 'Pending_Approval'))
  WITH CHECK (profile_id = auth.uid());

-- Admin can view all leave requests
CREATE POLICY "leave_requests: admin can select all"
  ON public.leave_requests FOR SELECT
  USING (public.get_my_role() = 'admin');

-- Admin can update all leave requests (approve/reject)
CREATE POLICY "leave_requests: admin can update all"
  ON public.leave_requests FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- ============================================================
-- STEP 8: Storage Buckets setup (run via Supabase Dashboard or CLI)
-- Dashboard: Storage > New Bucket
-- ============================================================

-- Bucket: leave-scans (private, max 5MB)
-- Run via Supabase Dashboard: Storage > Create bucket > "leave-scans" (private)
-- Or via CLI: supabase storage create leave-scans

-- Bucket: pdf-templates (private)
-- Run via Supabase Dashboard: Storage > Create bucket > "pdf-templates" (private)

-- ============================================================
-- STEP 9: Storage RLS policies (via Supabase Dashboard)
-- ============================================================

-- leave-scans: user can upload to their own folder
-- Policy name: "leave_scans: user upload own"
-- Allowed operations: INSERT
-- Expression: auth.uid()::text = (storage.foldername(name))[1]

-- leave-scans: user can view their own files
-- Policy name: "leave_scans: user view own"
-- Allowed operations: SELECT
-- Expression: auth.uid()::text = (storage.foldername(name))[1]

-- leave-scans: admin can view all
-- Policy name: "leave_scans: admin view all"
-- Allowed operations: SELECT
-- Expression: (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
