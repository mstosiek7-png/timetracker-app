// =====================================================
// Export Service - Excel/PDF Report Generation
// FIXED VERSION - Bez użycia jsPDF z błędem latin1
// =====================================================

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Buffer } from 'buffer';
import { supabase } from './supabase';
import { format, type Locale } from 'date-fns';
import { de, pl } from 'date-fns/locale';
import { TimeEntry, SiteDelivery, ActiveSiteSummary } from '../types/models';
import { Language, strings, StringKey } from '../i18n/strings';

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
  language?: Language;
}

export interface ReportData {
  employeeId: string;
  employeeName: string;
  position: string;
  date: string; // YYYY-MM-DD for easier sorting/processing
  hours: number;
  status: string;
  notes?: string;
}

export interface ExportConstructionOptions {
  startDate: Date;
  endDate: Date;
  siteIds?: string[];
  format: 'excel' | 'pdf';
  language?: Language;
}

export interface ConstructionReportData {
  siteName: string;
  date: string;
  asphaltClass: string;
  tons: number;
  waybill: string;
  supplier: string;
}

export interface WeeklyConstructionData {
  siteId: string;
  siteName: string;
  siteAddress: string;
  deliveries: {
    [date: string]: {
      asphaltTypes: {
        name: string;
        sumTons: number;
      }[];
      suppliers: Set<string>;
      waybills: Set<string>;
    }
  };
}

function getLocale(language: Language) {
  return language === 'de' ? de : pl;
}

