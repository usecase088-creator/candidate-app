import { http, HttpResponse } from 'msw';

// Default handlers shared by all tests. Tests add their own with `server.use(...)`.
// Base URL matches the development variant (app.config.ts).
export const API = 'http://localhost:3000';

export const handlers = [
  http.get(`${API}/health`, () => HttpResponse.json({ status: 'ok', db: 'ok' })),
  // The app asks for its settings at start (Phase 4). By default nothing is restricted.
  http.get(`${API}/api/app-config`, () =>
    HttpResponse.json({ minVersion: { android: '0.0.0', ios: '0.0.0' }, flags: {} }),
  ),
  // The bell in the top bar of every tab asks for the unread count. By default there is nothing.
  http.get(`${API}/api/notifications`, () => HttpResponse.json({ data: [], unreadCount: 0 })),
];
