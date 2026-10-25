import { colors, fonts, gradients, radius, shadows, spacing } from '../tokens';

// WCAG 2.x contrast ratio.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('colours (docs/reference/THEME.md)', () => {
  it('match the website tokens', () => {
    expect(colors).toMatchObject({
      background: '#F7FBFD',
      surface: '#FFFFFF',
      surface2: '#F2F8FC',
      foreground: '#0A121F',
      primary: '#0D172F',
      primaryForeground: '#F7FBFD',
      brand: '#326AD9',
      brandSoft: '#E1F0FF',
      muted: '#EFF4FA',
      mutedForeground: '#596475',
      destructive: '#E23439',
      warning: '#DEA143',
      border: '#D4DAE1',
      ring: '#326AD9',
    });
  });

  it('error text uses the darker red from D15', () => {
    expect(colors.errorText).toBe('#D4212D');
  });

  it.each([
    ['foreground on background', 'foreground', 'background'],
    ['muted text on surface', 'mutedForeground', 'surface'],
    ['muted text on background', 'mutedForeground', 'background'],
    ['brand on surface', 'brand', 'surface'],
    ['error text on surface', 'errorText', 'surface'],
    ['error text on background', 'errorText', 'background'],
    ['error text in the error box', 'errorText', 'destructiveSoft'],
    ['primary button text', 'primaryForeground', 'primary'],
    ['brand button text', 'brandForeground', 'brand'],
  ] as const)('%s meets WCAG AA for small text (4.5:1)', (_label, fg, bg) => {
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('radius (12 px base)', () => {
  it('follows the website scale', () => {
    expect(radius).toMatchObject({ sm: 8, md: 10, lg: 12, xl: 16, '2xl': 20, '3xl': 24, full: 9999 });
  });
});

describe('spacing', () => {
  it('is a 4-point scale', () => {
    for (const v of Object.values(spacing)) expect(v % 4 === 0 || v === 2).toBe(true);
  });
});

describe('fonts', () => {
  it('maps every weight the website uses to an Inter face', () => {
    expect(Object.keys(fonts)).toEqual(['regular', 'medium', 'semibold', 'bold', 'extrabold']);
    for (const f of Object.values(fonts)) expect(f).toMatch(/^Inter_\d00/);
  });
});

describe('shadows and gradients', () => {
  it('copies the website shadows as boxShadow strings', () => {
    expect(shadows.card).toBe('0 1px 3px rgba(15,23,42,0.06), 0 10px 28px -10px rgba(15,23,42,0.12)');
  });

  it('copies the signup button gradient (D16)', () => {
    expect(gradients.signup).toEqual({
      colors: ['#0D1936', '#1D54C1', '#203378', '#0D1936'],
      locations: [0, 0.45, 0.8, 1],
    });
  });
});
