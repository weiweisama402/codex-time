import { Pause, Play, Square } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CATEGORIES, CATEGORY_MAP } from '../constants';
import { activeTimerSeconds, formatClock } from '../lib/duration';
import { useTimerNow } from '../hooks/useTimerNow';
import { recentActivities } from '../lib/stats';
import { useAppStore } from '../store/appStore';
import type { CategoryKey } from '../types';

export function TimerPanel() {
  const timer = useAppStore((state) => state.timer);
  const entries = useAppStore((state) => state.entries);
  const settings = useAppStore((state) => state.settings);
  const startTimer = useAppStore((state) => state.startTimer);
  const pauseTimer = useAppStore((state) => state.pauseTimer);
  const resumeTimer = useAppStore((state) => state.resumeTimer);
  const stopTimer = useAppStore((state) => state.stopTimer);
  const [title, setTitle] = useState('');
  const [categoryKey, setCategoryKey] = useState<CategoryKey>('main');
  const [error, setError] = useState('');
  const now = useTimerNow(timer?.status === 'running');
  const recent = useMemo(() => recentActivities(entries), [entries]);

  const start = async (activity = title, category = categoryKey) => {
    setError('');
    try {
      await startTimer(activity, category);
      setTitle('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法开始计时');
    }
  };

  if (timer) {
    const seconds = activeTimerSeconds(timer, now || new Date(timer.updatedAt).getTime());
    const warning = seconds >= settings.timerWarningMinutes * 60;
    return (
      <section className={`timer-panel active ${warning ? 'warning' : ''}`} aria-label="活动计时器">
        <div className="timer-live">
          <span className="live-dot" />
          {timer.status === 'running' ? '正在计时' : '计时已暂停'}
        </div>
        <h2>{timer.title}</h2>
        <span
          className="category-caption"
          style={{ '--category-color': CATEGORY_MAP[timer.categoryKey].color } as React.CSSProperties}
        >
          {CATEGORY_MAP[timer.categoryKey].label}
        </span>
        <output className="timer-clock" aria-label={`已记录 ${formatClock(seconds)}`}>
          {formatClock(seconds)}
        </output>
        {warning && (
          <p className="timer-warning">已超过 {settings.timerWarningMinutes} 分钟，请确认是否忘记停止。</p>
        )}
        <div className="timer-actions">
          {timer.status === 'running' ? (
            <button className="button secondary" onClick={() => void pauseTimer()}>
              <Pause size={18} />
              暂停
            </button>
          ) : (
            <button className="button secondary" onClick={() => void resumeTimer()}>
              <Play size={18} />
              继续
            </button>
          )}
          <button className="button primary" onClick={() => void stopTimer()}>
            <Square size={17} />
            完成记录
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="timer-panel" aria-label="开始计时">
      <div className="timer-heading">
        <div>
          <p className="eyebrow">现在开始</p>
          <h2>记录一段净时间</h2>
        </div>
        <span>00:00:00</span>
      </div>
      <label className="field">
        <span>正在做什么</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          placeholder="例如：整理冲击试验数据"
          enterKeyHint="done"
        />
      </label>
      <fieldset className="category-picker">
        <legend>时间分类</legend>
        {CATEGORIES.map((category) => (
          <label key={category.key} style={{ '--category-color': category.color } as React.CSSProperties}>
            <input
              type="radio"
              name="timer-category"
              value={category.key}
              checked={categoryKey === category.key}
              onChange={() => setCategoryKey(category.key)}
            />
            <span>{category.shortLabel}</span>
          </label>
        ))}
      </fieldset>
      {recent.length > 0 && (
        <div className="recent-activities" role="group" aria-label="最近活动">
          {recent.map((activity) => (
            <button
              key={`${activity.categoryKey}:${activity.title}`}
              onClick={() => void start(activity.title, activity.categoryKey)}
            >
              <i style={{ background: CATEGORY_MAP[activity.categoryKey].color }} />
              {activity.title}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary block large" onClick={() => void start()}>
        <Play size={19} />
        开始计时
      </button>
    </section>
  );
}
