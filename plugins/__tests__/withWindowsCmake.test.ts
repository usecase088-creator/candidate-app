import { CMAKE_VERSION, cmakeDirLine, mergeLocalProperties } from '../withWindowsCmake';

const exists = () => true;
const missing = () => false;

describe('cmakeDirLine', () => {
  it('points AGP at the SDK CMake 3.31.6 on Windows (long-path aware ninja, docs/SETUP.md)', () => {
    expect(cmakeDirLine('win32', 'C:\\Users\\pc\\AppData\\Local\\Android\\Sdk', exists)).toBe(
      `cmake.dir=C:/Users/pc/AppData/Local/Android/Sdk/cmake/${CMAKE_VERSION}`,
    );
  });

  it('does nothing on macOS/Linux (no path limit there)', () => {
    expect(cmakeDirLine('darwin', '/Users/x/Library/Android/sdk', exists)).toBeNull();
    expect(cmakeDirLine('linux', '/home/x/Android/Sdk', exists)).toBeNull();
  });

  it('does nothing when ANDROID_HOME is unset or that CMake is not installed', () => {
    expect(cmakeDirLine('win32', undefined, exists)).toBeNull();
    expect(cmakeDirLine('win32', 'C:\\sdk', missing)).toBeNull();
  });
});

describe('mergeLocalProperties', () => {
  it('creates the file content when there is none', () => {
    expect(mergeLocalProperties(undefined, 'cmake.dir=C:/x')).toBe('cmake.dir=C:/x\n');
  });

  it('replaces an existing cmake.dir and keeps other lines', () => {
    expect(mergeLocalProperties('sdk.dir=C:/sdk\ncmake.dir=C:/old\n', 'cmake.dir=C:/new')).toBe(
      'sdk.dir=C:/sdk\ncmake.dir=C:/new\n',
    );
  });

  it('appends when only other lines exist', () => {
    expect(mergeLocalProperties('sdk.dir=C:/sdk', 'cmake.dir=C:/new')).toBe(
      'sdk.dir=C:/sdk\ncmake.dir=C:/new\n',
    );
  });
});
