// Design tokens from the candidate website (docs/reference/THEME.md, ../job/candidates/src/styles.css).
// Light theme only (D11). Components take colours, spacing, radius and fonts from here only (CLAUDE.md).

export const colors = {
  background: '#F7FBFD',
  surface: '#FFFFFF',
  surface2: '#F2F8FC',
  foreground: '#0A121F',
  card: '#FFFFFF',
  navy: '#0D172F',
  primary: '#0D172F',
  primaryForeground: '#F7FBFD',
  brand: '#326AD9',
  brandForeground: '#F7FBFD',
  brandSoft: '#E1F0FF',
  secondary: '#EFF4FA',
  secondaryForeground: '#0D172F',
  muted: '#EFF4FA',
  mutedForeground: '#596475',
  accent: '#E1F0FF',
  accentForeground: '#0D172F',
  destructive: '#E23439',
  destructiveForeground: '#F7FBFD',
  /** D15: small error text. #E23439 fails AA for small text; same hue, darker. */
  errorText: '#D4212D',
  /** The website's --success is blue (THEME.md note ²). */
  success: '#398AD6',
  warning: '#DEA143',
  border: '#D4DAE1',
  input: '#D4DAE1',
  ring: '#326AD9',
  /** Signup consent checkbox accent (auth.tsx). */
  checkbox: '#3778D7',
  /** Scrim behind toasts and sheets. */
  overlay: 'rgba(10,18,31,0.5)',
} as const;

export type ColorToken = keyof typeof colors;

/** --radius 0.75rem = 12 px. */
export const radius = { sm: 8, md: 10, lg: 12, xl: 16, '2xl': 20, '3xl': 24, full: 9999 } as const;

/** 4-point scale (Tailwind units: 1 = 4 px). */
export const spacing = {
  '0.5': 2,
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
} as const;

/** Inter faces loaded in src/theme/fonts.ts. RN needs one family name per weight. */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export type FontWeight = keyof typeof fonts;

/** Tailwind sizes used on the auth screens (THEME.md "Typography"). Line heights keep text readable at font scale 2. */
export const fontSizes = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 28 },
  xl: { fontSize: 20, lineHeight: 28 },
  '2xl': { fontSize: 24, lineHeight: 32 },
  '3xl': { fontSize: 30, lineHeight: 36 },
} as const;

/** Headings use letter-spacing -0.02em on the website. */
export const headingLetterSpacing = (fontSize: number) => -0.02 * fontSize;

/** boxShadow strings (new architecture supports them on Android and iOS). */
export const shadows = {
  soft: '0 1px 3px rgba(15,23,42,0.06), 0 2px 6px rgba(15,23,42,0.07)',
  card: '0 1px 3px rgba(15,23,42,0.06), 0 10px 28px -10px rgba(15,23,42,0.12)',
  pop: '0 10px 40px -10px rgba(11,30,63,0.18)',
} as const;

/** D16. Website: 135deg linear gradient. */
export const gradients = {
  signup: { colors: ['#0D1936', '#1D54C1', '#203378', '#0D1936'], locations: [0, 0.45, 0.8, 1] },
} as const;

/** Smallest comfortable touch target (Android 48 dp, iOS 44 pt). */
export const MIN_TOUCH = 48;
