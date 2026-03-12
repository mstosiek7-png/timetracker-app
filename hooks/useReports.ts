// ============================================================
// useReports — stats + export report generation
// ============================================================
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  documentDirectory,
  writeAsStringAsync,
  deleteAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import { 
  generateExcelReport, 
  generatePdfReport, 
  generateConstructionExcelReport,
  generateConstructionPdfReport,
  shareReport,
  ExportOptions,
  ExportConstructionOptions
} from '../services/export';
import { useI18n } from '../i18n/I18nProvider';

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
  uri?: string;
}

const SAVED_REPORTS_KEY = 'timetracker:savedReports';

const STATUS_MAP: Record<string, keyof ReportStats['byStatus']> = {
  work: 'praca',
  sick: 'chorobowe',
  vacation: 'urlop',
  fza: 'fza',
};

export function useReports() {
  const { language } = useI18n();
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  useEffect(() => {
    const loadSavedReports = async () => {
      try {
        const stored = await AsyncStorage.getItem(SAVED_REPORTS_KEY);
        if (stored) {
          setSavedReports(JSON.parse(stored));
        }
      } catch (error) {
        console.warn('Nie udalo sie odczytac zapisanych raportow:', error);
      }
    };
    loadSavedReports();
  }, []);

  useEffect(() => {
    const saveReports = async () => {
      try {
        await AsyncStorage.setItem(SAVED_REPORTS_KEY, JSON.stringify(savedReports));
      } catch (error) {
        console.warn('Nie udalo sie zapisac raportow:', error);
      }
    };
    saveReports();
  }, [savedReports]);

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
    reportType = 'employees',
    siteIds = [],
  }: {
    dateFrom: Date;
    dateTo: Date;
    workerIds?: string[];
    format: 'xlsx' | 'pdf';
    includeNotes: boolean;
    reportType?: 'employees' | 'construction';
    siteIds?: string[];
  }): Promise<void> {
    try {
      // Generate the appropriate format
      let fileUri: string;

      if (reportType === 'employees') {
        const exportOptions: ExportOptions = {
          startDate: dateFrom,
          endDate: dateTo,
          employeeIds: workerIds.length > 0 ? workerIds : undefined,
          includeNotes,
          format: fmt === 'xlsx' ? 'excel' : 'pdf',
          language,
        };

        if (fmt === 'xlsx') {
          fileUri = await generateExcelReport(exportOptions);
        } else {
          fileUri = await generatePdfReport(exportOptions);
        }
      } else {
        const constructionOptions: ExportConstructionOptions = {
          startDate: dateFrom,
          endDate: dateTo,
          siteIds: siteIds.length > 0 ? siteIds : undefined,
          format: fmt === 'xlsx' ? 'excel' : 'pdf',
          language,
        };

        if (fmt === 'xlsx') {
          fileUri = await generateConstructionExcelReport(constructionOptions);
        } else {
          fileUri = await generateConstructionPdfReport(constructionOptions);
        }
      }

      console.log(`${reportType} ${fmt} report generated:`, fileUri);

      // Add to saved reports list first
      const fileName = fileUri.split('/').pop() || 'raport';
      setSavedReports(prev => [
        { 
          id: Date.now().toString(), 
          name: fileName, 
          createdAt: new Date().toLocaleString(language === 'de' ? 'de-DE' : 'pl-PL'),
          uri: fileUri
        },
        ...prev,
      ]);

      // Report is saved; sharing is triggered manually from the list
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  // ─── shareExistingReport ──────────────────────────────────
  async function shareExistingReport(report: SavedReport): Promise<void> {
    try {
      if (!report.uri) {
        throw new Error('Report URI not found');
      }
      await shareReport(report.uri, language);
    } catch (error) {
      console.error('Error sharing report:', error);
      throw error;
    }
  }

  // ─── deleteReport ─────────────────────────────────────────
  async function deleteReport(reportId: string): Promise<void> {
    try {
      const report = savedReports.find(r => r.id === reportId);
      if (report?.uri) {
        await deleteAsync(report.uri, { idempotent: true });
      }
      setSavedReports(prev => prev.filter(r => r.id !== reportId));
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  }

  return { getStats, useReportStats, generateReport, shareExistingReport, deleteReport, savedReports };
}
