// Answers to a job's own questions (website: lib/jobCustomFields.ts, components/apply/JobCustomFieldsForm.tsx).
import type { CustomField, CustomFieldResponses } from '@/api/schemas/applications';

/**
 * Same checks, order and messages as the website. Returns the first problem, or null. A type the app does not know is
 * handled like plain text, so a new question type on the backend never blocks applying.
 */
export function validateAnswers(fields: CustomField[], answers: CustomFieldResponses): string | null {
  for (const f of fields) {
    const raw = answers[f.id];
    if (f.type === 'checkbox') {
      // "No" is stored as false: only a completely missing answer counts as unanswered.
      if (f.required && raw === undefined) return `"${f.label}" is required`;
      continue;
    }
    const empty = raw === undefined || raw === null || String(raw).trim() === '';
    if (f.required && empty) return `"${f.label}" is required`;
    if (f.type === 'number' && !empty && Number.isNaN(Number(raw))) return `"${f.label}" must be a number`;
    if (f.type === 'select' && !empty && f.options && !f.options.includes(String(raw))) {
      return `"${f.label}": choose a valid option`;
    }
  }
  return null;
}

/** What the website stores for a number box: empty stays empty, anything else becomes a number. */
export function numberAnswer(text: string): string | number {
  return text === '' ? '' : Number(text);
}

/** Yes / No for a checkbox question; nothing while it is unanswered. */
export function visibleChoice(value: unknown): 'Yes' | 'No' | undefined {
  if (value === undefined) return undefined;
  return value ? 'Yes' : 'No';
}
