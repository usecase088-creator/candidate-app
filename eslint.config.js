// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: [
      'dist/*',
      '.expo/*',
      'coverage/*',
      '.reference-backend/*',
      'staging-backend/*',
      // Run inside .reference-backend with its own Prisma client; not resolvable from this repo.
      'scripts/backend-local/overlay/app-scripts/dbFacts.ts',
      'scripts/backend-local/overlay/app-scripts/seedApp.ts',
      'android/*',
      'ios/*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // CLAUDE.md: no `any`; use `unknown` + Zod.
      '@typescript-eslint/no-explicit-any': 'error',
      // CLAUDE.md: all network calls go through src/api/client.ts.
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Use src/api/client.ts (createApiClient) for network calls.' },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // An async call nobody waits for: the CV PDF bug (2026-11-23) was an unawaited File.move (async since SDK 58), so the
    // share sheet got a path the file was being moved away from and the receiving app opened an empty PDF.
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['src/**/__tests__/**', 'src/test/**'],
    languageOptions: { parserOptions: { projectService: true } },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
    },
  },
  {
    // The client itself, and tests that check the network mock or call the backend directly.
    files: ['src/api/createApiClient.ts', 'src/test/**', 'tests/contract/**', 'e2e/**', 'scripts/**'],
    rules: { 'no-restricted-globals': 'off' },
  },
]);
