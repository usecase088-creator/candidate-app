import { StyleSheet } from 'react-native';

import { colors } from '@/theme/tokens';
import { renderWithProviders, screen } from '@/test/render';

import type { FieldSpec } from '../../formSpec';
import { FormField } from '../FormField';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

const field = (spec: Partial<FieldSpec> & Pick<FieldSpec, 'kind'>): FieldSpec => ({
  key: 'k',
  label: 'Gender',
  ...spec,
});

// R2 issue 9: the builder's choice groups and dates used a plain black " *"; TextInput a red one. Now one marker.
describe('FormField required marker', () => {
  it.each(['select', 'multi'] as const)(
    'a required %s group shows the red asterisk as its own text',
    async (kind) => {
      await renderWithProviders(
        <FormField
          testID="builder.field.k"
          spec={field({ kind, required: true, options: ['Male', 'Female'] })}
          value=""
          onChange={() => {}}
        />,
      );
      const asterisk = screen.getByTestId('builder.field.k.required');
      expect(asterisk).toHaveTextContent('*');
      expect(flat(asterisk.props.style).color).toBe(colors.errorText);
      // The label text itself is unchanged.
      expect(screen.getByText('Gender *')).toBeOnTheScreen();
    },
  );

  it('a required long select (picker row) uses the same red asterisk', async () => {
    const states = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    await renderWithProviders(
      <FormField
        testID="builder.field.k"
        spec={field({ kind: 'select', label: 'State', required: true, options: states })}
        value=""
        onChange={() => {}}
      />,
    );
    const asterisk = screen.getByTestId('builder.field.k.required');
    expect(flat(asterisk.props.style).color).toBe(colors.errorText);
    expect(screen.getByText('State *')).toBeOnTheScreen();
    // Screen readers hear the plain label, not the asterisk.
    expect(screen.getByTestId('builder.field.k')).toHaveProp('accessibilityLabel', 'State, Select');
  });

  it('an optional group has no asterisk', async () => {
    await renderWithProviders(
      <FormField
        testID="builder.field.k"
        spec={field({ kind: 'select', options: ['Male', 'Female'] })}
        value=""
        onChange={() => {}}
      />,
    );
    expect(screen.queryByTestId('builder.field.k.required')).toBeNull();
    expect(screen.getByText('Gender')).toBeOnTheScreen();
  });

  it('a required date uses the same red asterisk', async () => {
    await renderWithProviders(
      <FormField
        testID="builder.field.d"
        spec={field({ kind: 'date', key: 'start', label: 'Start date', required: true })}
        value=""
        onChange={() => {}}
      />,
    );
    expect(flat(screen.getByTestId('builder.field.d.required').props.style).color).toBe(colors.errorText);
  });
});