function createTranslator(language: Language) {
  return (key: StringKey) => strings[language][key] ?? key;
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
    const language = options.language ?? 'pl';
    const t = createTranslator(language);
    const dateLocale = getLocale(language);
    
    // Fetch data
    const data = await fetchReportData(options, t, dateLocale);

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(t('Raport czasu pracy'));

    // 1. Prepare Days Range
    const days: string[] = [];
    let current = new Date(options.startDate);
    while (current <= options.endDate) {
      days.push(format(current, 'yyyy-MM-dd'));
      current.setDate(current.getDate() + 1);
    }

    // 2. Group data by employee
    const employeesMap = new Map<string, { name: string; position: string; entries: Map<string, { hours: number; status: string }> }>();
    
    data.forEach(entry => {
      if (!employeesMap.has(entry.employeeId)) {
        employeesMap.set(entry.employeeId, {
          name: entry.employeeName,
          position: entry.position,
          entries: new Map()
        });
      }
      const emp = employeesMap.get(entry.employeeId)!;
      // If multiple entries for same day, sum hours and take status (Arbeit > Krank > Urlaub > FZA)
      const existing = emp.entries.get(entry.date);
      if (existing) {
        existing.hours += entry.hours;
        // Simple priority: work > sick > vacation > fza
        const priority = { work: 4, sick: 3, vacation: 2, fza: 1 };
        const currentPrio = (priority as any)[entry.status] || 0;
        const existingPrio = (priority as any)[existing.status] || 0;
        if (currentPrio > existingPrio) existing.status = entry.status;
      } else {
        emp.entries.set(entry.date, { hours: entry.hours, status: entry.status });
      }
    });

    const sortedEmployees = Array.from(employeesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // 3. Define Styles
    const fontArial10: Partial<ExcelJS.Font> = { name: 'Arial', size: 10 };
    const borderThin: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FFAAAAAA' } },
      left: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FFAAAAAA' } },
      bottom: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FFAAAAAA' } },
      right: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FFAAAAAA' } }
    };

    const statusStyles: Record<string, { fill: ExcelJS.Fill }> = {
      work: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } } },     // zielony
      sick: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD7D7' } } },     // czerwony
      vacation: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } } }, // żółty
      fza: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE1D5E7' } } },      // fioletowy
      none: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } } }      // szary
    };

    // 4. Build Header
    // Row 1: Title
    const titleRow = worksheet.addRow([`${t('Raport czasu pracy')} - ${format(options.startDate, 'MM.yyyy')}`]);
    titleRow.height = 30;
    worksheet.mergeCells(1, 1, 1, days.length + 3);
    const titleCell = titleRow.getCell(1);
    titleCell.style = {
      font: { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } },
      alignment: { vertical: 'middle', horizontal: 'center' }
    };

    // Row 2: Headers
    const headerLabels = [t('Pracownik'), t('Stanowisko'), ...days.map(d => format(new Date(d), 'dd.MM')), t('Suma')];
    const headerRow = worksheet.addRow(headerLabels);
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
      cell.style = {
        font: { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } },
        border: borderThin,
        alignment: { vertical: 'middle', horizontal: 'center' }
      };
    });
    worksheet.getColumn(1 as any).width = 25;
    worksheet.getColumn(2 as any).width = 15;
    days.forEach((_, i) => worksheet.getColumn(i + 3 as any).width = 6);
    worksheet.getColumn(days.length + 3 as any).width = 10;

    // 5. Add Employee Rows
    sortedEmployees.forEach(emp => {
      const rowData: (string | number)[] = [emp.name, emp.position];
      let rowTotal = 0;
      
      days.forEach(day => {
        const entry = emp.entries.get(day);
        if (entry) {
          rowData.push(entry.hours);
          rowTotal += entry.hours;
        } else {
          rowData.push('-');
        }
      });
      rowData.push(rowTotal);

      const row = worksheet.addRow(rowData);
      row.eachCell((cell, colNumber) => {
        cell.font = fontArial10;
        cell.border = borderThin;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };

        if (colNumber > 2 && colNumber <= days.length + 2) {
          const date = days[colNumber - 3];
          const entry = emp.entries.get(date);
          if (entry) {
            const style = statusStyles[entry.status];
            if (style) cell.fill = style.fill;
          } else {
            cell.fill = statusStyles.none.fill;
          }
        }
        
        // Bold for name and total
        if (colNumber === 1 || colNumber === days.length + 3) {
          cell.font = { ...fontArial10, bold: true };
        }
      });
    });

    // 6. Add Totals Row
    const totalsRowValues: (string | number)[] = [t('Razem'), ''];
    for (let i = 0; i < days.length; i++) {
      let daySum = 0;
      sortedEmployees.forEach(emp => {
        const entry = emp.entries.get(days[i]);
        if (entry) daySum += entry.hours;
      });
      totalsRowValues.push(daySum);
    }
    const grandTotal = sortedEmployees.reduce((sum, emp) => {
      let empSum = 0;
      emp.entries.forEach(e => empSum += e.hours);
      return sum + empSum;
    }, 0);
    totalsRowValues.push(grandTotal);

    const totalsRow = worksheet.addRow(totalsRowValues);
    totalsRow.height = 20;
    totalsRow.eachCell((cell) => {
      cell.style = {
        font: { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } },
        border: borderThin,
        alignment: { vertical: 'middle', horizontal: 'center' }
      };
    });

    // 7. Add Legend
    worksheet.addRow([]); // Spacer
    const legendHeader = worksheet.addRow([t('Legenda') + ':']);
    const legendHeaderCell = legendHeader.getCell(1);
    legendHeaderCell.font = { ...fontArial10, bold: true };

    const legendItems = [
      { label: t('Praca'), status: 'work' },
      { label: t('Chorobowe'), status: 'sick' },
      { label: t('Urlop'), status: 'vacation' },
      { label: t('FZA'), status: 'fza' },
      { label: t('Nieobecny'), status: 'none' }
    ];

    legendItems.forEach(item => {
      const row = worksheet.addRow(['', item.label]);
      const cell1 = row.getCell(1);
      const cell2 = row.getCell(2);
      cell1.fill = statusStyles[item.status].fill;
      cell1.border = borderThin;
      cell2.font = fontArial10;
    });

    // Generate File
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const fileName = `bericht_${format(options.startDate, 'yyyy_MM')}.xlsx`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
  } catch (error) {
    console.error('Błąd generowania raportu Excel:', error);
    throw new Error(createTranslator(options.language ?? 'pl')('Nie udalo sie wygenerowac raportu Excel'));
  }
}

