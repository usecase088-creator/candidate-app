import { isOtpTestNumber, TEST_OTP, testModeResponse } from '../overlay/src/lib/otpTestMode.ts';

const on = { OTP_TEST_MODE: 'true', NODE_ENV: 'development', OTP_TEST_NUMBERS: '9000000001, 9000000002' };

describe('isOtpTestNumber', () => {
  it('is true for a listed number when test mode is on', () => {
    expect(isOtpTestNumber('9000000001', on)).toBe(true);
    expect(isOtpTestNumber('9000000002', on)).toBe(true);
  });

  it('compares digits only, so spacing typed in the form does not matter', () => {
    expect(isOtpTestNumber(' 90000 00001 ', on)).toBe(true);
  });

  it('is false for numbers not in the list (they get a real SMS, D3)', () => {
    expect(isOtpTestNumber('9876543210', on)).toBe(false);
    expect(isOtpTestNumber('', on)).toBe(false);
  });

  it('is false when test mode is off or not exactly "true"', () => {
    expect(isOtpTestNumber('9000000001', { ...on, OTP_TEST_MODE: 'false' })).toBe(false);
    expect(isOtpTestNumber('9000000001', { ...on, OTP_TEST_MODE: '1' })).toBe(false);
    expect(isOtpTestNumber('9000000001', { ...on, OTP_TEST_MODE: undefined })).toBe(false);
  });

  it('is always false in production', () => {
    expect(isOtpTestNumber('9000000001', { ...on, NODE_ENV: 'production' })).toBe(false);
  });

  it('is false when the list is empty or missing', () => {
    expect(isOtpTestNumber('9000000001', { ...on, OTP_TEST_NUMBERS: '' })).toBe(false);
    expect(isOtpTestNumber('9000000001', { ...on, OTP_TEST_NUMBERS: undefined })).toBe(false);
  });
});

describe('test OTP', () => {
  it('is 123456 (D3)', () => {
    expect(TEST_OTP).toBe('123456');
  });

  it('builds a Fast2SMS-shaped success response', () => {
    expect(testModeResponse('OTP sent')).toEqual({
      return: true,
      status_code: 200,
      message: 'OTP sent (test mode)',
    });
  });
});
