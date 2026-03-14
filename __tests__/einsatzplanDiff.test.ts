import { calcDiff, formatTonnen, parseRealInput, stringSimilarity } from '../utils/einsatzplanDiff';

describe('calcDiff', () => {
  test('diff > 0 → green label with + prefix', () => {
    const result = calcDiff(40, 42);
    expect(result).not.toBeNull();
    expect(result!.label).toBe('+2,0 t');
    expect(result!.color).toBe('#22c55e');
  });

  test('diff < 0 → red label with − prefix', () => {
    const result = calcDiff(40, 38.5);
    expect(result).not.toBeNull();
    expect(result!.label).toBe('-1,5 t');
    expect(result!.color).toBe('#ef4444');
  });

  test('diff = 0 → gray label 0,0 t', () => {
    const result = calcDiff(40, 40);
    expect(result).not.toBeNull();
    expect(result!.label).toBe('0,0 t');
    expect(result!.color).toBe('#6b7280');
  });

  test('tonnen_real = null → returns null', () => {
    expect(calcDiff(40, null)).toBeNull();
  });

  test('tonnen_real = undefined → returns null', () => {
    expect(calcDiff(40, undefined)).toBeNull();
  });

  test('tonnen_plan = null → returns null', () => {
    expect(calcDiff(null, 38.5)).toBeNull();
  });

  test('boundary: 0.0 tons', () => {
    const result = calcDiff(0, 0);
    expect(result!.label).toBe('0,0 t');
  });

  test('boundary: large numbers 999.99', () => {
    const result = calcDiff(500, 999.99);
    // toFixed(1) rounds 499.99 → "500,0"
    expect(result!.label).toBe('+500,0 t');
    expect(result!.color).toBe('#22c55e');
  });

  test('uses comma as decimal separator', () => {
    const result = calcDiff(40, 38.5);
    expect(result!.label).toContain(',');
    expect(result!.label).not.toContain('.');
  });
});

describe('formatTonnen', () => {
  test('formats 40 → "40,0 t"', () => {
    expect(formatTonnen(40)).toBe('40,0 t');
  });

  test('formats 38.5 → "38,5 t"', () => {
    expect(formatTonnen(38.5)).toBe('38,5 t');
  });

  test('null → "—"', () => {
    expect(formatTonnen(null)).toBe('—');
  });

  test('undefined → "—"', () => {
    expect(formatTonnen(undefined)).toBe('—');
  });

  test('0 → "0,0 t"', () => {
    expect(formatTonnen(0)).toBe('0,0 t');
  });
});

describe('parseRealInput', () => {
  test('accepts decimal with comma "38,5" → 38.5', () => {
    expect(parseRealInput('38,5')).toBe(38.5);
  });

  test('accepts decimal with dot "38.5" → 38.5', () => {
    expect(parseRealInput('38.5')).toBe(38.5);
  });

  test('accepts zero "0" → 0', () => {
    expect(parseRealInput('0')).toBe(0);
  });

  test('accepts integer "40" → 40', () => {
    expect(parseRealInput('40')).toBe(40);
  });

  test('rejects negative value "-1" → null', () => {
    expect(parseRealInput('-1')).toBeNull();
  });

  test('rejects letters "abc" → null', () => {
    expect(parseRealInput('abc')).toBeNull();
  });

  test('rejects empty string → null', () => {
    expect(parseRealInput('')).toBeNull();
  });

  test('rejects value > 9999.99 → null', () => {
    expect(parseRealInput('10000')).toBeNull();
  });

  test('accepts boundary 9999.99', () => {
    expect(parseRealInput('9999.99')).toBe(9999.99);
  });

  test('trims whitespace', () => {
    expect(parseRealInput('  38,5  ')).toBe(38.5);
  });
});

describe('stringSimilarity', () => {
  test('identical strings → 1', () => {
    expect(stringSimilarity('Langenpreising', 'Langenpreising')).toBe(1);
  });

  test('case-insensitive match → 1', () => {
    expect(stringSimilarity('langenpreising', 'Langenpreising')).toBe(1);
  });

  test('substring match → high score', () => {
    const score = stringSimilarity('Langenpresing', 'Langenpreising');
    expect(score).toBeGreaterThan(0.8);
  });

  test('completely different strings → low score', () => {
    const score = stringSimilarity('Monachium', 'Langenpreising');
    expect(score).toBeLessThan(0.8);
  });

  test('empty strings → 0', () => {
    expect(stringSimilarity('', 'Langenpreising')).toBe(0);
    expect(stringSimilarity('Langenpreising', '')).toBe(0);
  });
});
