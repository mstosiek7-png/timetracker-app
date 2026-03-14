// =====================================================
// useEinsatzplan — weekly plan data + tonnen_real edits
// =====================================================
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../services/supabase';
import { EinsatzplanWithSite } from '../types/models';

const CACHE_PREFIX = 'einsatzplan:week:';

function weekCacheKey(weekStart: Date) {
  return `${CACHE_PREFIX}${weekStart.toISOString().slice(0, 10)}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function useEinsatzplan(weekStart: Date) {
  const queryClient = useQueryClient();
  const weekEnd = addDays(weekStart, 7);
  const startISO = weekStart.toISOString().slice(0, 10);
  const endISO = weekEnd.toISOString().slice(0, 10);

  const query = useQuery<EinsatzplanWithSite[]>({
    queryKey: ['einsatzplan-week', startISO],
    queryFn: async () => {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        // Offline: return cached data
        const cached = await AsyncStorage.getItem(weekCacheKey(weekStart));
        if (cached) return JSON.parse(cached) as EinsatzplanWithSite[];
        return [];
      }

      const { data, error } = await supabase
        .from('einsatzplan')
        .select('*, construction_sites(name, address)')
        .gte('date', startISO)
        .lt('date', endISO)
        .order('date');

      if (error) throw error;

      const result = (data ?? []) as EinsatzplanWithSite[];
      // Persist cache for offline use
      await AsyncStorage.setItem(weekCacheKey(weekStart), JSON.stringify(result));
      return result;
    },
    staleTime: 2 * 60 * 1000,
  });

  const updateRealMutation = useMutation({
    mutationFn: async ({
      einsatzplanId,
      tonnen_real,
      currentUserId,
    }: {
      einsatzplanId: string;
      tonnen_real: number;
      currentUserId: string;
    }) => {
      const net = await NetInfo.fetch();
      const now = new Date().toISOString();

      if (net.isConnected) {
        const { error } = await supabase
          .from('einsatzplan')
          .update({ tonnen_real, updated_at: now })
          .eq('id', einsatzplanId);
        if (error) throw error;
      } else {
        // Queue for offline sync
        await supabase.from('sync_queue').insert({
          operation: 'UPDATE',
          table_name: 'einsatzplan',
          record_id: einsatzplanId,
          data: { tonnen_real, updated_at: now },
          created_by: currentUserId,
        });
      }
    },
    onSuccess: (_data, variables) => {
      // Optimistic update in React Query cache
      queryClient.setQueryData<EinsatzplanWithSite[]>(
        ['einsatzplan-week', startISO],
        (prev) =>
          (prev ?? []).map((item) =>
            item.id === variables.einsatzplanId
              ? { ...item, tonnen_real: variables.tonnen_real }
              : item,
          ),
      );
      // Update local AsyncStorage cache too
      queryClient
        .getQueryData<EinsatzplanWithSite[]>(['einsatzplan-week', startISO])
        ?.then?.((updated) => {
          if (updated) {
            AsyncStorage.setItem(weekCacheKey(weekStart), JSON.stringify(updated));
          }
        });
    },
  });

  const updateTonnenReal = useCallback(
    async (einsatzplanId: string, tonnen_real: number, currentUserId: string) => {
      await updateRealMutation.mutateAsync({ einsatzplanId, tonnen_real, currentUserId });
      // Refresh cache entry in AsyncStorage after update
      const current = queryClient.getQueryData<EinsatzplanWithSite[]>([
        'einsatzplan-week',
        startISO,
      ]);
      if (current) {
        await AsyncStorage.setItem(weekCacheKey(weekStart), JSON.stringify(current));
      }
    },
    [updateRealMutation, queryClient, startISO, weekStart],
  );

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    updateTonnenReal,
    isUpdating: updateRealMutation.isPending,
  };
}
