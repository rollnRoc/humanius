-- Multi-office / Multi-branch company locations for PDKS
CREATE TABLE IF NOT EXISTS public.company_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 200,
  address TEXT DEFAULT '',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_locations ENABLE ROW LEVEL SECURITY;

-- Allow public / authenticated access
DROP POLICY IF EXISTS "Public full access to company_locations" ON public.company_locations;
CREATE POLICY "Public full access to company_locations" ON public.company_locations FOR ALL TO public USING (true) WITH CHECK (true);
