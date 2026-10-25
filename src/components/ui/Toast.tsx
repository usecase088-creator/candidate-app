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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type ColorToken, colors, radius, shadows, spacing } from '@/theme/tokens';

import { AppText } from './Text';

export type ToastVariant = 'info' | 'success' | 'error';
type ToastOptions = { variant?: ToastVariant; duration?: number };
type ToastState = { id: number; message: string; variant: ToastVariant; duration: number } | null;
type ToastApi = { show: (message: string, options?: ToastOptions) => void; hide: () => void };

const DEFAULT_DURATION_MS = 4000;

const ACCENT: Record<ToastVariant, { bar: ColorToken; text: ColorToken }> = {
  info: { bar: 'brand', text: 'foreground' },
  success: { bar: 'success', text: 'foreground' },
  error: { bar: 'destructive', text: 'errorText' },
};

const ToastContext = createContext<ToastApi | null>(null);

/** One toast at a time at the top of the screen; a new one replaces the current one. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const nextId = useRef(0);
  const insets = useSafeAreaInsets();

  const hide = useCallback(() => setToast(null), []);
  const show = useCallback((message: string, options: ToastOptions = {}) => {
    nextId.current += 1;
    setToast({
      id: nextId.current,
      message,
      variant: options.variant ?? 'info',
      duration: options.duration ?? DEFAULT_DURATION_MS,
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(hide, toast.duration);
    return () => clearTimeout(timer);
  }, [toast, hide]);

  const api = useMemo(() => ({ show, hide }), [show, hide]);
  const accent = toast ? ACCENT[toast.variant] : null;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && accent && (
        <View pointerEvents="box-none" style={[styles.host, { top: insets.top + spacing['2'] }]}>
          <Pressable
            testID="toast"
            accessibilityRole="alert"
            accessibilityLabel={toast.message}
            accessibilityLiveRegion="polite"
            accessibilityHint="Tap to dismiss"
            onPress={hide}
            style={[styles.toast, { borderLeftColor: colors[accent.bar] }]}
          >
            <AppText color={accent.text} weight="medium">
              {toast.message}
            </AppText>
          </Pressable>
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
    boxShadow: shadows.pop,
  },
});
