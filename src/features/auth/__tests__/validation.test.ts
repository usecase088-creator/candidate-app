import {
  firstError,
  loginSchema,
  OTP_ERROR,
  otpError,
  resetPasswordError,
  resetPhoneError,
  signupSchema,
} from '../validation';

// Messages copied from ../job/candidates/src/lib/validations.ts and the auth routes (docs/reference/SCREENS.md).

const issues = (schema: typeof loginSchema | typeof signupSchema, value: unknown) => {
  const r = schema.safeParse(value);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('loginSchema', () => {
  it('accepts a valid email and any non-empty password', () => {
    expect(loginSchema.safeParse({ email: 'asha@x.com', password: 'a' }).success).toBe(true);
  });

  it('uses the website messages', () => {
    expect(issues(loginSchema, { email: 'asha@', password: '' })).toEqual({
      email: 'Enter a valid email',
      password: 'Password is required',
    });
  });

  it('does not trim or lowercase the email (the backend matches it exactly)', () => {
    const r = loginSchema.safeParse({ email: 'Asha@X.com', password: 'a' });
    expect(r.success && r.data.email).toBe('Asha@X.com');
  });
});

describe('signupSchema', () => {
  const valid = { name: 'Asha Rao', mobile: '+91 9876543210', email: 'asha@x.com', password: 'Secret@123' };

  it('accepts the website example values', () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it('keeps the mobile exactly as typed (no +91 handling)', () => {
    const r = signupSchema.safeParse(valid);
    expect(r.success && r.data.mobile).toBe('+91 9876543210');
  });

  it.each([
    [{ name: 'A' }, 'name', 'Name must be at least 2 characters'],
    [{ email: 'nope' }, 'email', 'Enter a valid email'],
    [{ mobile: '98765' }, 'mobile', 'Enter a valid 10-digit phone number'],
    [{ mobile: '9876543210123456' }, 'mobile', 'Phone number is too long'],
    [{ mobile: '98765abc43210' }, 'mobile', 'Phone number can only contain digits and + - ( )'],
    [{ password: 'Ab@1' }, 'password', 'Password must be at least 8 characters'],
    [{ password: 'secret@123' }, 'password', 'Password must contain at least one uppercase letter'],
    [{ password: 'SECRET@123' }, 'password', 'Password must contain at least one lowercase letter'],
    [{ password: 'Secret1234' }, 'password', 'Password must contain at least one special character'],
  ])('%o → %s: %s', (patch, field, message) => {
    expect(issues(signupSchema, { ...valid, ...patch })[field]).toBe(message);
  });
});

describe('firstError (the red box shows the first error, in field order)', () => {
  it('follows the given field order', () => {
    expect(firstError({ password: { message: 'P' }, email: { message: 'E' } }, ['email', 'password'])).toBe(
      'E',
    );
  });

  it('is undefined when there are no errors', () => {
    expect(firstError({}, ['email'])).toBeUndefined();
  });
});

describe('otpError', () => {
  it('needs exactly 6 digits', () => {
    expect(otpError('12345')).toBe(OTP_ERROR);
    expect(OTP_ERROR).toBe('Please enter a valid 6-digit OTP.');
    expect(otpError('123456')).toBeUndefined();
  });
});

describe('forgot password checks', () => {
  it('phone: only checks it is not empty', () => {
    expect(resetPhoneError('')).toBe('Please enter your registered mobile number.');
    expect(resetPhoneError('   ')).toBe('Please enter your registered mobile number.');
    expect(resetPhoneError('123')).toBeUndefined();
  });

  it.each([
    ['', 'Password is required.'],
    ['Ab@1', 'Password must be at least 8 characters.'],
    ['secret@123', 'Password must contain at least one uppercase letter.'],
    ['SECRET@123', 'Password must contain at least one lowercase letter.'],
    ['Secret1234', 'Password must contain at least one special character.'],
  ])('new password %p → %s (with a full stop, unlike signup)', (pw, message) => {
    expect(resetPasswordError(pw)).toBe(message);
  });

  it('accepts a strong password', () => {
    expect(resetPasswordError('Secret@123')).toBeUndefined();
  });
});
