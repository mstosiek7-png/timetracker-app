// =====================================================
// Formatowanie danych do wyświetlenia
// =====================================================

import { STATUS_LABELS, STATUS_COLORS, STATUS_ICONS } from './constants';
import { TimeEntryStatus } from '@/types/models';

/**
 * Formatuj godziny (np. 8.5 -> "8.5h" lub "8h 30min")
 */
export const formatHours = (hours: number, detailed = false): string => {
  if (detailed) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  }
  return `${hours}h`;
};

/**
 * Formatuj status do wyświetlenia
 */
export const formatStatus = (status: TimeEntryStatus): string => {
  return STATUS_LABELS[status] || status;
};

/**
 * Pobierz kolor dla statusu
 */
export const getStatusColor = (status: TimeEntryStatus): string => {
  return STATUS_COLORS[status] || '#757575';
};

/**
 * Pobierz ikonę dla statusu
 */
export const getStatusIcon = (status: TimeEntryStatus): string => {
  return STATUS_ICONS[status] || 'help-circle';
};

/**
 * Formatuj imię i nazwisko (skróć jeśli za długie)
 */
export const formatName = (name: string, maxLength = 25): string => {
  if (name.length <= maxLength) return name;
  return `${name.substring(0, maxLength - 3)}...`;
};

/**
 * Formatuj inicjały z imienia i nazwiska
 */
export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Formatuj liczbę z separatorem tysięcy
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString('pl-PL');
};

/**
 * Formatuj procent
 */
export const formatPercent = (value: number, total: number): string => {
  if (total === 0) return '0%';
  const percent = (value / total) * 100;
  return `${percent.toFixed(1)}%`;
};

/**
 * Pluralizacja dla polskiego języka
 */
export const pluralize = (
  count: number,
  singular: string,
  plural2to4: string,
  plural5plus: string
): string => {
  if (count === 1) return singular;
  if (count >= 2 && count <= 4) return plural2to4;
  if (count >= 5 && count <= 21) return plural5plus;
  
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastTwoDigits >= 12 && lastTwoDigits <= 14) return plural5plus;
  if (lastDigit >= 2 && lastDigit <= 4) return plural2to4;
  
  return plural5plus;
};

/**
 * Formatuj liczbę pracowników
 */
export const formatEmployeeCount = (count: number): string => {
  return `${count} ${pluralize(count, 'pracownik', 'pracowników', 'pracowników')}`;
};

/**
 * Formatuj liczbę godzin z etykietą
 */
export const formatHoursLabel = (hours: number): string => {
  return `${formatHours(hours)} ${pluralize(Math.floor(hours), 'godzina', 'godziny', 'godzin')}`;
};
