import type { ComponentProps } from 'react';
import type { Stack } from 'expo-router';

type Options = NonNullable<ComponentProps<typeof Stack.Screen>['options']>;

/**
 * Search filters as an iOS form sheet (D32): one full detent with the grabber. At a 0.7 detent the sheet's content and
 * header overlapped on the iPhone SE simulator (2026-11-22), and the pinned footer needs the full height anyway.
 */
export const filterSheetOptions: Options = {
  headerShown: false,
  presentation: 'formSheet',
  sheetAllowedDetents: [1],
  sheetGrabberVisible: true,
  sheetCornerRadius: 20,
};
