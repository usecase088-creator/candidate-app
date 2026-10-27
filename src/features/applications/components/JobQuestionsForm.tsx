// The job's own questions (website: components/apply/JobCustomFieldsForm.tsx). Text, long text and numbers are inputs;
// a select shows all its options as buttons and a yes/no question shows Yes and No (no drop-down: every choice is one
// tap). The form keeps what was typed; the screen validates (logic/customFields.ts) and sends answersForSubmit.
import { StyleSheet, View } from 'react-native';

import type { CustomField, CustomFieldResponses } from '@/api/schemas/applications';
import { Chip } from '@/components/ui/Chip';
import { TextInput } from '@/components/ui/TextInput';
import { AppText } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

export type JobQuestionsFormProps = {
  testID: string;
  title: string;
  fields: CustomField[];
  values: CustomFieldResponses;
  onChange: (values: CustomFieldResponses) => void;
  disabled?: boolean;
  /** The first problem, shown under the questions. */
  error?: string;
};

export function JobQuestionsForm({
  testID,
  title,
  fields,
  values,
  onChange,
  disabled,
  error,
}: JobQuestionsFormProps) {
  if (fields.length === 0) return null;
  const set = (id: string, value: string | number | boolean) => onChange({ ...values, [id]: value });

  return (
    <View testID={testID} style={styles.box}>
      <View style={styles.head}>
        <AppText variant="label" weight="semibold" accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="caption" color="mutedForeground">
          These questions are specific to this job posting.
        </AppText>
      </View>

      {fields.map((f) => {
        const label = f.required ? `${f.label} *` : f.label;
        const id = `${testID}.${f.id}`;
        const raw = values[f.id];

        if (f.type === 'select') {
          return (
            <View key={f.id} style={styles.question}>
              <AppText variant="label">{label}</AppText>
              {f.helpText ? (
                <AppText variant="caption" color="mutedForeground">
                  {f.helpText}
                </AppText>
              ) : null}
              <View style={styles.choices}>
                {(f.options ?? []).map((option, i) => (
                  <Chip
                    key={option}
                    testID={`${id}.option.${i}`}
                    label={option}
                    selected={raw === option}
                    onPress={() => !disabled && set(f.id, option)}
                  />
                ))}
              </View>
            </View>
          );
        }

        if (f.type === 'checkbox') {
          return (
            <View key={f.id} style={styles.question}>
              <AppText variant="label">{label}</AppText>
              {f.helpText ? (
                <AppText variant="caption" color="mutedForeground">
                  {f.helpText}
                </AppText>
              ) : null}
              <View style={styles.choices}>
                <Chip
                  testID={`${id}.yes`}
                  label="Yes"
                  selected={raw === true}
                  onPress={() => !disabled && set(f.id, true)}
                />
                <Chip
                  testID={`${id}.no`}
                  label="No"
                  selected={raw === false}
                  onPress={() => !disabled && set(f.id, false)}
                />
              </View>
            </View>
          );
        }

        const number = f.type === 'number';
        return (
          <TextInput
            key={f.id}
            testID={id}
            label={label}
            helper={f.helpText ?? undefined}
            placeholder={f.placeholder ?? undefined}
            value={raw === undefined ? '' : String(raw)}
            onChangeText={(text) => set(f.id, text)}
            editable={!disabled}
            multiline={f.type === 'textarea'}
            keyboardType={number ? 'decimal-pad' : 'default'}
            autoCorrect={!number}
          />
        );
      })}

      {error ? (
        <AppText
          testID={`${testID}.error`}
          variant="caption"
          color="errorText"
          accessibilityLiveRegion="polite"
        >
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing['4'],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    backgroundColor: colors.surface,
    padding: spacing['4'],
  },
  head: { gap: spacing['1'] },
  question: { gap: spacing['2'] },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'] },
});
