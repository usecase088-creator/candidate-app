import type { ComponentProps } from 'react';
import type { Stack } from 'expo-router';

type Options = NonNullable<ComponentProps<typeof Stack.Screen>['options']>;

/**
 * Search filters as a sheet (D32). Android and web: one full-height detent, because at a partial height the sheet's
 * pinned footer (Reset / Show n roles) sat below the screen edge on the phone (2026-11-22).
 */
export const filterSheetOptions: Options = {
  headerShown: false,
  presentation: 'formSheet',
  sheetAllowedDetents: [1],
  sheetGrabberVisible: true,
  sheetCornerRadius: 28,
};
