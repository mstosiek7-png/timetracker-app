// =====================================================
// Stałe aplikacji TimeTracker
// =====================================================

import { TimeEntryStatus } from '@/types/models';

// Kolory aplikacji
export const COLORS = {
  primary: '#1976D2',
  primaryDark: '#1565C0',
  primaryLight: '#BBDEFB',
  secondary: '#FF9800',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  error: '#D32F2F',
  success: '#388E3C',
  warning: '#F57C00',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  disabled: '#BDBDBD',
} as const;

// Kolory statusów
export const STATUS_COLORS: Record<TimeEntryStatus, string> = {
  work: '#4CAF50',
  sick: '#F44336',
  vacation: '#2196F3',
  fza: '#FF9800',
};

// Etykiety statusów (po polsku)
export const STATUS_LABELS: Record<TimeEntryStatus, string> = {
  work: 'Praca',
  sick: 'Chorobowe',
  vacation: 'Urlop',
  fza: 'FZA',
};

// Ikony statusów (Material Design)
export const STATUS_ICONS: Record<TimeEntryStatus, string> = {
  work: 'briefcase',
  sick: 'hospital-box',
  vacation: 'beach',
  fza: 'clock-alert',
};

// Domyślne godziny pracy
export const DEFAULT_WORK_HOURS = 8;

// Maksymalna liczba godzin na dzień
export const MAX_HOURS_PER_DAY = 24;

// Pozycje pracowników (budowlane)
export const EMPLOYEE_POSITIONS = [
  'Brukarz',
  'Operator maszyn',
  'Kierowca',
  'Pomocnik',
  'Majster',
  'Elektryk',
  'Hydraulik',
  'Spawacz',
  'Cieśla',
  'Inny',
] as const;

// Formaty dat
export const DATE_FORMATS = {
  display: 'dd.MM.yyyy',
  displayShort: 'dd.MM',
  api: 'yyyy-MM-dd',
  monthYear: 'LLLL yyyy',
  dayName: 'EEEE',
} as const;

// Klasy asfaltu
export const ASPHALT_CLASSES = [
  'AC 5',
  'AC 8',
  'AC 10',
  'AC 11',
  'AC 16',
  'AC 22',
  'AC 32',
  'SMA 5',
  'SMA 8',
  'SMA 11',
  'SMA 16',
  'PA 8',
  'PA 11',
  'PA 16',
] as const;

export type AsphaltClass = (typeof ASPHALT_CLASSES)[number];

// Konfiguracja aplikacji
export const APP_CONFIG = {
  appName: 'TimeTracker',
  version: '1.0.0',
  maxRetryCount: 3,
  syncIntervalMs: 30000, // 30 sekund
  pageSize: 50,
} as const;
