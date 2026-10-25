import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

// Placeholder: phone → OTP → reset → success is Task 8. Headings are the website's (SCREENS.md §2).
export default function ForgotPassword() {
  return (
    <Screen testID="forgot.screen" scroll>
      <View style={styles.stack}>
        <AppText variant="title">Reset Password</AppText>
        <AppText color="mutedForeground">Enter your registered mobile number to receive an OTP.</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ stack: { gap: spacing['4'] } });
