// What the Applications and Profile tabs show a signed-out visitor (website: those pages send a guest to sign-in).
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import { goToSignIn, goToSignUp } from '../signInGate';

type Props = {
  /** `applications.signin`, `profile.signin`: the button is `{testID}.button`. */
  testID: string;
  title: string;
  /** Where to go after signing in. */
  heading: string;
};

export function SignInPrompt({ testID, title, heading }: Props) {
  return (
    <Screen testID={testID} edges={[]}>
      <View style={styles.stack}>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        <AppText color="mutedForeground">Sign in to access your saved jobs and applications.</AppText>
        <Button
          testID={`${testID}.button`}
          label="Sign in"
          accessibilityLabel="Sign in"
          onPress={() => goToSignIn(heading)}
        />
        <Button
          testID={`${testID}.signup`}
          label="Create an account"
          accessibilityLabel="Create an account"
          variant="outline"
          onPress={() => goToSignUp(heading)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ stack: { gap: spacing['4'] } });
