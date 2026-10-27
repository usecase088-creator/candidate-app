import { applicantMe, applied, seededApplications } from '@/test/fixtures/applications';
import { ApplicationListSchema } from '@/api/schemas/applications';
import { CandidateMeSchema } from '@/api/schemas/candidate';

import { alreadyApplied, FORM_CV_MIN_COMPLETENESS, hasFormCv, uploadApplyError } from '../apply';

const me = CandidateMeSchema.parse(applicantMe);

describe('hasFormCv (website: profile && completeness >= 30)', () => {
  it('is true from 30 percent up', () => {
    expect(FORM_CV_MIN_COMPLETENESS).toBe(30);
    expect(hasFormCv({ ...me, profile: { ...me.profile!, completeness: 30 } })).toBe(true);
    expect(hasFormCv(me)).toBe(true);
  });

  it('is false below 30, without a profile, and without a candidate row yet', () => {
    expect(hasFormCv({ ...me, profile: { ...me.profile!, completeness: 29 } })).toBe(false);
    expect(hasFormCv({ ...me, profile: null })).toBe(false);
    expect(hasFormCv(undefined)).toBe(false);
    expect(hasFormCv(null)).toBe(false);
  });

  it('a profile with no completeness number counts as 0', () => {
    expect(hasFormCv(CandidateMeSchema.parse({ id: 'c', profile: {} }))).toBe(false);
  });
});

describe('alreadyApplied', () => {
  const list = ApplicationListSchema.parse(seededApplications);

  it('is true when any application is for this job', () => {
    expect(alreadyApplied(list, applied.jobId)).toBe(true);
  });

  it('is false for another job, an empty list and no list yet', () => {
    expect(alreadyApplied(list, 'other-job')).toBe(false);
    expect(alreadyApplied([], applied.jobId)).toBe(false);
    expect(alreadyApplied(undefined, applied.jobId)).toBe(false);
  });
});

describe('uploadApplyError (website: uploadApplySchema)', () => {
  const ok = { name: 'Demo Applicant', email: 'Demo@Apronhanger.test', phone: '9876500088' };

  it('accepts a good form, and takes the email exactly as typed', () => {
    expect(uploadApplyError(ok)).toBeUndefined();
  });

  it('name: at least 2 characters', () => {
    expect(uploadApplyError({ ...ok, name: 'A' })).toEqual({ field: 'name', message: 'Name is required' });
  });

  it('email: a valid address', () => {
    expect(uploadApplyError({ ...ok, email: 'not-an-email' })).toEqual({
      field: 'email',
      message: 'Enter a valid email',
    });
  });

  it('phone: same messages as sign up', () => {
    expect(uploadApplyError({ ...ok, phone: '123' })).toEqual({
      field: 'phone',
      message: 'Enter a valid 10-digit phone number',
    });
    expect(uploadApplyError({ ...ok, phone: '1'.repeat(16) })).toEqual({
      field: 'phone',
      message: 'Phone number is too long',
    });
    expect(uploadApplyError({ ...ok, phone: '98765abcde' })).toEqual({
      field: 'phone',
      message: 'Phone number can only contain digits and + - ( )',
    });
  });

  it('reports the first problem in field order: name, email, phone', () => {
    expect(uploadApplyError({ name: '', email: 'x', phone: '1' })?.field).toBe('name');
    expect(uploadApplyError({ name: 'Ab', email: 'x', phone: '1' })?.field).toBe('email');
  });

  it('the phone is checked after trimming, like the website; the email is not trimmed or lowercased', () => {
    expect(uploadApplyError({ ...ok, phone: ' 9876500088 ' })).toBeUndefined();
  });
});
