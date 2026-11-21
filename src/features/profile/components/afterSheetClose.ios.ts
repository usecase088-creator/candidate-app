/**
 * iOS: a view controller (camera, photo library, alert) cannot be presented while the sheet's modal is still sliding
 * out, so the chosen action waits for the exit animation (~250 ms) before it runs.
 */
export function afterSheetClose(run: () => void): void {
  setTimeout(run, 300);
}
