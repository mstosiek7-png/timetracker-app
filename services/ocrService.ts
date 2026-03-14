// =====================================================
// OCR Service — Einsatzplan import via Claude Vision
// =====================================================
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';
import { EinsatzplanOcrResult } from '../types/models';
import { stringSimilarity } from '../utils/einsatzplanDiff';

const PROXY_URL = process.env.EXPO_PUBLIC_LITELLM_PROXY_URL;
const PROXY_KEY = process.env.EXPO_PUBLIC_LITELLM_KEY;
const OCR_TIMEOUT_MS = 30_000;

const EINSATZPLAN_PROMPT = `You are reading a German construction weekly plan form (Einsatzplan).
Return ONLY valid JSON — no markdown, no comments, no text before or after.

The form is a TABLE. Each ROW is one job entry. Columns typically include:
- Date (Tag/Datum) — the workday date
- Kostenstelle — the site cost center number (e.g. "129460", "B-123"). READ THIS EXACTLY per row.
- Baustelle — the site address/location text. READ THIS EXACTLY per row.
- Mischgut — asphalt mix class (e.g. "AC 11 DS", "SMA 8 S", "AC 32 TN")
- Menge/Tonnen — planned tonnage (number)

CRITICAL: Each row is INDEPENDENT. Do NOT copy kostenstelle or adresse from one row to another.
If a row has its own kostenstelle value, use that value — even if it differs from other rows.

Response format:
{
  "kw": 42,
  "year": 2024,
  "days": [
    {
      "date": "2024-10-14",
      "kostenstelle": "129460",
      "adresse": "Musterstraße 1, München",
      "mischgut": "AC 32 TN 50/70",
      "tonnen_plan": 40,
      "confidence": 0.95
    }
  ]
}

Rules:
- "kostenstelle": copy EXACTLY from the Kostenstelle column for that specific row
- "adresse": copy EXACTLY from the Baustelle column for that specific row
- "confidence": 0.0–1.0 per row. Unreadable field → below 0.80
- Skip rows with no entries and weekends
- Unreadable date → skip the entire row
- Unreadable "tonnen_plan" → set null, confidence 0.0
- KW (Kalenderwoche) = ISO week number, usually in the form header`;

export class OcrError extends Error {
  constructor(
    message: string,
    public readonly type: 'network' | 'timeout' | 'parse' | 'proxy',
  ) {
    super(message);
    this.name = 'OcrError';
  }
}

/**
 * Runs Einsatzplan OCR on the given image URI.
 * Creates a record in `documents`, calls Claude Vision, saves result.
 * Returns the parsed OCR result and the document ID.
 */
export async function runEinsatzplanOcr(
  imageUri: string,
  currentUserId: string,
): Promise<{ result: EinsatzplanOcrResult; documentId: string }> {
  if (!PROXY_URL || !PROXY_KEY) {
    throw new OcrError('Brak konfiguracji proxy AI', 'network');
  }

  // 1. Read image as base64
  const base64Image = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const ext = imageUri.split('?')[0].split('.').pop()?.toLowerCase();
  const mimeType =
    ext === 'png' ? 'image/png' :
    ext === 'webp' ? 'image/webp' :
    ext === 'gif' ? 'image/gif' : 'image/jpeg';

  // 2. Create document record
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      file_name: `einsatzplan_${Date.now()}.jpg`,
      file_path: imageUri,
      mime_type: 'image/jpeg',
      status: 'processing',
      created_by: currentUserId,
    })
    .select()
    .single();

  if (docError || !doc) {
    throw new OcrError('Nie udało się zapisać dokumentu', 'network');
  }

  // 3. Call Claude Vision with timeout
  let json: any;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

    const response = await fetch(`${PROXY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PROXY_KEY}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64Image}` },
              },
              { type: 'text', text: EINSATZPLAN_PROMPT },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error('[OCR Proxy] HTTP', response.status, body);
      await supabase.from('documents').update({ status: 'failed' }).eq('id', doc.id);
      throw new OcrError(`Proxy błąd ${response.status}: ${body.slice(0, 200)}`, 'proxy');
    }

    json = await response.json();
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      await supabase.from('documents').update({ status: 'failed' }).eq('id', doc.id);
      throw new OcrError('Przekroczono czas oczekiwania.', 'timeout');
    }
    if (err instanceof OcrError) throw err;
    console.error('[OCR Proxy] fetch error:', err?.message, err);
    await supabase.from('documents').update({ status: 'failed' }).eq('id', doc.id);
    throw new OcrError(`Błąd połączenia: ${err?.message ?? 'nieznany'}`, 'network');
  }

  // 4. Parse response
  let parsed: EinsatzplanOcrResult;
  try {
    const raw: string = json?.choices?.[0]?.message?.content ?? '';
    const cleaned = raw.replace(/```json|```/gi, '').trim();
    parsed = JSON.parse(cleaned) as EinsatzplanOcrResult;

    if (!parsed.days || !Array.isArray(parsed.days)) {
      throw new Error('Brak pola days');
    }
  } catch {
    await supabase.from('documents').update({ status: 'failed' }).eq('id', doc.id);
    throw new OcrError(
      'Nie udało się odczytać planu. Spróbuj lepszym zdjęciem.',
      'parse',
    );
  }

  // 5. Update document with parsed data
  await supabase
    .from('documents')
    .update({ ocr_data: parsed as any, ocr_text: JSON.stringify(parsed), status: 'completed' })
    .eq('id', doc.id);

  return { result: parsed, documentId: doc.id };
}

