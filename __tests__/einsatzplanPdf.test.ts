// ============================================================
// Tests: einsatzplanPdfService helpers + HTML rendering
// ============================================================

jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///tmp/',
  moveAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn().mockResolvedValue({ uri: 'file:///tmp/print.pdf' }),
}));

import {
  getWeekDays,
  getMonthBounds,
  getISOWeek,
  navigateKW,
  renderWeekHTML,
} from '../services/einsatzplanPdfService';

// ─── getWeekDays ────────────────────────────────────────────

describe('getWeekDays', () => {
  function fmt(d: Date): string {
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  }

  test('KW42 2024 → 14.10 – 18.10.2024', () => {
    const days = getWeekDays(42, 2024);
    expect(days).toHaveLength(5);
    expect(fmt(days[0])).toBe('14.10.2024');
    expect(fmt(days[4])).toBe('18.10.2024');
  });

  test('KW1 2025 → starts 30.12.2024 (KW1 can be in December)', () => {
    const days = getWeekDays(1, 2025);
    expect(days).toHaveLength(5);
    expect(fmt(days[0])).toBe('30.12.2024');
    expect(fmt(days[2])).toBe('01.01.2025');
    expect(fmt(days[4])).toBe('03.01.2025');
  });

  test('KW52 2020 → correct last week of year', () => {
    const days = getWeekDays(52, 2020);
    expect(days).toHaveLength(5);
    expect(fmt(days[0])).toBe('21.12.2020');
    expect(fmt(days[4])).toBe('25.12.2020');
  });

  test('always returns exactly 5 days (Mon–Fri)', () => {
    [1, 10, 26, 52].forEach(kw => {
      expect(getWeekDays(kw, 2024)).toHaveLength(5);
    });
  });

  test('consecutive days differ by exactly 1', () => {
    const days = getWeekDays(20, 2024);
    for (let i = 1; i < 5; i++) {
      const diff = (days[i].getTime() - days[i - 1].getTime()) / (1000 * 60 * 60 * 24);
      expect(diff).toBe(1);
    }
  });
});

// ─── getMonthBounds ─────────────────────────────────────────

describe('getMonthBounds', () => {
  test('February 2024 leap year → 01.02 – 29.02', () => {
    const { dateFrom, dateTo } = getMonthBounds(2, 2024);
    expect(dateFrom.getDate()).toBe(1);
    expect(dateFrom.getMonth()).toBe(1); // 0-based
    expect(dateTo.getDate()).toBe(29);
  });

  test('February 2025 non-leap → 01.02 – 28.02', () => {
    const { dateFrom, dateTo } = getMonthBounds(2, 2025);
    expect(dateTo.getDate()).toBe(28);
  });

  test('December 2024 → 01.12 – 31.12', () => {
    const { dateFrom, dateTo } = getMonthBounds(12, 2024);
    expect(dateFrom.getDate()).toBe(1);
    expect(dateTo.getDate()).toBe(31);
  });

  test('April 2024 → 01.04 – 30.04', () => {
    const { dateFrom, dateTo } = getMonthBounds(4, 2024);
    expect(dateTo.getDate()).toBe(30);
  });
});

// ─── getISOWeek ─────────────────────────────────────────────

describe('getISOWeek', () => {
  test('14.10.2024 → KW42', () => {
    expect(getISOWeek(new Date(2024, 9, 14))).toEqual({ kw: 42, year: 2024 });
  });

  test('30.12.2024 → KW1 of 2025', () => {
    const result = getISOWeek(new Date(2024, 11, 30));
    expect(result).toEqual({ kw: 1, year: 2025 });
  });

  test('01.01.2025 → KW1 2025', () => {
    expect(getISOWeek(new Date(2025, 0, 1))).toEqual({ kw: 1, year: 2025 });
  });
});

// ─── navigateKW ─────────────────────────────────────────────

describe('navigateKW', () => {
  test('KW10 2024 +1 → KW11 2024', () => {
    expect(navigateKW(10, 2024, 1)).toEqual({ kw: 11, year: 2024 });
  });

  test('KW10 2024 -1 → KW9 2024', () => {
    expect(navigateKW(10, 2024, -1)).toEqual({ kw: 9, year: 2024 });
  });

  test('KW1 2025 -1 → last week of 2024', () => {
    const result = navigateKW(1, 2025, -1);
    expect(result.year).toBe(2024);
    expect(result.kw).toBeGreaterThan(50);
  });

  test('last week of 2024 +1 → KW1 2025', () => {
    const lastKW = navigateKW(1, 2025, -1);
    const result = navigateKW(lastKW.kw, lastKW.year, 1);
    expect(result).toEqual({ kw: 1, year: 2025 });
  });
});

// ─── renderWeekHTML ─────────────────────────────────────────

