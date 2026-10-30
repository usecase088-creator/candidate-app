import { parseWebsiteDate } from '../dates';

const ymd = (d: Date | null) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null;

describe('parseWebsiteDate (what the website accepts: date-fns parseISO)', () => {
  it.each([
    ['2021-08-15', '2021-08-15'],
    ['2018-01', '2018-01-01'],
    ['2018', '2018-01-01'],
    ['2021-08-15T10:30:00.000Z', '2021-08-15'],
    ['  2021-08-15  ', '2021-08-15'],
  ])('reads %s as the local day %s', (raw, day) => {
    expect(ymd(parseWebsiteDate(raw))).toBe(day);
  });

  it.each(['', '   ', '15/08/2021', 'Aug 2021', '2021-02-30', '2021-13', 'present'])('treats %p as no date', (raw) => {
    expect(parseWebsiteDate(raw)).toBeNull();
  });
});
