// The structured form is the profile builder (Phase 4). "Start form" and "Edit & apply" lead here; the page sends the
// user to the builder and back to the chooser, where Quick Apply works once the form is saved.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { AppText } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import { ApplyBody, ApplyFrame } from '../components/ApplyFrame';
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
      appliedMessage={(job) => `You have already submitted an application for ${job.role}.`}
    >
      {({ job }) => (
        <ApplyBody
          prefix="apply.form"
          bar={
            // D32: the one primary action sits in the sticky bar.
            <StickyActionBar testID="apply.form.bar">
              <Button
                testID="apply.form.build"
                label="Fill in my profile"
                haptic="medium"
                onPress={() => router.push('/profile-builder')}
              />
            </StickyActionBar>
          }
        >
          <ApplyingForCard job={job} />
          <View style={styles.box}>
            <AppText variant="heading">Application form</AppText>
            <AppText color="mutedForeground">
              Fill in the profile form first. When it is saved, come back here: Quick Apply and apply with
              your CV will be ready.
            </AppText>
            <Button
              testID="apply.form.choose"
              label="Choose another way to apply"
              variant="secondary"
              size="md"
              onPress={back}
            />
          </View>
        </ApplyBody>
      )}
    </ApplyFrame>
  );
}

const styles = StyleSheet.create({ box: { gap: spacing['3'] } });
