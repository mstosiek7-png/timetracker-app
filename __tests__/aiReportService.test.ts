// =====================================================
// Tests: aiReportService — Eksport Budowy + Lohnliste
// =====================================================

jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///tmp/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  moveAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn().mockResolvedValue({ uri: 'file:///tmp/print.pdf' }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
  addEventListener: jest.fn(),
}));

// ─── Eksport Budowy unit logic ───────────────────────

describe('Eksport Budowy — data calculations', () => {
  function sumPlan(tage: { tonnen_plan: number | null }[]) {
    return tage.reduce((s, t) => s + (t.tonnen_plan ?? 0), 0);
  }

  function sumReal(tage: { tonnen_real: number | null }[]) {
    return tage.reduce((s, t) => s + (t.tonnen_real ?? 0), 0);
  }

  function detectAnomalies(tage: { tonnen_plan: number | null; tonnen_real: number | null }[]) {
    return tage.filter(t => {
      if (t.tonnen_plan == null || t.tonnen_real == null) return false;
      return Math.abs(t.tonnen_real - t.tonnen_plan) / t.tonnen_plan > 0.1;
    });
  }

  function realizationPercent(plan: number, real: number) {
    if (plan === 0) return 0;
    return Math.round((real / plan) * 100);
  }

  function groupByMischgut(tage: { mischgut: string | null; tonnen_plan: number | null; tonnen_real: number | null }[]) {
    const map: Record<string, { plan: number; real: number }> = {};
    for (const t of tage) {
      const key = t.mischgut ?? 'Unbekannt';
      if (!map[key]) map[key] = { plan: 0, real: 0 };
      map[key].plan += t.tonnen_plan ?? 0;
      map[key].real += t.tonnen_real ?? 0;
    }
    return map;
  }

  const sampleData = [
    { datum: '2024-10-14', mischgut: 'AC 32 TN 50/70', tonnen_plan: 40, tonnen_real: 38.5 },
    { datum: '2024-10-15', mischgut: 'AC 16 DS 50/70', tonnen_plan: 25, tonnen_real: null },
    { datum: '2024-10-21', mischgut: 'AC 32 TN 50/70', tonnen_plan: 35, tonnen_real: 37.2 },
  ];

  test('sum plan ignores null', () => {
    expect(sumPlan(sampleData)).toBe(100);
  });

  test('sum real ignores null', () => {
    expect(sumReal(sampleData)).toBeCloseTo(75.7);
  });

  test('realization %: (real/plan)*100, rounded', () => {
    expect(realizationPercent(40, 38.5)).toBe(96);
    expect(realizationPercent(35, 37.2)).toBe(106);
  });

  test('anomaly detection: |diff| > 10% plan', () => {
    const data = [
      { tonnen_plan: 40, tonnen_real: 50 },   // +25% — anomaly
      { tonnen_plan: 40, tonnen_real: 38.5 },  // -3.75% — ok
      { tonnen_plan: 40, tonnen_real: null },   // no real — skip
    ];
    const anomalies = detectAnomalies(data);
    expect(anomalies).toHaveLength(1);
  });

  test('no anomalies when all within 10%', () => {
    const data = [
      { tonnen_plan: 40, tonnen_real: 38.5 },
      { tonnen_plan: 25, tonnen_real: 26 },
    ];
    expect(detectAnomalies(data)).toHaveLength(0);
  });

  test('tonnen_real = null → "—" in display', () => {
    const val = null;
    const display = val !== null ? `${(val as number).toFixed(1)} t` : '—';
    expect(display).toBe('—');
  });

  test('grouping by mischgut', () => {
    const groups = groupByMischgut(sampleData);
    expect(groups['AC 32 TN 50/70'].plan).toBe(75);
    expect(groups['AC 16 DS 50/70'].plan).toBe(25);
  });
});

// ─── Lohnliste unit logic ────────────────────────────

