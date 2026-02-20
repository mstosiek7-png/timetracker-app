// =====================================================
// Export Service - Excel/PDF Report Generation
// FIXED VERSION - Bez użycia jsPDF z błędem latin1
// =====================================================

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { TimeEntry } from '../types/models';

// Types for Supabase response
interface TimeEntryWithEmployee {
  hours: number;
  date: string;
  status: string;
  notes: string | null;
  employees: {
    name: string;
    position: string;
  } | null;
}

// Types
export interface ExportOptions {
  startDate: Date;
  endDate: Date;
  employeeIds?: string[];
  includeNotes?: boolean;
  format: 'excel' | 'pdf';
}

export interface ReportData {
  employeeName: string;
  position: string;
  date: string;
  hours: number;
  status: string;
  notes?: string;
}

// =====================================================
// Excel Export Functions
// =====================================================

/**
 * Generuje raport Excel z danymi o czasie pracy
 * Używa biblioteki xlsx (SheetJS) - lżejszej i kompatybilnej z React Native
 */
export async function generateExcelReport(options: ExportOptions): Promise<string> {
  try {
    // Pobierz dane z bazy
    const data = await fetchReportData(options);

    // Przygotuj nagłówki
    const headers = [
      'Pracownik',
      'Stanowisko',
      'Data',
      'Godziny',
      'Status',
      ...(options.includeNotes ? ['Notatki'] : []),
    ];

    // Przygotuj wiersze danych
    const rows = data.map(row => [
      row.employeeName,
      row.position,
      row.date,
      row.hours,
      translateStatus(row.status),
      ...(options.includeNotes ? [row.notes || ''] : []),
    ]);

    // Dodaj podsumowanie
    const totalHours = data.reduce((sum, row) => sum + row.hours, 0);
    rows.push([]); // Pusty wiersz
    const summaryRow: (string | number)[] = ['Łączna liczba godzin:', '', '', totalHours, ''];
    if (options.includeNotes) summaryRow.push('');
    rows.push(summaryRow);

    // Utwórz arkusz z nagłówkami i danymi
    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Ustaw szerokości kolumn
    worksheet['!cols'] = [
      { wch: 25 }, // Pracownik
      { wch: 20 }, // Stanowisko
      { wch: 12 }, // Data
      { wch: 10 }, // Godziny
      { wch: 15 }, // Status
      ...(options.includeNotes ? [{ wch: 30 }] : []), // Notatki
    ];

    // Utwórz skoroszyt
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Raport czasu pracy');

    // Generuj plik jako base64
    const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

    // Generuj datę w nazwie pliku
    const fileName = `raport_${format(options.startDate, 'yyyy-MM-dd')}_${format(options.endDate, 'yyyy-MM-dd')}.xlsx`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    // Zapisz do pliku
    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
  } catch (error) {
    console.error('Błąd generowania raportu Excel:', error);
    throw new Error('Nie udało się wygenerować raportu Excel');
  }
}

// =====================================================
// PDF Export Functions - SIMPLIFIED HTML version
// =====================================================

/**
 * Generuje raport PDF z danymi o czasie pracy
 * Używa HTML + Print API zamiast jsPDF z błędem latin1
 */
