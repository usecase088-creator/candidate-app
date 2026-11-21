// The job's own questions (website: components/apply/JobCustomFieldsForm.tsx). Text, long text and numbers are inputs;
// a select shows all its options as chips and a yes/no question shows Yes and No (no drop-down: every choice is one
// tap). The form keeps what was typed; the screen validates (logic/customFields.ts firstProblem) and the message is
// shown once, under the field it belongs to (D32).
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CustomField, CustomFieldResponses } from '@/api/schemas/applications';
import { Chip } from '@/components/ui/Chip';
import { AppText } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { spacing } from '@/theme/tokens';

import type { AnswerProblem } from '../logic/customFields';

export type JobQuestionsFormProps = {
  testID: string;
  title: string;
  fields: CustomField[];
  values: CustomFieldResponses;
  onChange: (values: CustomFieldResponses) => void;
  disabled?: boolean;
  /** The first problem, shown under its field as `{testID}.{fieldId}.error`. */
  problem?: AnswerProblem;
};

export function JobQuestionsForm({
  testID,
  title,
  fields,
  values,
  onChange,
  disabled,
  problem,
}: JobQuestionsFormProps) {
  if (fields.length === 0) return null;
  const set = (id: string, value: string | number | boolean) => onChange({ ...values, [id]: value });
  const errorFor = (id: string) => (problem?.fieldId === id ? problem.message : undefined);

  return (
    <View testID={testID} style={styles.box}>
      <View style={styles.head}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="secondary" color="mutedForeground">
          These questions are specific to this job posting.
        </AppText>
      </View>

      {fields.map((f) => {
        const id = `${testID}.${f.id}`;
        const raw = values[f.id];

        if (f.type === 'select') {
          return (
            <ChoiceQuestion key={f.id} id={id} field={f} error={errorFor(f.id)}>
              {(f.options ?? []).map((option, i) => (
                <Chip
                  key={option}
                  testID={`${id}.option.${i}`}
                  label={option}
                  selected={raw === option}
                  onPress={() => !disabled && set(f.id, option)}
                />
              ))}
            </ChoiceQuestion>
          );
        }

        if (f.type === 'checkbox') {
          return (
            <ChoiceQuestion key={f.id} id={id} field={f} error={errorFor(f.id)}>
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
            </ChoiceQuestion>
          );
        }

        const number = f.type === 'number';
        return (
          <TextInput
            key={f.id}
            testID={id}
            label={f.label}
            required={f.required}
            helper={f.helpText ?? undefined}
            error={errorFor(f.id)}
            placeholder={f.placeholder ?? undefined}
            value={raw === undefined ? '' : String(raw)}
            onChangeText={(text) => set(f.id, text)}
            editable={!disabled}
            multiline={f.type === 'textarea'}
            keyboardType={number ? 'decimal-pad' : 'default'}
            returnKeyType={number ? 'done' : undefined}
            autoCorrect={!number}
          />
        );
      })}
    </View>
  );
}

/** Label (with the required star, like TextInput), help text, the chips, and the error under them. */
function ChoiceQuestion({
  id,
  field,
  error,
  children,
}: {
  id: string;
  field: CustomField;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.question}>
      <AppText variant="label">
        {field.label}
        {field.required ? (
          <AppText testID={`${id}.required`} variant="label" color="errorText">
            {' *'}
          </AppText>
        ) : null}
      </AppText>
      {field.helpText ? (
        <AppText variant="secondary" color="mutedForeground">
          {field.helpText}
        </AppText>
      ) : null}
      <View style={styles.choices}>{children}</View>
      {error ? (
        <AppText
          testID={`${id}.error`}
          variant="secondary"
          color="errorText"
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // D32: flat (no box); heading-to-content 8, fields 20 apart.
  box: { gap: spacing['5'] },
  head: { gap: spacing['2'] },
  // Label-to-field 6, like TextInput.
  question: { gap: spacing['1'] + spacing['0.5'] },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'], paddingTop: spacing['0.5'] },
});
