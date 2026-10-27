// One router for every way into the app: notification rows, push payloads, email links and app links all end here
// (PLAN.md Phase 4). It maps the website's paths to this app's routes and refuses everything else, so a link from
// outside can only ever open one of our own screens.
const HOSTS = new Set(['apronhanger.work', 'www.apronhanger.work']);
const APP_SCHEME = /^apronhanger(-dev|-preview)?:\/\//;
/** An id as the backend writes it: letters, digits, dash, underscore, and an escaped slash stays escaped. */
const ID = /^[A-Za-z0-9_-]+(?:%[0-9A-Fa-f]{2}[A-Za-z0-9_-]*)*$/;

function pathOf(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (raw.startsWith('/')) return raw.split(/[?#]/)[0] ?? null;
  const scheme = raw.match(APP_SCHEME);
  if (scheme) return '/' + (raw.slice(scheme[0].length).split(/[?#]/)[0] ?? '');
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || !HOSTS.has(url.hostname)) return null;
    return url.pathname;
  } catch {
    return null;
  }
}

const SIMPLE: Record<string, string> = {
  '/': '/',
  '/applications': '/applications',
  '/profile': '/profile',
  '/saved-jobs': '/saved-jobs',
  '/gov-jobs': '/gov-jobs',
  '/foreign-jobs': '/intl-jobs',
};

/** The app route for a link, or null when the app has no screen for it. */
export function resolveLink(input: string | null | undefined): string | null {
  if (!input) return null;
  const path = pathOf(input);
  if (path === null) return null;
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const simple = SIMPLE[clean];
  if (simple) return simple;
  const parts = clean.split('/').filter(Boolean);
  if (parts.length !== 2) return null;
  const [kind, id] = parts as [string, string];
  if (!ID.test(id)) return null;
  if (kind === 'jobs') return `/job/${id}`;
  if (kind === 'applications') return `/application/${id}`;
  if (kind === 'apply') return `/apply/${id}`;
  return null;
}

/** Push payloads carry `link`, or an application / job id. */
export function resolvePushData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (typeof d.link === 'string') {
    const r = resolveLink(d.link);
    if (r) return r;
  }
  if (typeof d.applicationId === 'string') return resolveLink(`/applications/${d.applicationId}`);
  if (typeof d.jobId === 'string') return resolveLink(`/jobs/${d.jobId}`);
  return null;
}
