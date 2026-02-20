// =====================================================
// useEmployees Hook - Employee Data Management
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Employee, EmployeeInsert, EmployeeUpdate } from '../types/models';

// =====================================================
// Query Keys
// =====================================================

const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters: any) => [...employeeKeys.lists(), { filters }] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
};

// =====================================================
// API Functions
// =====================================================

/**
 * Pobiera listę pracowników
 */
async function fetchEmployees(filters?: { active?: boolean }) {
  let query = supabase
    .from('employees')
    .select('*')
    .order('name', { ascending: true });

  if (filters?.active !== undefined) {
    query = query.eq('active', filters.active);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Błąd pobierania pracowników: ${error.message}`);
  }

  return data as Employee[];
}

/**
 * Pobiera pojedynczego pracownika
 */
async function fetchEmployee(id: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Błąd pobierania pracownika: ${error.message}`);
  }

  return data as Employee;
}

/**
 * Tworzy nowego pracownika
 */
async function createEmployee(employeeData: EmployeeInsert) {
  // Ensure created_by is not required since it has DEFAULT auth.uid()
  const { data, error } = await supabase
    .from('employees')
    .insert(employeeData)
    .select()
    .single();

  if (error) {
    throw new Error(`Błąd tworzenia pracownika: ${error.message}`);
  }

  return data as Employee;
}

/**
 * Aktualizuje pracownika
 */
async function updateEmployee({ id, ...updates }: EmployeeUpdate & { id: string }) {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Błąd aktualizacji pracownika: ${error.message}`);
  }

  return data as Employee;
}

/**
 * Usuwa pracownika
 */
async function deleteEmployee(id: string) {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Błąd usuwania pracownika: ${error.message}`);
  }

  return { id };
}

// =====================================================
// React Query Hooks
// =====================================================

/**
 * Hook do pobierania listy pracowników
 */
export function useEmployees(filters?: { active?: boolean }) {
  return useQuery({
    queryKey: employeeKeys.list(filters),
    queryFn: () => fetchEmployees(filters),
    staleTime: 5 * 60 * 1000, // 5 minut
    gcTime: 10 * 60 * 1000, // 10 minut
  });
}

/**
 * Hook do pobierania pojedynczego pracownika
 */
export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => fetchEmployee(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook do tworzenia pracownika
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      // Inwaliduj zapytania związane z pracownikami
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
    onError: (error: Error) => {
      console.error('Błąd tworzenia pracownika:', error);
    },
  });
}

/**
 * Hook do aktualizacji pracownika
 */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEmployee,
    onSuccess: (data) => {
      // Inwaliduj zapytania związane z pracownikami
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      console.error('Błąd aktualizacji pracownika:', error);
    },
  });
}

/**
 * Hook do usuwania pracownika
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEmployee,
    onSuccess: (data) => {
      // Inwaliduj zapytania związane z pracownikami
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.removeQueries({ queryKey: employeeKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      console.error('Błąd usuwania pracownika:', error);
    },
  });
}

/**
 * Hook do wyszukiwania pracowników
 */
export function useSearchEmployees(searchTerm: string) {
  return useQuery({
    queryKey: ['employees', 'search', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) {
        return [];
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .order('name', { ascending: true })
        .limit(20);

      if (error) {
        throw new Error(`Błąd wyszukiwania pracowników: ${error.message}`);
      }

      return data as Employee[];
    },
    enabled: searchTerm.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minuty
  });
}

/**
 * Hook do pobierania aktywnych pracowników
 */
export function useActiveEmployees() {
  return useEmployees({ active: true });
}

/**
 * Hook do pobierania nieaktywnych pracowników
 */
export function useInactiveEmployees() {
  return useEmployees({ active: false });
}

/**
 * Hook do pobierania statystyk pracowników
 */
export function useEmployeeStats() {
  return useQuery({
    queryKey: ['employees', 'stats'],
    queryFn: async () => {
      const { data: activeCount, error: activeError } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('active', true);

      const { data: totalCount, error: totalError } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true });

      if (activeError || totalError) {
        throw new Error('Błąd pobierania statystyk pracowników');
      }

      return {
        active: activeCount?.length || 0,
        total: totalCount?.length || 0,
        inactive: (totalCount?.length || 0) - (activeCount?.length || 0),
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minut
  });
}