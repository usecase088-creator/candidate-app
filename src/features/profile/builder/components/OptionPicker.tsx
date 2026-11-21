import { Fragment, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { PressableScale } from '@/components/ui/PressableScale';
import { Separator } from '@/components/ui/Separator';
import { AppText } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  /** `builder.field.<key>`: the row; options are `{testID}.option.<n>`. */
  testID: string;
  label: string;
  hint?: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
};

const DOWN = { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' } as const;
const UP = { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' } as const;
const CHECK = { ios: 'checkmark', android: 'check', web: 'check' } as const;

/**
 * D32 single choice with many or long options (Role, State): a 48-pt picker row that opens a check list in place,
 * instead of 36 chips. Choosing closes the list; choosing the current value clears it (as the chips did).
 */
export function OptionPicker({ testID, label, hint, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.group}>
      <AppText variant="label">{label}</AppText>
      <PressableScale
        testID={testID}
        pressScale={1}
        accessibilityLabel={`${label}, ${value || 'Select'}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={[styles.field, open && styles.fieldOpen]}
      >
        <AppText
          testID={`${testID}.value`}
          color={value ? 'foreground' : 'placeholder'}
          numberOfLines={2}
          style={styles.value}
        >
          {value || 'Select'}
        </AppText>
        <Icon name={open ? UP : DOWN} size={20} tintColor={colors.mutedForeground} />
      </PressableScale>
      {hint ? (
        <AppText variant="caption" color="mutedForeground">
          {hint}
        </AppText>
      ) : null}
      {open ? (
        <View testID={`${testID}.options`} style={styles.list}>
          {options.map((option, i) => (
            <Fragment key={option}>
              {i > 0 ? <Separator inset={spacing['4']} /> : null}
              <ListRow
                testID={`${testID}.option.${i}`}
                title={option}
                titleNumberOfLines={3}
                accessibilityLabel={value === option ? `${option}, selected` : option}
                trailing={
                  value === option ? <Icon name={CHECK} size={20} tintColor={colors.brand} /> : 'none'
                }
                haptic="selection"
                onPress={() => {
                  onChange(value === option ? '' : option);
                  setOpen(false);
                }}
              />
            </Fragment>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing['1'] + spacing['0.5'] },
  field: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fieldOpen: { borderWidth: 1.5, borderColor: colors.ring },
  value: { flex: 1 },
  list: {
    marginTop: spacing['1'],
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
});
