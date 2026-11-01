// The bottom tab bar must have room for its labels at large phone font sizes. React Navigation sizes the bar for the
// normal label (49 dp plus the bottom safe area), so a label that grows with the font ran past the bottom edge on the
// phone at font scale 2 (seen 2026-11-01: "Home" and "Search" cut in half). The labels grow at most TAB_LABEL_MAX_SCALE.
import { tabBarHeight, TAB_LABEL_MAX_SCALE } from '../tabBar';

describe('tabBarHeight', () => {
  it('is the library default (49 dp) plus the bottom safe area at the normal font size', () => {
    expect(tabBarHeight(1, 0)).toBe(49);
    expect(tabBarHeight(1, 24)).toBe(73);
  });

  it('grows with the font size, up to the largest the labels grow to', () => {
    const h = [1, 1.15, 1.3].map((s) => tabBarHeight(s, 0));
    expect(h[1]).toBeGreaterThan(h[0] as number);
    expect(h[2]).toBeGreaterThan(h[1] as number);
  });

  it('stops growing beyond the label cap (a phone at font scale 2 gets the same bar as 1.3)', () => {
    expect(tabBarHeight(2, 0)).toBe(tabBarHeight(TAB_LABEL_MAX_SCALE, 0));
    expect(tabBarHeight(3, 10)).toBe(tabBarHeight(TAB_LABEL_MAX_SCALE, 10));
  });

  it('never shrinks below the default (font scale under 1 is treated as 1)', () => {
    expect(tabBarHeight(0.8, 0)).toBe(49);
  });

  it('adds the bottom safe area on top, whatever the font size', () => {
    expect(tabBarHeight(2, 30) - tabBarHeight(2, 0)).toBe(30);
  });
});
