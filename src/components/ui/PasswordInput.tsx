import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { MIN_TOUCH, spacing } from '@/theme/tokens';

import { AppText } from './Text';
import { TextInput, type TextInputProps } from './TextInput';

export type PasswordInputProps = Omit<TextInputProps, 'secureTextEntry' | 'accessory'> & {
  /** Signup and reset: lets password managers offer a strong new password. */
  isNew?: boolean;
};

export function PasswordInput({ testID, isNew = false, ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextInput
      testID={testID}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={isNew ? 'new-password' : 'current-password'}
      textContentType={isNew ? 'newPassword' : 'password'}
      accessory={
        <Pressable
          testID={`${testID}.toggle`}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={spacing['2']}
          onPress={() => setVisible((v) => !v)}
          style={styles.toggle}
        >
          <AppText variant="caption" weight="semibold" color="brand">
            {visible ? 'Hide' : 'Show'}
          </AppText>
        </Pressable>
      }
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  toggle: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingLeft: spacing['2'] },
});
