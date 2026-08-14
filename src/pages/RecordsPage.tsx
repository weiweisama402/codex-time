import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EntryList } from '../components/EntryList';
import { useShell } from '../components/shellContext';
import { formatDateLabel, shiftDateKey, todayKey } from '../lib/date';
import { formatDuration } from '../lib/duration';
import { totals } from '../lib/stats';
import { useAppStore } from '../store/appStore';

export function RecordsPage() {
  const entries = useAppStore((state) => state.entries);
  const settings = useAppStore((state) => state.settings);
  const { openEntry } = useShell();
  const today = todayKey(settings.timezone);
  const [anchor, setAnchor] = useState(today);
  const visible = useMemo(
    () =>
      entries
        .filter((entry) => !entry.deletedAt && entry.dateKey === anchor)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [entries, anchor]
  );
  return (
    <div className="page-stack">
      <header className="page-intro compact-intro">
        <div>
          <p className="eyebrow">History</p>
          <h1>时间记录</h1>
          <p>
            {visible.length} 条 · {formatDuration(totals(visible).total)}
          </p>
        </div>
        <button className="icon-button add-button" onClick={() => openEntry()} aria-label="补录时间">
          <Plus size={21} />
        </button>
      </header>
      <section className="date-toolbar">
        <button
          className="icon-button"
          onClick={() => setAnchor(shiftDateKey(anchor, -1))}
          aria-label="前一天"
        >
          <ChevronLeft />
        </button>
        <label>
          <span>{formatDateLabel(anchor)}</span>
          <input
            type="date"
            value={anchor}
            onChange={(event) => setAnchor(event.target.value)}
            aria-label="选择日期"
          />
        </label>
        <button
          className="icon-button"
          onClick={() => setAnchor(shiftDateKey(anchor, 1))}
          disabled={anchor >= today}
          aria-label="后一天"
        >
          <ChevronRight />
        </button>
      </section>
      {anchor !== today && (
        <button className="text-button" onClick={() => setAnchor(today)}>
          回到今天
        </button>
      )}
      <EntryList entries={visible} onEdit={openEntry} />
    </div>
  );
}
