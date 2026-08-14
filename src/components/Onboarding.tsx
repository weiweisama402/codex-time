import { BarChart3, Cloud, FlaskConical, Timer } from 'lucide-react';
import { useState } from 'react';
import { cloudConfigured } from '../data/supabase';
import { useAppStore } from '../store/appStore';
import { Logo } from './Logo';

export function Onboarding() {
  const complete = useAppStore((state) => state.completeOnboarding);
  const [busy, setBusy] = useState(false);
  const finish = async (template: boolean) => {
    setBusy(true);
    await complete(template);
  };
  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="onboarding-card">
        <Logo />
        <p className="eyebrow">欢迎使用 v1.0</p>
        <h1 id="welcome-title">让时间成为可验证的研究数据</h1>
        <p className="lead">记录净时间，按项目核算，在周期复盘中修正下一步计划。</p>
        <div className="feature-grid">
          <div>
            <Timer />
            <strong>双模式记录</strong>
            <span>实时计时与手动补录</span>
          </div>
          <div>
            <BarChart3 />
            <strong>多尺度洞察</strong>
            <span>日、周、月、年统计</span>
          </div>
          <div>
            <FlaskConical />
            <strong>科研项目模板</strong>
            <span>为冲击动力学课题预设</span>
          </div>
          <div>
            <Cloud />
            <strong>{cloudConfigured ? '跨设备同步' : '离线优先'}</strong>
            <span>{cloudConfigured ? '联网自动同步' : '配置后即可云同步'}</span>
          </div>
        </div>
        <div className="onboarding-actions">
          <button className="button primary" disabled={busy} onClick={() => void finish(true)}>
            使用科研模板开始
          </button>
          <button className="button ghost" disabled={busy} onClick={() => void finish(false)}>
            从空白项目开始
          </button>
        </div>
      </div>
    </div>
  );
}
