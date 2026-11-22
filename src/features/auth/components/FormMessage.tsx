import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { pillTones } from '@/components/ui/Pill';
import { AppText } from '@/components/ui/Text';
import { useAnnounce } from '@/components/ui/useAnnounce';
import { colors, radius, spacing } from '@/theme/tokens';

export type FormMessageTone = 'error' | 'info';

const ICONS = {
  error: { ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' },
  info: { ios: 'info.circle.fill', android: 'info', web: 'info' },
} as const;

type Props = {
  testID: string;
  tone: FormMessageTone;
  message: string | undefined;
};

/**
 * D32 message box at the top of the auth and delete-account forms: tint fill, no border, 20-pt tone icon, 14/20 text.
 * `error` (the website's red box: first validation error or the server error) is announced as an alert;
 * `info` (why the user is on the sign-in screen, e.g. after deleting the account) is read politely.
 * testIDs: `{id}`, `{id}.icon`, `{id}.text` (the message alone).
 */
export function FormMessage({ testID, tone, message }: Props) {
  useAnnounce(message);
  if (!message) return null;
  const { bg, fg } = pillTones[tone];
  const isError = tone === 'error';
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={message}
      accessibilityRole={isError ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
      style={[styles.box, { backgroundColor: colors[bg] }]}
    >
      <Icon testID={`${testID}.icon`} name={ICONS[tone]} size={ICON_SIZE} tintColor={colors[fg]} />
      <AppText
        testID={`${testID}.text`}
        variant="label"
        weight="regular"
        color={isError ? 'errorText' : 'foreground'}
        style={styles.text}
      >
        {message}
      </AppText>
    </View>
  );
}

const ICON_SIZE = 20;

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing['2'],
    borderRadius: radius.md,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['3'],
  },
  text: { flex: 1 },
});
