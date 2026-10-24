// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*', 'coverage/*', '.reference-backend/*', 'android/*', 'ios/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // CLAUDE.md: no `any`; use `unknown` + Zod.
      '@typescript-eslint/no-explicit-any': 'error',
      // CLAUDE.md: all network calls go through src/api/client.ts.
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Use src/api/client.ts for network calls.' },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // The client itself, and tests that check the network mock or call the backend directly.
    files: ['src/api/client.ts', 'src/test/**', 'tests/contract/**', 'e2e/**'],
    rules: { 'no-restricted-globals': 'off' },
  },
]);
