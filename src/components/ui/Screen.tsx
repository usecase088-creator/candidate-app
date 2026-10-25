import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/tokens';

import { keyboardBehavior } from './keyboardBehavior';
import { OfflineBanner } from './OfflineBanner';

export type ScreenProps = {
  testID: string;
  children: ReactNode;
  /** Forms and long content: scrolls, and stays scrollable at font scale 2 and 320 pt width. */
  scroll?: boolean;
  /** Tab screens leave the bottom edge to the tab bar. */
  edges?: Edge[];
  padded?: boolean;
};

/**
 * Every screen's root: safe areas (Android is edge-to-edge), theme background, dark status bar icons (D11),
 * keyboard avoidance and the offline banner. testIDs: `{id}`, `{id}.keyboard`, `{id}.scroll`.
 */
export function Screen({
  testID,
  children,
  scroll = false,
  edges = ['top', 'bottom'],
  padded = true,
}: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      testID={`${testID}.scroll`}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.scrollContent, padded && styles.padded]}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <SafeAreaView testID={testID} edges={edges} style={styles.root}>
      <StatusBar style="dark" />
      <OfflineBanner />
      <KeyboardAvoidingView
        testID={`${testID}.keyboard`}
        behavior={keyboardBehavior}
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
