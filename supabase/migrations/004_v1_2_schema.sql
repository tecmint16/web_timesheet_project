-- ============================================================
-- Migration 004: V1.2 Schema — pdf_templates table
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. pdf_templates table
CREATE TABLE IF NOT EXISTS public.pdf_templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name  VARCHAR(255) NOT NULL,
  file_path      VARCHAR(500),   -- path in Supabase Storage bucket 'pdf-templates'
  field_mappings JSONB DEFAULT '{}'::jsonb,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- 2. updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS set_pdf_templates_updated_at ON public.pdf_templates;
CREATE TRIGGER set_pdf_templates_updated_at
  BEFORE UPDATE ON public.pdf_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. RLS
ALTER TABLE public.pdf_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to pdf_templates"
  ON public.pdf_templates FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text IN ('admin','Admin')
  ));

CREATE POLICY "Anyone can read active pdf_templates"
  ON public.pdf_templates FOR SELECT TO authenticated
  USING (is_active = true);

-- 4. Storage bucket (run separately if needed via Supabase Dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('pdf-templates', 'pdf-templates', false)
-- ON CONFLICT (id) DO NOTHING;

-- 5. Seed default template entry (optional)
INSERT INTO public.pdf_templates (template_name, field_mappings)
VALUES (
  'Template Cuti Default',
  '{
    "full_name":     {"x": 60,  "y": 680, "size": 11},
    "npp":           {"x": 320, "y": 680, "size": 11},
    "leave_type":    {"x": 60,  "y": 640, "size": 11},
    "total_days":    {"x": 320, "y": 640, "size": 11},
    "start_date":    {"x": 60,  "y": 600, "size": 11},
    "end_date":      {"x": 320, "y": 600, "size": 11},
    "address_phone": {"x": 60,  "y": 560, "size": 11},
    "description":   {"x": 60,  "y": 520, "size": 10},
    "created_at":    {"x": 380, "y": 780, "size": 9}
  }'
)
ON CONFLICT DO NOTHING;
