import { HeaderHeightContext, HeaderShownContext } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { type ComponentRef, type ReactNode, useContext, useEffect, useRef } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/tokens';

import { keyboardBehavior, keyboardOffset } from './keyboardBehavior';
import { OfflineBanner } from './OfflineBanner';
import { useKeyboardScroll } from './useKeyboardScroll';

export type ScreenProps = {
  testID: string;
  children: ReactNode;
  /** Forms and long content: scrolls, and stays scrollable at font scale 2 and 320 pt width. */
  scroll?: boolean;
  /** Tab screens pass none: the top bar takes the top edge and the tab bar the bottom one. */
  edges?: Edge[];
  padded?: boolean;
  /** When this value changes the scroll view jumps back to the top (a new step of a form). */
  scrollToTopKey?: unknown;
};

/**
 * The KeyboardAvoidingView offset (R3 #3): on iOS the height of the native stack header the screen sits under (its
 * frame starts below it), 0 outside a stack with a header and on Android.
 */
export function useKeyboardOffset(): number {
  return keyboardOffset(useContext(HeaderHeightContext) ?? 0);
}

/**
 * Every screen's root: safe areas (Android is edge-to-edge), theme background, dark status bar icons (D11),
 * keyboard avoidance (scroll mode also brings the focused field above the keyboard) and the offline banner. testIDs: `{id}`, `{id}.keyboard`, `{id}.scroll`.
 */
export function Screen({
  testID,
  children,
  scroll = false,
  edges = ['top', 'bottom'],
  padded = true,
  scrollToTopKey,
}: ScreenProps) {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [scrollToTopKey]);
  const offset = useRef(0);
  const keyboardVerticalOffset = useKeyboardOffset();
  // Under a native stack header the header already sits below the status bar: padding the top inset again left an
  // empty band on every pushed screen (found on the phone). Tab screens (TopBar) and auth screens have no header.
  const headerShown = useContext(HeaderShownContext);
  const safeEdges = headerShown ? edges.filter((e) => e !== 'top') : edges;
  useKeyboardScroll(
    (y) => scrollRef.current?.scrollTo({ y, animated: true }),
    () => offset.current,
  );

  const content = scroll ? (
    <ScrollView
      ref={scrollRef}
      testID={`${testID}.scroll`}
      onScroll={(e) => {
        offset.current = e.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.scrollContent, padded && styles.padded]}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <SafeAreaView testID={testID} edges={safeEdges} style={styles.root}>
      <StatusBar style="dark" />
      <OfflineBanner />
      <KeyboardAvoidingView
        testID={`${testID}.keyboard`}
        behavior={keyboardBehavior}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={[styles.flex, !scroll && padded && styles.padded]}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  padded: { paddingHorizontal: spacing['4'], paddingVertical: spacing['4'] },
});
