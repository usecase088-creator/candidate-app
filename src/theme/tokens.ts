// Design tokens from the candidate website (docs/reference/THEME.md, ../job/candidates/src/styles.css).
// Light theme only (D11). Components take colours, spacing, radius and fonts from here only (CLAUDE.md).

export const colors = {
  background: '#F7FBFD',
  surface: '#FFFFFF',
  surface2: '#F2F8FC',
  /** R2: tonal control fill (search fields, idle chips, stepper, secondary buttons); visible on `background`. */
  fill: '#E9EFF6',
  foreground: '#0A121F',
  card: '#FFFFFF',
  navy: '#0D172F',
  primary: '#0D172F',
  primaryForeground: '#F7FBFD',
  /** R2: secondary text on the navy hero band (80% of primaryForeground; AA on every gradient stop). */
  primaryForegroundMuted: 'rgba(247,251,253,0.8)',
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
  /** Error box background, close to the website's bg-destructive/10, light enough for D15 text to stay 4.5:1. */
  destructiveSoft: '#FDF2F2',
  /** D15: small error text. #E23439 fails AA for small text; same hue, darker. */
  errorText: '#D4212D',
  /** The website's --success is blue (THEME.md note ²). */
  success: '#398AD6',
  warning: '#DEA143',
  /** Amber text for "7 days or fewer left" (website #d97706 is 3.2:1 on white; this is 5.0:1, like D15). */
  warningText: '#B45309',
  /** Application status pills (website applicationStatus.ts: indigo, amber, emerald, sky at 15 percent on white). */
  indigoSoft: '#EBEBFD',
  indigoText: '#4338CA',
  amberSoft: '#FEF4E0',
  amberText: '#78350F',
  emeraldSoft: '#E6F8F1',
  emeraldText: '#047857',
  skySoft: '#E8F4FD',
  skyText: '#075985',
  border: '#D4DAE1',
  input: '#D4DAE1',
  ring: '#326AD9',
  /** Scrim behind toasts and sheets. */
  overlay: 'rgba(10,18,31,0.5)',
  /** D32: hairline between rows and under headers (replaces 1 px `border` on cards). */
  separator: '#E5E9EF',
  /** D32: input placeholders (3:1 on white; real values use `foreground`). */
  placeholder: '#8A94A6',
  /** D32: "done" status (the website already uses emerald for application statuses; its blue --success stays on the web). */
  successSoft: '#E6F8F1',
  successText: '#047857',
} as const;

export type ColorToken = keyof typeof colors;

/** D32: one radius family. sm = small controls, md = buttons / inputs / cards / panels, lg = sheets, full = pills and avatars. */
export const radius = { sm: 8, md: 12, lg: 20, full: 9999 } as const;

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

/** D32 type ramp (docs/design/UI-REDESIGN.md section 2). Few sizes; weight and colour carry the hierarchy. */
export const fontSizes = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 13, lineHeight: 18 },
  md: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 15, lineHeight: 20 },
  lg: { fontSize: 16, lineHeight: 22 },
  xl: { fontSize: 17, lineHeight: 22 },
  '2xl': { fontSize: 22, lineHeight: 28 },
  '3xl': { fontSize: 28, lineHeight: 34 },
} as const;

/** Large titles use tight tracking (website: -0.02em on h1-h4; Inter needs it from 20 pt up). */
export const headingLetterSpacing = (fontSize: number) => -0.02 * fontSize;

/** D32: initials tiles for hospitals without a logo (deterministic by name). Website hue family, AA text. */
export const logoTints = [
  { bg: '#E1F0FF', fg: '#1E4FB3' },
  { bg: '#EBEBFD', fg: '#4338CA' },
  { bg: '#E6F8F1', fg: '#047857' },
  { bg: '#FEF4E0', fg: '#78350F' },
  { bg: '#E8F4FD', fg: '#075985' },
  { bg: '#F3E8FF', fg: '#6B21A8' },
] as const;

/** D32 motion: short, ease-out, transform + opacity only. One spring for press feedback (no bounce). */
export const motion = {
  duration: { press: 120, enter: 220, exit: 180, step: 250 },
  pressScale: 0.97,
  pressOpacity: 0.9,
  spring: { damping: 15, stiffness: 300, mass: 1 },
  /** Android ripple over light surfaces. */
  ripple: 'rgba(10,18,31,0.08)',
} as const;

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
