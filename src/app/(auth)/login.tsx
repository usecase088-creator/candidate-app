import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

// Placeholder: the real sign-in form is Task 8. Headings are the website's (SCREENS.md §1).
export default function Login() {
  return (
    <Screen testID="login.screen" scroll>
      <View style={styles.stack}>
        <AppText variant="title">Welcome back</AppText>
        <AppText color="mutedForeground">Sign in to access your saved jobs and applications.</AppText>
        <Button
          testID="login.forgot"
          label="Forgot password?"
          variant="ghost"
          onPress={() => router.push('/forgot-password')}
        />
        <Button
          testID="login.signup"
          label="Create an account"
          variant="outline"
          onPress={() => router.push('/signup')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ stack: { gap: spacing['4'] } });
