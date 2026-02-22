-- Tabele używane w aplikacji TimeTracker
-- Kontekst dla Claude — nie uruchamiać

CREATE TABLE public.construction_sites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  status text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active','completed'])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT construction_sites_pkey PRIMARY KEY (id)
);

CREATE TABLE public.asphalt_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT asphalt_types_pkey PRIMARY KEY (id),
  CONSTRAINT asphalt_types_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.construction_sites(id)
);

CREATE TABLE public.deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL,
  asphalt_type_id uuid,
  tons numeric NOT NULL CHECK (tons > 0),
  lieferschein_nr text,
  supplier text,
  delivery_time timestamp with time zone DEFAULT now(),
  photo_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT deliveries_pkey PRIMARY KEY (id),
  CONSTRAINT deliveries_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.construction_sites(id),
  CONSTRAINT deliveries_asphalt_type_id_fkey FOREIGN KEY (asphalt_type_id) REFERENCES public.asphalt_types(id)
);

CREATE TABLE public.employees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  position character varying NOT NULL,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT employees_pkey PRIMARY KEY (id)
);

CREATE TABLE public.time_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  date date NOT NULL,
  hours numeric NOT NULL CHECK (hours >= 0 AND hours <= 24),
  status character varying NOT NULL CHECK (status = ANY (ARRAY['work','sick','vacation','fza'])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT time_entries_pkey PRIMARY KEY (id),
  CONSTRAINT time_entries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id)
);
