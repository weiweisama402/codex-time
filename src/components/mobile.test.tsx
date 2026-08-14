import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../constants';
import { makeEntry, makeTimer } from '../test/factories';
import { useAppStore } from '../store/appStore';
import { EntrySheet } from './EntrySheet';
import { MiniTimer } from './MiniTimer';
import { TimerPanel } from './TimerPanel';

describe('mobile time capture components', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    useAppStore.setState({
      entries: [],
      timer: null,
      settings: DEFAULT_SETTINGS(),
      notice: '',
      undo: null
    });
  });

  it('starts a timer from the large today form', async () => {
    const user = userEvent.setup();
    const startTimer = vi.fn().mockResolvedValue(undefined);
    useAppStore.setState({ startTimer });
    render(<TimerPanel />);

    await user.type(screen.getByLabelText('正在做什么'), '分析 Ti6Al4V 数据');
    await user.click(screen.getByText('附加', { selector: 'span' }));
    await user.click(screen.getByRole('button', { name: '开始计时' }));
    expect(startTimer).toHaveBeenCalledWith('分析 Ti6Al4V 数据', 'extra');
  });

  it('shows and controls a persisted mini timer', async () => {
    const user = userEvent.setup();
    const resumeTimer = vi.fn().mockResolvedValue(undefined);
    const stopTimer = vi.fn().mockResolvedValue(undefined);
    useAppStore.setState({
      timer: makeTimer({ status: 'paused', runningSince: null, accumulatedSeconds: 125 }),
      resumeTimer,
      stopTimer
    });
    render(<MiniTimer />);
    expect(screen.getByText('00:02:05')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '继续' }));
    await user.click(screen.getByRole('button', { name: '完成记录' }));
    expect(resumeTimer).toHaveBeenCalledOnce();
    expect(stopTimer).toHaveBeenCalledOnce();
  });

  it('submits a net-duration entry and closes through browser history', async () => {
    const user = userEvent.setup();
    const saveEntry = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    useAppStore.setState({ saveEntry });
    render(<EntrySheet onClose={onClose} />);

    await user.type(screen.getByLabelText('做了什么'), '撰写论文方法部分');
    const minutes = screen.getByLabelText('净时长（分钟）');
    await user.clear(minutes);
    await user.type(minutes, '45');
    await user.click(screen.getByRole('button', { name: '保存记录' }));

    await waitFor(() => expect(saveEntry).toHaveBeenCalled());
    expect(saveEntry).toHaveBeenCalledWith(
      expect.objectContaining({ title: '撰写论文方法部分', minutes: 45, categoryKey: 'main' })
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('loads existing entry values for editing', () => {
    const entry = makeEntry({ title: '已有记录', durationSeconds: 5400, note: '检查数据质量' });
    render(<EntrySheet entry={entry} onClose={() => undefined} />);
    expect(screen.getByDisplayValue('已有记录')).toBeInTheDocument();
    expect(screen.getByDisplayValue('90')).toBeInTheDocument();
    expect(screen.getByDisplayValue('检查数据质量')).toBeInTheDocument();
  });
});
