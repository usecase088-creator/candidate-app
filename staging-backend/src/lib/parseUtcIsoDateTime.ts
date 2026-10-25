const HAS_EXPLICIT_TZ = /Z$|[+-]\d{2}:\d{2}$/;

/** Parse an ISO 8601 datetime that must include an explicit UTC/offset suffix. */
export function parseUtcIsoDateTime(
  value: unknown,
  fieldName: string,
): { ok: true; date: Date } | { ok: false; error: string } {
  const str = String(value ?? '').trim();
  if (!str) {
    return { ok: false, error: `${fieldName} is required` };
  }
  if (!HAS_EXPLICIT_TZ.test(str)) {
    return {
      ok: false,
      error: `${fieldName} must be an ISO 8601 string with explicit timezone (e.g. ending in Z)`,
    };
  }
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: `${fieldName} must be valid` };
  }
  return { ok: true, date };
}
