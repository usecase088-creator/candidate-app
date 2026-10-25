// Types-only entry for TypeScript. Metro and Jest pick secureStorage.native.ts or secureStorage.web.ts by platform.
export * from './secureStorage.native';
export type { SecureStorage } from './secureStorage.types';