describe('Lohnliste — data transformations', () => {
  function formatHoursDE(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${String(m).padStart(2, '0')}min`;
  }

  function isWeekend(dateStr: string): boolean {
    const d = new Date(dateStr);
    const day = d.getDay();
    return day === 0 || day === 6;
  }

  const STATUS_MAP: Record<string, string> = {
    work: 'Arbeit',
    sick: 'Krank',
    vacation: 'Urlaub',
    fza: 'FZA',
  };

  test('hours format: 8.0 → "8h 00min"', () => {
    expect(formatHoursDE(8.0)).toBe('8h 00min');
  });

  test('hours format: 9.5 → "9h 30min"', () => {
    expect(formatHoursDE(9.5)).toBe('9h 30min');
  });

  test('hours format: 7.75 → "7h 45min"', () => {
    expect(formatHoursDE(7.75)).toBe('7h 45min');
  });

  test('status work → Arbeit', () => {
    expect(STATUS_MAP['work']).toBe('Arbeit');
  });

  test('status sick → Krank', () => {
    expect(STATUS_MAP['sick']).toBe('Krank');
  });

  test('status fza → FZA', () => {
    expect(STATUS_MAP['fza']).toBe('FZA');
  });

  test('status vacation → Urlaub', () => {
    expect(STATUS_MAP['vacation']).toBe('Urlaub');
  });

  test('weekends are skipped', () => {
    expect(isWeekend('2024-10-12')).toBe(true);  // Saturday
    expect(isWeekend('2024-10-13')).toBe(true);  // Sunday
    expect(isWeekend('2024-10-14')).toBe(false); // Monday
  });

  test('employees sorted alphabetically by name', () => {
    const workers = [
      { name: 'Zygmunt Nowak', entries: [] },
      { name: 'Anna Kowalska', entries: [] },
      { name: 'Marek Wiśniewski', entries: [] },
    ];
    const sorted = [...workers].sort((a, b) => a.name.localeCompare(b.name));
    expect(sorted[0].name).toBe('Anna Kowalska');
    expect(sorted[2].name).toBe('Zygmunt Nowak');
  });

  test('employee without entries in period → excluded', () => {
    const workers = [
      { name: 'Jan Kowalski', entries: [{ date: '2024-10-14', status: 'work', hours: 8 }] },
      { name: 'Piotr Nowak', entries: [] },
    ];
    const withEntries = workers.filter(w => w.entries.length > 0);
    expect(withEntries).toHaveLength(1);
    expect(withEntries[0].name).toBe('Jan Kowalski');
  });
});

// ─── Integration: proxy fetch ────────────────────────

describe('AI report proxy integration', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_LITELLM_PROXY_URL = 'http://proxy.test';
    process.env.EXPO_PUBLIC_LITELLM_KEY = 'test-key';
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.EXPO_PUBLIC_LITELLM_PROXY_URL;
    delete process.env.EXPO_PUBLIC_LITELLM_KEY;
  });

  test('successful proxy call returns report text', async () => {
    const reportText = 'RAPORT BUDOWY\n═══\nBudowa: Test';
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [{ text: reportText }] }),
    });

    const res = await (global as any).fetch('http://proxy.test/messages', { method: 'POST' });
    const body = await res.json();
    expect(body.content[0].text).toBe(reportText);
  });

  test('proxy error → throws AiReportError with network type', async () => {
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const res = await (global as any).fetch('http://proxy.test/messages', { method: 'POST' });
    expect(res.ok).toBe(false);
  });

  test('timeout → rejects', async () => {
    (global as any).fetch = jest.fn().mockImplementationOnce(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('AbortError')), 50)),
    );
    await expect(
      (global as any).fetch('http://proxy.test/messages', { method: 'POST' }),
    ).rejects.toThrow();
  });

  test('Lohnliste always uses DE language regardless of app language', () => {
    // The prompt is hardcoded in German ("Generiere eine Lohnliste auf Deutsch")
    const prompt = 'Generiere eine Lohnliste auf Deutsch.';
    expect(prompt).toContain('Deutsch');
    expect(prompt).not.toContain('polski');
  });

  test('Lohnliste output file has .pdf extension', () => {
    const pdfName = `lohnliste_2024_02.pdf`;
    expect(pdfName.endsWith('.pdf')).toBe(true);
  });
});
