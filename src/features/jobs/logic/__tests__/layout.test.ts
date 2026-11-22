import { salaryFitsActionBar } from '../layout';

// R3 a11y P2-6: at 360 pt and font scale 1, "₹100–150 LPA" + two 108-pt buttons overflowed (the price was cut).
describe('salaryFitsActionBar', () => {
  it.each([
    [360, 1, false],
    [375, 1, false],
    [390, 1, true],
    [430, 1.13, true],
    [430, 1.2, false],
    [320, 2, false],
  ])('%d pt at font scale %d: %s', (width, scale, fits) => {
    expect(salaryFitsActionBar(width, scale, false)).toBe(fits);
  });

  it('never for a closed job (the button says "Position closed")', () => {
    expect(salaryFitsActionBar(430, 1, true)).toBe(false);
  });
});
