import type { SymbolViewProps } from 'expo-symbols';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { type ColorToken, colors, motion, radius, shadows, spacing } from '@/theme/tokens';

import { Icon } from './Icon';
import { AppText } from './Text';

export type ToastVariant = 'info' | 'success' | 'error';
/** bottom (default): above the tab bar. top: under the header of a pushed screen (give the header height as `offset`). */
export type ToastPlacement = 'top' | 'bottom';
type ToastOptions = {
  variant?: ToastVariant;
  duration?: number;
  placement?: ToastPlacement;
  offset?: number;
};
type ToastState = {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
  placement: ToastPlacement;
  offset: number;
};
type ToastApi = { show: (message: string, options?: ToastOptions) => void; hide: () => void };

const DEFAULT_DURATION_MS = 4000;
/** Height of the tab bar: the default bottom toast sits above it (plus the safe-area inset). */
const TAB_BAR_HEIGHT = 72;
/** How far the toast travels while it slides in or out. */
const SLIDE = 16;
const ICON_SIZE = 20;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** D32: soft fill from the semantic tint pair, icon in its text colour, message always in `foreground`. */
const LOOK: Record<ToastVariant, { bg: ColorToken; fg: ColorToken; icon: SymbolViewProps['name'] }> = {
  info: { bg: 'skySoft', fg: 'skyText', icon: { ios: 'info.circle.fill', android: 'info', web: 'info' } },
  success: {
    bg: 'successSoft',
    fg: 'successText',
    icon: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  },
  error: {
    bg: 'destructiveSoft',
    fg: 'errorText',
    icon: { ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' },
  },
};

const ToastContext = createContext<ToastApi | null>(null);

/**
 * One toast at a time; a new one replaces the current one. Slides + fades in over motion.duration.enter and out over
 * motion.duration.exit (Reduce Motion: fade only), then leaves the tree. Tap dismisses.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Called when the exit animation of toast `id` finished. A newer toast may have replaced it meanwhile: keep that one.
  const remove = useCallback((id: number) => {
    setToast((current) => (current && current.id === id ? null : current));
  }, []);

  const hide = useCallback(() => {
    const current = toast;
    if (!current) return;
    const slide = reduceMotion ? 0 : current.placement === 'top' ? -SLIDE : SLIDE;
    opacity.set(withTiming(0, { duration: motion.duration.exit, easing: Easing.in(Easing.quad) }));
    translateY.set(
      withTiming(slide, { duration: motion.duration.exit, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) runOnJS(remove)(current.id);
      }),
    );
  }, [toast, reduceMotion, opacity, translateY, remove]);

  const show = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const variant = options.variant ?? 'info';
      const placement = options.placement ?? 'bottom';
      if (variant !== 'info') haptic(variant);
      // Start pose before the first frame (no flash at the resting position); also cancels a running exit.
      opacity.set(0);
      translateY.set(reduceMotion ? 0 : placement === 'top' ? -SLIDE : SLIDE);
      nextId.current += 1;
      setToast({
        id: nextId.current,
        message,
        variant,
        duration: options.duration ?? DEFAULT_DURATION_MS,
        placement,
        offset: options.offset ?? 0,
      });
    },
    [opacity, reduceMotion, translateY],
  );

  // Enter animation for each new toast (also when a toast replaces another mid-flight).
  useEffect(() => {
    if (!toast) return;
    opacity.set(withTiming(1, { duration: motion.duration.enter, easing: Easing.out(Easing.cubic) }));
    translateY.set(withTiming(0, { duration: motion.duration.enter, easing: Easing.out(Easing.cubic) }));
  }, [toast, opacity, translateY]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(hide, toast.duration);
    return () => clearTimeout(timer);
  }, [toast, hide]);

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: translateY.get() }],
  }));

  const api = useMemo(() => ({ show, hide }), [show, hide]);
  const look = toast ? LOOK[toast.variant] : null;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && look && (
        <View
          testID="toast.host"
          pointerEvents="box-none"
          style={[
            styles.host,
            toast.placement === 'top'
              ? { top: insets.top + toast.offset }
              : { bottom: insets.bottom + TAB_BAR_HEIGHT + toast.offset },
          ]}
        >
          <AnimatedPressable
            testID="toast"
            accessibilityRole="alert"
            accessibilityLabel={toast.message}
            accessibilityLiveRegion="polite"
            accessibilityHint="Tap to dismiss"
            onPress={hide}
            style={[styles.toast, { backgroundColor: colors[look.bg] }, animated]}
          >
            <Icon testID="toast.icon" name={look.icon} size={ICON_SIZE} tintColor={colors[look.fg]} />
            <AppText style={styles.message} numberOfLines={2}>
              {toast.message}
            </AppText>
          </AnimatedPressable>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider> (root layout).');
  return api;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: spacing['4'], right: spacing['4'] },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    borderRadius: radius.md,
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
    boxShadow: shadows.soft,
  },
  message: { flex: 1 },
});
