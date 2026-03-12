// =====================================================
// Export Service - Excel/PDF Report Generation
// FIXED VERSION - tylko xlsx (SheetJS), bez ExcelJS
// =====================================================

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import { Buffer } from 'buffer';
import { supabase } from './supabase';
import { format, type Locale } from 'date-fns';
import { de, pl } from 'date-fns/locale';
import { TimeEntry, SiteDelivery, ActiveSiteSummary } from '../types/models';
import { Language, strings, StringKey } from '../i18n/strings';

// =====================================================
// Types
// =====================================================

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
  date: string;
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

// =====================================================
// Helpers
// =====================================================

function getLocale(language: Language) {
  return language === 'de' ? de : pl;
}

function createTranslator(language: Language) {
  return (key: StringKey) => strings[language][key] ?? key;
}

function translateStatus(status: string, t: (key: StringKey) => string): string {
  const translations: Record<string, string> = {
    work: t('Praca'),
    sick: t('Chorobowe'),
    vacation: t('Urlop'),
    fza: t('FZA'),
  };
  return translations[status] || status;
}

function weekdayShort(dateStr: string): string {
  const d = new Date(dateStr).getDay();
  return ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'][d];
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr).getDay();
  return d === 0 || d === 6;
}

// =====================================================
// Supabase Data Fetching
// =====================================================

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
  if (error) throw new Error(`${t('Blad pobierania danych')}: ${error.message}`);

  return (data || []).map((entry: any) => {
    const employee = Array.isArray(entry.employees) ? entry.employees[0] : entry.employees;
    return {
      employeeId: employee?.id || entry.employee_id || 'unknown',
      employeeName: employee?.name || t('Nieznany'),
      position: employee?.position || '',
      date: entry.date,
      hours: entry.hours,
      status: entry.status,
      notes: entry.notes,
    };
  });
}

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
    .order('delivery_time', { ascending: true });

  if (options.siteIds && options.siteIds.length > 0) {
    query = query.in('site_id', options.siteIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(`${t('Blad pobierania danych')}: ${error.message}`);

  return (data || []).map((d: any) => {
    const site = Array.isArray(d.construction_sites) ? d.construction_sites[0] : d.construction_sites;
    const asphalt = Array.isArray(d.asphalt_types) ? d.asphalt_types[0] : d.asphalt_types;
    return {
      siteName: site?.name || t('Nieznany'),
      // date jako YYYY-MM-DD dla grupowania
      date: format(new Date(d.delivery_time), 'yyyy-MM-dd'),
      asphaltClass: asphalt?.name || t('Nieznany typ'),
      tons: Number(d.tons),
      waybill: d.lieferschein_nr || '-',
      supplier: d.supplier || t('Brak firmy'),
    };
  });
}

// =====================================================
// TAGESRAPPORT - główna funkcja eksportu budów
// Każda dostawa = osobny wiersz, dynamicznie
// =====================================================

export async function generateConstructionExcelReport(
  options: ExportConstructionOptions
): Promise<string> {
  try {
    const language = options.language ?? 'pl';
    const t = createTranslator(language);
    const dateLocale = getLocale(language);

    // 1. Pobierz dane
    const rawData = await fetchConstructionReportData(options, t, dateLocale);

    // 2. Grupuj po dacie (YYYY-MM-DD)
    const deliveriesByDate = new Map<string, ConstructionReportData[]>();
    rawData.forEach((row) => {
      if (!deliveriesByDate.has(row.date)) deliveriesByDate.set(row.date, []);
      deliveriesByDate.get(row.date)!.push(row);
    });

    // 3. Lista dni w zakresie
    const allDays: string[] = [];
    let current = new Date(options.startDate);
    while (current <= options.endDate) {
      allDays.push(format(current, 'yyyy-MM-dd'));
      current.setDate(current.getDate() + 1);
    }

    // 4. Numer tygodnia KW
    const kw = format(options.startDate, 'II', { locale: dateLocale });
    const periodLabel = `${format(options.startDate, 'dd.MM.yyyy')} – ${format(options.endDate, 'dd.MM.yyyy')}`;

    // 5. Buduj wiersze AOA (array of arrays)
    const aoa: any[][] = [];

    // Wiersz 1: Tytuł
    aoa.push([`TAGESRAPPORT  KW${kw}  —  ${periodLabel}`, '', '', '', '', '', '', '', '']);
    // Wiersz 2: Meta
    aoa.push(['Polier:', '', '', 'KW / Tydzień:', '', '', 'Unterschrift:', '', '']);
    // Wiersz 3: Spacer
    aoa.push(['', '', '', '', '', '', '', '', '']);
    // Wiersz 4: Nagłówki
    aoa.push(['Lp.', 'Data', 'Dz.', 'Budowa', 'Klasa asfaltu', 'Ilość [t]', 'Dostawca', 'LS nr', 'Notatki']);

    let totalTons = 0;
    let lp = 0;

    for (const dateStr of allDays) {
      const weekend = isWeekend(dateStr);
      const deliveries = deliveriesByDate.get(dateStr) ?? [];
      const dayLabel = format(new Date(dateStr), 'dd.MM.yyyy');
      const dayShort = weekdayShort(dateStr);

      // Pomijaj puste weekendy
      if (weekend && deliveries.length === 0) continue;

      lp++;

      if (deliveries.length === 0) {
        // Dzień roboczy bez budów
        aoa.push([lp, dayLabel, dayShort, '— brak budów —', '', '', '', '', '']);
      } else {
        // Tyle wierszy ile dostaw w danym dniu
        for (let i = 0; i < deliveries.length; i++) {
          const d = deliveries[i];
          const isFirst = i === 0;
          aoa.push([
            isFirst ? lp : '',
            isFirst ? dayLabel : '',
            isFirst ? dayShort : '',
            d.siteName,
            d.asphaltClass,
            d.tons,
            d.supplier,
            d.waybill,
            '',
          ]);
          totalTons += d.tons;
        }
      }

      // Separator między dniami
      aoa.push(['', '', '', '', '', '', '', '', '']);
    }

    // Wiersz sumy
    aoa.push(['', '', '', '', 'SUMA ŁĄCZNIE:', totalTons, '', '', '']);
    // Notatki
    aoa.push(['', '', '', '', '', '', '', '', '']);
    aoa.push(['NOTATKI:', '', '', '', '', '', '', '', '']);
    aoa.push(['', '', '', '', '', '', '', '', '']);
    aoa.push(['', '', '', '', '', '', '', '', '']);

    // 6. Utwórz arkusz
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws['!cols'] = [
      { wch: 5 },   // A: Lp
      { wch: 13 },  // B: Data
      { wch: 5 },   // C: Dzień
      { wch: 24 },  // D: Budowa
      { wch: 14 },  // E: Klasa asfaltu
      { wch: 11 },  // F: Ilość
      { wch: 16 },  // G: Dostawca
      { wch: 14 },  // H: LS nr
      { wch: 20 },  // I: Notatki
    ];

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Tytuł A1:I1
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }, // Polier A2:C2
      { s: { r: 1, c: 3 }, e: { r: 1, c: 5 } }, // KW D2:F2
      { s: { r: 1, c: 6 }, e: { r: 1, c: 8 } }, // Unterschrift G2:I2
    ];

    // 7. Zapis
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `KW${kw}`);

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const fileName = `tagesrapport_KW${kw}_${format(options.startDate, 'yyyy')}.xlsx`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
  } catch (error) {
    console.error('Błąd generowania Tagesraportu:', error);
    throw new Error(
      createTranslator(options.language ?? 'pl')('Nie udalo sie wygenerowac raportu Excel')
    );
  }
}

