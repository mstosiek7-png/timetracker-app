// =====================================================
// useTimeEntries Hook - Time Entry Data Management
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { TimeEntry, TimeEntryInsert, TimeEntryUpdate, TimeEntryStatus } from '../types/models';
import { format } from 'date-fns';

// =====================================================
// Query Keys
// =====================================================

const timeEntryKeys = {
  all: ['timeEntries'] as const,
  lists: () => [...timeEntryKeys.all, 'list'] as const,
  list: (filters: any) => [...timeEntryKeys.lists(), { filters }] as const,
  details: () => [...timeEntryKeys.all, 'detail'] as const,
  detail: (id: string) => [...timeEntryKeys.details(), id] as const,
};

// =====================================================
// API Functions
// =====================================================

interface FetchTimeEntriesFilters {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: TimeEntryStatus;
  date?: string;
}

/**
 * Pobiera listę wpisów czasu pracy
 */
async function fetchTimeEntries(filters?: FetchTimeEntriesFilters) {
  let query = supabase
    .from('time_entries')
    .select('*, employees(name, position)')
    .order('date', { ascending: false });

  if (filters?.employeeId) {
    query = query.eq('employee_id', filters.employeeId);
  }

  if (filters?.startDate) {
    query = query.gte('date', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('date', filters.endDate);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.date) {
    query = query.eq('date', filters.date);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Błąd pobierania wpisów czasu pracy: ${error.message}`);
  }

  // Transformuj dane
  return data.map(entry => ({
    ...entry,
    employees: Array.isArray(entry.employees) ? entry.employees[0] : entry.employees,
  })) as TimeEntry[];
}

/**
 * Pobiera pojedynczy wpis czasu pracy
 */
async function fetchTimeEntry(id: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*, employees(*)')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Błąd pobierania wpisu czasu pracy: ${error.message}`);
  }

  return data as TimeEntry;
}

/**
 * Tworzy nowy wpis czasu pracy
 */
async function createTimeEntry(timeEntryData: TimeEntryInsert) {
  // created_by has DEFAULT auth.uid() in the database
  const { data, error } = await supabase
    .from('time_entries')
    .insert(timeEntryData)
    .select('*, employees(*)')
    .single();

  if (error) {
    throw new Error(`Błąd tworzenia wpisu czasu pracy: ${error.message}`);
  }

  return data as TimeEntry;
}

/**
 * Tworzy wiele wpisów czasu pracy naraz (bulk insert)
 */
async function createBulkTimeEntries(timeEntriesData: TimeEntryInsert[]) {
  const { data, error } = await supabase
    .from('time_entries')
    .insert(timeEntriesData)
    .select('*, employees(*)');

  if (error) {
    throw new Error(`Błąd tworzenia zbiorczych wpisów czasu pracy: ${error.message}`);
  }

  return data as TimeEntry[];
}

/**
 * Aktualizuje wpis czasu pracy
 */
async function updateTimeEntry({ id, ...updates }: TimeEntryUpdate & { id: string }) {
  const { data, error } = await supabase
    .from('time_entries')
    .update(updates)
    .eq('id', id)
    .select('*, employees(*)')
    .single();

  if (error) {
    throw new Error(`Błąd aktualizacji wpisu czasu pracy: ${error.message}`);
  }

  return data as TimeEntry;
}

/**
 * Usuwa wpis czasu pracy
 */
