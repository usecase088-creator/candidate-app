import { ApiError, ERROR_MESSAGES, isApiError } from '../errors';

describe('ApiError.fromHttp', () => {
  it('keeps the backend { error } message for 4xx responses', () => {
    const err = ApiError.fromHttp(409, { error: 'Email is already registered' });
    expect(err).toMatchObject({
      kind: 'http',
      status: 409,
      serverMessage: 'Email is already registered',
      message: 'Email is already registered',
    });
  });

  it('shows the rate-limit message as sent (429)', () => {
    const err = ApiError.fromHttp(429, { error: 'Too many OTP requests, please try again after 15 minutes' });
    expect(err.message).toBe('Too many OTP requests, please try again after 15 minutes');
    expect(err.isRateLimited).toBe(true);
  });

  it('uses the website server-error wording for 5xx, keeping the raw message aside', () => {
    const err = ApiError.fromHttp(500, { error: 'Internal Server Error' });
    expect(err.message).toBe('Server error. Please try again in a moment.');
    expect(err.serverMessage).toBe('Internal Server Error');
  });

  it.each([
    ['an HTML error page', '<html>502 Bad Gateway</html>'],
    ['null', null],
    ['an error that is not a string', { error: { nested: true } }],
  ])('falls back to the generic message when the body is %s', (_label, body) => {
    const err = ApiError.fromHttp(403, body);
    expect(err.message).toBe('Something went wrong. Please try again.');
    expect(err.serverMessage).toBeUndefined();
  });

  it('marks 401 as unauthorized', () => {
    expect(ApiError.fromHttp(401, { error: 'Invalid or expired token' }).isUnauthorized).toBe(true);
    expect(ApiError.fromHttp(403, { error: 'Forbidden' }).isUnauthorized).toBe(false);
  });
});

describe('other kinds', () => {
  it('network uses the website wording', () => {
    expect(ApiError.network()).toMatchObject({
      kind: 'network',
      status: undefined,
      message: 'Network error. Please check your connection and try again.',
    });
  });

  it('timeout has its own message', () => {
    expect(ApiError.timeout()).toMatchObject({ kind: 'timeout', message: ERROR_MESSAGES.timeout });
  });

  it('parse keeps the HTTP status and the path, never the response body', () => {
    const err = ApiError.parse(200, '/api/auth/me', ['user.email: Invalid input']);
    expect(err).toMatchObject({
      kind: 'parse',
      status: 200,
      path: '/api/auth/me',
      message: ERROR_MESSAGES.generic,
    });
    expect(err.issues).toEqual(['user.email: Invalid input']);
  });
});

describe('isApiError', () => {
  it('recognises ApiError and nothing else', () => {
    expect(isApiError(ApiError.network())).toBe(true);
    expect(isApiError(new Error('x'))).toBe(false);
    expect(isApiError({ kind: 'http' })).toBe(false);
  });

  it('is a real Error subclass (stack, instanceof)', () => {
    const err = ApiError.network();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiError');
  });
});
