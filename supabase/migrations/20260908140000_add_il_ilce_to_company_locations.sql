-- Add il (province) and ilce (district) columns to company_locations table
ALTER TABLE public.company_locations 
ADD COLUMN IF NOT EXISTS il TEXT DEFAULT NULL;

ALTER TABLE public.company_locations 
ADD COLUMN IF NOT EXISTS ilce TEXT DEFAULT NULL;

COMMENT ON COLUMN public.company_locations.il IS 'Ofis / Şubenin bulunduğu il';
COMMENT ON COLUMN public.company_locations.ilce IS 'Ofis / Şubenin bulunduğu ilçe';
