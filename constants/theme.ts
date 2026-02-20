/**
 * Design System — TimeTracker
 * Wszystkie tokeny designowe: kolory, zaokrąglenia, rozmiary fontów, spacing.
 * ZASADA: Zero hardcoded kolorów w komponentach — tylko importy z tego pliku.
 */

export const theme = {
  colors: {
    background: '#F5F0E8',
    card: '#FFFFFF',
    accent: '#E8722A',
    accentLight: '#FFF0E6',
    dark: '#1A1A1A',
    mid: '#4A4A4A',
    muted: '#9A9A9A',
    border: '#E8E0D0',
    success: '#2E7D5E',
    successLight: '#E8F5EF',
    error: '#C0392B',
    errorLight: '#FDECEA',
    statusColors: {
      work: { bg: '#E8F5EF', text: '#2E7D5E' },
      sick: { bg: '#FDECEA', text: '#C0392B' },
      vacation: { bg: '#E8F4FF', text: '#1A6FA8' },
      fza: { bg: '#FFF0E6', text: '#E8722A' },
    },
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 28,
  },
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
} as const;

export type StatusType = keyof typeof theme.colors.statusColors;
export type ThemeType = typeof theme;

export default theme;
