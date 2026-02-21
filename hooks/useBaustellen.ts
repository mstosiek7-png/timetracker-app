// ============================================================
// useBaustellen — construction sites + deliveries
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

// ─── Types ───────────────────────────────────────────────────
export interface DeliveryItem {
  id: string;
  siteId: string;
  asphaltClass: string;
  tons: number;
  waybill?: string;
  supplier?: string;
  photoUri?: string;
  date: string;
  time: string;
}

export interface AsphaltSummaryRow {
  class: string;
  count: number;
  tons: number;
}

export interface Site {
  id: string;
  name: string;
  address?: string;
  active: boolean;
  totalTons: number;
  deliveryCount: number;
  asphaltClasses: string[];
  deliveries: DeliveryItem[];
  asphaltSummary: AsphaltSummaryRow[];
}

// ─── Fetch ───────────────────────────────────────────────────
async function fetchSites(): Promise<Site[]> {
  const { data: sitesRaw, error: sitesError } = await supabase
    .from('construction_sites')
    .select('id, name, address, status')
    .order('created_at', { ascending: false });

  if (sitesError) throw new Error(sitesError.message);

  const { data: asphaltTypes, error: atError } = await supabase
    .from('asphalt_types')
    .select('id, site_id, name');

  if (atError) throw new Error(atError.message);

  const { data: deliveries, error: delError } = await supabase
    .from('deliveries')
    .select('id, site_id, asphalt_type_id, tons, lieferschein_nr, supplier, photo_url, delivery_time')
    .order('delivery_time', { ascending: false });

  if (delError) throw new Error(delError.message);

  const atMap: Record<string, string> = {};
  (asphaltTypes ?? []).forEach(at => { atMap[at.id] = at.name; });

  return (sitesRaw ?? []).map(site => {
    const siteDeliveries = (deliveries ?? []).filter(d => d.site_id === site.id);

    const deliveryItems: DeliveryItem[] = siteDeliveries.map(d => {
      const dt = d.delivery_time ? new Date(d.delivery_time) : new Date();
      return {
        id: d.id,
        siteId: d.site_id,
        asphaltClass: d.asphalt_type_id ? (atMap[d.asphalt_type_id] ?? '') : '',
        tons: Number(d.tons),
        waybill: d.lieferschein_nr ?? undefined,
        supplier: d.supplier ?? undefined,
        photoUri: d.photo_url ?? undefined,
        date: dt.toISOString().split('T')[0],
        time: dt.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      };
    });

    const totalTons = deliveryItems.reduce((s, d) => s + d.tons, 0);
    const classSet = new Set(deliveryItems.map(d => d.asphaltClass).filter(Boolean));
    const asphaltClasses = [...classSet];

    const summaryMap: Record<string, { count: number; tons: number }> = {};
    deliveryItems.forEach(d => {
      const cls = d.asphaltClass || 'Nieznana';
      if (!summaryMap[cls]) summaryMap[cls] = { count: 0, tons: 0 };
      summaryMap[cls].count++;
      summaryMap[cls].tons += d.tons;
    });
    const asphaltSummary: AsphaltSummaryRow[] = Object.entries(summaryMap).map(([cls, v]) => ({
      class: cls, count: v.count, tons: v.tons,
    }));

    return {
      id: site.id,
      name: site.name,
      address: site.address ?? undefined,
      active: site.status === 'active',
      totalTons,
      deliveryCount: siteDeliveries.length,
      asphaltClasses,
      deliveries: deliveryItems,
      asphaltSummary,
    };
  });
}

// ─── Hook ────────────────────────────────────────────────────
export function useBaustellen() {
  const queryClient = useQueryClient();

  const { data: sites = [], isLoading, refetch } = useQuery({
    queryKey: ['baustellen'],
    queryFn: fetchSites,
    staleTime: 2 * 60 * 1000,
  });

  const totalTons = sites.reduce((s, site) => s + site.totalTons, 0);

  function getSite(id: string): Site | undefined {
    return sites.find(s => s.id === id);
  }

  // ─── Add delivery ─────────────────────────────────────────
  const addDeliveryMutation = useMutation({
    mutationFn: async (payload: {
      siteId: string;
      asphaltClass: string;
      tons: number;
      waybill?: string;
      supplier?: string;
      photoUri?: string;
      date: string;
      time: string;
    }) => {
      // Find or create asphalt type
      let asphaltTypeId: string | null = null;
      if (payload.asphaltClass) {
        const { data: existing } = await supabase
          .from('asphalt_types')
          .select('id')
          .eq('site_id', payload.siteId)
          .eq('name', payload.asphaltClass)
          .single();

        if (existing) {
          asphaltTypeId = existing.id;
        } else {
          const { data: created, error } = await supabase
            .from('asphalt_types')
            .insert({ site_id: payload.siteId, name: payload.asphaltClass })
            .select('id')
            .single();
          if (error) throw error;
          asphaltTypeId = created?.id ?? null;
        }
      }

      const deliveryTime = new Date(`${payload.date}T${payload.time}:00`).toISOString();
      const { error } = await supabase.from('deliveries').insert({
        site_id: payload.siteId,
        asphalt_type_id: asphaltTypeId,
        tons: payload.tons,
        lieferschein_nr: payload.waybill ?? null,
        supplier: payload.supplier ?? null,
        photo_url: payload.photoUri ?? null,
        delivery_time: deliveryTime,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['baustellen'] });
      queryClient.invalidateQueries({ queryKey: ['construction-sites'] });
      queryClient.invalidateQueries({ queryKey: ['site-deliveries', variables.siteId] });
      queryClient.invalidateQueries({ queryKey: ['site-summary', variables.siteId] });
      queryClient.invalidateQueries({ queryKey: ['construction-site', variables.siteId] });
      queryClient.invalidateQueries({ queryKey: ['site-statistics'] });
    },
  });

  // ─── Create site ──────────────────────────────────────────
  const createSiteMutation = useMutation({
    mutationFn: async (payload: { name: string; address?: string }) => {
      const { error } = await supabase
        .from('construction_sites')
        .insert({ name: payload.name, address: payload.address ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baustellen'] });
      queryClient.invalidateQueries({ queryKey: ['construction-sites'] });
    },
  });

  // ─── Delete site ──────────────────────────────────────────
  const deleteSiteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting site:', id);
      const { error } = await supabase
        .from('construction_sites')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      console.log('Delete successful');
      return id; // Return ID for onSuccess
    },
    onSuccess: (id: string) => {
      console.log('Delete mutation success, removing from cache:', id);
      // Remove from cache immediately
      queryClient.setQueryData(['baustellen'], (oldData: Site[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter(s => s.id !== id);
      });
    },
  });

  return {
    sites,
    totalTons,
    isLoading,
    refetch,
    getSite,
    addDelivery: addDeliveryMutation.mutateAsync,
    createSite: createSiteMutation.mutateAsync,
    deleteSite: async (id: string) => {
      try {
        console.log('Starting delete for site:', id);
        await deleteSiteMutation.mutateAsync(id);
        console.log('Delete completed');
      } catch (err) {
        console.error('Error deleting site:', err);
        throw err;
      }
    },
  };
}
