import {
  colors,
  fonts,
  fontSizes,
  gradients,
  ICON_BUTTON,
  logoTints,
  MIN_TOUCH,
  motion,
  radius,
  shadows,
  spacing,
  touchSlop,
} from '../tokens';

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
      warning: '#DEA143',
      border: '#D4DAE1',
      ring: '#326AD9',
    });
  });

  it('R3 a11y: the destructive fill is darker than the website red (#E23439) so its label meets AA', () => {
    expect(colors.destructive).toBe('#C81E2A');
    expect(contrast(colors.destructiveForeground, colors.destructive)).toBeGreaterThanOrEqual(4.5);
  });

  it('R3 a11y: placeholders meet AA on every field background (also the tonal fill of search fields)', () => {
    expect(colors.placeholder).toBe('#636D7F');
    for (const bg of ['surface', 'background', 'fill'] as const) {
      expect(contrast(colors.placeholder, colors[bg])).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('R3 a11y: brandText is the blue for text on brand tints; brand stays for fills, borders and icons', () => {
    expect(colors.brandText).toBe('#2A5BC4');
    for (const bg of ['brandSoft', 'fill', 'skySoft', 'surface'] as const) {
      expect(contrast(colors.brandText, colors[bg])).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('R3 a11y: controlBorder outlines inputs, checkboxes, OTP boxes and the switch track at >= 3:1 (WCAG 1.4.11)', () => {
    expect(colors.controlBorder).toBe('#8A94A6');
    expect(contrast(colors.controlBorder, colors.surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(colors.controlBorder, colors.background)).toBeGreaterThanOrEqual(2.9);
  });

  it('gov note More/Less: skyText on skySoft is AA', () => {
    expect(contrast(colors.skyText, colors.skySoft)).toBeGreaterThanOrEqual(4.5);
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
    ['interview pill', 'indigoText', 'indigoSoft'],
    ['document pill', 'amberText', 'amberSoft'],
    ['offer and joining pill', 'emeraldText', 'emeraldSoft'],
    ['reviewed pill', 'skyText', 'skySoft'],
  ] as const)('%s meets WCAG AA for small text (4.5:1)', (_label, fg, bg) => {
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

// D32: the website's six radii (8/10/12/16/20/24) read as six different components on a phone; the app keeps one family.
describe('radius (D32 family)', () => {
  it('has exactly four radii: 8 / 12 / 20 / pill', () => {
    expect(radius).toEqual({ sm: 8, md: 12, lg: 20, full: 9999 });
  });
});

describe('D32 additions', () => {
  it('adds the roles the redesign needs and drops the second blue', () => {
    expect(colors.separator).toBe('#E5E9EF');
    expect(colors.successSoft).toBe('#E6F8F1');
    expect(colors.successText).toBe('#047857');
    expect('checkbox' in colors).toBe(false);
    expect(contrast(colors.successText, colors.successSoft)).toBeGreaterThanOrEqual(4.5);
  });

  it('R2: a tonal control fill that is visibly darker than the canvas and keeps text AA', () => {
    expect(colors.fill).toBe('#E9EFF6');
    // surface2 on background was ~1.02:1, so tonal controls disappeared.
    expect(contrast(colors.fill, colors.background)).toBeGreaterThan(
      contrast(colors.surface2, colors.background),
    );
    expect(contrast(colors.fill, colors.background)).toBeGreaterThanOrEqual(1.1);
    expect(contrast(colors.foreground, colors.fill)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.mutedForeground, colors.fill)).toBeGreaterThanOrEqual(4.5);
  });

  it('builder CV preview: a 12% white tint on navy for its boxes, with white and muted text AA on it', () => {
    expect(colors.primaryForegroundTint).toBe('rgba(247,251,253,0.12)');
    const over = (alpha: number, top: string, bg: string) => {
      const ch = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
      const mix = [1, 3, 5].map((i) => Math.round(alpha * ch(top, i) + (1 - alpha) * ch(bg, i)));
      return `#${mix.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
    };
    const box = over(0.12, colors.primaryForeground, colors.navy);
    expect(contrast(colors.primaryForeground, box)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(over(0.8, colors.primaryForeground, box), box)).toBeGreaterThanOrEqual(4.5);
  });

  it('R2: muted text on the navy hero band (80% white) stays AA on every gradient stop', () => {
    expect(colors.primaryForegroundMuted).toBe('rgba(247,251,253,0.8)');
    // 80% #F7FBFD over each stop, then checked against that stop.
    const blend = (bg: string) => {
      const ch = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
      const mix = [1, 3, 5].map((i) => Math.round(0.8 * ch('#F7FBFD', i) + 0.2 * ch(bg, i)));
      return `#${mix.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
    };
    for (const stop of gradients.signup.colors) {
      expect(contrast(blend(stop), stop)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors.primaryForeground, stop)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('has six logo tints (initials fallback), each readable', () => {
    expect(logoTints).toHaveLength(6);
    for (const t of logoTints) expect(contrast(t.fg, t.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('motion: short, ease-out, one press spring', () => {
    expect(motion.duration).toEqual({ press: 120, enter: 220, exit: 180, step: 250 });
    expect(motion.pressScale).toBe(0.97);
    expect(motion.pressOpacity).toBe(0.9);
    expect(motion.spring).toEqual({ damping: 15, stiffness: 300, mass: 1 });
  });
});

describe('R3 #13: values that used to bypass the theme', () => {
  it('has an 11/13 size for text inside a 36-pt ring (the smallest text in the app)', () => {
    expect(fontSizes['2xs']).toEqual({ fontSize: 11, lineHeight: 13 });
  });

  it('has the 44-pt icon button size (with touchSlop it reaches MIN_TOUCH)', () => {
    expect(ICON_BUTTON).toBe(44);
    expect(ICON_BUTTON + 2 * touchSlop(ICON_BUTTON)).toBe(MIN_TOUCH);
  });
});

describe('touch targets', () => {
  it('touchSlop pads a drawn size up to MIN_TOUCH (48: Android 48 dp, more than iOS 44 pt)', () => {
    expect(MIN_TOUCH).toBe(48);
    expect(touchSlop(32)).toBe(8);
    expect(touchSlop(36)).toBe(6);
    expect(touchSlop(44)).toBe(2);
    expect(touchSlop(20)).toBe(14);
    expect(touchSlop(48)).toBe(0);
    expect(touchSlop(60)).toBe(0);
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
