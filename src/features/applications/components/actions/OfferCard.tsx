// Offer Letter Received and Joining Date (website: CandidateActionCard.tsx). The website's "View Offer Letter" opens the
// home page; the app opens the letter, and can also download and share it. Reject asks once more (D26): it is final.
// D32: the panel wears the status tone (amber: the offer needs an answer; green once joining is confirmed), the letter
// as a document row with a share button, one full-width primary, Reject as red text.
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { Application } from '@/api/schemas/applications';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { AppText } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { confirmAction } from '@/lib/confirm';
import { colors, radius, spacing } from '@/theme/tokens';

import { useRespond } from '../../hooks/useRespond';
import { formatIndianDate } from '../../logic/interview';
import { openOfferLetter, type OfferLetterResult, shareOfferLetter } from '../../offerLetter';
import { CardFrame } from './CardFrame';

const CANNOT_OPEN = "This link can't be opened.";
const CANNOT_DOWNLOAD = 'Could not download the offer letter. Please try again.';

const OFFER = { ios: 'envelope.open', android: 'mail', web: 'mail' } as const;
const PDF = { ios: 'doc.richtext', android: 'picture_as_pdf', web: 'picture_as_pdf' } as const;
const SHARE = { ios: 'square.and.arrow.up', android: 'share', web: 'share' } as const;
const CHEVRON = { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as const;
const CELEBRATE = { ios: 'party.popper', android: 'celebration', web: 'celebration' } as const;

export function OfferCard({ application: a }: { application: Application }) {
  const respond = useRespond();
  const toast = useToast();
  const [working, setWorking] = useState<'view' | 'share'>();
  const busy = respond.isPending;
  const letter = a.offerLetterUrl;

  const run = async (kind: 'view' | 'share', action: (url: string) => Promise<OfferLetterResult>) => {
    if (!letter || working) return;
    setWorking(kind);
    const result = await action(letter);
    setWorking(undefined);
    if (!result.ok) {
      toast.show(kind === 'share' && result.reason === 'failed' ? CANNOT_DOWNLOAD : CANNOT_OPEN, {
        variant: 'error',
      });
    }
  };

  const confirmReject = async () => {
    const sure = await confirmAction({
      title: 'Reject this offer?',
      message: 'This cannot be undone. The hospital will be told you are not taking the job.',
      confirmLabel: 'Reject offer',
    });
    if (sure) respond.mutate({ id: a.id, status: 'OfferRejected' });
  };

  return (
    <CardFrame status={a.status} icon={OFFER} title="Offer Letter Received">
      <View style={styles.body}>
        <AppText>Congratulations! The hospital has sent you an offer letter.</AppText>
        {letter ? (
          <View style={styles.letterRow}>
            <PressableScale
              testID="action.offer.view"
              accessibilityLabel="View offer letter"
              accessibilityState={{ busy: working === 'view' }}
              pressScale={1}
              onPress={() => void run('view', openOfferLetter)}
              style={styles.letter}
            >
              <Icon name={PDF} size={22} tintColor={colors.amberText} />
              <View style={styles.letterText}>
                <AppText variant="label" numberOfLines={2}>
                  View Offer Letter
                </AppText>
                <AppText variant="caption" color="mutedForeground">
                  PDF
                </AppText>
              </View>
              {working === 'view' ? (
                <ActivityIndicator color={colors.mutedForeground} />
              ) : (
                <Icon name={CHEVRON} size={20} tintColor={colors.mutedForeground} />
              )}
            </PressableScale>
            <PressableScale
              testID="action.offer.share"
              accessibilityLabel="Download or share offer letter"
              accessibilityState={{ busy: working === 'share' }}
              pressScale={1}
              onPress={() => void run('share', shareOfferLetter)}
              style={styles.share}
            >
              {working === 'share' ? (
                <ActivityIndicator color={colors.brand} />
              ) : (
                <Icon name={SHARE} size={22} tintColor={colors.brand} />
              )}
            </PressableScale>
          </View>
        ) : null}
        <View style={styles.actions}>
          <Button
            testID="action.offer.accept"
            label="Accept Offer"
            accessibilityLabel="Accept offer"
            size="md"
            haptic="medium"
            disabled={busy}
            onPress={() => respond.mutate({ id: a.id, status: 'OfferAccepted' })}
          />
          <Button
            testID="action.offer.reject"
            label="Reject Offer"
            accessibilityLabel="Reject offer"
            variant="destructiveText"
            size="md"
            disabled={busy}
            onPress={() => void confirmReject()}
          />
        </View>
      </View>
    </CardFrame>
  );
}

export function JoiningCard({ application: a }: { application: Application }) {
  return (
    <CardFrame status={a.status} icon={CELEBRATE} title="Joining Date">
      <View style={styles.body}>
        <AppText testID="action.joining.text">
          {'Your joining date is '}
          <AppText weight="bold" tabular>
            {formatIndianDate(a.joiningDate)}
          </AppText>
          {'.'}
        </AppText>
        {a.joiningNote ? (
          <AppText variant="secondary" color="mutedForeground">
            {a.joiningNote}
          </AppText>
        ) : null}
      </View>
    </CardFrame>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing['3'] },
  letterRow: { flexDirection: 'row', alignItems: 'stretch', gap: spacing['2'] },
  letter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    minHeight: 56,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  letterText: { flex: 1, gap: spacing['0.5'] },
  share: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  actions: { gap: spacing['2'] },
});
