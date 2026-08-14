import { Cloud, Download, LogOut, RefreshCw, Smartphone, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { CATEGORIES } from '../constants';
import { cloudConfigured } from '../data/cloud';
import { useAppStore } from '../store/appStore';
import type { BackupV2 } from '../types';
import { Modal } from './Modal';

const backupLabels = {
  local: '仅保存在本机',
  pending: '等待云备份',
  syncing: '正在备份',
  synced: '云备份已同步',
  offline: '离线，稍后自动备份',
  error: '云备份异常',
  conflict: '需要选择保留的数据'
};

function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function backupFilename(extension: string) {
  return `shiheng-v2-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function toCsv(backup: BackupV2) {
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = backup.entries
    .filter((entry) => !entry.deletedAt)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .map((entry) =>
      [
        entry.dateKey,
        entry.title,
        CATEGORIES.find((item) => item.key === entry.categoryKey)?.label,
        Math.round(entry.durationSeconds / 60),
        entry.note,
        entry.source
      ]
        .map(escape)
        .join(',')
    );
  return `\uFEFF日期,活动,分类,分钟,备注,来源\n${rows.join('\n')}`;
}

export function SettingsSheet({
  installPrompt,
  updateAvailable,
  applyUpdate,
  onClose
}: {
  installPrompt: BeforeInstallPromptEvent | null;
  updateAvailable: boolean;
  applyUpdate: () => void;
  onClose: () => void;
}) {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const session = useAppStore((state) => state.session);
  const backupStatus = useAppStore((state) => state.backupStatus);
  const conflict = useAppStore((state) => state.cloudConflict);
  const login = useAppStore((state) => state.login);
  const logout = useAppStore((state) => state.logout);
  const sync = useAppStore((state) => state.syncCloud);
  const resolveConflict = useAppStore((state) => state.resolveCloudConflict);
  const exportBackup = useAppStore((state) => state.exportBackup);
  const importBackup = useAppStore((state) => state.importBackup);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  const doLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      setPassword('');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message.toLowerCase() : '';
      setError(
        message.includes('invalid login credentials') ? '邮箱或密码不正确' : '连接失败，请检查网络后重试'
      );
    } finally {
      setBusy(false);
    }
  };

  const exportJson = async () =>
    download(JSON.stringify(await exportBackup(), null, 2), backupFilename('json'), 'application/json');
  const exportCsv = async () =>
    download(toCsv(await exportBackup()), backupFilename('csv'), 'text/csv;charset=utf-8');

  const importFile = async (file?: File) => {
    if (!file) return;
    if (!window.confirm('导入将替换当前 v2 本地账本，是否继续？')) return;
    setBusy(true);
    try {
      await importBackup(JSON.parse(await file.text()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '导入失败');
    } finally {
      setBusy(false);
      if (importRef.current) importRef.current.value = '';
    }
  };

  return (
    <Modal title="设置" onClose={onClose}>
      <div className="settings-stack">
        <section className="settings-section">
          <h3>显示与计时</h3>
          <label className="field">
            <span>主题</span>
            <select
              value={settings.theme}
              onChange={(event) =>
                void updateSettings({ theme: event.target.value as typeof settings.theme })
              }
            >
              <option value="system">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </label>
          <label className="field">
            <span>统计时区</span>
            <select
              value={settings.timezone}
              onChange={(event) => void updateSettings({ timezone: event.target.value })}
            >
              <option value="Asia/Shanghai">中国标准时间</option>
              <option value="Asia/Tokyo">东京</option>
              <option value="Europe/London">伦敦</option>
              <option value="America/New_York">纽约</option>
              <option value="UTC">UTC</option>
            </select>
          </label>
          <label className="field">
            <span>超长计时提醒（分钟）</span>
            <input
              type="number"
              min="15"
              max="1440"
              value={settings.timerWarningMinutes}
              onChange={(event) => void updateSettings({ timerWarningMinutes: Number(event.target.value) })}
            />
          </label>
        </section>

        <section className="settings-section">
          <div className="settings-title-row">
            <div>
              <h3>云备份</h3>
              <p className={`backup-state ${backupStatus}`}>{backupLabels[backupStatus]}</p>
            </div>
            <Cloud size={21} />
          </div>
          {!cloudConfigured ? (
            <p className="settings-note">部署环境尚未配置 Supabase，当前仅保存在本机。</p>
          ) : session ? (
            <>
              <p className="settings-note">已连接 {session.email}。退出不会删除本机记录。</p>
              <div className="button-grid">
                <button
                  className="button secondary"
                  onClick={() => void sync()}
                  disabled={backupStatus === 'syncing'}
                >
                  <RefreshCw size={16} />
                  立即备份
                </button>
                <button className="button ghost" onClick={() => void logout()}>
                  <LogOut size={16} />
                  退出云备份
                </button>
              </div>
            </>
          ) : (
            <form className="form-stack" onSubmit={(event) => void doLogin(event)}>
              <p className="settings-note">登录只用于备份；不登录也可以完整离线使用。</p>
              <label className="field">
                <span>邮箱</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>密码</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <button className="button primary block" disabled={busy}>
                {busy ? '连接中…' : '连接云备份'}
              </button>
            </form>
          )}
          {conflict && (
            <div className="conflict-card" role="alert">
              <strong>{conflict.reason === 'restore' ? '发现可恢复的云备份' : '本机与云端均有新改动'}</strong>
              <p>云端备份时间：{new Date(conflict.remote.exportedAt).toLocaleString('zh-CN')}</p>
              <button className="button primary block" onClick={() => void resolveConflict('restore')}>
                恢复云端数据
              </button>
              <button className="button secondary block" onClick={() => void resolveConflict('replace')}>
                用本机数据替换云端
              </button>
              <button className="button ghost block" onClick={() => void exportJson()}>
                先导出本机 JSON
              </button>
            </div>
          )}
        </section>

        <section className="settings-section">
          <h3>数据管理</h3>
          <div className="button-grid">
            <button className="button secondary" onClick={() => void exportJson()}>
              <Download size={16} />
              JSON 备份
            </button>
            <button className="button secondary" onClick={() => void exportCsv()}>
              <Download size={16} />
              CSV 明细
            </button>
            <button className="button secondary" onClick={() => importRef.current?.click()}>
              <Upload size={16} />
              导入 JSON
            </button>
          </div>
          <input
            ref={importRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void importFile(event.target.files?.[0])}
          />
        </section>

        <section className="settings-section">
          <h3>应用</h3>
          {installPrompt && (
            <button className="button primary block" onClick={() => void installPrompt.prompt()}>
              <Smartphone size={17} />
              安装到主屏幕
            </button>
          )}
          {updateAvailable && (
            <button className="button secondary block" onClick={applyUpdate}>
              <RefreshCw size={17} />
              立即更新
            </button>
          )}
          {!installPrompt && !updateAvailable && (
            <p className="settings-note">应用已是最新版本。可通过浏览器菜单安装到主屏幕。</p>
          )}
          <p className="version-line">时衡 v2.0 · IndexedDB shiheng-v2</p>
        </section>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
