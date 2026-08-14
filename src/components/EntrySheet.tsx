import { useState } from 'react';
import { CATEGORIES } from '../constants';
import { todayKey } from '../lib/date';
import { useAppStore } from '../store/appStore';
import type { CategoryKey, TimeEntryV2 } from '../types';
import { Modal } from './Modal';

export function EntrySheet({ entry, onClose }: { entry?: TimeEntryV2; onClose: () => void }) {
  const settings = useAppStore((state) => state.settings);
  const saveEntry = useAppStore((state) => state.saveEntry);
  const [title, setTitle] = useState(entry?.title ?? '');
  const [date, setDate] = useState(entry?.dateKey ?? todayKey(settings.timezone));
  const [categoryKey, setCategoryKey] = useState<CategoryKey>(entry?.categoryKey ?? 'main');
  const [minutes, setMinutes] = useState(
    entry ? String(Math.max(1, Math.round(entry.durationSeconds / 60))) : '30'
  );
  const [note, setNote] = useState(entry?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await saveEntry({ id: entry?.id, title, dateKey: date, categoryKey, minutes: Number(minutes), note });
      if (window.history.state?.shihengSheet) window.history.back();
      else onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败');
      setBusy(false);
    }
  };

  return (
    <Modal title={entry ? '编辑记录' : '补录净时间'} onClose={onClose}>
      <form className="form-stack" onSubmit={(event) => void submit(event)}>
        <label className="field">
          <span>做了什么</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            autoFocus
            required
          />
        </label>
        <fieldset className="category-picker">
          <legend>时间分类</legend>
          {CATEGORIES.map((category) => (
            <label key={category.key} style={{ '--category-color': category.color } as React.CSSProperties}>
              <input
                type="radio"
                name="entry-category"
                checked={categoryKey === category.key}
                onChange={() => setCategoryKey(category.key)}
              />
              <span>{category.shortLabel}</span>
            </label>
          ))}
        </fieldset>
        <div className="form-row">
          <label className="field">
            <span>日期</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </label>
          <label className="field">
            <span>净时长（分钟）</span>
            <input
              type="number"
              min="1"
              max="10080"
              inputMode="numeric"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              required
            />
          </label>
        </div>
        <label className="field">
          <span>备注（可选）</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            rows={3}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary block large" disabled={busy}>
          {busy ? '保存中…' : '保存记录'}
        </button>
      </form>
    </Modal>
  );
}
