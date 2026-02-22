// =====================================================
// Walidacja danych
// =====================================================

import { MAX_HOURS_PER_DAY } from './constants';
import { EmployeeInsert, TimeEntryInsert } from '@/types/models';
import { strings, StringKey } from '../i18n/strings';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const defaultT = (key: StringKey) => strings.pl[key] ?? key;

/**
 * Walidacja danych pracownika
 */
export const validateEmployee = (
  data: Partial<EmployeeInsert>,
  t: (key: StringKey) => string = defaultT
): ValidationResult => {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push(t('Imie i nazwisko jest wymagane'));
  } else if (data.name.trim().length < 2) {
    errors.push(t('Imie i nazwisko musi miec minimum 2 znaki'));
  } else if (data.name.trim().length > 255) {
    errors.push(t('Imie i nazwisko moze miec maksymalnie 255 znakow'));
  }

  if (!data.position || data.position.trim().length === 0) {
    errors.push(t('Stanowisko jest wymagane'));
  } else if (data.position.trim().length > 100) {
    errors.push(t('Stanowisko moze miec maksymalnie 100 znakow'));
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Walidacja wpisu czasu pracy
 */
export const validateTimeEntry = (
  data: Partial<TimeEntryInsert>,
  t: (key: StringKey) => string = defaultT
): ValidationResult => {
  const errors: string[] = [];

  if (!data.employee_id) {
    errors.push(t('Pracownik jest wymagany'));
  }

  if (!data.date) {
    errors.push(t('Data jest wymagana'));
  }

  if (data.hours === undefined || data.hours === null) {
    errors.push(t('Liczba godzin jest wymagana'));
  } else if (data.hours < 0) {
    errors.push(t('Liczba godzin nie moze byc ujemna'));
  } else if (data.hours > MAX_HOURS_PER_DAY) {
    errors.push(`${t('Liczba godzin nie moze przekraczac')} ${MAX_HOURS_PER_DAY}`);
  }

  if (!data.status) {
    errors.push(t('Status jest wymagany'));
  } else if (!['work', 'sick', 'vacation', 'fza'].includes(data.status)) {
    errors.push(t('Nieprawidlowy status'));
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Walidacja bulk entry (wiele pracowników)
 */
export const validateBulkEntry = (
  employeeIds: string[],
  date: string,
  hours: number,
  status: string,
  t: (key: StringKey) => string = defaultT
): ValidationResult => {
  const errors: string[] = [];

  if (!employeeIds || employeeIds.length === 0) {
    errors.push(t('Wybierz przynajmniej jednego pracownika'));
  }

  if (!date) {
    errors.push(t('Data jest wymagana'));
  }

  if (hours === undefined || hours === null) {
    errors.push(t('Liczba godzin jest wymagana'));
  } else if (hours < 0) {
    errors.push(t('Liczba godzin nie moze byc ujemna'));
  } else if (hours > MAX_HOURS_PER_DAY) {
    errors.push(`${t('Liczba godzin nie moze przekraczac')} ${MAX_HOURS_PER_DAY}`);
  }

  if (!status) {
    errors.push(t('Status jest wymagany'));
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Sprawdź czy UUID jest poprawny
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};
