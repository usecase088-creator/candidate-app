import { type ComponentRef, useCallback, useRef } from 'react';
import type { LayoutChangeEvent, ScrollView } from 'react-native';

/** Room left above a field scrolled into view (its label stays visible). */
export const FIELD_SCROLL_GAP = 16;

/**
 * Brings a field with an error into view (R3 #1). Each level records its own `onLayout` y (relative to its parent);
 * `scrollToField(['group', 'field'])` scrolls to the sum of that path. A path with a level not laid out yet is ignored.
 */
export function useFieldScroll() {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const ys = useRef(new Map<string, number>());

  const onLayoutOf = useCallback(
    (key: string) => (e: LayoutChangeEvent) => {
      ys.current.set(key, e.nativeEvent.layout.y);
    },
    [],
  );

  const scrollToField = useCallback((path: readonly string[]) => {
    let y = 0;
    for (const key of path) {
      const part = ys.current.get(key);
      if (part === undefined) return;
      y += part;
    }
    scrollRef.current?.scrollTo({ y: Math.max(0, y - FIELD_SCROLL_GAP), animated: true });
  }, []);

  return { scrollRef, onLayoutOf, scrollToField };
}
