// Local config plugin: on Windows, make every native module build with the SDK's CMake 3.31.6, whose ninja
// handles paths over 260 characters (docs/SETUP.md "Android build on Windows"). Writes cmake.dir into
// android/local.properties on every prebuild, so regenerating android/ no longer loses it.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { type ConfigPlugin, withDangerousMod } from 'expo/config-plugins';

export const CMAKE_VERSION = '3.31.6';

export function cmakeDirLine(
  platform: string,
  androidHome: string | undefined,
  dirExists: (dir: string) => boolean,
): string | null {
  if (platform !== 'win32' || !androidHome) return null;
  const dir = `${androidHome.replace(/\\/g, '/')}/cmake/${CMAKE_VERSION}`;
  return dirExists(dir) ? `cmake.dir=${dir}` : null;
}

export function mergeLocalProperties(existing: string | undefined, line: string): string {
  const kept = (existing ?? '').split(/\r?\n/).filter((l) => l.trim() !== '' && !l.startsWith('cmake.dir='));
  return [...kept, line].join('\n') + '\n';
}

const withWindowsCmake: ConfigPlugin = (config) =>
  withDangerousMod(config, [
    'android',
    (cfg) => {
      const line = cmakeDirLine(process.platform, process.env.ANDROID_HOME, existsSync);
      if (line) {
        const file = path.join(cfg.modRequest.platformProjectRoot, 'local.properties');
        writeFileSync(
          file,
          mergeLocalProperties(existsSync(file) ? readFileSync(file, 'utf8') : undefined, line),
        );
      }
      return cfg;
    },
  ]);

export default withWindowsCmake;
