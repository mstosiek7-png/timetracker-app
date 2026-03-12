import { 
  formatDate, 
  formatDateShort, 
  getMonthStart, 
  getMonthEnd, 
  isWeekendDay 
} from '../utils/date';
import { 
  formatHours, 
  getInitials, 
  pluralize 
} from '../utils/formatting';
import { 
  validateEmployee, 
  validateTimeEntry 
} from '../utils/validation';

describe('Utility Functions', () => {
  
  describe('Date Utils', () => {
    const testDate = new Date('2024-03-15T10:00:00Z'); // Piątek

    test('formatDate powinien zwracać poprawny format polski', () => {
      expect(formatDate(testDate)).toBe('15.03.2024');
    });

    test('formatDateShort powinien zwracać krótki format', () => {
      expect(formatDateShort(testDate)).toBe('15.03');
    });

    test('getMonthStart powinien zwracać pierwszy dzień miesiąca', () => {
      const start = getMonthStart(testDate);
      expect(start.getDate()).toBe(1);
      expect(start.getMonth()).toBe(2); // Marzec
    });

    test('isWeekendDay powinien wykrywać weekendy', () => {
      const saturday = new Date('2024-03-16T10:00:00Z');
      const sunday = new Date('2024-03-17T10:00:00Z');
      const monday = new Date('2024-03-18T10:00:00Z');
      
      expect(isWeekendDay(saturday)).toBe(true);
      expect(isWeekendDay(sunday)).toBe(true);
      expect(isWeekendDay(monday)).toBe(false);
    });
  });

  describe('Formatting Utils', () => {
    test('formatHours powinien poprawnie formatować godziny', () => {
      expect(formatHours(8.5)).toBe('8,5h');
      expect(formatHours(8)).toBe('8,0h');
      expect(formatHours(8.5, true)).toBe('8h 30min');
      expect(formatHours(8, true)).toBe('8h');
    });

    test('getInitials powinien generować poprawne inicjały', () => {
      expect(getInitials('Jan Kowalski')).toBe('JK');
      expect(getInitials('Anna Maria Nowak')).toBe('AN');
      expect(getInitials('Stefan')).toBe('ST');
      expect(getInitials('  Marek   Burek  ')).toBe('MB');
    });

    test('pluralize powinien obsługiwać polską gramatykę', () => {
      const s = 'godzina';
      const p2 = 'godziny';
      const p5 = 'godzin';

      expect(pluralize(1, s, p2, p5)).toBe('godzina');
      expect(pluralize(2, s, p2, p5)).toBe('godziny');
      expect(pluralize(4, s, p2, p5)).toBe('godziny');
      expect(pluralize(5, s, p2, p5)).toBe('godzin');
      expect(pluralize(12, s, p2, p5)).toBe('godzin');
      expect(pluralize(22, s, p2, p5)).toBe('godziny');
      expect(pluralize(25, s, p2, p5)).toBe('godzin');
    });
  });

  describe('Validation Utils', () => {
    test('validateEmployee powinien wykrywać błędy w danych pracownika', () => {
      expect(validateEmployee({ name: '', position: 'Kierowca' }).isValid).toBe(false);
      expect(validateEmployee({ name: 'J', position: 'Kierowca' }).isValid).toBe(false);
      expect(validateEmployee({ name: 'Jan', position: '' }).isValid).toBe(false);
      expect(validateEmployee({ name: 'Jan', position: 'Kierowca' }).isValid).toBe(true);
    });

    test('validateTimeEntry powinien walidować wpisy czasu', () => {
      const validEntry = { 
        employee_id: '123', 
        date: '2024-03-15', 
        hours: 8, 
        status: 'work' as any 
      };
      
      expect(validateTimeEntry(validEntry).isValid).toBe(true);
      expect(validateTimeEntry({ ...validEntry, hours: -1 }).isValid).toBe(false);
      expect(validateTimeEntry({ ...validEntry, hours: 25 }).isValid).toBe(false);
      expect(validateTimeEntry({ ...validEntry, status: 'invalid' as any }).isValid).toBe(false);
    });
  });
});
