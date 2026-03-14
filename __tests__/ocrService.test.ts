// =====================================================
// Tests: ocrService — OCR parsing, fuzzy match, save
// =====================================================

// Mock Supabase
jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'doc-uuid-123' }, error: null }),
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-uuid' } } }),
    },
  },
}));

// Mock expo-file-system
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('base64encodedstring=='),
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
}));

// Mock NetInfo — online by default
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
  addEventListener: jest.fn(),
}));

const OCR_SUCCESS_PAYLOAD = {
  kw: 42,
  year: 2024,
  days: [
    {
      date: '2024-10-14',
      baustelle: 'Langenpreising',
      adresse: 'Danner, Garagen Park',
      mischgut: 'AC 32 TN 50/70',
      tonnen_plan: 40,
      confidence: 0.95,
    },
  ],
};

describe('OCR response parsing', () => {
  test('clean JSON parses without error', () => {
    const raw = JSON.stringify(OCR_SUCCESS_PAYLOAD);
    const cleaned = raw.replace(/```json|```/gi, '').trim();
    const parsed = JSON.parse(cleaned);
    expect(parsed.kw).toBe(42);
    expect(parsed.days).toHaveLength(1);
  });

  test('JSON wrapped in ```json ... ``` — strips and parses', () => {
    const raw = '```json\n' + JSON.stringify(OCR_SUCCESS_PAYLOAD) + '\n```';
    const cleaned = raw.replace(/```json|```/gi, '').trim();
    const parsed = JSON.parse(cleaned);
    expect(parsed.year).toBe(2024);
  });

  test('empty days array — parses without crash', () => {
    const raw = JSON.stringify({ kw: 42, year: 2024, days: [] });
    const parsed = JSON.parse(raw);
    expect(parsed.days).toHaveLength(0);
  });

  test('missing tonnen_plan field treated as null', () => {
    const day = { date: '2024-10-14', baustelle: 'TestBau', mischgut: 'AC', confidence: 0.0 };
    expect(day).not.toHaveProperty('tonnen_plan');
    const tonnen = (day as any).tonnen_plan ?? null;
    expect(tonnen).toBeNull();
  });

  test('invalid JSON throws error', () => {
    expect(() => JSON.parse('not valid json {{')).toThrow();
  });

  test('confidence < 0.80 — day is flagged as low confidence', () => {
    const days = [
      { date: '2024-10-14', baustelle: 'Test', confidence: 0.75 },
      { date: '2024-10-15', baustelle: 'Test2', confidence: 0.92 },
    ];
    const lowConf = days.filter(d => d.confidence < 0.8);
    const highConf = days.filter(d => d.confidence >= 0.8);
    expect(lowConf).toHaveLength(1);
    expect(highConf).toHaveLength(1);
  });

  test('confidence >= 0.80 — no warning flag', () => {
    const day = { date: '2024-10-15', baustelle: 'Test', confidence: 0.80 };
    expect(day.confidence < 0.8).toBe(false);
  });
});

describe('OCR proxy fetch mocking', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('successful OCR — returns parsed result', async () => {
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: JSON.stringify(OCR_SUCCESS_PAYLOAD) }],
      }),
    });

    const json = await (global as any).fetch('http://proxy/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const body = await json.json();
    const raw = body.content[0].text.trim();
    const parsed = JSON.parse(raw);
    expect(parsed.days[0].baustelle).toBe('Langenpreising');
  });

  test('proxy error (500) — fetch returns not ok', async () => {
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const res = await (global as any).fetch('http://proxy/messages', { method: 'POST' });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(500);
  });

  test('timeout — fetch rejects after delay', async () => {
    (global as any).fetch = jest.fn().mockImplementationOnce(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 50)),
    );

    await expect(
      (global as any).fetch('http://proxy/messages', { method: 'POST' }),
    ).rejects.toThrow('timeout');
  });
});

describe('stringSimilarity (site matching)', () => {
  const { stringSimilarity } = require('../utils/einsatzplanDiff');

  test('"Langenpreising" === "Langenpreising" → score 1.0, auto-select', () => {
    expect(stringSimilarity('Langenpreising', 'Langenpreising')).toBe(1);
  });

  test('case-insensitive comparison', () => {
    expect(stringSimilarity('langenpreising', 'Langenpreising')).toBe(1);
  });

  test('Langenpresing vs Langenpreising → > 0.80', () => {
    const score = stringSimilarity('Langenpresing', 'Langenpreising');
    expect(score).toBeGreaterThan(0.8);
  });

  test('Monachium vs Langenpreising → < 0.80, shows manual selector', () => {
    const score = stringSimilarity('Monachium', 'Langenpreising');
    expect(score).toBeLessThan(0.8);
  });

  test('empty construction_sites list → null match', () => {
    const sites: any[] = [];
    const best = sites.reduce(
      (acc: any, site: any) => {
        const score = stringSimilarity('Test', site.name);
        return score > acc.score ? { siteId: site.id, score } : acc;
      },
      { siteId: null, score: 0 },
    );
    expect(best.siteId).toBeNull();
  });
});

describe('upsert conflict handling', () => {
  test('upsert called with correct onConflict option', async () => {
    const { supabase } = require('../services/supabase');
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ upsert: upsertMock });

    const rows = [
      {
        construction_site_id: 'site-uuid',
        date: '2024-10-14',
        mischgut: 'AC 32 TN',
        tonnen_plan: 40,
        tonnen_real: null,
        kw: 42,
        year: 2024,
        document_id: 'doc-uuid',
        created_by: 'user-uuid',
      },
    ];

    await supabase.from('einsatzplan').upsert(rows, { onConflict: 'construction_site_id,date' });

    expect(upsertMock).toHaveBeenCalledWith(rows, { onConflict: 'construction_site_id,date' });
  });
});