// =====================================================
// Excel - Czas pracy pracowników
// =====================================================

export async function generateExcelReport(options: ExportOptions): Promise<string> {
  try {
    const language = options.language ?? 'pl';
    const t = createTranslator(language);
    const dateLocale = getLocale(language);

    const data = await fetchReportData(options, t, dateLocale);

    const days: string[] = [];
    let current = new Date(options.startDate);
    while (current <= options.endDate) {
      days.push(format(current, 'yyyy-MM-dd'));
      current.setDate(current.getDate() + 1);
    }

    const employeesMap = new Map<string, { name: string; position: string; entries: Map<string, { hours: number; status: string }> }>();
    data.forEach((entry) => {
      if (!employeesMap.has(entry.employeeId)) {
        employeesMap.set(entry.employeeId, { name: entry.employeeName, position: entry.position, entries: new Map() });
      }
      const emp = employeesMap.get(entry.employeeId)!;
      const existing = emp.entries.get(entry.date);
      if (existing) {
        existing.hours += entry.hours;
      } else {
        emp.entries.set(entry.date, { hours: entry.hours, status: entry.status });
      }
    });

    const sortedEmployees = Array.from(employeesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    const headerRow = [t('Pracownik'), t('Stanowisko'), ...days.map((d) => format(new Date(d), 'dd.MM')), t('Suma')];
    const aoa: any[][] = [
      [`${t('Raport czasu pracy')} - ${format(options.startDate, 'MM.yyyy')}`],
      headerRow,
    ];

    sortedEmployees.forEach((emp) => {
      const row: any[] = [emp.name, emp.position];
      let total = 0;
      days.forEach((day) => {
        const entry = emp.entries.get(day);
        if (entry) { row.push(entry.hours); total += entry.hours; }
        else row.push('-');
      });
      row.push(total);
      aoa.push(row);
    });

    // Wiersz sum
    const totalsRow: any[] = [t('Razem'), ''];
    days.forEach((day) => {
      let daySum = 0;
      sortedEmployees.forEach((emp) => {
        const e = emp.entries.get(day);
        if (e) daySum += e.hours;
      });
      totalsRow.push(daySum);
    });
    const grandTotal = sortedEmployees.reduce((sum, emp) => {
      let s = 0; emp.entries.forEach((e) => (s += e.hours)); return sum + s;
    }, 0);
    totalsRow.push(grandTotal);
    aoa.push(totalsRow);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, ...days.map(() => ({ wch: 6 })), { wch: 10 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: days.length + 2 } }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('Raport czasu pracy'));

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const fileName = `bericht_${format(options.startDate, 'yyyy_MM')}.xlsx`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
  } catch (error) {
    console.error('Błąd generowania raportu Excel:', error);
    throw new Error(createTranslator(options.language ?? 'pl')('Nie udalo sie wygenerowac raportu Excel'));
  }
}

