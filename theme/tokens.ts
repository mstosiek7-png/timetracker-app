// ============================================================
// TimeTracker — Design System: Spacing, Radius, Shadows, Typography
// ============================================================

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm:   10,
  md:   16,
  lg:   20,
  pill: 100,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 32,
    elevation: 10,
  },
  orange: {
    shadowColor: '#E8631A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

export const FontFamily = {
  // Install: npx expo install @expo-google-fonts/dm-sans @expo-google-fonts/dm-mono expo-font
  regular:     'DMSans_400Regular',
  medium:      'DMSans_500Medium',
  semiBold:    'DMSans_600SemiBold',
  bold:        'DMSans_700Bold',
  mono:        'DMMono_400Regular',
  monoBold:    'DMMono_500Medium',
} as const;

export const FontSize = {
  xs:   10,
  sm:   11,
  base: 13,
  md:   14,
  lg:   15,
  xl:   16,
  xxl:  18,
  h3:   20,
  h2:   22,
  h1:   28,
  display: 36,
} as const;
