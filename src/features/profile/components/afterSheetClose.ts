/** Android and web: the next screen or dialog can open while the sheet closes, so the action runs at once. */
export function afterSheetClose(run: () => void): void {
  run();
}
