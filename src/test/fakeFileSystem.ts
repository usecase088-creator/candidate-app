/**
 * In-memory stand-in for the parts of expo-file-system the app uses for drafts (native module, so faked in Jest).
 * Use: jest.mock('expo-file-system', () => jest.requireActual('@/test/fakeFileSystem').fakeFileSystemModule);
 * Files live in `fakeFiles` (uri -> content); tests may read and reset it.
 */
export const fakeFiles = new Map<string, string>();
const dirs = new Set<string>();

const join = (parts: (string | { uri: string })[]) =>
  parts
    .map((p, i) => {
      const s = typeof p === 'string' ? p : p.uri;
      return i === 0 ? s.replace(/\/+$/, '') : s.replace(/^\/+|\/+$/g, '');
    })
    .join('/');

class FakeFile {
  uri: string;
  constructor(...parts: (string | { uri: string })[]) {
    this.uri = join(parts);
  }
  get exists() {
    return fakeFiles.has(this.uri);
  }
  get name() {
    return this.uri.slice(this.uri.lastIndexOf('/') + 1);
  }
  get size() {
    return fakeFiles.get(this.uri)?.length ?? null;
  }
  text() {
    const content = fakeFiles.get(this.uri);
    return content === undefined ? Promise.reject(new Error('missing')) : Promise.resolve(content);
  }
  write(content: string) {
    fakeFiles.set(this.uri, content);
    return Promise.resolve();
  }
  create() {
    fakeFiles.set(this.uri, '');
  }
  delete() {
    if (!fakeFiles.delete(this.uri)) throw new Error('missing');
  }
  copy(dest: { uri: string }) {
    const content = fakeFiles.get(this.uri);
    if (content === undefined) return Promise.reject(new Error('missing'));
    fakeFiles.set(dest.uri, content);
    return Promise.resolve();
  }
}

class FakeDirectory {
  uri: string;
  constructor(...parts: (string | { uri: string })[]) {
    this.uri = join(parts);
  }
  get exists() {
    return dirs.has(this.uri) || [...fakeFiles.keys()].some((k) => k.startsWith(`${this.uri}/`));
  }
  create() {
    dirs.add(this.uri);
  }
  delete() {
    if (!this.exists) throw new Error('missing');
    for (const k of [...fakeFiles.keys()]) if (k.startsWith(`${this.uri}/`)) fakeFiles.delete(k);
    for (const d of [...dirs]) if (d === this.uri || d.startsWith(`${this.uri}/`)) dirs.delete(d);
  }
}

export function resetFakeFiles() {
  fakeFiles.clear();
  dirs.clear();
}

export const fakeFileSystemModule = {
  File: FakeFile,
  Directory: FakeDirectory,
  Paths: { document: { uri: 'file:///docs' }, cache: { uri: 'file:///cache' } },
};
