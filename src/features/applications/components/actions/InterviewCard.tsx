// Interview Scheduled: date and place, then Accept, Request Reschedule or Decline (website: CandidateActionCard.tsx).
// Decline asks once more (D26): it is final. Everything waits for the server's answer.
// D32: the panel wears the status tone (amber: the invitation needs an answer), date block, Join Meeting as a
// full-width secondary button (no card inside the card), then Accept, Request Reschedule and Decline stacked full width.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Application } from '@/api/schemas/applications';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { confirmAction } from '@/lib/confirm';
import { useOpenLink } from '@/features/jobs/components/listings/useOpenLink';
import { spacing } from '@/theme/tokens';

import { useRespond } from '../../hooks/useRespond';
import { formatIstDateTime, interviewPlace } from '../../logic/interview';
import { CardFrame } from './CardFrame';

const CALENDAR = { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' } as const;
const OPEN = { ios: 'arrow.up.right.square', android: 'open_in_new', web: 'open_in_new' } as const;

export function InterviewCard({ application: a }: { application: Application }) {
  const respond = useRespond();
  const openLink = useOpenLink();
  const [rescheduling, setRescheduling] = useState(false);
  const [note, setNote] = useState('');
  const place = interviewPlace(a);
  const busy = respond.isPending;

  const send = (status: string, withNote?: string) => respond.mutate({ id: a.id, status, note: withNote });
  const confirmDecline = async () => {
    const sure = await confirmAction({
      title: 'Decline this interview?',
      message: 'This cannot be undone. The hospital will be told you are not taking part.',
      confirmLabel: 'Decline',
    });
    if (sure) send('InterviewDeclined');
  };

  return (
    <CardFrame status={a.status} icon={CALENDAR} title="Interview Scheduled">
      <View style={styles.body}>
        <View style={styles.when}>
          <AppText variant="heading" tabular>
            {formatIstDateTime(a.interviewDate)}
          </AppText>
          {a.interviewType ? <AppText variant="label">{a.interviewType}</AppText> : null}
          {a.interviewerName ? (
            <View style={styles.fact}>
              <AppText variant="label" color="mutedForeground">
                Interviewer:
              </AppText>
              <AppText variant="label" style={styles.factValue}>
                {a.interviewerName}
              </AppText>
            </View>
          ) : null}
        </View>

        {place.kind === 'link' ? (
          <Button
            testID="action.interview.join"
            label="Join Meeting"
            accessibilityLabel="Join meeting"
            variant="secondary"
            size="md"
            icon={OPEN}
            onPress={() => openLink(place.url)}
          />
        ) : (
          <View style={styles.where}>
            <AppText variant="caption" color="mutedForeground">
              {place.label.trim()}
            </AppText>
            <AppText variant="label">{place.text}</AppText>
          </View>
        )}

        {rescheduling ? (
          <View style={styles.actions}>
            <TextInput
              testID="action.interview.note"
              label="Your availability"
              placeholder="Please provide your availability for rescheduling..."
              value={note}
              onChangeText={setNote}
              multiline
              editable={!busy}
            />
            <Button
              testID="action.interview.reschedule.submit"
              label="Submit Request"
              size="md"
              loading={busy}
              disabled={!note.trim()}
              onPress={() => send('RescheduleRequested', note)}
            />
            <Button
              testID="action.interview.reschedule.cancel"
              label="Cancel"
              variant="ghost"
              size="md"
              disabled={busy}
              onPress={() => setRescheduling(false)}
            />
          </View>
        ) : (
          <View style={styles.actions}>
            <Button
              testID="action.interview.accept"
              label="Accept"
              accessibilityLabel="Accept interview"
              size="md"
              haptic="medium"
              disabled={busy}
              onPress={() => send('InterviewAccepted')}
            />
            {/* Stacked, not a pair: 'Request Reschedule' wrapped to two lines in half a phone width. */}
            <Button
              testID="action.interview.reschedule"
              label="Request Reschedule"
              accessibilityLabel="Request reschedule"
              variant="secondary"
              size="md"
              disabled={busy}
              onPress={() => setRescheduling(true)}
            />
            <Button
              testID="action.interview.decline"
              label="Decline"
              accessibilityLabel="Decline interview"
              variant="destructiveText"
              size="md"
              disabled={busy}
              onPress={() => void confirmDecline()}
            />
          </View>
        )}
      </View>
    </CardFrame>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing['3'] },
  when: { gap: spacing['0.5'] },
  fact: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['1'] },
  factValue: { flexShrink: 1 },
  where: { gap: spacing['0.5'] },
  actions: { gap: spacing['2'] },
});
