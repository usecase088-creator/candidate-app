// Offer Letter Received and Joining Date (website: CandidateActionCard.tsx). The website's "View Offer Letter" opens the
// home page; the app opens the letter, and can also download and share it. Reject asks once more (D26): it is final.
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import type { Application } from '@/api/schemas/applications';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { spacing } from '@/theme/tokens';

import { useRespond } from '../../hooks/useRespond';
import { formatIndianDate } from '../../logic/interview';
import { openOfferLetter, type OfferLetterResult, shareOfferLetter } from '../../offerLetter';
import { CardFrame } from './CardFrame';

const CANNOT_OPEN = "This link can't be opened.";
const CANNOT_DOWNLOAD = 'Could not download the offer letter. Please try again.';

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

  const confirmReject = () =>
    Alert.alert(
      'Reject this offer?',
      'This cannot be undone. The hospital will be told you are not taking the job.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject offer',
          style: 'destructive',
          onPress: () => respond.mutate({ id: a.id, status: 'OfferRejected' }),
        },
      ],
    );

  return (
    <CardFrame tone="positive" title="Offer Letter Received">
      <AppText color="emeraldText">Congratulations! The hospital has sent you an offer letter.</AppText>
      {letter ? (
        <View style={styles.row}>
          <Button
            testID="action.offer.view"
            label="View Offer Letter"
            accessibilityLabel="View offer letter"
            variant="outline"
            fullWidth={false}
            loading={working === 'view'}
            onPress={() => void run('view', openOfferLetter)}
          />
          <Button
            testID="action.offer.share"
            label="Download or share"
            accessibilityLabel="Download or share offer letter"
            variant="outline"
            fullWidth={false}
            loading={working === 'share'}
            onPress={() => void run('share', shareOfferLetter)}
          />
        </View>
      ) : null}
      <View style={styles.row}>
        <Button
          testID="action.offer.accept"
          label="Accept Offer"
          accessibilityLabel="Accept offer"
          fullWidth={false}
          disabled={busy}
          onPress={() => respond.mutate({ id: a.id, status: 'OfferAccepted' })}
        />
        <Button
          testID="action.offer.reject"
          label="Reject Offer"
          accessibilityLabel="Reject offer"
          variant="outline"
          fullWidth={false}
          disabled={busy}
          onPress={confirmReject}
        />
      </View>
    </CardFrame>
  );
}

export function JoiningCard({ application: a }: { application: Application }) {
  return (
    <CardFrame tone="positive" title="Joining Date">
      <AppText testID="action.joining.text" color="emeraldText">
        {'Your joining date is '}
        <AppText weight="bold" color="emeraldText">
          {formatIndianDate(a.joiningDate)}
        </AppText>
        {'.'}
      </AppText>
      {a.joiningNote ? (
        <AppText variant="caption" color="emeraldText">
          {a.joiningNote}
        </AppText>
      ) : null}
    </CardFrame>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'] } });
