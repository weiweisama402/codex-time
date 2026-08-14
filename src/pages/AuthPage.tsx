import { FormEvent, useEffect, useState } from 'react';
import { KeyRound, Mail } from 'lucide-react';
import { requestEmailCode, verifyEmailCode } from '../data/supabase';
import { Logo } from '../components/Logo';
import { authErrorMessage, normalizeEmail, normalizeOtp } from '../lib/auth';

const RESEND_COOLDOWN_SECONDS = 60;

export function AuthPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [hasError, setHasError] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const request = async () => {
    setBusy(true);
    setMessage('');
    setHasError(false);
    try {
      await requestEmailCode(normalizeEmail(email));
      setSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setMessage('6 位验证码已发送，请检查收件箱和垃圾邮件');
    } catch (error) {
      setHasError(true);
      setMessage(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setMessage('');
    setHasError(false);
    try {
      await verifyEmailCode(normalizeEmail(email), code);
    } catch (error) {
      setHasError(true);
      setMessage(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void (sent ? verify() : request());
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Logo />
        <p className="eyebrow">个人时间实验室</p>
        <h1>{sent ? '输入邮箱验证码' : '登录你的时间账本'}</h1>
        <p className="muted">只有预先创建的个人账号可以登录，数据由 Supabase RLS 隔离。</p>
        {sent && <p className="muted">验证码已发送至 {normalizeEmail(email)}，有效期以邮件说明为准。</p>}
        <form onSubmit={submit} noValidate>
          <label className="field">
            <span>邮箱</span>
            <div className="input-with-icon">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="name@example.com"
                required
                readOnly={sent}
              />
            </div>
          </label>
          {sent && (
            <label className="field">
              <span>6 位验证码</span>
              <div className="input-with-icon">
                <KeyRound size={18} />
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(normalizeOtp(event.target.value))}
                  autoComplete="one-time-code"
                  enterKeyHint="done"
                  aria-describedby="otp-help"
                  autoFocus
                  required
                />
              </div>
              <small id="otp-help" className="hint">
                输入邮件中的数字验证码，不需要复制或打开链接
              </small>
            </label>
          )}
          {message && (
            <p
              className={`form-message ${hasError ? 'error' : 'success'}`}
              role={hasError ? 'alert' : 'status'}
            >
              {message}
            </p>
          )}
          <button
            type="submit"
            className="button primary block"
            disabled={busy || !normalizeEmail(email) || (sent && code.length !== 6)}
          >
            {busy ? '请稍候…' : sent ? '验证并登录' : '获取验证码'}
          </button>
          {sent && (
            <div className="auth-secondary-actions">
              <button
                type="button"
                className="button ghost"
                disabled={busy || cooldown > 0}
                onClick={() => void request()}
              >
                {cooldown > 0 ? `${cooldown} 秒后可重新发送` : '重新发送验证码'}
              </button>
              <button
                type="button"
                className="button ghost"
                disabled={busy}
                onClick={() => {
                  setSent(false);
                  setCode('');
                  setMessage('');
                  setHasError(false);
                  setCooldown(0);
                }}
              >
                更换邮箱
              </button>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
