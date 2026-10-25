// `npm run drift-check`: read-only GETs on production's public endpoints, parsed with the app's schemas.
// The only test that may call production (CLAUDE.md: Safety). No auth, no writes.
/** @type {import('jest').Config} */
module.exports = {
  rootDir: '../..',
  testMatch: ['<rootDir>/tests/drift/**/*.test.ts'],
  testEnvironment: 'node',
  transform: { '\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  // Render free tier: the first request can take ~30 s while the server wakes up.
  testTimeout: 90_000,
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  modulePathIgnorePatterns: ['<rootDir>/.reference-backend/'],
};
