import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { AppText } from '@/components/ui/Text';
import { colors, radius, shadows, spacing, touchSlop } from '@/theme/tokens';

const DOC = { ios: 'doc.text', android: 'description', web: 'description' } as const;
const CLOSE = { ios: 'xmark', android: 'close', web: 'close' } as const;
const CLOSE_SIZE = 32;

type Props =
  | { guest: true; onCreateAccount: () => void; onBuildCv: () => void; onDismiss: () => void }
  | { guest: false; onFillForm: () => void; onDismiss: () => void };

/**
 * Website routes/index.tsx "build banner", shown while the visitor has no profile. D32: a white card with the brand
 * document tile, the website's title and line, its buttons and a 44-pt dismiss cross. testIDs `home.banner*`.
 */
export function BuildProfileBanner(props: Props) {
  const { guest, onDismiss } = props;
  return (
    <View testID="home.banner" style={styles.card}>
      <View style={styles.top}>
        <View style={styles.tile}>
          <Icon name={DOC} size={18} tintColor={colors.primaryForeground} />
        </View>
        <View style={styles.text}>
          <AppText variant="rowTitle">
            {guest
              ? 'Join 1.2L+ healthcare professionals on ApronHanger'
              : 'Build your ApronHanger CV in one go'}
          </AppText>
          <AppText variant="secondary" color="mutedForeground">
            {guest
              ? 'Create your candidate profile to get verified, unlock one-click applications, and get discovered by top hospitals.'
              : "Fill the detailed form once — we'll generate your CV and unlock Quick Apply on every job."}
          </AppText>
        </View>
        <PressableScale
          testID="home.banner.dismiss"
          accessibilityLabel="Dismiss banner"
          pressScale={0.9}
          hitSlop={touchSlop(CLOSE_SIZE)}
          onPress={onDismiss}
          style={styles.close}
        >
          <Icon name={CLOSE} size={16} tintColor={colors.mutedForeground} />
        </PressableScale>
      </View>
      <View style={styles.actions}>
        {props.guest ? (
          <>
            <Button
              testID="home.banner.signup"
              label="Create Account"
              variant="gradient"
              size="sm"
              fullWidth={false}
              haptic="light"
              onPress={props.onCreateAccount}
            />
            <Button
              testID="home.banner.buildCv"
              label="Build CV"
              variant="outline"
              size="sm"
              fullWidth={false}
              onPress={props.onBuildCv}
            />
          </>
        ) : (
          <Button
            testID="home.banner.fillForm"
            label="Fill the form"
            size="sm"
            fullWidth={false}
            haptic="light"
            onPress={props.onFillForm}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing['3'],
    padding: spacing['4'],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    boxShadow: shadows.soft,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['3'] },
  tile: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: spacing['1'] },
  close: {
    width: CLOSE_SIZE,
    height: CLOSE_SIZE,
    marginTop: -spacing['1'],
    marginRight: -spacing['2'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'], paddingLeft: 36 + spacing['3'] },
});
