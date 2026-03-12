import { supabase } from '../services/supabase';

// Mockowanie Supabase
jest.mock('../services/supabase', () => {
  const mockTable: Record<string, any[]> = {
    employees: [],
    time_entries: []
  };

  return {
    supabase: {
      from: jest.fn((table: string) => ({
        select: jest.fn((column?: string) => ({
          eq: jest.fn((field, val) => {
            const data = mockTable[table].filter(row => row[field] === val);
            return { data, error: null };
          }),
          order: jest.fn(() => ({
            eq: jest.fn((field, val) => {
              const data = mockTable[table].filter(row => row[field] === val);
              return { data, error: null };
            }),
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => ({
                  data: mockTable[table],
                  error: null
                }))
              }))
            }))
          })),
          data: mockTable[table],
          error: null
        })),
        insert: jest.fn((data: any) => {
          const rows = Array.isArray(data) ? data : [data];
          const newRows = rows.map(r => ({ ...r, id: Math.random().toString(36).substr(2, 9) }));
          mockTable[table].push(...newRows);
          return {
            select: () => ({
              single: () => ({ data: newRows[0], error: null }),
              data: newRows,
              error: null
            })
          };
        }),
        upsert: jest.fn((data: any) => {
          const rows = Array.isArray(data) ? data : [data];
          rows.forEach(r => {
            const index = mockTable[table].findIndex(item => 
              item.employee_id === r.employee_id && item.date === r.date
            );
            if (index !== -1) {
              mockTable[table][index] = { ...mockTable[table][index], ...r };
            } else {
              mockTable[table].push({ ...r, id: Math.random().toString(36).substr(2, 9) });
            }
          });
          return {
            select: () => ({
              data: mockTable[table],
              error: null,
              single: () => ({ data: mockTable[table][0], error: null })
            })
          };
        }),
        delete: jest.fn(() => ({
          eq: jest.fn((field, val) => {
            mockTable[table] = mockTable[table].filter(row => row[field] !== val);
            return { error: null };
          })
        }))
      }))
    }
  };
});

// Helpery do API (symulacja funkcji z hooków bez React Native context)
async function fetchEmployees() {
  const { data } = await supabase.from('employees').select('*');
  return data;
}

async function createEmployee(name: string, position: string) {
  const { data } = await (supabase.from('employees') as any).insert({ name, position, active: true }).select().single();
  return data;
}

async function createTimeEntry(employee_id: string, date: string, hours: number, status: string) {
  const { data } = await (supabase.from('time_entries') as any).upsert({ employee_id, date, hours, status }).select().single();
  return data;
}

describe('System Integration Flow', () => {
  let employee1: any;
  let employee2: any;

  beforeAll(async () => {
    // 1. Setup - tworzenie pracowników
    employee1 = await createEmployee('Marek Budowlany', 'Operator Koparki');
    employee2 = await createEmployee('Jan Kowalski', 'Pomocnik');
  });

  test('powinien poprawnie zarządzać listą pracowników', async () => {
    const list = await fetchEmployees();
    expect(list).toHaveLength(2);
    expect(list?.[0].name).toBe('Marek Budowlany');
  });

  test('powinien poprawnie zapisywać i agregować czas pracy', async () => {
    // 2. Dodawanie wpisów
    await createTimeEntry(employee1.id, '2024-03-01', 8, 'work');
    await createTimeEntry(employee1.id, '2024-03-02', 4, 'work');
    await createTimeEntry(employee2.id, '2024-03-01', 10, 'work');

    // 3. Weryfikacja wpisów dla pracownika (fetchMonthlySummary logic simulation)
    const { data: entries } = await supabase.from('time_entries').select('*').eq('employee_id', employee1.id);
    
    expect(entries).toHaveLength(2);
    const totalHours = (entries || []).reduce((sum, e) => sum + e.hours, 0);
    expect(totalHours).toBe(12);
  });

  test('powinien poprawnie obsługiwać aktualizację wpisu (upsert)', async () => {
    // Zmiana 4h na 6h dla tej samej daty i osoby
    await createTimeEntry(employee1.id, '2024-03-02', 6, 'work');
    
    const { data: entries } = await supabase.from('time_entries').select('*').eq('employee_id', employee1.id);
    
    // Nadal powinny być tylko 2 wpisy dla employee1
    expect(entries).toHaveLength(2);
    const entryUpdate = (entries || []).find(e => e.date === '2024-03-02');
    expect(entryUpdate.hours).toBe(6);
  });
});