/**
 * Generuje raport Excel z danymi o dostawach (budowy)
 */
export async function generateConstructionExcelReport(options: ExportConstructionOptions): Promise<string> {
  try {
    const language = options.language ?? 'pl';
    const t = createTranslator(language);
    const dateLocale = getLocale(language);
    
    // Pobierz dane
    const data = await fetchConstructionReportData(options, t, dateLocale);

    // Przygotuj nagłówki
    const headers = [
      t('Budowa'),
      t('Data'),
      t('Klasa asfaltu'),
      t('Tony'),
      t('Dostawca'),
      t('List przewozowy'),
    ];

    // Przygotuj wiersze
    const rows = data.map((row: ConstructionReportData) => [
      row.siteName,
      row.date,
      row.asphaltClass,
      row.tons,
      row.supplier,
      row.waybill,
    ]);

    // Podsumowanie
    const totalTons = data.reduce((sum: number, row: ConstructionReportData) => sum + row.tons, 0);
    rows.push([]);
    rows.push([`${t('Razem')}:`, '', '', totalTons, '']);

    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    worksheet['!cols'] = [
      { wch: 30 }, // Budowa
      { wch: 12 }, // Data
      { wch: 20 }, // Klasa
      { wch: 10 }, // Tony
      { wch: 20 }, // Dostawca
      { wch: 20 }, // LS
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t('Baustellen'));

    const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const fileName = `budowy_${format(options.startDate, 'yyyy-MM-dd')}_${format(options.endDate, 'yyyy-MM-dd')}.xlsx`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
    return fileUri;
  } catch (error) {
    console.error('Błąd generowania raportu budów Excel:', error);
    throw new Error(createTranslator(options.language ?? 'pl')('Nie udalo sie wygenerowac raportu Excel'));
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
    const language = options.language ?? 'pl';
    const t = createTranslator(language);
    const dateLocale = getLocale(language);
    // Pobierz dane z bazy
    const data = await fetchReportData(options, t, dateLocale);
    
    // Przygotuj HTML do druku
    const totalHours = data.reduce((sum, row) => sum + row.hours, 0);
    
    // Buduj tabelę HTML
    const tableRows = data.map(row => `
      <tr>
        <td style="border: 1px solid #ccc; padding: 4px;">${row.employeeName}</td>
        <td style="border: 1px solid #ccc; padding: 4px;">${row.position}</td>
        <td style="border: 1px solid #ccc; padding: 4px;">${row.date}</td>
        <td style="border: 1px solid #ccc; padding: 4px;">${row.hours.toFixed(2)}</td>
        <td style="border: 1px solid #ccc; padding: 4px;">${translateStatus(row.status, t)}</td>
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
        <h1>${t('Raport czasu pracy')}</h1>
        <h2>${t('Okres')}: ${format(options.startDate, 'dd.MM.yyyy', { locale: dateLocale })} - ${format(options.endDate, 'dd.MM.yyyy', { locale: dateLocale })}</h2>
        <h2>${t('Wygenerowano')}: ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: dateLocale })}</h2>
        
        <table>
          <thead>
            <tr>
              <th>${t('Pracownik')}</th>
              <th>${t('Stanowisko')}</th>
              <th>${t('Data')}</th>
              <th>${t('Godziny')}</th>
              <th>${t('Status')}</th>
              ${options.includeNotes ? `<th>${t('Notatki')}</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div class="summary">
          <strong>${t('Laczna liczba godzin')}: ${totalHours.toFixed(2)}</strong>
        </div>
        
        <div class="footer">
          TimeTracker • asphaltbau • ${t('Wygenerowano automatycznie')}
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
    const fileName = `${t('raport')}_${format(options.startDate, 'yyyy-MM-dd')}_${format(options.endDate, 'yyyy-MM-dd')}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${fileName}`;
    
    // Skopiuj do docelowej lokalizacji
    await FileSystem.copyAsync({
      from: uri,
      to: newUri,
    });

    return newUri;
  } catch (error) {
    console.error('Błąd generowania raportu PDF:', error);
    throw new Error(createTranslator(options.language ?? 'pl')('Nie udalo sie wygenerowac raportu PDF'));
  }
}

/**
 * Generuje raport PDF z danymi o dostawach (budowy)
 */
export async function generateConstructionPdfReport(options: ExportConstructionOptions): Promise<string> {
  try {
    const language = options.language ?? 'pl';
    const t = createTranslator(language);
    const dateLocale = getLocale(language);
    
    const data = await fetchConstructionReportData(options, t, dateLocale);
    const totalTons = data.reduce((sum: number, row: ConstructionReportData) => sum + row.tons, 0);

    const tableRows = data.map((row: ConstructionReportData) => `
      <tr>
        <td style="border: 1px solid #ccc; padding: 4px;">${row.siteName}</td>
        <td style="border: 1px solid #ccc; padding: 4px;">${row.date}</td>
        <td style="border: 1px solid #ccc; padding: 4px;">${row.asphaltClass}</td>
        <td style="border: 1px solid #ccc; padding: 4px; text-align: right;">${row.tons.toFixed(2)}</td>
        <td style="border: 1px solid #ccc; padding: 4px;">${row.supplier}</td>
        <td style="border: 1px solid #ccc; padding: 4px;">${row.waybill}</td>
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
        <h1>${t('Baustellen')} - ${t('Raport')}</h1>
        <h2>${t('Okres')}: ${format(options.startDate, 'dd.MM.yyyy', { locale: dateLocale })} - ${format(options.endDate, 'dd.MM.yyyy', { locale: dateLocale })}</h2>
        
        <table>
          <thead>
            <tr>
              <th>${t('Budowa')}</th>
              <th>${t('Data')}</th>
              <th>${t('Klasa asfaltu')}</th>
              <th>${t('Tony')}</th>
              <th>${t('Dostawca')}</th>
              <th>${t('List przewozowy')}</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div class="summary">
          <strong>${t('Razem')}: ${totalTons.toFixed(2)} t</strong>
        </div>
        
        <div class="footer">
          TimeTracker • asphaltbau • ${t('Wygenerowano automatycznie')}
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      width: 842,
      height: 595,
    });

    const fileName = `budowy_${format(options.startDate, 'yyyy-MM-dd')}_${format(options.endDate, 'yyyy-MM-dd')}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.copyAsync({ from: uri, to: newUri });

    return newUri;
  } catch (error) {
    console.error('Błąd generowania raportu budów PDF:', error);
    throw new Error(createTranslator(options.language ?? 'pl')('Nie udalo sie wygenerowac raportu PDF'));
  }
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Pobiera dane do raportu z bazy danych
 */
async function fetchReportData(
  options: ExportOptions,
  t: (key: StringKey) => string,
  dateLocale: Locale
): Promise<ReportData[]> {
  let query = supabase
    .from('time_entries')
    .select(`
      employee_id,
      hours,
      date,
      status,
      notes,
      employees (
        id,
        name,
        position
      )
    `)
    .gte('date', format(options.startDate, 'yyyy-MM-dd'))
    .lte('date', format(options.endDate, 'yyyy-MM-dd'))
    .order('date', { ascending: false });

  if (options.employeeIds && options.employeeIds.length > 0) {
    query = query.in('employee_id', options.employeeIds);
  }

  const { data, error } = await query;
  
  if (error) {
    throw new Error(`${t('Blad pobierania danych')}: ${error.message}`);
  }
  
  // Transformuj dane
  return (data || []).map((entry: any) => {
    // Supabase może zwrócić relację jako obiekt lub tablicę
    const employee = Array.isArray(entry.employees) ? entry.employees[0] : entry.employees;
    return {
      employeeId: employee?.id || entry.employee_id || 'unknown',
      employeeName: employee?.name || t('Nieznany'),
      position: employee?.position || '',
      date: entry.date,
      hours: entry.hours,
      status: entry.status,
      notes: entry.notes
    };
  });
}

/**
 * Pobiera dane o dostawach do raportu
 */
async function fetchConstructionReportData(
  options: ExportConstructionOptions,
  t: (key: StringKey) => string,
  dateLocale: Locale
): Promise<ConstructionReportData[]> {
  let query = supabase
    .from('deliveries')
    .select(`
      id,
      tons,
      lieferschein_nr,
      supplier,
      delivery_time,
      construction_sites (
        name
      ),
      asphalt_types (
        name
      )
    `)
    .gte('delivery_time', options.startDate.toISOString())
    .lte('delivery_time', options.endDate.toISOString())
    .order('delivery_time', { ascending: false });

  if (options.siteIds && options.siteIds.length > 0) {
    query = query.in('site_id', options.siteIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`${t('Blad pobierania danych')}: ${error.message}`);
  }

  return (data || []).map((d: any) => {
    const site = Array.isArray(d.construction_sites) ? d.construction_sites[0] : d.construction_sites;
    const asphalt = Array.isArray(d.asphalt_types) ? d.asphalt_types[0] : d.asphalt_types;
    
    return {
      siteName: site?.name || t('Nieznany'),
      date: format(new Date(d.delivery_time), 'dd.MM.yyyy HH:mm', { locale: dateLocale }),
      asphaltClass: asphalt?.name || t('Nieznany typ'),
      tons: Number(d.tons),
      waybill: d.lieferschein_nr || '-',
      supplier: d.supplier || t('Brak firmy'),
    };
  });
}

/**
 * Tłumaczy status na język polski
 */
function translateStatus(status: string, t: (key: StringKey) => string): string {
  const translations: Record<string, string> = {
    work: t('Praca'),
    sick: t('Chorobowe'),
    vacation: t('Urlop'),
    fza: t('FZA')
  };
  
  return translations[status] || status;
}

/**
 * Udostępnia plik użytkownikowi (do pobrania/wysłania)
 */
export async function shareReport(fileUri: string, language: Language = 'pl'): Promise<void> {
  const t = createTranslator(language);
  console.log('shareReport called with:', fileUri);
  
  // Check if file exists
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) {
    throw new Error(t('Plik raportu nie zostal znaleziony'));
  }
  
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(t('Udostepnianie nie jest dostepne na tym urzadzeniu'));
  }
  
  console.log('Opening share dialog...');
  const result = await Sharing.shareAsync(fileUri, {
    mimeType: fileUri.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: t('Udostepnij raport'),
    UTI: fileUri.endsWith('.pdf') ? 'com.adobe.pdf' : 'org.openxmlformats.spreadsheetml.sheet'
  });
  console.log('Share result:', result);
}

/**
 * Generuje tygodniowy raport budowy (Tagesrapport) w układzie poziomym
 * UKŁAD: Wiersze = dane budowy, Kolumny = dni (Pon-Pią)
 */
export async function generateWeeklyConstructionReport(
  weekStart: Date,
  weekEnd: Date,
  language: Language = 'pl'
): Promise<string> {
  try {
    const t = createTranslator(language);
    const dateLocale = getLocale(language);

    // 1. Pobierz dane z Supabase
    // Używamy joinów według specyfikacji użytkownika
    const { data: rawData, error } = await supabase
      .from('deliveries')
      .select(`
        tons,
        supplier,
        lieferschein_nr,
        delivery_time,
        construction_sites (
          id,
          name,
          address
        ),
        asphalt_types (
          name
        )
      `)
      .gte('delivery_time', format(weekStart, "yyyy-MM-dd'T'00:00:00.000'Z'"))
      .lte('delivery_time', format(weekEnd, "yyyy-MM-dd'T'23:59:59.999'Z'"));

    if (error) throw error;
    // 2. Przetwórz i pogrupuj dane
    // Grupowanie: Budowa -> Dzień -> Asfalt
    interface WeeklyConstructionDataLocal {
      siteId: string;
      siteName: string;
      siteAddress: string;
      deliveries: Record<string, {
        asphaltTypes: { name: string; sumTons: number }[];
        suppliers: string[];
        waybills: string[];
      }>;
    }

    const sitesMap = new Map<string, WeeklyConstructionDataLocal>();

    (rawData || []).forEach((d) => {
      // Supabase returns foreign keys as objects, but TypeScript might think it's an array if multiple were possible.
      // Force extraction to be sure.
      const site = Array.isArray(d.construction_sites) ? d.construction_sites[0] : d.construction_sites;
      const asphalt = Array.isArray(d.asphalt_types) ? d.asphalt_types[0] : d.asphalt_types;
      
      if (!site) {
        console.warn(`[Tagesrapport] Missing site for delivery matching waybill ${d.lieferschein_nr}`);
        return;
      }

      if (!sitesMap.has(site.id)) {
        console.log(`[Tagesrapport] Adding site: ${site.name} (${site.id})`);
        sitesMap.set(site.id, {
          siteId: site.id,
          siteName: site.name,
          siteAddress: site.address || '-',
          deliveries: {}
        });
      }

      const siteData = sitesMap.get(site.id)!;
      const dateKey = format(new Date(d.delivery_time), 'yyyy-MM-dd');

      if (!siteData.deliveries[dateKey]) {
        siteData.deliveries[dateKey] = {
          asphaltTypes: [],
          suppliers: [],
          waybills: []
        };
      }

      const dayData = siteData.deliveries[dateKey];
      const asphaltName = asphalt?.name || t('Nieznany');
      
      const existingAsphalt = dayData.asphaltTypes.find(a => a.name === asphaltName);
      if (existingAsphalt) {
        existingAsphalt.sumTons += Number(d.tons);
      } else {
        dayData.asphaltTypes.push({ name: asphaltName, sumTons: Number(d.tons) });
      }
      
      if (d.supplier && !dayData.suppliers.includes(d.supplier)) {
        dayData.suppliers.push(d.supplier);
      }
      if (d.lieferschein_nr && !dayData.waybills.includes(d.lieferschein_nr)) {
        dayData.waybills.push(d.lieferschein_nr);
      }
    });

    console.log(`[Tagesrapport] Processing completed. Sites with data: ${sitesMap.size}`);
    if (sitesMap.size === 0) {
      console.warn('[Tagesrapport] NO SITES FOUND. Check if delivery_time matches the selected week.');
    }

    // 3. Przygotuj Workbook ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(t('Tagesrapport'));

    // Formaty dni (Dynamiczne na podstawie wybranego zakresu od-do)
    const days: Date[] = [];
    let curr = new Date(weekStart);
    curr.setHours(0, 0, 0, 0);
    const end = new Date(weekEnd);
    end.setHours(23, 59, 59, 999);
    
    while (curr <= end) {
      days.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    // Styles
    const borderThin: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
    };

    // Column widths
    worksheet.getColumn(1).width = 15; // Kolumna A
    for (let i = 2; i <= days.length + 1; i++) {
        worksheet.getColumn(i).width = 22; // Kolumny dni
    }

    // A1:Ostatnia Header
    const weekNum = format(weekStart, 'w');
    const year = format(weekStart, 'yyyy');
    
    // Tytuł w nagłówku
    let titleText = `RAPORT OD ${format(weekStart, 'dd.MM')} DO ${format(weekEnd, 'dd.MM.yyyy')}`;
    if (days.length <= 7) {
       titleText = `TAGESRAPPORT KW ${weekNum} / ${year}`;
    }
    
    const titleRow = worksheet.addRow([titleText]);
    worksheet.mergeCells(1, 1, 1, days.length + 1);
    titleRow.getCell(1).style = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E2E2E' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };
    titleRow.height = 25;

    // Row 2: Dates
    const dateLabels = ['', ...days.map(d => format(d, 'dd.MM.yyyy'))];
    const dateRow = worksheet.addRow(dateLabels);
    dateRow.eachCell((cell, colNum) => {
      if (colNum > 1) {
        cell.style = {
          font: { bold: true, color: { argb: 'FFFFFFFF' } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6A8F3C' } },
          alignment: { horizontal: 'center' },
          border: borderThin
        };
      }
    });

    // 4. Renderuj tabelę horyzontalną (jeden blok na cały tydzień)
    const buildRow = (label: string, getter: (day: Date) => string, style?: Partial<ExcelJS.Style>) => {
      const row = worksheet.addRow([label]);
      row.getCell(1).style = {
        font: { bold: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0EDE8' } },
        border: borderThin
      };

      days.forEach((day, idx) => {
        const val = getter(day);
        const cell = row.getCell(idx + 2);
        cell.value = val;
        cell.style = { 
          border: borderThin,
          alignment: { wrapText: true, vertical: 'middle', horizontal: 'center' },
          ...style
        };
      });
      return row;
    };

    // Funkcja pomocnicza do pobierania wszystkich wpisów danego dnia (wszystkie budowy)
    const getFlattenedDayData = (day: Date) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const results: { siteName: string; siteAddress: string; asphaltName: string; tons: string; supplier: string; waybill: string }[] = [];
      
      sitesMap.forEach(site => {
        const d = site.deliveries[dateKey];
        if (d) {
          d.asphaltTypes.forEach(at => {
            results.push({
              siteName: site.siteName,
              siteAddress: site.siteAddress,
              asphaltName: at.name,
              tons: at.sumTons.toFixed(2),
              supplier: d.suppliers && d.suppliers.length > 0 ? d.suppliers.join(', ') : '-',
              waybill: d.waybills && d.waybills.length > 0 ? d.waybills.join(', ') : '-'
            });
          });
        }
      });
      return results;
    };

    // Nr budowy
    buildRow(t('Nr budowy'), (day) => {
      return getFlattenedDayData(day).map(r => r.siteName).join('\n');
    });
    // Adres
    buildRow(t('Adres'), (day) => {
      return getFlattenedDayData(day).map(r => r.siteAddress).join('\n');
    });
    // Klasa asfaltu
    buildRow(t('Klasa asfaltu'), (day) => {
      return getFlattenedDayData(day).map(r => r.asphaltName).join('\n');
    });
    // Ilość [to]
    buildRow(t('Ilosc [to]'), (day) => {
      return getFlattenedDayData(day).map(r => r.tons).join('\n');
    }, { font: { bold: true } });
    // Dostawca
    buildRow(t('Dostawca'), (day) => {
      return getFlattenedDayData(day).map(r => r.supplier).join('\n');
    });
    // LS nr
    buildRow(t('LS nr'), (day) => {
      return getFlattenedDayData(day).map(r => r.waybill).join('\n');
    });
    // Notatki
    const notesRow = buildRow(t('Notatki'), () => '', { 
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBF5' } } 
    });
    notesRow.getCell(1).style = {
      font: { bold: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBF5' } },
      border: borderThin
    };

    // Poprawka koloru nagłówka na Orange (#E8631A) zgodnie z mockupem
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8631A' } };

    // Finalizacja pliku
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const fileName = `tagesrapport_KW${weekNum}_${year}.xlsx`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
  } catch (error) {
    console.error('Błąd generowania raportu tygodniowego budowy:', error);
    throw error;
  }
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
