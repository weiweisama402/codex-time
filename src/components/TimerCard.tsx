import { Pause, Play, Square } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CATEGORY_MAP, CATEGORIES } from '../constants';
import { activeTimerSeconds, formatDuration } from '../lib/duration';
import { useAppStore } from '../store/appStore';
import type { CategoryKey, TimerPreset } from '../types';

export function TimerCard() {
  const timer = useAppStore((state) => state.timer);
  const allProjects = useAppStore((state) => state.projects);
  const presets = useAppStore((state) => state.presets);
  const settings = useAppStore((state) => state.settings);
  const startTimer = useAppStore((state) => state.startTimer);
  const pauseTimer = useAppStore((state) => state.pauseTimer);
  const resumeTimer = useAppStore((state) => state.resumeTimer);
  const stopTimer = useAppStore((state) => state.stopTimer);
  const [now, setNow] = useState(() => (timer ? Date.parse(timer.updatedAt) : 0));
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryKey>('main');
  const [projectId, setProjectId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!timer || timer.status !== 'running') return;
    const initial = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [timer]);

  const seconds = activeTimerSeconds(timer, now);
  const warning = settings && seconds >= settings.timerWarningMinutes * 60;
  const projects = useMemo(
    () => allProjects.filter((project) => !project.deletedAt && !project.archivedAt),
    [allProjects]
  );
  const availableProjects = useMemo(
    () => projects.filter((project) => project.categoryKey === category),
    [projects, category]
  );

  const start = async (preset?: TimerPreset) => {
    const selected = preset ?? null;
    const nextTitle =
      selected?.title ||
      title.trim() ||
      availableProjects.find((project) => project.id === projectId)?.name ||
      CATEGORY_MAP[category].label;
    setError('');
    try {
      await startTimer({
        categoryKey: selected?.categoryKey ?? category,
        projectId: selected?.projectId ?? (projectId || null),
        taskId: selected?.taskId ?? null,
        tagIds: selected?.tagIds ?? [],
        title: nextTitle
      });
      setTitle('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法开始计时');
    }
  };

  if (timer) {
    const project = projects.find((item) => item.id === timer.projectId);
    return (
      <section className={`timer-card active ${warning ? 'warning' : ''}`}>
        <div className="timer-status">
          <span className="pulse-dot" />
          <span>{timer.status === 'running' ? '正在计时' : '已暂停'}</span>
        </div>
        <h2>{timer.title}</h2>
        <p>
          {CATEGORY_MAP[timer.categoryKey].label}
          {project ? ` · ${project.name}` : ''}
        </p>
        <div className="timer-digits" aria-live="off">
          {formatDuration(seconds)}
        </div>
        {warning && (
          <p className="timer-warning" role="status">
            本次计时已超过 {settings?.timerWarningMinutes} 分钟，建议确认是否忘记停止。
          </p>
        )}
        <div className="timer-controls">
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
            完成并记录
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="timer-card">
      <div className="timer-intro">
        <div>
          <p className="eyebrow">现在开始</p>
          <h2>记录一段净时间</h2>
        </div>
        <span className="timer-zero">00:00:00</span>
      </div>
      <label className="field">
        <span>当前活动</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="做了什么？可在结束后补充"
        />
      </label>
      <div className="form-row">
        <label className="field">
          <span>分类</span>
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as CategoryKey);
              setProjectId('');
            }}
          >
            {CATEGORIES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>项目</span>
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">不指定项目</option>
            {availableProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {presets.length > 0 && (
        <div className="preset-row" aria-label="快捷预设">
          {presets.slice(0, 6).map((preset) => (
            <button
              key={preset.id}
              onClick={() => void start(preset)}
              style={{ '--preset-color': preset.color } as React.CSSProperties}
            >
              {preset.name}
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