export async function generatePdfReport(options: ExportOptions): Promise<string> {
  try {
    // Pobierz dane z bazy
    const data = await fetchReportData(options);
    
    // Przygotuj HTML do druku
    const totalHours = data.reduce((sum, row) => sum + row.hours, 0);
    
    // Buduj tabelę HTML
    const tableRows = data.map(row => `
      <tr>
        <td style="border: 1px solid #ccc; padding: 4px;">${row.employeeName}</td>
        <td style="border: 1px solid #ccc; padding: 4px;">${row.position}</td>
        <td style="border: 1px solid #ccc; padding: 4px;">${row.date}</td>
        <td style="border: 1px solid #ccc; padding: 4px;">${row.hours.toFixed(2)}</td>
        <td style="border: 1px solid #ccc; padding: 4px;">${translateStatus(row.status)}</td>
        ${options.includeNotes ? `<td style="border: 1px solid #ccc; padding: 4px;">${row.notes || ''}</td>` : ''}
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; margin-bottom: 5px; }
          h2 { color: #666; font-size: 16px; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #404040; color: white; font-weight: bold; padding: 8px; text-align: left; }
          td { border: 1px solid #ccc; padding: 6px; }
          .summary { margin-top: 20px; padding: 10px; background-color: #f5f5f5; border-left: 4px solid #404040; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: right; }
        </style>
      </head>
      <body>
        <h1>Raport czasu pracy</h1>
        <h2>Okres: ${format(options.startDate, 'dd.MM.yyyy', { locale: pl })} - ${format(options.endDate, 'dd.MM.yyyy', { locale: pl })}</h2>
        <h2>Wygenerowano: ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: pl })}</h2>
        
        <table>
          <thead>
            <tr>
              <th>Pracownik</th>
              <th>Stanowisko</th>
              <th>Data</th>
              <th>Godziny</th>
              <th>Status</th>
              ${options.includeNotes ? '<th>Notatki</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div class="summary">
          <strong>Łączna liczba godzin: ${totalHours.toFixed(2)}</strong>
        </div>
        
        <div class="footer">
          TimeTracker • asphaltbau • Wygenerowano automatycznie
        </div>
      </body>
      </html>
    `;

    // Generuj PDF przy użyciu Print API
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      width: 842, // A4 szerokość w punktach
      height: 595, // A4 wysokość w punktach
    });

    // Generuj datę w nazwie pliku
    const fileName = `raport_${format(options.startDate, 'yyyy-MM-dd')}_${format(options.endDate, 'yyyy-MM-dd')}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${fileName}`;
    
    // Skopiuj do docelowej lokalizacji
    await FileSystem.copyAsync({
      from: uri,
      to: newUri,
    });

    return newUri;
  } catch (error) {
    console.error('Błąd generowania raportu PDF:', error);
    throw new Error('Nie udało się wygenerować raportu PDF');
  }
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Pobiera dane do raportu z bazy danych
 */
async function fetchReportData(options: ExportOptions): Promise<ReportData[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      hours,
      date,
      status,
      notes,
      employees (
        name,
        position
      )
    `)
    .gte('date', format(options.startDate, 'yyyy-MM-dd'))
    .lte('date', format(options.endDate, 'yyyy-MM-dd'))
    .order('date', { ascending: false });
  
  if (error) {
    throw new Error(`Błąd pobierania danych: ${error.message}`);
  }
  
  // Transformuj dane
  return data.map(entry => {
    // Supabase może zwrócić relację jako obiekt lub tablicę
    const employee = Array.isArray(entry.employees) ? entry.employees[0] : entry.employees;
    return {
      employeeName: employee?.name || 'Nieznany',
      position: employee?.position || '',
      date: format(new Date(entry.date), 'dd.MM.yyyy'),
      hours: entry.hours,
      status: entry.status,
      notes: entry.notes
    };
  });
}

/**
 * Tłumaczy status na język polski
 */
function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    'work': 'Praca',
    'sick': 'Chorobowe',
    'vacation': 'Urlop',
    'fza': 'FZA'
  };
  
  return translations[status] || status;
}

/**
 * Udostępnia plik użytkownikowi (do pobrania/wysłania)
 */
export async function shareReport(fileUri: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Udostępnianie nie jest dostępne na tym urządzeniu');
  }
  
  await Sharing.shareAsync(fileUri, {
    mimeType: fileUri.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Udostępnij raport',
    UTI: fileUri.endsWith('.pdf') ? 'com.adobe.pdf' : 'org.openxmlformats.spreadsheetml.sheet'
  });
}

/**
 * Drukuje raport PDF
 */
export async function printReport(fileUri: string): Promise<void> {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64
  });
  
  await Print.printAsync({
    html: `<iframe src="data:application/pdf;base64,${base64}" width="100%" height="100%"></iframe>`,
    orientation: 'landscape'
  });
}

/**
 * Pobiera dostępne raporty z lokalnego systemu plików
 */
export async function getSavedReports(): Promise<Array<{ uri: string; name: string; size: number; modified: Date }>> {
  const reportsDir = `${FileSystem.documentDirectory}reports/`;
  
  // Utwórz katalog jeśli nie istnieje
  const dirInfo = await FileSystem.getInfoAsync(reportsDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(reportsDir, { intermediates: true });
    return [];
  }
  
  // Pobierz listę plików
  const files = await FileSystem.readDirectoryAsync(reportsDir);
  
  const reports = await Promise.all(
    files
      .filter(file => file.endsWith('.pdf') || file.endsWith('.xlsx'))
      .map(async file => {
        const fileUri = `${reportsDir}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        
        return {
          uri: fileUri,
          name: file,
          size: fileInfo.exists ? (fileInfo.size ?? 0) : 0,
          modified: new Date(fileInfo.exists ? (fileInfo.modificationTime ?? Date.now()) : Date.now())
        };
      })
  );
  
  return reports.sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

/**
 * Usuwa zapisany raport
 */
export async function deleteReport(fileUri: string): Promise<void> {
  await FileSystem.deleteAsync(fileUri);
}