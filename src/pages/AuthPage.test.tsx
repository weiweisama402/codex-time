import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthPage } from './AuthPage';
import { requestEmailCode, verifyEmailCode } from '../data/supabase';

vi.mock('../data/supabase', () => ({
  requestEmailCode: vi.fn(),
  verifyEmailCode: vi.fn()
}));

describe('AuthPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests and verifies a six-digit email code without directing users to a link', async () => {
    const user = userEvent.setup();
    vi.mocked(requestEmailCode).mockResolvedValue();
    vi.mocked(verifyEmailCode).mockResolvedValue({} as never);
    render(<AuthPage />);

    await user.type(screen.getByLabelText('邮箱'), 'Wei542439@GMAIL.COM');
    await user.click(screen.getByRole('button', { name: '获取验证码' }));

    await waitFor(() => expect(requestEmailCode).toHaveBeenCalledWith('wei542439@gmail.com'));
    expect(screen.getByRole('heading', { name: '输入邮箱验证码' })).toBeInTheDocument();
    expect(screen.getByText(/不需要复制或打开链接/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /60 秒后可重新发送/ })).toBeDisabled();

    await user.type(screen.getByLabelText(/6 位验证码/), '12a3456');
    await user.click(screen.getByRole('button', { name: '验证并登录' }));
    await waitFor(() => expect(verifyEmailCode).toHaveBeenCalledWith('wei542439@gmail.com', '123456'));
  });

  it('shows a Chinese message when email delivery is rate limited', async () => {
    const user = userEvent.setup();
    vi.mocked(requestEmailCode).mockRejectedValue({
      code: 'over_email_send_rate_limit',
      status: 429
    });
    render(<AuthPage />);

    await user.type(screen.getByLabelText('邮箱'), 'wei542439@gmail.com');
    await user.click(screen.getByRole('button', { name: '获取验证码' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('验证码发送次数过多，请稍后再试');
  });
});
