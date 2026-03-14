// =====================================================
// AI Report Service — Eksport Budowy + Lohnliste
// =====================================================
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { supabase } from './supabase';
import { format } from 'date-fns';

const PROXY_URL = process.env.EXPO_PUBLIC_LITELLM_PROXY_URL;
const PROXY_KEY = process.env.EXPO_PUBLIC_LITELLM_KEY;
console.log('[AI Config] PROXY_URL:', PROXY_URL ? PROXY_URL.slice(0, 40) : 'BRAK');
const REPORT_TIMEOUT_MS = 30_000;

export class AiReportError extends Error {
  constructor(
    message: string,
    public readonly type: 'network' | 'timeout' | 'no_data' | 'parse',
  ) {
    super(message);
    this.name = 'AiReportError';
  }
}

async function callProxy(prompt: string): Promise<string> {
  if (!PROXY_URL || !PROXY_KEY) {
    throw new AiReportError('Brak konfiguracji proxy AI', 'network');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS);

  try {
    const response = await fetch(`${PROXY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PROXY_KEY}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4.5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error('[AI Proxy] HTTP', response.status, body);
      throw new AiReportError(`Proxy błąd ${response.status}: ${body.slice(0, 120)}`, 'network');
    }

    const json = await response.json();
    const text: string = json?.choices?.[0]?.message?.content ?? '';
    if (!text) throw new AiReportError('Pusta odpowiedź od AI.', 'parse');
    return text.trim();
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      throw new AiReportError('Przekroczono czas oczekiwania.', 'timeout');
    }
    if (err instanceof AiReportError) throw err;
    console.error('[AI Proxy] fetch error:', err?.message, err);
    throw new AiReportError(`Błąd połączenia: ${err?.message ?? 'nieznany'}`, 'network');
  }
}

// ─── Typ A: Eksport Budowy ─────────────────────────────────

export interface BaustellenReportOptions {
  siteId: string;
  dateFrom: Date;
  dateTo: Date;
  language: 'pl' | 'de';
}

export async function generateBaustellenReport(
  options: BaustellenReportOptions,
): Promise<string> {
  const { siteId, dateFrom, dateTo, language } = options;

  // Fetch data
  const { data, error } = await supabase
    .from('einsatzplan')
    .select('date, mischgut, tonnen_plan, tonnen_real, construction_sites(name, address)')
    .eq('construction_site_id', siteId)
    .gte('date', format(dateFrom, 'yyyy-MM-dd'))
    .lte('date', format(dateTo, 'yyyy-MM-dd'))
    .order('date');

  if (error) throw new AiReportError('Błąd pobierania danych.', 'network');
  if (!data || data.length === 0) {
    throw new AiReportError('Brak danych dla wybranego okresu.', 'no_data');
  }

  const firstRow = data[0] as any;
  const siteName = firstRow?.construction_sites?.name ?? '';
  const siteAddress = firstRow?.construction_sites?.address ?? '';

  const payload = {
    baustelle: siteName,
    adresse: siteAddress,
    zeitraum: {
      von: format(dateFrom, 'yyyy-MM-dd'),
      bis: format(dateTo, 'yyyy-MM-dd'),
    },
    tage: data.map((row: any) => ({
      datum: row.date,
      mischgut: row.mischgut,
      tonnen_plan: row.tonnen_plan,
      tonnen_real: row.tonnen_real,
    })),
  };

  const prompt = `Wygeneruj raport w języku: ${language === 'de' ? 'de' : 'pl'}.

Dane (JSON):
${JSON.stringify(payload, null, 2)}

Struktura raportu (zachowaj kolejność):
1. Nagłówek: nazwa budowy, adres, zakres dat, data wygenerowania
2. Tabela dzienna: data | Mischgut | Tonnen Plan | Tonnen Real | Różnica | % realizacji
   - tonnen_real = null → wpisz "—" w kolumnach Real, Różnica i %
3. Podsumowanie: suma plan | suma real | łączna różnica | % całości
4. Anomalie (TYLKO jeśli są): dni z |różnica| > 10% planu
5. Grupowanie po Mischgut: suma plan i suma real per klasa

Zasady:
- Liczby: 1 miejsce po przecinku, separator: przecinek (PL) / Komma (DE)
- Daty: DD.MM.YYYY
- Dzisiejsza data: ${format(new Date(), 'dd.MM.yyyy')}
- Zwróć tylko tekst raportu. Bez komentarzy.`;

  const reportText = await callProxy(prompt);

  // Save as text file
  const fileName = `baustellen_${siteName.replace(/\s+/g, '_')}_${format(dateFrom, 'yyyyMM')}.txt`;
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, reportText, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return fileUri;
}

// ─── Typ B: Lohnliste ──────────────────────────────────────

export interface LohnlisteOptions {
  employeeIds: string[];
  dateFrom: Date;
  dateTo: Date;
}

const STATUS_MAP: Record<string, string> = {
  work: 'work',
  sick: 'sick',
  vacation: 'vacation',
  fza: 'fza',
};

export async function generateLohnliste(options: LohnlisteOptions): Promise<string> {
  const { employeeIds, dateFrom, dateTo } = options;

  let query = supabase
    .from('time_entries')
    .select('date, hours, status, employees(name)')
    .gte('date', format(dateFrom, 'yyyy-MM-dd'))
    .lte('date', format(dateTo, 'yyyy-MM-dd'))
    .order('date');

  if (employeeIds.length > 0) {
    query = query.in('employee_id', employeeIds);
  }

  const { data, error } = await query;
  if (error) throw new AiReportError('Błąd pobierania danych.', 'network');
  if (!data || data.length === 0) {
    throw new AiReportError('Brak danych dla wybranego okresu.', 'no_data');
  }

  // Group by employee, sort alphabetically by name
  const byEmployee: Record<string, { name: string; eintraege: { datum: string; status: string; hours: number | null }[] }> = {};
  for (const row of data as any[]) {
    const name: string = row?.employees?.name ?? 'Unbekannt';
    if (!byEmployee[name]) byEmployee[name] = { name, eintraege: [] };
    byEmployee[name].eintraege.push({
      datum: row.date,
      status: STATUS_MAP[row.status] ?? row.status,
      hours: row.hours ?? null,
    });
  }

  const sortedEmployees = Object.values(byEmployee).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const monat = format(dateFrom, 'MMMM yyyy', { locale: undefined });

  const payload = { monat, mitarbeiter: sortedEmployees };

  const prompt = `Generiere eine Lohnliste auf Deutsch.

Eingabedaten (JSON):
${JSON.stringify(payload, null, 2)}

Format (exakt einhalten):
LOHNLISTE — {Monat Jahr}
{Name}
{DD.MM.}  {Xh YYmin}   Arbeit
{DD.MM.}  —             Krank
{DD.MM.}  —             FZA
{DD.MM.}  —             Urlaub

Gesamt Arbeit:    {X}h {YY}min
Kranktage:        {N}
FZA-Tage:         {N}
Urlaubstage:      {N}
─────────────────────────────
{nächster Mitarbeiter...}

Regeln:
- Status-Mapping: work→Arbeit, sick→Krank, vacation→Urlaub, fza→FZA
- Wochenenden weglassen.
- Tage ohne Eintrag weglassen.
- Mitarbeiter ohne Einträge im Zeitraum weglassen.
- Stunden: "Xh YYmin" (z.B. "8h 00min", "9h 30min").
- Alphabetisch nach Name sortieren.
- Nur die fertige Lohnliste, kein Kommentar.`;

  const reportText = await callProxy(prompt);

  // Save as PDF
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: monospace; font-size: 12px; white-space: pre-wrap; margin: 24px; }
</style></head>
<body>${reportText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body></html>`;

  const { uri } = await Print.printToFileAsync({ html });

  // Rename to .pdf
  const pdfName = `lohnliste_${format(dateFrom, 'yyyy_MM')}.pdf`;
  const pdfUri = `${FileSystem.documentDirectory}${pdfName}`;
  await FileSystem.moveAsync({ from: uri, to: pdfUri });

  return pdfUri;
}
