import {
  applicantsLine,
  experienceStat,
  formatExp,
  formatLPA,
  htmlToText,
  isHtml,
  postedLabel,
} from '../format';

describe('formatLPA (website lib/format.ts)', () => {
  it.each([
    [0, 0, 'Unpaid / Stipend'],
    [4, 4, '₹4 LPA'],
    [3, 4.5, '₹3–4.5 LPA'],
  ])('%s to %s', (min, max, out) => expect(formatLPA(min, max)).toBe(out));
});

describe('formatExp', () => {
  it.each([
    [2, 2, '2 yr'],
    [1, 5, '1–5 yrs'],
    [0, 0, '0 yr'],
  ])('%s to %s', (min, max, out) => expect(formatExp(min, max)).toBe(out));

  it('shows a dash when the backend has no numbers (the website would print NaN)', () => {
    expect(formatExp(null, undefined)).toBe('—');
  });
});

describe('postedLabel', () => {
  it('Today / {n}d ago, and the lower-case form used in the details header', () => {
    expect(postedLabel(0)).toBe('Today');
    expect(postedLabel(3)).toBe('3d ago');
    expect(postedLabel(0, { sentence: true })).toBe('today');
    expect(postedLabel(3, { sentence: true })).toBe('3d ago');
  });
});

describe('experienceStat (job details side card)', () => {
  it('uses the numbers when either is above 0', () => {
    expect(experienceStat({ experienceMin: 1, experienceMax: 5, experience: 'x' })).toBe('1–5 yrs');
  });
  it('falls back to the free-text experience, then a dash', () => {
    expect(experienceStat({ experienceMin: 0, experienceMax: 0, experience: '2+ years' })).toBe('2+ years');
    expect(experienceStat({ experienceMin: null, experienceMax: null, experience: null })).toBe('—');
    expect(experienceStat({ experienceMin: 0, experienceMax: 0 })).toBe('—');
  });
});

describe('applicantsLine', () => {
  it('hidden at 0, singular at 1, plural above', () => {
    expect(applicantsLine(0)).toBeNull();
    expect(applicantsLine(undefined)).toBeNull();
    expect(applicantsLine(1)).toBe('🧑‍⚕️ 1 person has already applied');
    expect(applicantsLine(7)).toBe('🧑‍⚕️ 7 people have already applied');
  });
});

describe('job description text', () => {
  it('isHtml uses the website test', () => {
    expect(isHtml('<p>Hi</p>')).toBe(true);
    expect(isHtml('Plain text, 5 < 6 and 7 > 3')).toBe(false);
  });

  it('htmlToText keeps paragraphs and bullet points, drops tags and scripts, decodes entities', () => {
    const html =
      '<p>Ward <strong>duty</strong> &amp; rounds</p><ul><li>ICU</li><li>OT</li></ul><script>x()</script>';
    expect(htmlToText(html)).toBe('Ward duty & rounds\n\n• ICU\n• OT');
  });

  it('htmlToText of plain text is the text', () => {
    expect(htmlToText('Just text')).toBe('Just text');
  });
});
