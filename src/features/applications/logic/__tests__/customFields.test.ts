import type { CustomField } from '@/api/schemas/applications';

import { answersForSubmit, numberAnswer, validateAnswers, visibleChoice } from '../customFields';

const field = (over: Partial<CustomField> & { id: string }): CustomField => ({
  label: `Question ${over.id}`,
  type: 'text',
  required: false,
  ...over,
});

describe('validateAnswers (website: lib/jobCustomFields.ts validateCustomResponses)', () => {
  it('no questions, or everything optional and empty: fine', () => {
    expect(validateAnswers([], {})).toBeNull();
    expect(validateAnswers([field({ id: 'a' }), field({ id: 'b', type: 'number' })], {})).toBeNull();
  });

  it('a required text, textarea, number or select left empty: "{label}" is required', () => {
    for (const type of ['text', 'textarea', 'number', 'select']) {
      const f = field({ id: 'a', label: 'Your scans', type, required: true, options: ['x', 'y'] });
      expect(validateAnswers([f], {})).toBe('"Your scans" is required');
      expect(validateAnswers([f], { a: '' })).toBe('"Your scans" is required');
      expect(validateAnswers([f], { a: '   ' })).toBe('"Your scans" is required');
    }
  });

  it('a number that is not a number: "{label}" must be a number', () => {
    const f = field({ id: 'n', label: 'Scans', type: 'number' });
    expect(validateAnswers([f], { n: Number.NaN })).toBe('"Scans" must be a number');
    expect(validateAnswers([f], { n: 12 })).toBeNull();
    expect(validateAnswers([f], { n: 0 })).toBeNull();
    expect(validateAnswers([f], { n: -3.5 })).toBeNull();
  });

  it('a select answer that is not one of the options: "{label}": choose a valid option', () => {
    const f = field({ id: 's', label: 'Shift', type: 'select', options: ['Morning', 'Evening'] });
    expect(validateAnswers([f], { s: 'Night' })).toBe('"Shift": choose a valid option');
    expect(validateAnswers([f], { s: 'Evening' })).toBeNull();
  });

  it('a required checkbox needs an answer, and No (false) is an answer', () => {
    const f = field({ id: 'c', label: 'Certificate', type: 'checkbox', required: true });
    expect(validateAnswers([f], {})).toBe('"Certificate" is required');
    expect(validateAnswers([f], { c: false })).toBeNull();
    expect(validateAnswers([f], { c: true })).toBeNull();
  });

  it('an optional checkbox may stay unanswered', () => {
    expect(validateAnswers([field({ id: 'c', type: 'checkbox' })], {})).toBeNull();
  });

  it('reports the first problem in the order the job lists the questions', () => {
    const fields = [
      field({ id: 'a', label: 'First', required: true }),
      field({ id: 'b', label: 'Second', type: 'number', required: true }),
    ];
    expect(validateAnswers(fields, {})).toBe('"First" is required');
    expect(validateAnswers(fields, { a: 'x' })).toBe('"Second" is required');
  });

  it('a type the app does not know is treated as plain text', () => {
    const f = field({ id: 'd', label: 'Date', type: 'date', required: true });
    expect(validateAnswers([f], {})).toBe('"Date" is required');
    expect(validateAnswers([f], { d: '2026-01-01' })).toBeNull();
  });
});

describe('numberAnswer', () => {
  it('turns what is typed into the value the website stores: empty stays empty, otherwise a number', () => {
    expect(numberAnswer('')).toBe('');
    expect(numberAnswer('12')).toBe(12);
    expect(numberAnswer('1.5')).toBe(1.5);
    expect(numberAnswer('-4')).toBe(-4);
    expect(Number.isNaN(numberAnswer('abc'))).toBe(true);
  });
});

describe('visibleChoice', () => {
  it('shows a checkbox answer as Yes or No, and nothing when unanswered', () => {
    expect(visibleChoice(true)).toBe('Yes');
    expect(visibleChoice(false)).toBe('No');
    expect(visibleChoice(undefined)).toBeUndefined();
  });
});

describe('answersForSubmit (what is sent to the server)', () => {
  const fields = [
    field({ id: 't', type: 'text' }),
    field({ id: 'n', type: 'number' }),
    field({ id: 's', type: 'select', options: ['a', 'b'] }),
    field({ id: 'c', type: 'checkbox' }),
  ];

  it('sends numbers as numbers, text as typed, and keeps No (false)', () => {
    expect(answersForSubmit(fields, { t: ' CT scanner ', n: '12', s: 'a', c: false })).toEqual({
      t: ' CT scanner ',
      n: 12,
      s: 'a',
      c: false,
    });
  });

  it('leaves out empty answers', () => {
    expect(answersForSubmit(fields, { t: '', n: '', s: undefined as never })).toEqual({});
    expect(answersForSubmit(fields, { t: '   ' })).toEqual({});
  });

  it('sends a number that cannot be read as it is, so the server can name the question', () => {
    expect(answersForSubmit(fields, { n: 'many' })).toEqual({ n: 'many' });
  });

  it('ignores answers to questions the job does not have', () => {
    expect(answersForSubmit(fields, { gone: 'x', t: 'y' })).toEqual({ t: 'y' });
  });

  it('decimals and negatives stay numbers', () => {
    expect(answersForSubmit(fields, { n: '1.5' })).toEqual({ n: 1.5 });
    expect(answersForSubmit(fields, { n: '-4' })).toEqual({ n: -4 });
  });
});
