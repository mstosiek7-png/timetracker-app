// =====================================================
// Einsatzplan PDF Service
// Generuje PDF z danymi z tabeli einsatzplan
// Layout: A4 landscape, tabela tygodniowa zielone nagłówki
// =====================================================
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { supabase } from './supabase';
import { format } from 'date-fns';

const WEEKDAY_DE = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

// ─── Helpers ───────────────────────────────────────────────

/** ISO 8601: oblicza daty poniedziałek–piątek dla danego KW */
export function getWeekDays(kw: number, year: number): Date[] {
  const jan4 = new Date(year, 0, 4);
  const startOfYear = new Date(jan4);
  startOfYear.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const monday = new Date(startOfYear);
  monday.setDate(startOfYear.getDate() + (kw - 1) * 7);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/** Zwraca datę od–do dla danego miesiąca (1-based) */
export function getMonthBounds(
  month: number,
  year: number,
): { dateFrom: Date; dateTo: Date } {
  return {
    dateFrom: new Date(year, month - 1, 1),
    dateTo: new Date(year, month, 0),
  };
}

/** Oblicza numer KW i rok (ISO 8601) z dowolnej daty */
export function getISOWeek(date: Date): { kw: number; year: number } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const kw =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    );
  const thu = new Date(date);
  thu.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  return { kw, year: thu.getFullYear() };
}

/** Nawigacja do poprzedniego/następnego tygodnia */
export function navigateKW(
  kw: number,
  year: number,
  direction: 1 | -1,
): { kw: number; year: number } {
  const days = getWeekDays(kw, year);
  const monday = days[0];
  const newMonday = new Date(monday);
  newMonday.setDate(monday.getDate() + direction * 7);
  return getISOWeek(newMonday);
}

// ─── HTML rendering ────────────────────────────────────────

function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function fmtDateShort(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.`;
}

function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderCell(entries: any[]): string {
  if (!entries.length) return '<td></td>';
  const rows = entries
    .map(
      (e, i) => `
      ${i > 0 ? '<hr class="sep"/>' : ''}
      <div class="e-name">${esc(e.construction_sites?.name)}</div>
      <div class="e-addr">${esc(e.construction_sites?.address)}</div>
      <div class="e-mix">${esc(e.mischgut)}</div>
      <div>Plan: ${e.tonnen_plan != null ? e.tonnen_plan + ' to' : '—'}</div>
      <div>Real: ${e.tonnen_real != null ? e.tonnen_real + ' to' : '—'}</div>
    `,
    )
    .join('');
  return `<td>${rows}</td>`;
}

export function renderWeekHTML(weekData: {
  kw: number;
  year: number;
  days: Record<string, any[]>;
}): string {
  const days = getWeekDays(weekData.kw, weekData.year);

  const headerCols = days
    .map(
      d =>
        `<th>${WEEKDAY_DE[d.getDay()] || ''}<br/><span class="date-small">${fmtDate(d)}</span></th>`,
    )
    .join('');

  const dataCols = days.map(d => renderCell(weekData.days[fmtDateShort(d)] || weekData.days[d.toISOString().split('T')[0]] || [])).join('');

  return `
    <div class="week-block">
      <div class="kw-header">Einsatzplan KW${weekData.kw}</div>
      <table>
        <thead>
          <tr>
            <th class="label-col"></th>
            ${headerCols}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="label">Baustelle /<br/>Mischgut /<br/>Tonnen</td>
            ${dataCols}
          </tr>
        </tbody>
      </table>
      <div class="kw-footer">Einsatzplan KW${weekData.kw}</div>
    </div>
  `;
}

const PDF_CSS = `
body { font-family: Arial, sans-serif; font-size: 10px; margin: 0; }
.week-block { margin-bottom: 24px; page-break-after: always; }
.week-block:last-child { page-break-after: auto; }
.kw-header {
  background: #4CAF50; color: white; text-align: center;
  font-weight: bold; padding: 6px; font-size: 13px;
}
.kw-footer {
  background: #4CAF50; color: white; text-align: center;
  padding: 4px; font-size: 10px;
}
table { width: 100%; border-collapse: collapse; }
th {
  background: #c8e6c9; border: 1px solid #999;
  padding: 5px 4px; text-align: center; font-size: 9px;
}
th.label-col { width: 70px; background: #f0f0f0; }
td {
  border: 1px solid #ccc; padding: 4px; vertical-align: top;
  font-size: 9px; min-height: 20px;
}
td.label { background: #f0f0f0; font-weight: bold; white-space: nowrap; width: 70px; }
.e-name { font-weight: bold; }
.e-addr { color: #666; font-size: 8px; }
.e-mix { margin-top: 2px; }
.sep { margin: 3px 0; border: none; border-top: 1px solid #ddd; }
.date-small { font-weight: normal; }
@page { size: A4 landscape; margin: 10mm; }
`;

// ─── Main export ───────────────────────────────────────────

export interface EinsatzplanPdfOptions {
  dateFrom: Date;
  dateTo: Date;
  rangeLabel: string; // used in filename, e.g. "KW12_2026" or "2026_03"
}

export async function generateEinsatzplanPdf(
  options: EinsatzplanPdfOptions,
): Promise<string> {
  const { dateFrom, dateTo, rangeLabel } = options;

  const { data, error } = await supabase
    .from('einsatzplan')
    .select(
      `date, kw, year, mischgut, tonnen_plan, tonnen_real,
       construction_sites ( name, address )`,
    )
    .gte('date', format(dateFrom, 'yyyy-MM-dd'))
    .lte('date', format(dateTo, 'yyyy-MM-dd'))
    .order('date');

  if (error) throw new Error('Błąd pobierania danych: ' + error.message);
  if (!data || data.length === 0)
    throw new Error('Brak danych dla wybranego zakresu.');

  // Group by week
  const byWeek: Record<
    string,
    { kw: number; year: number; days: Record<string, any[]> }
  > = {};

  for (const row of data as any[]) {
    const key = `${row.year}-${String(row.kw).padStart(2, '0')}`;
    if (!byWeek[key])
      byWeek[key] = { kw: row.kw, year: row.year, days: {} };
    if (!byWeek[key].days[row.date]) byWeek[key].days[row.date] = [];
    byWeek[key].days[row.date].push(row);
  }

  const sortedWeeks = Object.values(byWeek).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.kw - b.kw,
  );

  const weeksHtml = sortedWeeks.map(w => renderWeekHTML(w)).join('');
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>${PDF_CSS}</style>
</head><body>${weeksHtml}</body></html>`;

  const { uri } = await Print.printToFileAsync({ html });

  const fileName = `Einsatzplan_${rangeLabel}.pdf`;
  const pdfUri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.moveAsync({ from: uri, to: pdfUri });

  return pdfUri;
}