/**
 * Fuzzy-matches OCR kostenstelle to active construction_sites by name.
 * Returns matchedSiteId or null when similarity < 0.80.
 */
export async function matchSite(
  kostenstelle: string,
): Promise<{ siteId: string; siteName: string; score: number } | null> {
  const { data: sites } = await supabase
    .from('construction_sites')
    .select('id, name, address')
    .eq('status', 'active');

  if (!sites || sites.length === 0) return null;

  const kLower = kostenstelle.toLowerCase().trim();

  let best = { siteId: '', siteName: '', score: -1 };
  for (const site of sites) {
    const nameLower = (site.name ?? '').toLowerCase();
    const addrLower = (site.address ?? '').toLowerCase();

    let score = 0;
    if (nameLower.includes(kLower) || kLower.includes(nameLower)) {
      score = 0.9;
    } else if (addrLower.includes(kLower)) {
      score = 0.85;
    } else {
      score = Math.max(
        stringSimilarity(kostenstelle, site.name ?? ''),
        stringSimilarity(kostenstelle, site.address ?? ''),
      );
    }

    if (score > best.score) {
      best = { siteId: site.id, siteName: site.name, score };
    }
  }

  // Always return best available match (even if weak) so import is never blocked
  return best.siteId ? { siteId: best.siteId, siteName: best.siteName, score: best.score } : null;
}

/**
 * Saves OCR result to einsatzplan table.
 * Uses upsert on UNIQUE(construction_site_id, date).
 */
/** Normalizes a date string to ISO format YYYY-MM-DD */
function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  // Already ISO: 2025-10-13
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // German: 13.10.2025 or 13.10.25
  const de = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (de) {
    const year = de[3].length === 2 ? `20${de[3]}` : de[3];
    return `${year}-${de[2].padStart(2, '0')}-${de[1].padStart(2, '0')}`;
  }
  return null;
}

export async function saveEinsatzplanRows(
  parsedResult: EinsatzplanOcrResult,
  documentId: string,
  currentUserId: string,
  siteMatches: Record<string, string>, // kostenstelle → construction_site_id
): Promise<void> {
  // Deduplicate by (construction_site_id, date) — last entry wins
  const seen = new Map<string, object>();
  for (const day of parsedResult.days) {
    const siteId = siteMatches[day.kostenstelle];
    if (!siteId) continue;
    const date = normalizeDate(day.date);
    if (!date) continue;
    const key = `${siteId}|${date}`;
    seen.set(key, {
      construction_site_id: siteId,
      date,
      mischgut: day.mischgut ?? null,
      tonnen_plan: day.tonnen_plan ?? null,
      tonnen_real: null,
      kw: parsedResult.kw,
      year: parsedResult.year,
      document_id: documentId,
      created_by: currentUserId,
    });
  }
  const rows = [...seen.values()];

  if (rows.length === 0) return;

  const { error } = await supabase
    .from('einsatzplan')
    .upsert(rows, { onConflict: 'construction_site_id,date' });

  if (error) throw error;
}
