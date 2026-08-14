import { CATEGORIES } from '../constants';
import { formatDuration } from '../lib/duration';
import { totals } from '../lib/stats';
import type { TimeEntry } from '../types';

export function SummaryCards({ entries, compact = false }: { entries: TimeEntry[]; compact?: boolean }) {
  const result = totals(entries);
  const values = [
    ...CATEGORIES.map((category) => ({
      label: category.shortLabel,
      value: result.byCategory[category.key],
      color: category.color
    })),
    { label: '有效时间', value: result.effective, color: 'var(--accent)' },
    { label: '总记录', value: result.total, color: 'var(--text)' }
  ];
  return (
    <div className={`summary-grid ${compact ? 'compact' : ''}`}>
      {values.map((item) => (
        <article className="metric-card" key={item.label}>
          <span>{item.label}</span>
          <strong style={{ color: item.color }}>{formatDuration(item.value, true)}</strong>
        </article>
      ))}
    </div>
  );
}
