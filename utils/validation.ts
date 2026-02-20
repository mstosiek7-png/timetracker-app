// =====================================================
// Walidacja danych
// =====================================================

import { MAX_HOURS_PER_DAY } from './constants';
import { EmployeeInsert, TimeEntryInsert } from '@/types/models';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Walidacja danych pracownika
 */
export const validateEmployee = (data: Partial<EmployeeInsert>): ValidationResult => {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Imię i nazwisko jest wymagane');
  } else if (data.name.trim().length < 2) {
    errors.push('Imię i nazwisko musi mieć minimum 2 znaki');
  } else if (data.name.trim().length > 255) {
    errors.push('Imię i nazwisko może mieć maksymalnie 255 znaków');
  }

  if (!data.position || data.position.trim().length === 0) {
    errors.push('Stanowisko jest wymagane');
  } else if (data.position.trim().length > 100) {
    errors.push('Stanowisko może mieć maksymalnie 100 znaków');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Walidacja wpisu czasu pracy
 */
export const validateTimeEntry = (data: Partial<TimeEntryInsert>): ValidationResult => {
  const errors: string[] = [];

  if (!data.employee_id) {
    errors.push('Pracownik jest wymagany');
  }

  if (!data.date) {
    errors.push('Data jest wymagana');
  }

  if (data.hours === undefined || data.hours === null) {
    errors.push('Liczba godzin jest wymagana');
  } else if (data.hours < 0) {
    errors.push('Liczba godzin nie może być ujemna');
  } else if (data.hours > MAX_HOURS_PER_DAY) {
    errors.push(`Liczba godzin nie może przekraczać ${MAX_HOURS_PER_DAY}`);
  }

  if (!data.status) {
    errors.push('Status jest wymagany');
  } else if (!['work', 'sick', 'vacation', 'fza'].includes(data.status)) {
    errors.push('Nieprawidłowy status');
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
  status: string
): ValidationResult => {
  const errors: string[] = [];

  if (!employeeIds || employeeIds.length === 0) {
    errors.push('Wybierz przynajmniej jednego pracownika');
  }

  if (!date) {
    errors.push('Data jest wymagana');
  }

  if (hours === undefined || hours === null) {
    errors.push('Liczba godzin jest wymagana');
  } else if (hours < 0) {
    errors.push('Liczba godzin nie może być ujemna');
  } else if (hours > MAX_HOURS_PER_DAY) {
    errors.push(`Liczba godzin nie może przekraczać ${MAX_HOURS_PER_DAY}`);
  }

  if (!status) {
    errors.push('Status jest wymagany');
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
