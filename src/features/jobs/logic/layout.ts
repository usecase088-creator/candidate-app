/**
 * Does the salary fit next to Save and Apply in the job details sticky bar (R3 a11y P2-6)? The salary grows up to
 * 1.5x and the buttons up to 1.3x: below 380 pt of width per font-scale unit, or for a closed job ("Position closed"
 * is wider), the bar keeps only the two buttons; the salary is in the Compensation section anyway.
 */
export function salaryFitsActionBar(width: number, fontScale: number, closed: boolean): boolean {
  return !closed && width / Math.max(1, fontScale) >= 380;
}
