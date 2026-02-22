-- Add site_date to construction_sites for weekly view grouping
ALTER TABLE IF EXISTS public.construction_sites
  ADD COLUMN IF NOT EXISTS site_date date;

UPDATE public.construction_sites
SET site_date = CURRENT_DATE
WHERE site_date IS NULL;

ALTER TABLE public.construction_sites
  ALTER COLUMN site_date SET DEFAULT CURRENT_DATE;

ALTER TABLE public.construction_sites
  ALTER COLUMN site_date SET NOT NULL;
