// The 15-step structured form is the profile builder of Phase 4. Until then this page says so and leads back, so
// the "Start form" and "Edit & apply" buttons never end in a dead tap. (docs/PHASE-3.md, Raj's answer 1)
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import { ApplyFrame } from '../components/ApplyFrame';
import { ApplyingForCard } from '../components/ApplyingForCard';

export function ApplyFormScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const back = () =>
    router.canGoBack() ? router.back() : router.replace({ pathname: '/apply/[jobId]', params: { jobId } });
  return (
    <ApplyFrame
      prefix="apply.form"
      jobId={jobId}
      onBack={back}
      appliedMessage={(job) => `You have already submitted an application for ${job.role}.`}
    >
      {({ job }) => (
        <>
          <ApplyingForCard job={job} />
          <View style={styles.box}>
            <AppText variant="title" accessibilityRole="header">
              Application form
            </AppText>
            <AppText color="mutedForeground">
              The 15-step structured form arrives in the next app update. Until then you can apply with Quick
              Apply (once your form CV exists on the website) or by uploading your CV.
            </AppText>
            <Button
              testID="apply.form.choose"
              label="Choose another way to apply"
              variant="outline"
              onPress={back}
            />
          </View>
        </>
      )}
    </ApplyFrame>
  );
}

const styles = StyleSheet.create({ box: { gap: spacing['3'] } });
