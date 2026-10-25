import { readFileSync } from 'node:fs';
import path from 'node:path';

// Safety rules for EAS builds (CLAUDE.md: Safety, PHASE-1 Task 10). eas.json is plain JSON read by EAS.
const root = path.resolve(__dirname, '../../..');
const eas = JSON.parse(readFileSync(path.join(root, 'eas.json'), 'utf8'));
const workflow = readFileSync(path.join(root, '.eas/workflows/e2e.yml'), 'utf8');

type Profile = {
  extends?: string;
  env?: Record<string, string>;
  withoutCredentials?: boolean;
  distribution?: string;
  android?: { buildType?: string };
  ios?: { simulator?: boolean };
};

/** A profile with its `extends` chain applied (env merged). */
function profile(name: string): Profile {
  const p: Profile = eas.build[name];
  if (!p.extends) return p;
  const base = profile(p.extends);
  return { ...base, ...p, env: { ...base.env, ...p.env } };
}

it('has the four profiles from PHASE-1 Task 10', () => {
  for (const name of ['development', 'preview', 'production', 'e2e-test'])
    expect(eas.build[name]).toBeDefined();
});

it.each([
  ['development', 'development'],
  ['preview', 'preview'],
  ['production', 'production'],
])('%s builds the %s variant (APP_VARIANT drives app.config.ts)', (name, variant) => {
  expect(profile(name).env?.APP_VARIANT).toBe(variant);
});

it.each([
  ['preview', 'preview'],
  ['production', 'production'],
])('%s builds receive OTA updates on the %s channel', (name, channel) => {
  expect(eas.build[name].channel).toBe(channel);
});

it('e2e-test never points at production: development variant (local API), no credentials', () => {
  const p = profile('e2e-test');
  expect(p.env?.APP_VARIANT).toBe('development');
  expect(p.withoutCredentials).toBe(true);
  expect(p.android?.buildType).toBe('apk');
  expect(p.ios?.simulator).toBe(true);
});

it('test and internal builds are internal, never store builds', () => {
  for (const name of ['development', 'preview', 'e2e-test'])
    expect(profile(name).distribution).toBe('internal');
});

it("has no submit config: store submission only with Raj's OK (CLAUDE.md)", () => {
  expect(eas.submit).toBeUndefined();
});

it('builds with the same Node version as the laptop and CI (24)', () => {
  expect(eas.build.base.node).toMatch(/^24\./);
});

describe('.eas/workflows/e2e.yml', () => {
  it('runs only on demand (each run costs build minutes)', () => {
    expect(workflow).toMatch(/^on:\s*\n\s+workflow_dispatch:/m);
    expect(workflow).not.toMatch(/^\s+(push|pull_request|schedule):/m);
  });

  it('builds the e2e-test profile and runs only flows that need no backend', () => {
    expect(workflow).toContain('profile: e2e-test');
    expect(workflow).toContain("flow_path: ['e2e/maestro/smoke.yaml']");
    expect(workflow).not.toMatch(/auth-/);
  });
});
