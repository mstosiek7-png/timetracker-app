// =====================================================
// OCR Service — Einsatzplan import via Claude Vision
// =====================================================
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';
import { EinsatzplanOcrResult } from '../types/models';
import { stringSimilarity } from '../utils/einsatzplanDiff';

const PROXY_URL = process.env.EXPO_PUBLIC_LITELLM_PROXY_URL;
const PROXY_KEY = process.env.EXPO_PUBLIC_LITELLM_KEY;
const OCR_TIMEOUT_MS = 15_000;

const EINSATZPLAN_PROMPT = `Przeanalizuj tabelę Einsatzplan na zdjęciu.
Zwróć TYLKO poprawny JSON — bez komentarzy, bez markdown, bez tekstu przed ani po.

Format:
{
  "kw": 42,
  "year": 2024,
  "days": [
    {
      "date": "2024-10-14",
      "baustelle": "Langenpreising",
      "adresse": "Danner, Garagen Park",
      "mischgut": "AC 32 TN 50/70",
      "tonnen_plan": 40,
      "confidence": 0.95
    }
  ]
}

Zasady:
- "confidence" (0.0–1.0): pewność rozpoznania. Nieczytelne pole → wartość < 0.80.
- Pomiń dni bez wpisów i weekendy.
- Nieczytelna data → pomiń cały wiersz.
- Nieczytelne "tonnen_plan" → ustaw null i confidence 0.0.`;

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
        model: 'anthropic/claude-haiku-4.5',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Image}` },
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
      await supabase.from('documents').update({ status: 'failed' }).eq('id', doc.id);
      throw new OcrError('Nie udało się połączyć. Sprawdź internet.', 'proxy');
    }

    json = await response.json();
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      await supabase.from('documents').update({ status: 'failed' }).eq('id', doc.id);
      throw new OcrError('Przekroczono czas oczekiwania.', 'timeout');
    }
    if (err instanceof OcrError) throw err;
    await supabase.from('documents').update({ status: 'failed' }).eq('id', doc.id);
    throw new OcrError('Nie udało się połączyć. Sprawdź internet.', 'network');
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
 * Fuzzy-matches OCR baustelle names to active construction_sites.
 * Returns matchedSiteId or null when similarity < 0.80.
 */
export async function matchSite(
  ocrName: string,
): Promise<{ siteId: string; siteName: string } | null> {
  const { data: sites } = await supabase
    .from('construction_sites')
    .select('id, name')
    .eq('status', 'active');

  if (!sites || sites.length === 0) return null;

  let best = { siteId: '', siteName: '', score: 0 };
  for (const site of sites) {
    const score = stringSimilarity(ocrName, site.name);
    if (score > best.score) {
      best = { siteId: site.id, siteName: site.name, score };
    }
  }

  return best.score >= 0.8 ? { siteId: best.siteId, siteName: best.siteName } : null;
}

/**
 * Saves OCR result to einsatzplan table.
 * Uses upsert on UNIQUE(construction_site_id, date).
 */
export async function saveEinsatzplanRows(
  parsedResult: EinsatzplanOcrResult,
  documentId: string,
  currentUserId: string,
  siteMatches: Record<string, string>, // ocrBaustelle → construction_site_id
): Promise<void> {
  const rows = parsedResult.days
    .filter((day) => siteMatches[day.baustelle])
    .map((day) => ({
      construction_site_id: siteMatches[day.baustelle],
      date: day.date,
      mischgut: day.mischgut ?? null,
      tonnen_plan: day.tonnen_plan ?? null,
      tonnen_real: null,
      kw: parsedResult.kw,
      year: parsedResult.year,
      document_id: documentId,
      created_by: currentUserId,
    }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from('einsatzplan')
    .upsert(rows, { onConflict: 'construction_site_id,date' });

  if (error) throw error;
}
