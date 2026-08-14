import { Copy, MoreHorizontal, Play, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CATEGORY_MAP } from '../constants';
import { formatDuration } from '../lib/duration';
import { useAppStore } from '../store/appStore';
import type { TimeEntryV2 } from '../types';

export function EntryList({
  entries,
  onEdit,
  compact = false
}: {
  entries: TimeEntryV2[];
  onEdit: (entry: TimeEntryV2) => void;
  compact?: boolean;
}) {
  if (!entries.length)
    return (
      <div className="empty-state">
        <div className="empty-clock" aria-hidden="true">
          ◷
        </div>
        <h3>还没有时间记录</h3>
        <p>开始计时，或补录已经完成的活动。</p>
      </div>
    );
  return (
    <div className={`entry-list ${compact ? 'compact' : ''}`}>
      {entries.map((entry) => (
        <EntryRow key={entry.id} entry={entry} onEdit={() => onEdit(entry)} />
      ))}
    </div>
  );
}

function EntryRow({ entry, onEdit }: { entry: TimeEntryV2; onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const timer = useAppStore((state) => state.timer);
  const startTimer = useAppStore((state) => state.startTimer);
  const duplicate = useAppStore((state) => state.duplicateEntry);
  const remove = useAppStore((state) => state.deleteEntry);
  const category = CATEGORY_MAP[entry.categoryKey];
  return (
    <article className="entry-row">
      <i className="entry-color" style={{ background: category.color }} />
      <button className="entry-main" onClick={onEdit}>
        <span>{category.label}</span>
        <strong>{entry.title}</strong>
        {entry.note && <small>{entry.note}</small>}
      </button>
      <time>{formatDuration(entry.durationSeconds)}</time>
      <button
        className="icon-button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`更多操作：${entry.title}`}
        aria-expanded={open}
      >
        <MoreHorizontal size={20} />
      </button>
      {open && (
        <div className="entry-menu">
          <button
            disabled={Boolean(timer)}
            onClick={() => {
              setOpen(false);
              void startTimer(entry.title, entry.categoryKey);
            }}
          >
            <Play size={16} />
            再次计时
          </button>
          <button
            onClick={() => {
              setOpen(false);
              void duplicate(entry);
            }}
          >
            <Copy size={16} />
            复制
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <RotateCcw size={16} />
            编辑
          </button>
          <button
            className="danger"
            onClick={() => {
              setOpen(false);
              void remove(entry);
            }}
          >
            <Trash2 size={16} />
            删除
          </button>
        </div>
      )}
    </article>
  );
}