// =====================================================
// PDF - Czas pracy
// =====================================================

export async function generatePdfReport(options: ExportOptions): Promise<string> {
  try {
    const language = options.language ?? 'pl';
    const t = createTranslator(language);
    const dateLocale = getLocale(language);

    const data = await fetchReportData(options, t, dateLocale);
    const totalHours = data.reduce((sum, row) => sum + row.hours, 0);

    const tableRows = data.map((row) => `
      <tr>
        <td>${row.employeeName}</td>
        <td>${row.position}</td>
        <td>${row.date}</td>
        <td>${row.hours.toFixed(2)}</td>
        <td>${translateStatus(row.status, t)}</td>
        ${options.includeNotes ? `<td>${row.notes || ''}</td>` : ''}
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; } h2 { color: #666; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #404040; color: white; padding: 8px; text-align: left; }
        td { border: 1px solid #ccc; padding: 6px; }
        .summary { margin-top: 20px; padding: 10px; background: #f5f5f5; border-left: 4px solid #404040; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: right; }
      </style></head><body>
        <h1>${t('Raport czasu pracy')}</h1>
        <h2>${t('Okres')}: ${format(options.startDate, 'dd.MM.yyyy', { locale: dateLocale })} - ${format(options.endDate, 'dd.MM.yyyy', { locale: dateLocale })}</h2>
        <h2>${t('Wygenerowano')}: ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: dateLocale })}</h2>
        <table>
          <thead><tr>
            <th>${t('Pracownik')}</th><th>${t('Stanowisko')}</th>
            <th>${t('Data')}</th><th>${t('Godziny')}</th><th>${t('Status')}</th>
            ${options.includeNotes ? `<th>${t('Notatki')}</th>` : ''}
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="summary"><strong>${t('Laczna liczba godzin')}: ${totalHours.toFixed(2)}</strong></div>
        <div class="footer">TimeTracker • asphaltbau • ${t('Wygenerowano automatycznie')}</div>
      </body></html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent, width: 842, height: 595 });
    const fileName = `${t('raport')}_${format(options.startDate, 'yyyy-MM-dd')}_${format(options.endDate, 'yyyy-MM-dd')}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.copyAsync({ from: uri, to: newUri });
    return newUri;
  } catch (error) {
    console.error('Błąd generowania raportu PDF:', error);
    throw new Error(createTranslator(options.language ?? 'pl')('Nie udalo sie wygenerowac raportu PDF'));
  }
}

// =====================================================
// PDF - Budowy
// =====================================================

export async function generateConstructionPdfReport(options: ExportConstructionOptions): Promise<string> {
  try {
    const language = options.language ?? 'pl';
    const t = createTranslator(language);
    const dateLocale = getLocale(language);

    const data = await fetchConstructionReportData(options, t, dateLocale);
    const totalTons = data.reduce((sum, row) => sum + row.tons, 0);

    const tableRows = data.map((row) => `
      <tr>
        <td>${row.siteName}</td>
        <td>${format(new Date(row.date), 'dd.MM.yyyy', { locale: dateLocale })}</td>
        <td>${row.asphaltClass}</td>
        <td style="text-align:right">${row.tons.toFixed(2)}</td>
        <td>${row.supplier}</td>
        <td>${row.waybill}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; } h2 { color: #666; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #404040; color: white; padding: 8px; text-align: left; }
        td { border: 1px solid #ccc; padding: 6px; }
        .summary { margin-top: 20px; padding: 10px; background: #f5f5f5; border-left: 4px solid #E8631A; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: right; }
      </style></head><body>
        <h1>${t('Baustellen')} - ${t('Raport')}</h1>
        <h2>${t('Okres')}: ${format(options.startDate, 'dd.MM.yyyy', { locale: dateLocale })} - ${format(options.endDate, 'dd.MM.yyyy', { locale: dateLocale })}</h2>
        <table>
          <thead><tr>
            <th>${t('Budowa')}</th><th>${t('Data')}</th><th>${t('Klasa asfaltu')}</th>
            <th>${t('Tony')}</th><th>${t('Dostawca')}</th><th>${t('List przewozowy')}</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="summary"><strong>${t('Razem')}: ${totalTons.toFixed(2)} t</strong></div>
        <div class="footer">TimeTracker • asphaltbau • ${t('Wygenerowano automatycznie')}</div>
      </body></html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent, width: 842, height: 595 });
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
// Sharing & File Management
// =====================================================

export async function shareReport(fileUri: string, language: Language = 'pl'): Promise<void> {
  const t = createTranslator(language);

  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) throw new Error(t('Plik raportu nie zostal znaleziony'));
  if (!(await Sharing.isAvailableAsync())) throw new Error(t('Udostepnianie nie jest dostepne na tym urzadzeniu'));

  await Sharing.shareAsync(fileUri, {
    mimeType: fileUri.endsWith('.pdf')
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: t('Udostepnij raport'),
    UTI: fileUri.endsWith('.pdf') ? 'com.adobe.pdf' : 'org.openxmlformats.spreadsheetml.sheet',
  });
}

export async function getSavedReports(): Promise<Array<{ uri: string; name: string; size: number; modified: Date }>> {
  const reportsDir = `${FileSystem.documentDirectory}reports/`;

  const dirInfo = await FileSystem.getInfoAsync(reportsDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(reportsDir, { intermediates: true });
    return [];
  }

  const files = await FileSystem.readDirectoryAsync(reportsDir);

  const reports = await Promise.all(
    files
      .filter((file) => file.endsWith('.pdf') || file.endsWith('.xlsx'))
      .map(async (file) => {
        const fileUri = `${reportsDir}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        return {
          uri: fileUri,
          name: file,
          size: fileInfo.exists ? (fileInfo.size ?? 0) : 0,
          modified: new Date(fileInfo.exists ? (fileInfo.modificationTime ?? Date.now()) : Date.now()),
        };
      })
  );

  return reports.sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

export async function deleteReport(fileUri: string): Promise<void> {
  await FileSystem.deleteAsync(fileUri);
}