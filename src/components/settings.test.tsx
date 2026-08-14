import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../data/cloud', () => ({
  cloudConfigured: true,
  currentSession: vi.fn().mockResolvedValue(null),
  fetchCloudBackup: vi.fn().mockResolvedValue(null),
  insertCloudBackup: vi.fn(),
  signInWithPassword: vi.fn(),
  signOutCloud: vi.fn(),
  supabase: null,
  updateCloudBackup: vi.fn()
}));

import { DEFAULT_SETTINGS } from '../constants';
import { useAppStore } from '../store/appStore';
import { makeBackup } from '../test/factories';
import { SettingsSheet } from './SettingsSheet';

describe('cloud backup settings', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    useAppStore.setState({
      settings: DEFAULT_SETTINGS(),
      session: null,
      backupStatus: 'local',
      cloudConflict: null,
      notice: ''
    });
  });

  it('uses email and password only for optional cloud backup', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue(undefined);
    useAppStore.setState({ login });
    render(
      <SettingsSheet
        installPrompt={null}
        updateAvailable={false}
        applyUpdate={() => undefined}
        onClose={() => undefined}
      />
    );
    await user.type(screen.getByLabelText('邮箱'), 'wei542439@gmail.com');
    await user.type(screen.getByLabelText('密码'), 'secret-password');
    await user.click(screen.getByRole('button', { name: '连接云备份' }));
    expect(login).toHaveBeenCalledWith('wei542439@gmail.com', 'secret-password');
  });

  it('stops on revision conflict and offers explicit resolution choices', async () => {
    const user = userEvent.setup();
    const resolveCloudConflict = vi.fn().mockResolvedValue(undefined);
    useAppStore.setState({
      cloudConflict: { reason: 'diverged', remote: makeBackup({ revision: 3 }) },
      backupStatus: 'conflict',
      resolveCloudConflict
    });
    render(
      <SettingsSheet
        installPrompt={null}
        updateAvailable={false}
        applyUpdate={() => undefined}
        onClose={() => undefined}
      />
    );
    expect(screen.getByText('本机与云端均有新改动')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '恢复云端数据' }));
    expect(resolveCloudConflict).toHaveBeenCalledWith('restore');
  });
});
