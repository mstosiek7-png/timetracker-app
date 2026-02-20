// ============================================================
// TimeTracker — Design System: Colors
// ============================================================

export const Colors = {
  // Brand
  orange:      '#E8631A',
  orangeLight: '#F5863A',
  orangePale:  '#FDF0E8',

  // Backgrounds
  cream:       '#F8F4EF',
  creamDark:   '#EDE8E0',
  white:       '#FFFFFF',

  // Text
  black:       '#111111',
  grayDark:    '#444444',
  grayMid:     '#888888',
  grayLight:   '#CCCCCC',

  // Semantic
  green:       '#2D9A5C',
  greenBg:     '#E8F5EE',
  blue:        '#2D6BE4',
  blueBg:      '#E8EFFE',
  red:         '#D93025',
  redBg:       '#FCE8E6',
  fzaText:     '#E65100',
  fzaBg:       '#FFF3E0',
} as const;

export type ColorKey = keyof typeof Colors;
