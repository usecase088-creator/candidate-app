'use strict';

// jest-expo's native environment, plus a handle on Node's own web APIs.
// Expo's runtime replaces global `fetch` with expo/fetch, which is a native-module stub in Jest,
// so MSW never sees requests. jest.setup.ts puts these Node versions back before MSW starts.
const ExpoNativeEnvironment = require('jest-expo/src/preset/nativeEnvironment');

class AppTestEnvironment extends ExpoNativeEnvironment {
  constructor(config, context) {
    super(config, context);
    this.global.__NODE_WEB_APIS__ = { fetch, Request, Response, Headers, FormData, Blob, AbortController };
  }
}

module.exports = AppTestEnvironment;
module.exports.TestEnvironment = AppTestEnvironment;
