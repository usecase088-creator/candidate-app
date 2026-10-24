import { defineConfig, devices } from '@playwright/test';

// Quick UI checks on Expo web (CLAUDE.md). Chromium only; native behaviour is checked with Maestro.
const PORT = 8081;

export default defineConfig({
  testDir: 'e2e/web',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1, // 8 GB laptop
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'pixel-7', use: { ...devices['Pixel 7'] } },
    // iPhone 13 viewport and touch, rendered in Chromium (we don't install WebKit).
    { name: 'iphone-13', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
  webServer: {
    command: `npx expo start --web --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: { APP_VARIANT: 'development', EXPO_NO_TELEMETRY: '1', CI: '1' },
  },
});
