/**
 * Normalize an origin to its canonical form before comparison.
 * - Strips `www.` prefix  (ISPs / DNS resolvers that redirect bare → www)
 * - Strips redundant default ports (:443 on https, :80 on http)
 *   (transparent proxies that explicitly append the default port)
 */
function normalizeOrigin(origin: string): string {
  return origin
    .replace(/^(https?:\/\/)www\./, '$1') // strip www.
    .replace(/^(https:\/\/[^:]+):443$/, '$1') // strip :443 on https
    .replace(/^(http:\/\/[^:]+):80$/, '$1'); // strip :80 on http
}

/** Evaluate whether a request Origin is allowed. Health checks and curl omit Origin. */
export function evaluateCorsOrigin(
  origin: string | undefined,
  allowedOrigins: string[],
  nodeEnv: string,
): { allowed: boolean; error?: string } {
  if (nodeEnv === 'production' && allowedOrigins.length === 0) {
    return { allowed: false, error: 'CORS is not configured for production' };
  }
  if (allowedOrigins.length === 0) return { allowed: true };
  if (!origin) {
    return { allowed: false, error: 'CORS: Origin header required' };
  }
  const normalizedOrigin = normalizeOrigin(origin);
  if (allowedOrigins.some(a => normalizeOrigin(a) === normalizedOrigin)) return { allowed: true };
  return { allowed: false, error: 'Not allowed by CORS' };
}
