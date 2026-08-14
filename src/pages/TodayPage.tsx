import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { EntryList } from '../components/EntryList';
import { TimerPanel } from '../components/TimerPanel';
import { useShell } from '../components/shellContext';
import { formatDateLabel, todayKey } from '../lib/date';
import { formatDuration } from '../lib/duration';
import { totals } from '../lib/stats';
import { useAppStore } from '../store/appStore';

export function TodayPage() {
  const entries = useAppStore((state) => state.entries);
  const settings = useAppStore((state) => state.settings);
  const { openEntry } = useShell();
  const today = todayKey(settings.timezone);
  const todayEntries = useMemo(
    () =>
      entries
        .filter((entry) => !entry.deletedAt && entry.dateKey === today)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [entries, today]
  );
  const summary = totals(todayEntries);
  return (
    <div className="page-stack">
      <header className="page-intro">
        <div>
          <p className="eyebrow">{formatDateLabel(today)}</p>
          <h1>把时间记清楚</h1>
          <p>忠实记录事实，再观察投入结构。</p>
        </div>
        <button className="icon-button add-button" onClick={() => openEntry()} aria-label="补录时间">
          <Plus size={21} />
        </button>
      </header>
      <TimerPanel />
      <section className="today-summary" aria-label="今日汇总">
        <div>
          <span>今日记录</span>
          <strong>{formatDuration(summary.total)}</strong>
        </div>
        <div>
          <span>有效时间</span>
          <strong>{formatDuration(summary.effective)}</strong>
        </div>
        <div>
          <span>有效占比</span>
          <strong>{summary.effectiveRate}%</strong>
        </div>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Daily ledger</p>
            <h2>今日记录</h2>
          </div>
          <span>{todayEntries.length} 条</span>
        </div>
        <EntryList entries={todayEntries} onEdit={openEntry} compact />
      </section>
    </div>
  );
}
