import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

// Placeholder: the two-step signup (details → OTP) is Task 8. Headings are the website's (SCREENS.md §1).
export default function Signup() {
  return (
    <Screen testID="signup.screen" scroll>
      <View style={styles.stack}>
        <AppText variant="title">Create your account</AppText>
        <AppText color="mutedForeground">Join 1.2L+ verified healthcare professionals across India.</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ stack: { gap: spacing['4'] } });
