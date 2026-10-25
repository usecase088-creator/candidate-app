import { readFileSync } from 'node:fs';
import path from 'node:path';

// Rules for .github/workflows/ios-e2e.yml (Task 10): iPhone simulator tests on GitHub's macOS runners.
const yml = readFileSync(path.resolve(__dirname, '../../../.github/workflows/ios-e2e.yml'), 'utf8');

it('runs only when started by hand (macOS minutes count 10x against the free allowance)', () => {
  expect(yml).toMatch(/^on:\s*\n\s+workflow_dispatch:/m);
  expect(yml).not.toMatch(/^\s+(push|pull_request|schedule):/m);
});

it('runs on macOS with a time limit', () => {
  expect(yml).toMatch(/runs-on: macos-/);
  expect(yml).toMatch(/timeout-minutes: \d+/);
});

it('tests the e2e-test iOS simulator build (development variant: cannot reach production)', () => {
  expect(yml).toContain('--profile e2e-test');
  expect(yml).toContain('--platform ios');
  expect(yml).not.toMatch(/--profile (preview|production)/);
});

it('takes the Expo token from GitHub secrets, never from the file', () => {
  expect(yml).toContain('EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}');
  expect(yml).not.toMatch(/EXPO_TOKEN: [A-Za-z0-9_-]{20,}/);
});

it('never builds on GitHub (builds are free on EAS) and never publishes anything', () => {
  expect(yml).not.toMatch(/eas-cli@\S+ (build|submit|update)\b(?!:)/);
  expect(yml).not.toMatch(/xcodebuild/);
});

it('keeps screenshots, video and Maestro output for review', () => {
  expect(yml).toContain('actions/upload-artifact');
  expect(yml).toContain('recordVideo');
});