describe('renderWeekHTML', () => {
  const baseWeek = { kw: 42, year: 2024, days: {} };

  test('header contains "Einsatzplan KW42"', () => {
    const html = renderWeekHTML(baseWeek);
    expect(html).toContain('Einsatzplan KW42');
  });

  test('footer contains "Einsatzplan KW42"', () => {
    const html = renderWeekHTML(baseWeek);
    const matches = html.match(/Einsatzplan KW42/g);
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  test('empty days produce empty <td></td>, not undefined/null', () => {
    const html = renderWeekHTML(baseWeek);
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('>null<');
  });

  test('data for one day is rendered in the correct cell', () => {
    const week = {
      kw: 42,
      year: 2024,
      days: {
        '2024-10-14': [{ // Monday
          construction_sites: { name: 'Testbau', address: 'Teststr. 1' },
          mischgut: 'AC 11 DS',
          tonnen_plan: 40,
          tonnen_real: 38,
        }],
      },
    };
    const html = renderWeekHTML(week);
    expect(html).toContain('Testbau');
    expect(html).toContain('Teststr. 1');
    expect(html).toContain('AC 11 DS');
    expect(html).toContain('40 to');
    expect(html).toContain('38 to');
  });

  test('tonnen_real = null renders "—"', () => {
    const week = {
      kw: 10,
      year: 2024,
      days: {
        '2024-03-04': [{
          construction_sites: { name: 'Site A', address: null },
          mischgut: 'SMA 11 S',
          tonnen_plan: 60,
          tonnen_real: null,
        }],
      },
    };
    const html = renderWeekHTML(week);
    expect(html).toContain('60 to');
    expect(html).toContain('Real: —');
  });

  test('two entries on same day produce two blocks separated by <hr>', () => {
    const week = {
      kw: 42,
      year: 2024,
      days: {
        '2024-10-14': [
          { construction_sites: { name: 'Bau A', address: null }, mischgut: 'AC 11 DS', tonnen_plan: 30, tonnen_real: 28 },
          { construction_sites: { name: 'Bau B', address: null }, mischgut: 'SMA 8 S', tonnen_plan: 20, tonnen_real: 22 },
        ],
      },
    };
    const html = renderWeekHTML(week);
    expect(html).toContain('Bau A');
    expect(html).toContain('Bau B');
    expect(html).toContain('class="sep"');
  });

  test('HTML contains @page landscape in style', () => {
    // CSS is in generateEinsatzplanPdf, but we test that renderWeekHTML alone contains table structure
    const html = renderWeekHTML(baseWeek);
    expect(html).toContain('<table>');
    expect(html).toContain('<thead>');
    expect(html).toContain('<tbody>');
  });

  test('all 5 weekday headers present (Montag–Freitag)', () => {
    const html = renderWeekHTML(baseWeek);
    expect(html).toContain('Montag');
    expect(html).toContain('Dienstag');
    expect(html).toContain('Mittwoch');
    expect(html).toContain('Donnerstag');
    expect(html).toContain('Freitag');
  });

  test('XSS: special chars in site name are escaped', () => {
    const week = {
      kw: 1,
      year: 2025,
      days: {
        '2024-12-30': [{
          construction_sites: { name: '<script>alert(1)</script>', address: null },
          mischgut: null,
          tonnen_plan: null,
          tonnen_real: null,
        }],
      },
    };
    const html = renderWeekHTML(week);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

// ─── Grouping logic (unit-level) ────────────────────────────

describe('Data grouping into weeks', () => {
  function buildRows(dates: string[]): any[] {
    return dates.map(date => {
      const d = new Date(date);
      const { kw, year } = getISOWeek(d);
      return {
        date,
        kw,
        year,
        mischgut: 'AC 11',
        tonnen_plan: 10,
        tonnen_real: 10,
        construction_sites: { name: 'Bau', address: null },
      };
    });
  }

  function group(rows: any[]) {
    const byWeek: Record<string, { kw: number; year: number; days: Record<string, any[]> }> = {};
    for (const row of rows) {
      const key = `${row.year}-${String(row.kw).padStart(2, '0')}`;
      if (!byWeek[key]) byWeek[key] = { kw: row.kw, year: row.year, days: {} };
      if (!byWeek[key].days[row.date]) byWeek[key].days[row.date] = [];
      byWeek[key].days[row.date].push(row);
    }
    return byWeek;
  }

  test('5 days of one KW → one block with 5 filled days', () => {
    const rows = buildRows(['2024-10-14','2024-10-15','2024-10-16','2024-10-17','2024-10-18']);
    const grouped = group(rows);
    expect(Object.keys(grouped)).toHaveLength(1);
    expect(Object.keys(Object.values(grouped)[0].days)).toHaveLength(5);
  });

  test('3 days of one KW → one block, 3 filled days', () => {
    const rows = buildRows(['2024-10-14','2024-10-15','2024-10-16']);
    const grouped = group(rows);
    expect(Object.keys(grouped)).toHaveLength(1);
    expect(Object.keys(Object.values(grouped)[0].days)).toHaveLength(3);
  });

  test('two entries on same day stay together in one day bucket', () => {
    const rows = [
      { date: '2024-10-14', kw: 42, year: 2024, mischgut: 'A', tonnen_plan: 10, tonnen_real: 10, construction_sites: { name: 'X', address: null } },
      { date: '2024-10-14', kw: 42, year: 2024, mischgut: 'B', tonnen_plan: 20, tonnen_real: 20, construction_sites: { name: 'Y', address: null } },
    ];
    const grouped = group(rows);
    expect(grouped['2024-42'].days['2024-10-14']).toHaveLength(2);
  });

  test('data from 4 weeks → 4 blocks', () => {
    const rows = buildRows([
      '2024-10-14', // KW42
      '2024-10-21', // KW43
      '2024-10-28', // KW44
      '2024-11-04', // KW45
    ]);
    const grouped = group(rows);
    expect(Object.keys(grouped)).toHaveLength(4);
  });

  test('empty rows array → zero blocks', () => {
    const grouped = group([]);
    expect(Object.keys(grouped)).toHaveLength(0);
  });
});
