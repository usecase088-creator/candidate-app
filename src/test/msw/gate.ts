/**
 * Holds a mocked response until the test opens the gate. Use it instead of `delay(ms)` when a test must see the
 * loading state: a wall-clock delay races the test, and on a busy machine the answer can arrive before the check.
 */
export function createGate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { wait: () => opened, open };
}
