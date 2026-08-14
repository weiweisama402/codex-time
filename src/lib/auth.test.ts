import { describe, expect, it } from 'vitest';
import { authErrorMessage, normalizeEmail, normalizeOtp } from './auth';

describe('authentication helpers', () => {
  it('normalizes email addresses and six-digit OTP input', () => {
    expect(normalizeEmail('  Wei542439@GMAIL.COM ')).toBe('wei542439@gmail.com');
    expect(normalizeOtp('12a 34-567')).toBe('123456');
  });

  it('translates rate-limit and OTP errors into actionable Chinese messages', () => {
    expect(authErrorMessage({ code: 'over_email_send_rate_limit', status: 429 })).toContain('发送次数过多');
    expect(authErrorMessage({ message: 'Token has expired' })).toContain('已过期');
    expect(authErrorMessage({ code: 'invalid_credentials' })).toContain('验证码错误');
  });

  it('does not expose unknown server errors', () => {
    expect(authErrorMessage(new Error('internal implementation detail'))).toBe('操作失败，请稍后重试');
    expect(authErrorMessage(null)).toBe('操作失败，请稍后重试');
  });
});
