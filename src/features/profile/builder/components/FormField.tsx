import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Chip } from '@/components/ui/Chip';
import { TextInput } from '@/components/ui/TextInput';
import { AppText } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import type { FieldSpec } from '../formSpec';

type Props = {
  /** `builder.field.<key>` or `builder.<list>.<n>.<key>`: every part below adds its own suffix. */
  testID: string;
  spec: FieldSpec;
  value: unknown;
  onChange: (value: unknown) => void;
};

const asString = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const asList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
const label = (spec: FieldSpec) => (spec.required ? `${spec.label} *` : spec.label);

/** One form field of the profile builder. The kind decides the control; the website's labels are kept. */
export function FormField({ testID, spec, value, onChange }: Props) {
  switch (spec.kind) {
    case 'text':
    case 'multiline':
      return (
        <TextInput
          testID={testID}
          label={label(spec)}
          helper={spec.hint}
          placeholder={spec.placeholder}
          value={asString(value)}
          onChangeText={onChange}
          multiline={spec.kind === 'multiline'}
          numberOfLines={spec.kind === 'multiline' ? 5 : 1}
          keyboardType={spec.keyboard ?? 'default'}
          autoCapitalize={spec.keyboard === 'url' || spec.keyboard === 'email-address' ? 'none' : 'sentences'}
          autoCorrect={false}
        />
      );
    case 'number':
      return (
        <TextInput
          testID={testID}
          label={label(spec)}
          helper={spec.hint}
          value={typeof value === 'number' && value !== 0 ? String(value) : ''}
          placeholder="0"
          onChangeText={(t) => {
            const n = Number(t.replace(/[^\d.]/g, ''));
            onChange(Number.isFinite(n) ? n : 0);
          }}
          keyboardType="numeric"
        />
      );
    case 'readonly':
      return (
        <View style={styles.group}>
          <AppText variant="label">{spec.label}</AppText>
          <AppText testID={testID} color="mutedForeground">
            {asString(value)}
          </AppText>
          {spec.hint ? (
            <AppText variant="caption" color="mutedForeground">
              {spec.hint}
            </AppText>
          ) : null}
        </View>
      );
    case 'bool':
      return (
        <Checkbox
          testID={testID}
          checked={value === true}
          onChange={onChange}
          accessibilityLabel={spec.label}
        >
          <AppText>{spec.label}</AppText>
        </Checkbox>
      );
    case 'select':
      return (
        <View style={styles.group}>
          <AppText variant="label">{label(spec)}</AppText>
          <View style={styles.wrap}>
            {(spec.options ?? []).map((option, i) => (
              <Chip
                key={option}
                testID={`${testID}.option.${i}`}
                label={option}
                selected={value === option}
                onPress={() => onChange(value === option ? '' : option)}
              />
            ))}
          </View>
        </View>
      );
    case 'multi': {
      const selected = asList(value);
      return (
        <View style={styles.group}>
          <AppText variant="label">{label(spec)}</AppText>
          <View style={styles.wrap}>
            {(spec.options ?? []).map((option, i) => (
              <Chip
                key={option}
                testID={`${testID}.option.${i}`}
                label={option}
                selected={selected.includes(option)}
                onPress={() =>
                  onChange(
                    selected.includes(option) ? selected.filter((x) => x !== option) : [...selected, option],
                  )
                }
              />
            ))}
          </View>
        </View>
      );
    }
    case 'chips':
      return <ChipsField testID={testID} spec={spec} value={value} onChange={onChange} />;
  }
}

/** Type a word, tap Add, remove with the chip. `single` keeps one value as a string (primary specialty). */
function ChipsField({ testID, spec, value, onChange }: Props) {
  const [text, setText] = useState('');
  const items = spec.single ? (asString(value) ? [asString(value)] : []) : asList(value);
  const write = (next: string[]) => onChange(spec.single ? (next.at(-1) ?? '') : next);
  const add = (word: string) => {
    const w = word.trim();
    if (!w || items.includes(w)) return;
    write([...items, w]);
    setText('');
  };
  return (
    <View style={styles.group}>
      <TextInput
        testID={`${testID}.input`}
        label={label(spec)}
        helper={spec.hint}
        placeholder={spec.placeholder}
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => add(text)}
        returnKeyType="done"
        autoCorrect={false}
      />
      <Button
        testID={`${testID}.add`}
        label="Add"
        accessibilityLabel={`Add ${spec.label}`}
        variant="outline"
        disabled={!text.trim()}
        onPress={() => add(text)}
      />
      {items.length > 0 ? (
        <View style={styles.wrap}>
          {items.map((item, i) => (
            <Chip
              key={item}
              testID={`${testID}.item.${i}`}
              label={`${item}  ×`}
              accessibilityLabel={`Remove ${item}`}
              selected
              onPress={() => write(items.filter((x) => x !== item))}
            />
          ))}
        </View>
      ) : null}
      {spec.suggestions && spec.suggestions.length > 0 ? (
        <View style={styles.wrap}>
          {spec.suggestions
            .filter((s) => !items.includes(s))
            .map((s, i) => (
              <Chip
                key={s}
                testID={`${testID}.suggest.${i}`}
                label={s}
                selected={false}
                onPress={() => add(s)}
              />
            ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing['2'] },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'] },
});
