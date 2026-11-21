import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { TextInput, type TextInputProps } from './TextInput';

export type PasswordInputProps = Omit<TextInputProps, 'secureTextEntry' | 'accessory'> & {
  /** Signup and reset: lets password managers offer a strong new password. */
  isNew?: boolean;
};

const TOGGLE = 44;
const ICON_SIZE = 20;
const EYE = { ios: 'eye', android: 'visibility', web: 'visibility' } as const;
const EYE_OFF = { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' } as const;

/** D32: the Show/Hide toggle is a 44-pt eye icon button inside the field (`{id}.toggle`, `{id}.toggle.icon`). */
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
        <PressableScale
          testID={`${testID}.toggle`}
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          pressScale={1}
          onPress={() => setVisible((v) => !v)}
          style={styles.toggle}
        >
          <Icon
            testID={`${testID}.toggle.icon`}
            name={visible ? EYE_OFF : EYE}
            size={ICON_SIZE}
            tintColor={colors.mutedForeground}
          />
        </PressableScale>
      }
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  toggle: {
    width: TOGGLE,
    height: TOGGLE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    // The field has 12-pt side padding; pull the button out so the icon sits 12 pt from the edge.
    marginRight: -spacing['2'],
  },
});
