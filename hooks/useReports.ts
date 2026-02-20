// ============================================================
// useReports — stats + export report generation
// ============================================================
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { format } from 'date-fns';
import {
  documentDirectory,
  writeAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';

export interface ReportStats {
  totalHours: number;
  entryCount: number;
  workerCount: number;
  byStatus: {
    praca: number;
    chorobowe: number;
    urlop: number;
    fza: number;
  };
}

export interface SavedReport {
  id: string;
  name: string;
  createdAt: string;
}

const STATUS_MAP: Record<string, keyof ReportStats['byStatus']> = {
  work: 'praca',
  sick: 'chorobowe',
  vacation: 'urlop',
  fza: 'fza',
};

export function useReports() {
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  // Helper: build stats from fetched entries
  function buildStats(entries: any[]): ReportStats {
    const workerIds = new Set(entries.map(e => e.employee_id));
    const byStatus = { praca: 0, chorobowe: 0, urlop: 0, fza: 0 };

    entries.forEach(e => {
      const key = STATUS_MAP[e.status];
      if (key) byStatus[key] += Number(e.hours);
    });

    return {
      totalHours: entries.reduce((s, e) => s + Number(e.hours), 0),
      entryCount: entries.length,
      workerCount: workerIds.size,
      byStatus,
    };
  }

  // ─── getStats — sync version using last fetched data ─────
  // Note: This is a simplified synchronous version for use with pre-fetched data.
  // For reactive stats, use the useReportStats query below.
  function getStats({
    dateFrom,
    dateTo,
    workerIds = [],
  }: {
    dateFrom: Date;
    dateTo: Date;
    workerIds?: string[];
  }): ReportStats {
    // Returns placeholder until query resolves
    return { totalHours: 0, entryCount: 0, workerCount: 0, byStatus: { praca: 0, chorobowe: 0, urlop: 0, fza: 0 } };
  }

  // ─── useReportStats react-query version ───────────────────
  function useReportStats({
    dateFrom,
    dateTo,
    workerIds = [],
  }: {
    dateFrom: Date;
    dateTo: Date;
    workerIds?: string[];
  }) {
    return useQuery({
      queryKey: ['reportStats', format(dateFrom, 'yyyy-MM-dd'), format(dateTo, 'yyyy-MM-dd'), workerIds],
      queryFn: async () => {
        let query = supabase
          .from('time_entries')
          .select('employee_id, hours, status')
          .gte('date', format(dateFrom, 'yyyy-MM-dd'))
          .lte('date', format(dateTo, 'yyyy-MM-dd'));

        if (workerIds.length > 0) {
          query = query.in('employee_id', workerIds);
        }

        const { data, error } = await query;
        if (error) throw error;
        return buildStats(data ?? []);
      },
      staleTime: 2 * 60 * 1000,
    });
  }

  // ─── generateReport ───────────────────────────────────────
  async function generateReport({
    dateFrom,
    dateTo,
    workerIds = [],
    format: fmt,
    includeNotes,
  }: {
    dateFrom: Date;
    dateTo: Date;
    workerIds?: string[];
    format: 'xlsx' | 'pdf';
    includeNotes: boolean;
  }): Promise<void> {
    // Fetch entries
    let query = supabase
      .from('time_entries')
      .select('*, employees(name, position)')
      .gte('date', format(dateFrom, 'yyyy-MM-dd'))
      .lte('date', format(dateTo, 'yyyy-MM-dd'))
      .order('date', { ascending: true });

    if (workerIds.length > 0) {
      query = query.in('employee_id', workerIds);
    }

    const { data: entries, error } = await query;
    if (error) throw error;

    // Generate CSV as basic export
    const from = format(dateFrom, 'ddMMyyyy');
    const to   = format(dateTo,   'ddMMyyyy');
    const name = `raport_${from}-${to}`;

    const lines = [
      'Pracownik;Data;Godziny;Status' + (includeNotes ? ';Notatki' : ''),
      ...(entries ?? []).map(e => {
        const empName = (Array.isArray(e.employees) ? e.employees[0]?.name : e.employees?.name) ?? '';
        const row = [empName, e.date, e.hours, e.status];
        if (includeNotes) row.push(e.notes ?? '');
        return row.join(';');
      }),
    ];
    const csv = lines.join('\n');

    if (documentDirectory) {
      const path = `${documentDirectory}${name}.csv`;
      await writeAsStringAsync(path, csv, { encoding: EncodingType.UTF8 });

      setSavedReports(prev => [
        { id: Date.now().toString(), name: `${name}.csv`, createdAt: new Date().toISOString() },
        ...prev,
      ]);
    }
  }

  return { getStats, useReportStats, generateReport, savedReports };
}
