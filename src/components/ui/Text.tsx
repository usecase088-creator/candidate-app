import { Text, type TextProps } from 'react-native';

import {
  type ColorToken,
  colors,
  type FontWeight,
  fonts,
  fontSizes,
  headingLetterSpacing,
} from '@/theme/tokens';

const VARIANTS = {
  /** Page titles (website text-2xl, bold, tight tracking). */
  title: { size: fontSizes['2xl'], weight: 'bold', heading: true },
  heading: { size: fontSizes.lg, weight: 'semibold', heading: true },
  body: { size: fontSizes.sm, weight: 'regular', heading: false },
  bodyLg: { size: fontSizes.base, weight: 'regular', heading: false },
  label: { size: fontSizes.sm, weight: 'medium', heading: false },
  caption: { size: fontSizes.xs, weight: 'regular', heading: false },
} as const satisfies Record<
  string,
  { size: { fontSize: number; lineHeight: number }; weight: FontWeight; heading: boolean }
>;

export type TextVariant = keyof typeof VARIANTS;

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  weight?: FontWeight;
  color?: ColorToken;
  align?: 'left' | 'center' | 'right';
};

/** All app text goes through here: Inter, theme colours, sizes that keep working at font scale 2. */
export function AppText({
  variant = 'body',
  weight,
  color = 'foreground',
  align,
  style,
  ...rest
}: AppTextProps) {
  const v = VARIANTS[variant];
  return (
    <Text
      accessibilityRole={v.heading ? 'header' : undefined}
      {...rest}
      style={[
        v.size,
        {
          fontFamily: fonts[weight ?? v.weight],
          color: colors[color],
          ...(v.heading ? { letterSpacing: headingLetterSpacing(v.size.fontSize) } : {}),
          ...(align ? { textAlign: align } : {}),
        },
        style,
      ]}
    />
  );
}
