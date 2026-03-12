import { generateConstructionExcelReport, generateConstructionPdfReport } from '../services/export';
import { supabase } from '../services/supabase';

// Mock Supabase to return sample site data
jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => ({
      select: jest.fn(() => ({
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn(() => {
              if (table === 'deliveries') {
                return Promise.resolve({
                  data: [
                    {
                      id: '1',
                      tons: 24.5,
                      lieferschein_nr: 'LS001',
                      supplier: 'Kemna Bau',
                      delivery_time: '2024-03-12T10:00:00Z',
                      construction_sites: { name: 'A40 Essen' },
                      asphalt_types: { name: 'SMA 11 S' }
                    }
                  ],
                  error: null
                });
              }
              return Promise.resolve({ data: [], error: null });
            })
          }))
        }))
      }))
    }))
  }
}));

// Mock Expo modules that are not available in Node environment
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'test-dir/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: { Base64: 'base64' }
}));
jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn().mockResolvedValue({ uri: 'test-pdf-uri' })
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue({ type: 'success' })
}));

describe('Construction Export Service', () => {
  const options = {
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-03-31'),
    format: 'excel' as const,
    language: 'pl' as const
  };

  test('generateConstructionExcelReport should process data correctly', async () => {
    const uri = await generateConstructionExcelReport(options);
    expect(uri).toContain('budowy_2024-03-01_2024-03-31.xlsx');
  });

  test('generateConstructionPdfReport should process data correctly', async () => {
    const pdfOptions = { ...options, format: 'pdf' as const };
    const uri = await generateConstructionPdfReport(pdfOptions);
    expect(uri).toContain('budowy_2024-03-01_2024-03-31.pdf');
  });
});
