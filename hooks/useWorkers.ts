// ============================================================
// useWorkers — adapter over useEmployees for new design system
// ============================================================
import { useMemo } from 'react';
import { useEmployees } from './useEmployees';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

export interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  active: boolean;
  currentStatus?: string;
}

export function useWorkers() {
  const { data: employees = [], isLoading, refetch } = useEmployees();

  const workers = useMemo<Worker[]>(() => employees.map(emp => {
    const nameParts = emp.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName  = nameParts.slice(1).join(' ') ?? '';
    return {
      id: emp.id,
      firstName,
      lastName,
      position: emp.position,
      active: emp.active,
      currentStatus: 'Praca',
    };
  }), [employees]);

  return { workers, isLoading, refetch };
}

// ─── Add worker ──────────────────────────────────────────────
export function useAddWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, position }: { name: string; position: string }) => {
      const { data, error } = await supabase
        .from('employees')
        .insert({ name, position })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
