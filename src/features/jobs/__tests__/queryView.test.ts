import { queryView } from '../hooks/queryView';

describe('queryView: what a list screen shows', () => {
  it('pending and fetching: loading (skeletons)', () => {
    expect(queryView({ status: 'pending', fetchStatus: 'fetching', data: undefined })).toBe('loading');
  });
  it('pending but paused (no network, nothing cached): offline, not a skeleton for ever', () => {
    expect(queryView({ status: 'pending', fetchStatus: 'paused', data: undefined })).toBe('offline');
  });
  it('error with nothing to show: error', () => {
    expect(queryView({ status: 'error', fetchStatus: 'idle', data: undefined })).toBe('error');
  });
  it('data wins: a failed refresh keeps the list on screen', () => {
    expect(queryView({ status: 'error', fetchStatus: 'idle', data: [] })).toBe('ready');
    expect(queryView({ status: 'success', fetchStatus: 'paused', data: [1] })).toBe('ready');
  });
  it('an empty list is ready: the screen shows its own empty text', () => {
    expect(queryView({ status: 'success', fetchStatus: 'idle', data: [] })).toBe('ready');
  });
});
