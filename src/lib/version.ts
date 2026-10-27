const VERSION = /^(\d{1,4})\.(\d{1,4})\.(\d{1,4})(?:[-+].*)?$/;

function parts(v: string): [number, number, number] | null {
  const m = VERSION.exec(v.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** True only when both versions are readable and `installed` is lower than `minimum`. Unreadable never forces an update. */
export function isOlderThan(installed: string, minimum: string): boolean {
  const a = parts(installed);
  const b = parts(minimum);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i]! !== b[i]!) return a[i]! < b[i]!;
  }
  return false;
}
