// Interview Scheduled: date and place, then Accept, Request Reschedule or Decline (website: CandidateActionCard.tsx).
// Decline asks once more (D26): it is final. Everything waits for the server's answer.
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import type { Application } from '@/api/schemas/applications';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { useOpenLink } from '@/features/jobs/components/listings/useOpenLink';
import { type ColorToken, spacing } from '@/theme/tokens';

import { useRespond } from '../../hooks/useRespond';
import { formatIstDateTime, interviewPlace } from '../../logic/interview';
import { CardFrame, cardTextColor } from './CardFrame';

export function InterviewCard({ application: a }: { application: Application }) {
  const respond = useRespond();
  const openLink = useOpenLink();
  const [rescheduling, setRescheduling] = useState(false);
  const [note, setNote] = useState('');
  const place = interviewPlace(a);
  const busy = respond.isPending;
  const text = cardTextColor('interview');

  const send = (status: string, withNote?: string) => respond.mutate({ id: a.id, status, note: withNote });
  const confirmDecline = () =>
    Alert.alert(
      'Decline this interview?',
      'This cannot be undone. The hospital will be told you are not taking part.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Decline', style: 'destructive', onPress: () => send('InterviewDeclined') },
      ],
    );

  return (
    <CardFrame tone="interview" title="Interview Scheduled">
      <View style={styles.facts}>
        <Fact label="Date:" value={formatIstDateTime(a.interviewDate)} color={text} />
        <Fact label="Type:" value={a.interviewType ?? ''} color={text} />
        <View style={styles.fact}>
          <AppText variant="label" weight="semibold" color={text}>
            {place.label.trim()}
          </AppText>
          {place.kind === 'link' ? (
            <Pressable
              testID="action.interview.join"
              accessibilityRole="link"
              accessibilityLabel="Join meeting"
              hitSlop={spacing['2']}
              onPress={() => openLink(place.url)}
            >
              <AppText variant="label" weight="semibold" color={text} style={styles.underline}>
                Join Meeting
              </AppText>
            </Pressable>
          ) : (
            <AppText variant="label" color={text}>
              {place.text}
            </AppText>
          )}
        </View>
        {a.interviewerName ? <Fact label="Interviewer:" value={a.interviewerName} color={text} /> : null}
      </View>

      {rescheduling ? (
        <View style={styles.facts}>
          <TextInput
            testID="action.interview.note"
            label="Your availability"
            placeholder="Please provide your availability for rescheduling..."
            value={note}
            onChangeText={setNote}
            multiline
            editable={!busy}
          />
          <View style={styles.row}>
            <Button
              testID="action.interview.reschedule.submit"
              label="Submit Request"
              fullWidth={false}
              loading={busy}
              disabled={!note.trim()}
              onPress={() => send('RescheduleRequested', note)}
            />
            <Button
              testID="action.interview.reschedule.cancel"
              label="Cancel"
              variant="ghost"
              fullWidth={false}
              disabled={busy}
              onPress={() => setRescheduling(false)}
            />
          </View>
        </View>
      ) : (
        <View style={styles.row}>
          <Button
            testID="action.interview.accept"
            label="Accept"
            accessibilityLabel="Accept interview"
            fullWidth={false}
            disabled={busy}
            onPress={() => send('InterviewAccepted')}
          />
          <Button
            testID="action.interview.reschedule"
            label="Request Reschedule"
            accessibilityLabel="Request reschedule"
            variant="outline"
            fullWidth={false}
            disabled={busy}
            onPress={() => setRescheduling(true)}
          />
          <Button
            testID="action.interview.decline"
            label="Decline"
            accessibilityLabel="Decline interview"
            variant="outline"
            fullWidth={false}
            disabled={busy}
            onPress={confirmDecline}
          />
        </View>
      )}
    </CardFrame>
  );
}

function Fact({ label, value, color }: { label: string; value: string; color: ColorToken }) {
  return (
    <View style={styles.fact}>
      <AppText variant="label" weight="semibold" color={color}>
        {label}
      </AppText>
      <AppText variant="label" color={color}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  facts: { gap: spacing['2'] },
  fact: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'], alignItems: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'] },
  underline: { textDecorationLine: 'underline' },
});
