import { useCallback, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { colors, fonts, fontSizes, ICON_BUTTON, radius, shadows, spacing, touchSlop } from '@/theme/tokens';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { AppText } from './Text';

const HEIGHT = 44;
const ICON = 20;
const RING = 1.5;
/** The website's home search field (candidates/src/components/home/OpportunitiesHero.tsx). */
const DEFAULT_PLACEHOLDER = 'Role or specialty';
const DEFAULT_LABEL = 'Search jobs';

const MAGNIFIER = { ios: 'magnifyingglass', android: 'search', web: 'search' } as const;
const CLEAR = { ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' } as const;
export const SEARCH_ICONS = { magnifier: MAGNIFIER, clear: CLEAR } as const;

type FieldIcon =
  typeof MAGNIFIER | { ios: 'mappin.and.ellipse'; android: 'location_on'; web?: 'location_on' };

/** Web draws Material Symbols by their web name; an icon without one falls back to its (same) Android name. */
export const withWebName = <I extends { android: string; web?: string }>(icon: I) => ({
  web: icon.android,
  ...icon,
});

type Common = {
  testID: string;
  placeholder?: string;
  accessibilityLabel?: string;
  /** Leading icon; the magnifier by default (a city field passes a location pin). */
  icon?: FieldIcon;
  /** R2: white + soft shadow instead of the tonal fill (Home, where the field sits on the navy band). */
  elevated?: boolean;
  /** The search key by default; `next` when another field follows. */
  returnKeyType?: 'search' | 'next' | 'done';
};

export type EditableSearchFieldProps = Common & {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
  onFocus?: TextInputProps['onFocus'];
  onBlur?: TextInputProps['onBlur'];
  onPress?: never;
};

/** Fake search bar: the same look, but the whole field is one press that navigates (Home -> Search). */
export type PressableSearchFieldProps = Common & {
  onPress: () => void;
  /** Shown in place of the placeholder when a query is already set. */
  value?: string;
  onChangeText?: never;
};

export type SearchFieldProps = EditableSearchFieldProps | PressableSearchFieldProps;

/**
 * D32: the one 44-pt search field. Tonal fill (R2: `fill`; `elevated` = white + soft shadow), no border at rest, 1.5-pt brand ring while focused, leading magnifier,
 * our own 44-pt clear button (so both platforms behave the same), text 15 that grows to 1.5x.
 */
export function SearchField(props: SearchFieldProps) {
  if ('onPress' in props && props.onPress) return <PressableSearchField {...props} />;
  return <EditableSearchField {...(props as EditableSearchFieldProps)} />;
}

function EditableSearchField({
  testID,
  value,
  onChangeText,
  onSubmit,
  placeholder = DEFAULT_PLACEHOLDER,
  accessibilityLabel = DEFAULT_LABEL,
  icon = MAGNIFIER,
  returnKeyType = 'search',
  autoFocus,
  onFocus,
  onBlur,
  elevated,
}: EditableSearchFieldProps) {
  const [focused, setFocused] = useState(false);

  const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
    (e) => {
      setFocused(true);
      onFocus?.(e);
    },
    [onFocus],
  );
  const handleBlur = useCallback<NonNullable<TextInputProps['onBlur']>>(
    (e) => {
      setFocused(false);
      onBlur?.(e);
    },
    [onBlur],
  );
  const clear = useCallback(() => onChangeText(''), [onChangeText]);

  return (
    <View
      testID={`${testID}.field`}
      style={[styles.field, elevated && styles.elevated, focused && styles.focused]}
    >
      <Icon
        testID={`${testID}.icon`}
        name={withWebName(icon)}
        size={ICON}
        tintColor={colors.mutedForeground}
      />
      <TextInput
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType={returnKeyType}
        clearButtonMode="never"
        maxFontSizeMultiplier={1.5}
        style={styles.input}
      />
      {value.length > 0 ? (
        <PressableScale
          testID={`${testID}.clear`}
          accessibilityLabel="Clear search"
          hitSlop={touchSlop(ICON_BUTTON)}
          onPress={clear}
          style={styles.clear}
        >
          <Icon testID={`${testID}.clear.icon`} name={CLEAR} size={ICON} tintColor={colors.mutedForeground} />
        </PressableScale>
      ) : null}
    </View>
  );
}

function PressableSearchField({
  testID,
  onPress,
  value,
  placeholder = DEFAULT_PLACEHOLDER,
  accessibilityLabel = DEFAULT_LABEL,
  icon = MAGNIFIER,
  elevated,
}: PressableSearchFieldProps) {
  const hasValue = !!value;
  return (
    <PressableScale
      testID={testID}
      accessibilityRole="search"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={hasValue ? { text: value } : undefined}
      onPress={onPress}
      style={[styles.field, elevated && styles.elevated]}
    >
      <Icon
        testID={`${testID}.icon`}
        name={withWebName(icon)}
        size={ICON}
        tintColor={colors.mutedForeground}
      />
      <AppText
        variant="body"
        color={hasValue ? 'foreground' : 'placeholder'}
        numberOfLines={1}
        maxFontSizeMultiplier={1.5}
        style={styles.fakeText}
      >
        {hasValue ? value : placeholder}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    paddingLeft: spacing['3'],
    backgroundColor: colors.fill,
    borderRadius: radius.md,
    // Same width focused and not: the ring is a colour change, not a layout change.
    borderWidth: RING,
    borderColor: 'transparent',
  },
  elevated: { backgroundColor: colors.surface, boxShadow: shadows.soft },
  focused: { borderColor: colors.ring },
  input: {
    flex: 1,
    minHeight: HEIGHT - 2 * RING,
    paddingVertical: 0,
    paddingRight: spacing['3'],
    fontFamily: fonts.regular,
    fontSize: fontSizes.base.fontSize,
    color: colors.foreground,
  },
  fakeText: { flex: 1, paddingRight: spacing['3'] },
  clear: {
    width: HEIGHT,
    height: HEIGHT,
    marginLeft: -spacing['2'],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
