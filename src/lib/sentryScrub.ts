// No personal data in Sentry (CLAUDE.md): emails, phone numbers, tokens, request bodies and form values are removed
// before an event leaves the phone. Pure functions, used by src/lib/sentry.ts as beforeSend / beforeBreadcrumb.
import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JWT = /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g;
// Phase 4: the phone's Expo push token and the long-lived refresh token (backend PR 8) never leave the phone in a report.
const PUSH_TOKEN = /Expo(?:nent)?PushToken\[[^\]]*\]/g;
const REFRESH_TOKEN = /\brt_[\w-]{20,}/g;
const BEARER = /Bearer\s+[^\s"',;]+/g;
// Indian mobile numbers as people type them: 9876543210, 98765 43210, +91 98765 43210, 919876543210.
// Not inside longer words or numbers, so UUIDs, timestamps and ids survive.
const PHONE = /(?<![\w-])(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?![\w-])/g;

const SENSITIVE_KEYS =
  /^(password|new_?password|token|refresh_?token|push_?token|signup_token|reset_token|otp|mobile|phone|email|name|full_?name|username|authorization|cookie)$/i;
const BODY_KEYS = /^(body|data|request_body|response_body)$/i;
const MAX_DEPTH = 8;

export function scrubText(text: string): string {
  return text
    .replace(JWT, '[token]')
    .replace(PUSH_TOKEN, '[push-token]')
    .replace(REFRESH_TOKEN, '[token]')
    .replace(BEARER, 'Bearer [token]')
    .replace(EMAIL, '[email]')
    .replace(PHONE, '[phone]');
}

function scrubValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return scrubText(value);
  if (depth >= MAX_DEPTH || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SENSITIVE_KEYS.test(k) ? '[filtered]' : scrubValue(v, depth + 1);
  }
  return out;
}

const withoutQuery = (url: string) => url.split('?')[0];

export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  if (crumb.category === 'ui.input') return null;
  const out: Breadcrumb = { ...crumb };
  if (out.message) out.message = scrubText(out.message);
  if (out.data) {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(out.data)) {
      if (BODY_KEYS.test(k)) continue;
      data[k] = k === 'url' && typeof v === 'string' ? withoutQuery(v) : scrubValue(v);
    }
    out.data = data;
  }
  return out;
}

export function scrubEvent<T extends ErrorEvent>(event: T): T {
  const out: T = { ...event };

  if (out.request) {
    const { data: _data, cookies: _cookies, query_string: _qs, headers, url, ...rest } = out.request;
    const safeHeaders = headers
      ? Object.fromEntries(Object.entries(headers).filter(([k]) => !/^(authorization|cookie)$/i.test(k)))
      : undefined;
    out.request = {
      ...rest,
      ...(url ? { url: withoutQuery(url) } : {}),
      ...(safeHeaders ? { headers: safeHeaders } : {}),
    };
  }

  if (out.user) out.user = out.user.id !== undefined ? { id: out.user.id } : undefined;
  if (out.message) out.message = scrubText(out.message);
  if (out.exception?.values) {
    out.exception = {
      ...out.exception,
      values: out.exception.values.map((v) => (v.value ? { ...v, value: scrubText(v.value) } : v)),
    };
  }
  if (out.extra) out.extra = scrubValue(out.extra) as T['extra'];
  if (out.contexts) out.contexts = scrubValue(out.contexts) as T['contexts'];
  if (out.tags) out.tags = scrubValue(out.tags) as T['tags'];
  if (out.breadcrumbs) {
    out.breadcrumbs = out.breadcrumbs.map(scrubBreadcrumb).filter((b): b is Breadcrumb => b !== null);
  }
  return out;
}
