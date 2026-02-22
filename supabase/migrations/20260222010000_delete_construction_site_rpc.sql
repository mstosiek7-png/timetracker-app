-- Delete construction site with related records using a security definer function
CREATE OR REPLACE FUNCTION public.delete_construction_site(p_site_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted boolean;
BEGIN
  DELETE FROM public.deliveries WHERE site_id = p_site_id;
  DELETE FROM public.asphalt_types WHERE site_id = p_site_id;
  DELETE FROM public.construction_sites WHERE id = p_site_id;
  deleted := FOUND;
  RETURN deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_construction_site(uuid) TO anon, authenticated;