async function deleteTimeEntry(id: string) {
  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Błąd usuwania wpisu czasu pracy: ${error.message}`);
  }

  return { id };
}

/**
 * Pobiera podsumowanie miesięczne dla pracownika
 */
async function fetchMonthlySummary(employeeId: string, year: number, month: number) {
  const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
  const endDate = format(new Date(year, month, 0), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) {
    throw new Error(`Błąd pobierania podsumowania miesięcznego: ${error.message}`);
  }

  return data as TimeEntry[];
}

/**
 * Pobiera podsumowanie dzienne dla wszystkich pracowników
 */
async function fetchDailySummary(date: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*, employees(name)')
    .eq('date', date)
    .order('employees(name)', { ascending: true });

  if (error) {
    throw new Error(`Błąd pobierania podsumowania dziennego: ${error.message}`);
  }

  return data.map(entry => ({
    ...entry,
    employees: Array.isArray(entry.employees) ? entry.employees[0] : entry.employees,
  })) as TimeEntry[];
}

// =====================================================
// React Query Hooks
// =====================================================

/**
 * Hook do pobierania listy wpisów czasu pracy
 */
export function useTimeEntries(filters?: FetchTimeEntriesFilters) {
  return useQuery({
    queryKey: timeEntryKeys.list(filters),
    queryFn: () => fetchTimeEntries(filters),
    staleTime: 2 * 60 * 1000, // 2 minuty
    gcTime: 5 * 60 * 1000, // 5 minut
  });
}

/**
 * Hook do pobierania pojedynczego wpisu czasu pracy
 */
export function useTimeEntry(id: string) {
  return useQuery({
    queryKey: timeEntryKeys.detail(id),
    queryFn: () => fetchTimeEntry(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook do tworzenia wpisu czasu pracy
 */
export function useCreateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTimeEntry,
    onSuccess: () => {
      // Inwaliduj zapytania związane z wpisami czasu pracy
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.lists() });
    },
    onError: (error: Error) => {
      console.error('Błąd tworzenia wpisu czasu pracy:', error);
    },
  });
}

/**
 * Hook do tworzenia zbiorczych wpisów czasu pracy
 */
export function useCreateBulkTimeEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBulkTimeEntries,
    onSuccess: () => {
      // Inwaliduj zapytania związane z wpisami czasu pracy
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.lists() });
    },
    onError: (error: Error) => {
      console.error('Błąd tworzenia zbiorczych wpisów czasu pracy:', error);
    },
  });
}

/**
 * Hook do aktualizacji wpisu czasu pracy
 */
export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTimeEntry,
    onSuccess: (data) => {
      // Inwaliduj zapytania związane z wpisami czasu pracy
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      console.error('Błąd aktualizacji wpisu czasu pracy:', error);
    },
  });
}

/**
 * Hook do usuwania wpisu czasu pracy
 */
export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTimeEntry,
    onSuccess: (data) => {
      // Inwaliduj zapytania związane z wpisami czasu pracy
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.lists() });
      queryClient.removeQueries({ queryKey: timeEntryKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      console.error('Błąd usuwania wpisu czasu pracy:', error);
    },
  });
}

/**
 * Hook do pobierania podsumowania miesięcznego
 */
export function useMonthlySummary(employeeId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['timeEntries', 'monthlySummary', employeeId, year, month],
    queryFn: () => fetchMonthlySummary(employeeId, year, month),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook do pobierania podsumowania dziennego
 */
export function useDailySummary(date: string) {
  return useQuery({
    queryKey: ['timeEntries', 'dailySummary', date],
    queryFn: () => fetchDailySummary(date),
    enabled: !!date,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook do pobierania wpisów dla konkretnego pracownika
 */
export function useEmployeeTimeEntries(employeeId: string, options?: {
  startDate?: string;
  endDate?: string;
}) {
  return useTimeEntries({
    employeeId,
    startDate: options?.startDate,
    endDate: options?.endDate,
  });
}

/**
 * Hook do pobierania wpisów dla konkretnego dnia
 */
export function useTimeEntriesByDate(date: string) {
  return useTimeEntries({ date });
}

/**
 * Hook do pobierania statystyk wpisów czasu pracy
 */
export function useTimeEntryStats(filters?: FetchTimeEntriesFilters) {
  return useQuery({
    queryKey: ['timeEntries', 'stats', filters],
    queryFn: async () => {
      const entries = await fetchTimeEntries(filters);

      const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
      const workHours = entries
        .filter(entry => entry.status === 'work')
        .reduce((sum, entry) => sum + entry.hours, 0);
      const sickHours = entries
        .filter(entry => entry.status === 'sick')
        .reduce((sum, entry) => sum + entry.hours, 0);
      const vacationHours = entries
        .filter(entry => entry.status === 'vacation')
        .reduce((sum, entry) => sum + entry.hours, 0);
      const fzaHours = entries
        .filter(entry => entry.status === 'fza')
        .reduce((sum, entry) => sum + entry.hours, 0);

      return {
        totalEntries: entries.length,
        totalHours,
        workHours,
        sickHours,
        vacationHours,
        fzaHours,
        averageHoursPerDay: entries.length > 0 ? totalHours / new Set(entries.map(e => e.date)).size : 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}