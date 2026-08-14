import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EntryCard } from '../components/EntryCard';
import { EntryForm } from '../components/EntryForm';
import { Modal } from '../components/Modal';
import { SummaryCards } from '../components/SummaryCards';
import { CATEGORIES } from '../constants';
import { formatDateLabel, periodBounds, shiftDateKey, todayKey } from '../lib/date';
import { entriesInRange } from '../lib/stats';
import { useAppStore } from '../store/appStore';
import type { CategoryKey, TimeEntry } from '../types';

export function TimelinePage() {
  const entries = useAppStore((state) => state.entries);
  const settings = useAppStore((state) => state.settings)!;
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [anchor, setAnchor] = useState(todayKey(settings.timezone));
  const [category, setCategory] = useState<CategoryKey | 'all'>('all');
  const [modal, setModal] = useState<{ entry?: TimeEntry } | null>(null);
  const [start, end] = periodBounds(mode, anchor);
  const visible = useMemo(
    () =>
      entriesInRange(entries, start, end)
        .filter((entry) => category === 'all' || entry.categoryKey === category)
        .sort((a, b) =>
          `${b.dateKey}${b.startedAt ?? b.createdAt}`.localeCompare(
            `${a.dateKey}${a.startedAt ?? a.createdAt}`
          )
        ),
    [entries, start, end, category]
  );
  const grouped = [
    ...visible.reduce((map, entry) => {
      const group = map.get(entry.dateKey) ?? [];
      group.push(entry);
      map.set(entry.dateKey, group);
      return map;
    }, new Map<string, TimeEntry[]>())
  ].sort(([a], [b]) => b.localeCompare(a));
  const shift = (amount: number) => setAnchor(shiftDateKey(anchor, amount * (mode === 'week' ? 7 : 1)));
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Timeline</p>
          <h1>时间轴</h1>
          <p>检查一天的结构，识别空档与重复核算。</p>
        </div>
        <button className="button primary" onClick={() => setModal({})}>
          <Plus size={18} />
          添加记录
        </button>
      </header>
      <section className="toolbar-card">
        <div className="segmented">
          <button className={mode === 'day' ? 'active' : ''} onClick={() => setMode('day')}>
            日视图
          </button>
          <button className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}>
            周视图
          </button>
        </div>
        <div className="date-switcher">
          <button className="icon-button" onClick={() => shift(-1)} aria-label="上一周期">
            <ChevronLeft />
          </button>
          <button className="date-label" onClick={() => setAnchor(todayKey(settings.timezone))}>
            {mode === 'day' ? formatDateLabel(anchor) : `${start} — ${end}`}
          </button>
          <button className="icon-button" onClick={() => shift(1)} aria-label="下一周期">
            <ChevronRight />
          </button>
        </div>
        <select
          className="compact-select"
          aria-label="筛选分类"
          value={category}
          onChange={(event) => setCategory(event.target.value as CategoryKey | 'all')}
        >
          <option value="all">全部分类</option>
          {CATEGORIES.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </section>
      <SummaryCards entries={visible} compact />
      <section className="section-block">
        {grouped.length ? (
          grouped.map(([day, dayEntries]) => (
            <div className="timeline-day" key={day}>
              <div className="timeline-date">
                <strong>{formatDateLabel(day)}</strong>
                <span>{dayEntries.length} 条</span>
              </div>
              <div className="entry-list">
                {dayEntries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    showDate={mode === 'week'}
                    onEdit={() => setModal({ entry })}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state compact">
            <h3>该周期没有记录</h3>
            <p>调整筛选条件，或添加一条时间记录。</p>
          </div>
        )}
      </section>
      {modal && (
        <Modal title={modal.entry ? '编辑时间记录' : '添加时间记录'} onClose={() => setModal(null)}>
          <EntryForm entry={modal.entry} initialDate={anchor} onSaved={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}
