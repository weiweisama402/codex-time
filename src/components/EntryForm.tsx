import { useMemo, useState } from 'react';
import { CATEGORY_MAP, CATEGORIES } from '../constants';
import { combineLocalDateTime, toLocalTimeInput, todayKey } from '../lib/date';
import { useAppStore } from '../store/appStore';
import type { CategoryKey, TimeEntry } from '../types';

export function EntryForm({
  entry,
  initialDate,
  onSaved
}: {
  entry?: TimeEntry;
  initialDate?: string;
  onSaved: () => void;
}) {
  const allProjects = useAppStore((state) => state.projects);
  const allTasks = useAppStore((state) => state.tasks);
  const allTags = useAppStore((state) => state.tags);
  const settings = useAppStore((state) => state.settings);
  const saveEntry = useAppStore((state) => state.saveEntry);
  const [date, setDate] = useState(entry?.dateKey ?? initialDate ?? todayKey(settings?.timezone));
  const [category, setCategory] = useState<CategoryKey>(entry?.categoryKey ?? 'main');
  const [projectId, setProjectId] = useState(entry?.projectId ?? '');
  const [taskId, setTaskId] = useState(entry?.taskId ?? '');
  const [title, setTitle] = useState(entry?.title ?? '');
  const [note, setNote] = useState(entry?.note ?? '');
  const [tagIds, setTagIds] = useState<string[]>(entry?.tagIds ?? []);
  const [mode, setMode] = useState<'duration' | 'range'>(entry?.startedAt ? 'range' : 'duration');
  const [minutes, setMinutes] = useState(
    entry ? String(Math.max(1, Math.round(entry.durationSeconds / 60))) : '30'
  );
  const [start, setStart] = useState(toLocalTimeInput(entry?.startedAt ?? null));
  const [end, setEnd] = useState(toLocalTimeInput(entry?.endedAt ?? null));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const projects = useMemo(
    () => allProjects.filter((item) => !item.deletedAt && !item.archivedAt),
    [allProjects]
  );
  const tasks = useMemo(() => allTasks.filter((item) => !item.deletedAt && !item.archivedAt), [allTasks]);
  const tags = useMemo(() => allTags.filter((item) => !item.deletedAt), [allTags]);
  const availableProjects = useMemo(
    () => projects.filter((project) => project.categoryKey === category),
    [projects, category]
  );
  const availableTasks = useMemo(
    () => tasks.filter((task) => task.projectId === projectId),
    [tasks, projectId]
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    let startedAt: string | null = null;
    let endedAt: string | null = null;
    let durationSeconds = Math.round(Number(minutes) * 60);
    if (mode === 'range') {
      startedAt = combineLocalDateTime(date, start);
      endedAt = combineLocalDateTime(date, end);
      if (!startedAt || !endedAt || Date.parse(endedAt) <= Date.parse(startedAt)) {
        setError('结束时间必须晚于开始时间');
        return;
      }
      durationSeconds = Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000);
    }
    if (!date || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      setError('请填写有效日期和时长');
      return;
    }
    setBusy(true);
    try {
      await saveEntry({
        id: entry?.id,
        dateKey: date,
        startedAt,
        endedAt,
        durationSeconds,
        categoryKey: category,
        projectId: projectId || null,
        taskId: taskId || null,
        tagIds,
        title:
          title.trim() ||
          projects.find((project) => project.id === projectId)?.name ||
          CATEGORY_MAP[category].label,
        note
      });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败');
      setBusy(false);
    }
  };

  return (
    <form className="form-stack" onSubmit={(event) => void submit(event)}>
      <label className="field">
        <span>做了什么</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          placeholder="例如：整理 Ti6Al4V 压剪试验数据"
          autoFocus
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
              setTaskId('');
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
          <select
            value={projectId}
            onChange={(event) => {
              setProjectId(event.target.value);
              setTaskId('');
            }}
          >
            <option value="">不指定项目</option>
            {availableProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {projectId && (
        <label className="field">
          <span>任务</span>
          <select value={taskId} onChange={(event) => setTaskId(event.target.value)}>
            <option value="">不指定任务</option>
            {availableTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="field">
        <span>日期</span>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
      <div className="segmented" aria-label="时间录入方式">
        <button
          type="button"
          className={mode === 'duration' ? 'active' : ''}
          onClick={() => setMode('duration')}
        >
          净时长
        </button>
        <button type="button" className={mode === 'range' ? 'active' : ''} onClick={() => setMode('range')}>
          起止时间
        </button>
      </div>
      {mode === 'duration' ? (
        <label className="field">
          <span>净时长（分钟）</span>
          <input
            type="number"
            min="1"
            max="1440"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
          />
        </label>
      ) : (
        <div className="form-row">
          <label className="field">
            <span>开始</span>
            <input type="time" value={start} onChange={(event) => setStart(event.target.value)} />
          </label>
          <label className="field">
            <span>结束</span>
            <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
          </label>
        </div>
      )}
      {tags.length > 0 && (
        <fieldset className="tag-picker">
          <legend>标签</legend>
          {tags.map((tag) => (
            <label key={tag.id}>
              <input
                type="checkbox"
                checked={tagIds.includes(tag.id)}
                onChange={() =>
                  setTagIds((current) =>
                    current.includes(tag.id) ? current.filter((id) => id !== tag.id) : [...current, tag.id]
                  )
                }
              />
              <span style={{ '--tag-color': tag.color } as React.CSSProperties}>{tag.name}</span>
            </label>
          ))}
        </fieldset>
      )}
      <label className="field">
        <span>备注</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="结果、上下文或中断原因（可选）"
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary block" disabled={busy}>
        {busy ? '保存中…' : '保存记录'}
      </button>
    </form>
  );
}
