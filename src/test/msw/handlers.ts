import { http, HttpResponse } from 'msw';

// Default handlers shared by all tests. Tests add their own with `server.use(...)`.
// Base URL matches the development variant (app.config.ts).
export const API = 'http://localhost:3000';

export const handlers = [http.get(`${API}/health`, () => HttpResponse.json({ status: 'ok', db: 'ok' }))];
