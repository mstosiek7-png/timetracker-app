// =====================================================
// Helpery do obsługi dat
// =====================================================

import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  addMonths,
  subMonths,
  getYear,
  getMonth,
  parseISO,
  isValid,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { DATE_FORMATS } from './constants';

/**
 * Formatuj datę do wyświetlenia (dd.MM.yyyy)
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, DATE_FORMATS.display, { locale: pl });
};

/**
 * Formatuj datę krótko (dd.MM)
 */
export const formatDateShort = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, DATE_FORMATS.displayShort, { locale: pl });
};

/**
 * Formatuj datę do API (yyyy-MM-dd)
 */
export const formatDateApi = (date: Date): string => {
  return format(date, DATE_FORMATS.api);
};

/**
 * Formatuj miesiąc i rok (np. "Luty 2026")
 */
export const formatMonthYear = (date: Date): string => {
  return format(date, DATE_FORMATS.monthYear, { locale: pl });
};

/**
 * Formatuj nazwę dnia tygodnia
 */
export const formatDayName = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, DATE_FORMATS.dayName, { locale: pl });
};

/**
 * Pobierz pierwszy dzień miesiąca
 */
export const getMonthStart = (date: Date): Date => startOfMonth(date);

/**
 * Pobierz ostatni dzień miesiąca
 */
export const getMonthEnd = (date: Date): Date => endOfMonth(date);

/**
 * Pobierz wszystkie dni w miesiącu
 */
export const getDaysInMonth = (date: Date): Date[] => {
  return eachDayOfInterval({
    start: startOfMonth(date),
    end: endOfMonth(date),
  });
};

/**
 * Pobierz dni robocze w miesiącu
 */
export const getWorkDaysInMonth = (date: Date): Date[] => {
  return getDaysInMonth(date).filter((day) => !isWeekend(day));
};

/**
 * Następny miesiąc
 */
export const nextMonth = (date: Date): Date => addMonths(date, 1);

/**
 * Poprzedni miesiąc
 */
export const prevMonth = (date: Date): Date => subMonths(date, 1);

/**
 * Pobierz rok i miesiąc jako liczby
 */
export const getYearMonth = (date: Date): { year: number; month: number } => ({
  year: getYear(date),
  month: getMonth(date) + 1, // date-fns zwraca 0-11
});

/**
 * Sprawdź czy string jest poprawną datą
 */
export const isValidDate = (dateString: string): boolean => {
  const parsed = parseISO(dateString);
  return isValid(parsed);
};

/**
 * Sprawdź czy dzień jest weekendem
 */
export const isWeekendDay = (date: Date | string): boolean => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isWeekend(d);
};

/**
 * Dzisiejsza data w formacie API
 */
export const todayApi = (): string => formatDateApi(new Date());
