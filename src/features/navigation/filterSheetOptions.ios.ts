import type { ComponentProps } from 'react';
import type { Stack } from 'expo-router';

type Options = NonNullable<ComponentProps<typeof Stack.Screen>['options']>;

/**
 * Search filters on iOS (D32 sheet): the system page sheet (`modal`), a full-height card over the tabs that is
 * swiped down to close. Not `formSheet`: react-native-screens sets the frame of the first ScrollView it finds in a
 * form sheet to the whole sheet, ignoring our header and pinned footer. On the iPhone SE simulator the filter list then
 * covered the header (ios-e2e run 1, 0.7 detent) or stayed blank (run 2, full detent), 2026-11-22.
 */
export const filterSheetOptions: Options = {
  headerShown: false,
  presentation: 'modal',
};
