import { AlertTriangle, Plus, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EntryCard } from '../components/EntryCard';
import { EntryForm } from '../components/EntryForm';
import { Modal } from '../components/Modal';
import { SummaryCards } from '../components/SummaryCards';
import { TimerCard } from '../components/TimerCard';
import { formatDateLabel, todayKey } from '../lib/date';
import { hasOverlap } from '../lib/stats';
import { useAppStore } from '../store/appStore';
import type { TimeEntry } from '../types';

export function TodayPage() {
  const entries = useAppStore((state) => state.entries);
  const settings = useAppStore((state) => state.settings)!;
  const reviews = useAppStore((state) => state.reviews);
  const [modal, setModal] = useState<{ type: 'add' | 'edit'; entry?: TimeEntry } | null>(null);
  const today = todayKey(settings.timezone);
  const todayEntries = useMemo(
    () =>
      entries
        .filter((entry) => !entry.deletedAt && entry.dateKey === today)
        .sort((a, b) => (b.startedAt ?? b.createdAt).localeCompare(a.startedAt ?? a.createdAt)),
    [entries, today]
  );
  const overlapCount = todayEntries.filter((entry) => hasOverlap(entry, todayEntries)).length;
  const reviewed = reviews.some(
    (review) => !review.deletedAt && review.periodType === 'day' && review.periodStart === today
  );
  const backupAge = settings.lastBackupAt
    ? Math.max(
        0,
        Math.floor((Date.parse(`${today}T00:00:00`) - Date.parse(settings.lastBackupAt)) / 86400000)
      )
    : null;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{formatDateLabel(today)}</p>
          <h1>今日时间账本</h1>
          <p>记录事实，再让数据帮助你校准计划。</p>
        </div>
        <button className="button secondary" onClick={() => setModal({ type: 'add' })}>
          <Plus size={18} />
          补录时间
        </button>
      </header>
      <TimerCard />
      <SummaryCards entries={todayEntries} />
      {(overlapCount > 0 || !reviewed || backupAge === null || backupAge >= 7) && (
        <section className="attention-panel" aria-label="智能提醒">
          {overlapCount > 0 && (
            <div>
              <AlertTriangle />
              <span>
                <strong>发现 {overlapCount} 条时间重叠</strong>
                <small>请检查是否存在重复核算。</small>
              </span>
            </div>
          )}
          {!reviewed && (
            <div>
              <ShieldCheck />
              <span>
                <strong>今天尚未复盘</strong>
                <small>结束工作后记录成果与调整。</small>
              </span>
            </div>
          )}
          {(backupAge === null || backupAge >= 7) && (
            <div>
              <ShieldCheck />
              <span>
                <strong>{backupAge === null ? '尚未创建本地备份' : `距上次备份 ${backupAge} 天`}</strong>
                <small>可在设置中导出 JSON。</small>
              </span>
            </div>
          )}
        </section>
      )}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Daily ledger</p>
            <h2>今日记录</h2>
          </div>
          <span>{todayEntries.length} 条</span>
        </div>
        {todayEntries.length ? (
          <div className="entry-list">
            {todayEntries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} onEdit={() => setModal({ type: 'edit', entry })} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <ClockIllustration />
            <h3>今天还没有记录</h3>
            <p>开始一次计时，或补录已经完成的工作。</p>
            <button className="button secondary" onClick={() => setModal({ type: 'add' })}>
              添加第一条记录
            </button>
          </div>
        )}
      </section>
      {modal && (
        <Modal title={modal.type === 'edit' ? '编辑时间记录' : '补录时间'} onClose={() => setModal(null)}>
          <EntryForm entry={modal.entry} initialDate={today} onSaved={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}

function ClockIllustration() {
  return (
    <svg className="empty-illustration" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="42" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M60 34v27l18 11" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M28 101h64" stroke="var(--accent-2)" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
