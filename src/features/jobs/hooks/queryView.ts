// One rule for every list screen: loading, offline, error or ready (an empty list is "ready"; the screen words it).
export type QueryView = 'loading' | 'offline' | 'error' | 'ready';

export function queryView(q: {
  status: 'pending' | 'error' | 'success';
  fetchStatus: 'fetching' | 'paused' | 'idle';
  data: unknown;
}): QueryView {
  if (q.data !== undefined) return 'ready';
  if (q.status === 'error') return 'error';
  // TanStack pauses a first load while offline: without this the skeleton would stay for ever.
  if (q.fetchStatus === 'paused') return 'offline';
  return 'loading';
}
