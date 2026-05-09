-- ============================================================
-- Migration 002: Supabase Storage Buckets & RLS Policies
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Create Storage bucket for leave scans/PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'leave-scans',
  'leave-scans',
  true,        -- public so generated PDF URLs work without signed URLs
  5242880,     -- 5MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;


-- 2. Storage RLS: Users can upload to their own folder
CREATE POLICY "Users can upload their own leave scans"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'leave-scans'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Storage RLS: Users can view their own files; Admins can view all
CREATE POLICY "Users can view their own leave scans"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'leave-scans'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- 4. Storage RLS: Users can update/overwrite their own files
CREATE POLICY "Users can update their own leave scans"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'leave-scans'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Storage RLS: Users can delete their own files
CREATE POLICY "Users can delete their own leave scans"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'leave-scans'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- ============================================================
-- Optional: Helper function for notify-admin Edge Function trigger
-- Uncomment and run after deploying the Edge Function
-- ============================================================

-- STEP 1: Enable HTTP extension (run once)
-- CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- STEP 2: Create the trigger function
-- CREATE OR REPLACE FUNCTION notify_admin_on_leave_pending()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF NEW.status = 'Pending_Approval' AND (OLD.status IS NULL OR OLD.status != 'Pending_Approval') THEN
--     PERFORM extensions.http_post(
--       url := current_setting('app.supabase_url') || '/functions/v1/notify-admin',
--       body := json_build_object(
--         'leaveId', NEW.id,
--         'profileId', NEW.profile_id
--       )::text,
--       headers := json_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || current_setting('app.anon_key')
--       )::text
--     );
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Attach trigger to leave_requests
-- DROP TRIGGER IF EXISTS on_leave_pending ON public.leave_requests;
-- CREATE TRIGGER on_leave_pending
--   AFTER INSERT OR UPDATE OF status ON public.leave_requests
--   FOR EACH ROW EXECUTE FUNCTION notify_admin_on_leave_pending();

-- STEP 4: Set app settings (run in Supabase SQL editor with your values)
-- ALTER DATABASE postgres SET app.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
-- ALTER DATABASE postgres SET app.anon_key = 'YOUR_ANON_KEY';
