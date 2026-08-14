import { useState } from 'react';
import { KeyRound, Mail } from 'lucide-react';
import { requestEmailCode, verifyEmailCode } from '../data/supabase';
import { Logo } from '../components/Logo';

export function AuthPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const request = async () => {
    setBusy(true);
    setMessage('');
    try {
      await requestEmailCode(email.trim());
      setSent(true);
      setMessage('验证码已发送，请检查邮箱。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '发送失败');
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    setBusy(true);
    setMessage('');
    try {
      await verifyEmailCode(email.trim(), code.trim());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '验证失败');
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Logo />
        <p className="eyebrow">个人时间实验室</p>
        <h1>{sent ? '输入邮箱验证码' : '登录你的时间账本'}</h1>
        <p className="muted">只有预先创建的个人账号可以登录，数据由 Supabase RLS 隔离。</p>
        <label className="field">
          <span>邮箱</span>
          <div className="input-with-icon">
            <Mail size={18} />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              disabled={sent}
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
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>
          </label>
        )}
        {message && (
          <p className="form-message" role="status">
            {message}
          </p>
        )}
        <button
          className="button primary block"
          disabled={busy || !email || (sent && code.length !== 6)}
          onClick={() => void (sent ? verify() : request())}
        >
          {busy ? '请稍候…' : sent ? '验证并登录' : '获取验证码'}
        </button>
        {sent && (
          <button
            className="button ghost block"
            onClick={() => {
              setSent(false);
              setCode('');
              setMessage('');
            }}
          >
            更换邮箱
          </button>
        )}
      </section>
    </main>
  );
}
