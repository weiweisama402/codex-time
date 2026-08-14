type AuthErrorLike = {
  code?: unknown;
  message?: unknown;
  status?: unknown;
};

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeOtp(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

export function authErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return '操作失败，请稍后重试';

  const { code, message, status } = error as AuthErrorLike;
  const detail = `${String(code ?? '')} ${String(message ?? '')}`.toLowerCase();

  if (
    status === 429 ||
    detail.includes('rate limit') ||
    detail.includes('over_email_send_rate_limit') ||
    detail.includes('over_request_rate_limit')
  ) {
    return '验证码发送次数过多，请稍后再试';
  }
  if (detail.includes('security purposes') || detail.includes('after 20 seconds')) {
    return '请求过于频繁，请等待倒计时结束后重试';
  }
  if (detail.includes('otp_expired') || detail.includes('token has expired')) {
    return '验证码已过期，请重新获取';
  }
  if (
    detail.includes('invalid_credentials') ||
    detail.includes('token is invalid') ||
    detail.includes('invalid token')
  ) {
    return '验证码错误或已过期，请检查后重试';
  }
  if (detail.includes('signups not allowed') || detail.includes('user not found')) {
    return '该邮箱未开通登录权限';
  }
  if (detail.includes('network') || detail.includes('failed to fetch')) {
    return '网络连接失败，请检查网络后重试';
  }

  return '操作失败，请稍后重试';
}
