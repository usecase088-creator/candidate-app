import { Text, type TextProps } from 'react-native';

import {
  type ColorToken,
  colors,
  type FontWeight,
  fonts,
  fontSizes,
  headingLetterSpacing,
} from '@/theme/tokens';

// D32 ramp. `cap` = maxFontSizeMultiplier: body grows to 2x for readers who need it; titles, labels, pills and
// button text are capped so chrome never bursts (docs/design/UI-REDESIGN.md section 2).
const VARIANTS = {
  /** Auth hero titles only. */
  display: { size: fontSizes['3xl'], weight: 'bold', heading: true, tight: true, cap: 1.4 },
  /** Screen titles without a native header; the job role on details. */
  title: { size: fontSizes['2xl'], weight: 'semibold', heading: true, tight: true, cap: 1.4 },
  /** Section and panel headers. */
  heading: { size: fontSizes.xl, weight: 'semibold', heading: true, tight: false, cap: 1.5 },
  /** List rows and card titles. */
  rowTitle: { size: fontSizes.lg, weight: 'semibold', heading: false, tight: false, cap: 1.5 },
  body: { size: fontSizes.base, weight: 'regular', heading: false, tight: false, cap: 2 },
  /** Meta lines. */
  secondary: { size: fontSizes.sm, weight: 'regular', heading: false, tight: false, cap: 2 },
  /** Form labels, segmented controls. */
  label: { size: fontSizes.md, weight: 'medium', heading: false, tight: false, cap: 1.3 },
  /** Pills, badges, timestamps. */
  caption: { size: fontSizes.xs, weight: 'medium', heading: false, tight: false, cap: 1.3 },
  button: { size: fontSizes.base, weight: 'semibold', heading: false, tight: false, cap: 1.3 },
} as const satisfies Record<
  string,
  {
    size: { fontSize: number; lineHeight: number };
    weight: FontWeight;
    heading: boolean;
    tight: boolean;
    cap: number;
  }
>;

export type TextVariant = keyof typeof VARIANTS;

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  weight?: FontWeight;
  color?: ColorToken;
  align?: 'left' | 'center' | 'right';
  /** Lines up digits (money, counts, dates, OTP). */
  tabular?: boolean;
};

/** All app text goes through here: Inter, theme colours, sizes that keep working at font scale 2. */
export function AppText({
  variant = 'body',
  weight,
  color = 'foreground',
  align,
  tabular,
  maxFontSizeMultiplier,
  style,
  ...rest
}: AppTextProps) {
  const v = VARIANTS[variant];
  return (
    <Text
      accessibilityRole={v.heading ? 'header' : undefined}
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? v.cap}
      style={[
        v.size,
        {
          fontFamily: fonts[weight ?? v.weight],
          color: colors[color],
          ...(v.tight ? { letterSpacing: headingLetterSpacing(v.size.fontSize) } : {}),
          ...(align ? { textAlign: align } : {}),
          ...(tabular ? { fontVariant: ['tabular-nums'] as const } : {}),
        },
        style,
      ]}
    />
  );
}
