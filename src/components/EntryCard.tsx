import { Copy, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { CATEGORY_MAP } from '../constants';
import { formatDuration } from '../lib/duration';
import { toLocalTimeInput } from '../lib/date';
import { useAppStore } from '../store/appStore';
import type { TimeEntry } from '../types';

export function EntryCard({
  entry,
  onEdit,
  showDate = false
}: {
  entry: TimeEntry;
  onEdit?: () => void;
  showDate?: boolean;
}) {
  const projects = useAppStore((state) => state.projects);
  const deleteEntry = useAppStore((state) => state.deleteEntry);
  const restoreEntry = useAppStore((state) => state.restoreEntry);
  const startTimer = useAppStore((state) => state.startTimer);
  const activeTimer = useAppStore((state) => state.timer);
  const project = projects.find((item) => item.id === entry.projectId);
  const category = CATEGORY_MAP[entry.categoryKey];
  const time =
    entry.startedAt && entry.endedAt
      ? `${toLocalTimeInput(entry.startedAt)}–${toLocalTimeInput(entry.endedAt)}`
      : '净时长记录';
  return (
    <article className={`entry-card ${entry.deletedAt ? 'deleted' : ''}`}>
      <div className="entry-accent" style={{ background: project?.color ?? category.color }} />
      <div className="entry-main">
        <div className="entry-meta">
          <span className="category-dot" style={{ background: category.color }} />
          <span>{category.label}</span>
          {project && (
            <>
              <span>·</span>
              <span>{project.name}</span>
            </>
          )}
          {showDate && (
            <>
              <span>·</span>
              <span>{entry.dateKey}</span>
            </>
          )}
        </div>
        <h3>{entry.title}</h3>
        <p className="entry-time">
          {time} · {formatDuration(entry.durationSeconds, true)}
        </p>
        {entry.note && <p className="entry-note">{entry.note}</p>}
      </div>
      <div className="entry-actions">
        {entry.deletedAt ? (
          <button className="icon-button" onClick={() => void restoreEntry(entry.id)} aria-label="恢复记录">
            <RotateCcw size={17} />
          </button>
        ) : (
          <>
            <button
              className="icon-button"
              disabled={Boolean(activeTimer)}
              onClick={() =>
                void startTimer({
                  categoryKey: entry.categoryKey,
                  projectId: entry.projectId,
                  taskId: entry.taskId,
                  tagIds: entry.tagIds,
                  title: entry.title
                })
              }
              aria-label="继续计时"
            >
              <Copy size={17} />
            </button>
            {onEdit && (
              <button className="icon-button" onClick={onEdit} aria-label="编辑记录">
                <Pencil size={17} />
              </button>
            )}
            <button
              className="icon-button danger"
              onClick={() => void deleteEntry(entry.id)}
              aria-label="移入回收站"
            >
              <Trash2 size={17} />
            </button>
          </>
        )}
      </div>
    </article>
  );
}
