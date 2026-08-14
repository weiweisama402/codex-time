import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CATEGORIES } from '../constants';
import { monthBounds, shiftDateKey, shiftMonthKey, todayKey, weekBounds } from '../lib/date';
import { formatDuration } from '../lib/duration';
import { dailySeries, entriesInRange, totals } from '../lib/stats';
import { useAppStore } from '../store/appStore';

type Period = 'day' | 'week' | 'month';

export function StatsPage() {
  const entries = useAppStore((state) => state.entries);
  const settings = useAppStore((state) => state.settings);
  const today = todayKey(settings.timezone);
  const [period, setPeriod] = useState<Period>('week');
  const [anchor, setAnchor] = useState(today);
  const bounds: [string, string] =
    period === 'day' ? [anchor, anchor] : period === 'week' ? weekBounds(anchor) : monthBounds(anchor);
  const [start, end] = bounds;
  const visible = useMemo(() => entriesInRange(entries, start, end), [entries, start, end]);
  const summary = totals(visible);
  const series = dailySeries(visible, start, end);
  const maxDay = Math.max(...series.map((item) => item.total), 1);
  const shift = (amount: number) =>
    setAnchor(
      period === 'month'
        ? shiftMonthKey(anchor, amount)
        : shiftDateKey(anchor, amount * (period === 'day' ? 1 : 7))
    );
  return (
    <div className="page-stack">
      <header className="page-intro compact-intro">
        <div>
          <p className="eyebrow">Evidence</p>
          <h1>时间统计</h1>
          <p>用记录判断投入，而不是凭忙碌感。</p>
        </div>
      </header>
      <div className="segmented period-tabs" role="tablist" aria-label="统计周期">
        {(['day', 'week', 'month'] as Period[]).map((item) => (
          <button
            key={item}
            className={period === item ? 'active' : ''}
            onClick={() => {
              setPeriod(item);
              setAnchor(today);
            }}
            role="tab"
            aria-selected={period === item}
          >
            {{ day: '今日', week: '本周', month: '本月' }[item]}
          </button>
        ))}
      </div>
      <section className="period-switcher">
        <button className="icon-button" onClick={() => shift(-1)} aria-label="上一周期">
          <ChevronLeft />
        </button>
        <button onClick={() => setAnchor(today)}>{start === end ? start : `${start} — ${end}`}</button>
        <button
          className="icon-button"
          onClick={() => shift(1)}
          disabled={end >= today}
          aria-label="下一周期"
        >
          <ChevronRight />
        </button>
      </section>
      <section className="stats-hero">
        <span>累计记录</span>
        <strong>{formatDuration(summary.total)}</strong>
        <div>
          <span>有效时间 {formatDuration(summary.effective)}</span>
          <span>占比 {summary.effectiveRate}%</span>
        </div>
      </section>
      <section className="stats-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Structure</p>
            <h2>四类时间结构</h2>
          </div>
        </div>
        <div className="stacked-bar" role="img" aria-label="分类占比">
          {CATEGORIES.map((category) => (
            <i
              key={category.key}
              style={{
                width: `${summary.total ? (summary.byCategory[category.key] / summary.total) * 100 : 0}%`,
                background: category.color
              }}
            />
          ))}
        </div>
        <div className="category-stats">
          {CATEGORIES.map((category) => (
            <div key={category.key}>
              <i style={{ background: category.color }} />
              <span>{category.label}</span>
              <strong>{formatDuration(summary.byCategory[category.key])}</strong>
              <small>
                {summary.total ? Math.round((summary.byCategory[category.key] / summary.total) * 100) : 0}%
              </small>
            </div>
          ))}
        </div>
      </section>
      <section className="stats-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Trend</p>
            <h2>每日投入</h2>
          </div>
          <span>{series.length} 天</span>
        </div>
        <div className="trend-chart" role="img" aria-label="每日投入趋势">
          {series.map((day) => (
            <div key={day.date} title={`${day.date} ${formatDuration(day.total)}`}>
              <i style={{ height: `${Math.max(day.total ? 8 : 2, (day.total / maxDay) * 100)}%` }} />
              <span>{day.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
