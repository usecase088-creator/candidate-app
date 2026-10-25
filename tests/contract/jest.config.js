// Contract tests: our API client + schemas against the real reference backend (Task 4, Task 9).
// Run with `npm run test:contract` while `npm run backend:local` is up. Never points at production.
/** @type {import('jest').Config} */
module.exports = {
  rootDir: '../..',
  testMatch: ['<rootDir>/tests/contract/**/*.test.ts'],
  testEnvironment: 'node',
  transform: { '\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  testTimeout: 30_000,
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  modulePathIgnorePatterns: ['<rootDir>/.reference-backend/'],
};
