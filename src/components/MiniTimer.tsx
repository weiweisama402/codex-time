import { Pause, Play, Square } from 'lucide-react';
import { useTimerNow } from '../hooks/useTimerNow';
import { activeTimerSeconds, formatClock } from '../lib/duration';
import { useAppStore } from '../store/appStore';

export function MiniTimer() {
  const timer = useAppStore((state) => state.timer)!;
  const pause = useAppStore((state) => state.pauseTimer);
  const resume = useAppStore((state) => state.resumeTimer);
  const stop = useAppStore((state) => state.stopTimer);
  const now = useTimerNow(timer.status === 'running');
  const displayNow = now || new Date(timer.updatedAt).getTime();

  return (
    <aside className="mini-timer" aria-label="进行中的计时">
      <span className="live-dot" />
      <div>
        <strong>{timer.title}</strong>
        <span>{formatClock(activeTimerSeconds(timer, displayNow))}</span>
      </div>
      <button
        className="icon-button"
        onClick={() => void (timer.status === 'running' ? pause() : resume())}
        aria-label={timer.status === 'running' ? '暂停' : '继续'}
      >
        {timer.status === 'running' ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <button className="icon-button primary-icon" onClick={() => void stop()} aria-label="完成记录">
        <Square size={16} />
      </button>
    </aside>
  );
}
