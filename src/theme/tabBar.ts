// Size of the bottom tab bar. React Navigation makes it 49 dp (plus the bottom safe area) for the normal 11 pt label;
// the labels here grow with the phone's font size up to TAB_LABEL_MAX_SCALE, so the bar gets the extra room.
export const TAB_LABEL_SIZE = 11;
/** The labels grow at most this much (maxFontSizeMultiplier on the label), so 4 tabs still fit at 320 pt. */
export const TAB_LABEL_MAX_SCALE = 1.3;

const DEFAULT_HEIGHT = 49;
/** Extra height per label point of growth: line height plus the gap between icon and label (set on the phone). */
const EXTRA_PER_POINT = 3;

export function tabBarHeight(fontScale: number, bottomInset: number): number {
  const scale = Math.min(Math.max(fontScale, 1), TAB_LABEL_MAX_SCALE);
  const grown = TAB_LABEL_SIZE * (scale - 1);
  return DEFAULT_HEIGHT + Math.ceil(grown * EXTRA_PER_POINT) + bottomInset;
}
