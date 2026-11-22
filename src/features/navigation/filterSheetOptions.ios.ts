import type { ComponentProps } from 'react';
import type { Stack } from 'expo-router';

type Options = NonNullable<ComponentProps<typeof Stack.Screen>['options']>;

/** Search filters as an iOS form sheet with two detents and the grabber (D32). */
export const filterSheetOptions: Options = {
  headerShown: false,
  presentation: 'formSheet',
  sheetAllowedDetents: [0.7, 1],
  sheetGrabberVisible: true,
  sheetCornerRadius: 20,
  sheetInitialDetentIndex: 0,
};
