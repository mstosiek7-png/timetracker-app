// =====================================================
// Einsatzplan Diff Utilities
// =====================================================

export interface DiffResult {
  label: string;
  color: string;
}

/**
 * Calculates the difference between planned and real tons.
 * Returns null when tonnen_real is not yet entered.
 */
export function calcDiff(
  tonnen_plan: number | null,
  tonnen_real: number | null | undefined,
): DiffResult | null {
  if (tonnen_real === null || tonnen_real === undefined) return null;
  if (tonnen_plan === null) return null;

  const diff = tonnen_real - tonnen_plan;

  if (diff > 0) {
    return { label: `+${diff.toFixed(1).replace('.', ',')} t`, color: '#22c55e' };
  }
  if (diff < 0) {
    return { label: `${diff.toFixed(1).replace('.', ',')} t`, color: '#ef4444' };
  }
  return { label: '0,0 t', color: '#6b7280' };
}

/**
 * Formats a tonnage value for display (e.g. 40.0 → "40,0 t").
 * Returns "—" for null/undefined.
 */
export function formatTonnen(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(1).replace('.', ',')} t`;
}

/**
 * Parses user input for tonnen_real.
 * Accepts both "38,5" and "38.5" formats.
 * Returns null for invalid input.
 */
export function parseRealInput(input: string): number | null {
  if (!input || input.trim() === '') return null;
  const normalized = input.trim().replace(',', '.');
  const value = parseFloat(normalized);
  if (isNaN(value)) return null;
  if (value < 0) return null;
  if (value > 9999.99) return null;
  return value;
}

/**
 * Simple string similarity (0–1) based on longest common subsequence.
 * Used for fuzzy-matching OCR site names to construction_sites.
 */
export function stringSimilarity(a: string, b: string): number {
  const sa = a.toLowerCase().trim();
  const sb = b.toLowerCase().trim();
  if (sa === sb) return 1;
  if (sa.length === 0 || sb.length === 0) return 0;

  const longer = sa.length > sb.length ? sa : sb;
  const shorter = sa.length > sb.length ? sb : sa;

  // Check if shorter is a substring of longer
  if (longer.includes(shorter)) return shorter.length / longer.length;

  // Count common characters (simple approach)
  let common = 0;
  const bChars = sb.split('');
  for (const ch of sa) {
    const idx = bChars.indexOf(ch);
    if (idx !== -1) {
      common++;
      bChars.splice(idx, 1);
    }
  }
  return (2 * common) / (sa.length + sb.length);
}
