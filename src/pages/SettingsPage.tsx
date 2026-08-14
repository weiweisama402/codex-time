import {
  AlertTriangle,
  Cloud,
  Database,
  Download,
  LogOut,
  Plus,
  RefreshCw,
  RotateCcw,
  Upload
} from 'lucide-react';
import { useRef, useState } from 'react';
import { CATEGORIES } from '../constants';
import { cloudConfigured, signOut } from '../data/supabase';
import { useAppStore } from '../store/appStore';
import type { CategoryKey } from '../types';

function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function SettingsPage() {
  const state = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [projectName, setProjectName] = useState('');
  const [projectCategory, setProjectCategory] = useState<CategoryKey>('main');
  const [projectColor, setProjectColor] = useState('#315c87');
  const [taskName, setTaskName] = useState('');
  const [taskProject, setTaskProject] = useState('');
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#2f7d6d');
  const [presetName, setPresetName] = useState('');
  const [presetProject, setPresetProject] = useState('');
  const [message, setMessage] = useState('');
  const activeProjects = state.projects.filter((project) => !project.deletedAt && !project.archivedAt);
  const trash = state.entries
    .filter((entry) => entry.deletedAt)
    .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));

  const exportJson = async () => {
    const text = await state.exportBackup();
    downloadFile(`shiheng-backup-${new Date().toISOString().slice(0, 10)}.json`, text, 'application/json');
    setMessage('JSON 备份已导出');
  };
  const exportCsv = () => {
    const rows = [
      ['日期', '开始', '结束', '时长(秒)', '分类', '项目', '标题', '备注'],
      ...state.entries
        .filter((entry) => !entry.deletedAt)
        .map((entry) => [
          entry.dateKey,
          entry.startedAt ?? '',
          entry.endedAt ?? '',
          String(entry.durationSeconds),
          entry.categoryKey,
          state.projects.find((project) => project.id === entry.projectId)?.name ?? '',
          entry.title,
          entry.note
        ])
    ];
    const csv =
      '\uFEFF' +
      rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    downloadFile(
      `shiheng-records-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      'text/csv;charset=utf-8'
    );
    setMessage('CSV 已导出');
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const value = JSON.parse(await file.text());
      if (!window.confirm('导入会替换当前账号的本地数据，是否继续？')) return;
      await state.importBackup(value);
      setMessage('备份导入成功');
    } catch (error) {
      setMessage(error instanceof Error ? `导入失败：${error.message}` : '导入失败');
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>设置</h1>
          <p>管理研究结构、同步状态与数据安全。</p>
        </div>
      </header>
      {message && (
        <div className="inline-success" role="status">
          {message}
          <button onClick={() => setMessage('')}>关闭</button>
        </div>
      )}
      <div className="settings-grid">
        <section className="settings-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Projects</p>
              <h2>项目与任务</h2>
            </div>
            <span>{activeProjects.length} 个项目</span>
          </div>
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              void state
                .addProject({ name: projectName, categoryKey: projectCategory, color: projectColor })
                .then(() => setProjectName(''));
            }}
          >
            <input
              required
              placeholder="新项目名称"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
            />
            <select
              value={projectCategory}
              onChange={(event) => setProjectCategory(event.target.value as CategoryKey)}
            >
              {CATEGORIES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
            <input
              className="color-input"
              type="color"
              value={projectColor}
              onChange={(event) => setProjectColor(event.target.value)}
            />
            <button className="button secondary" aria-label="添加项目">
              <Plus size={18} />
            </button>
          </form>
          <div className="management-list">
            {activeProjects.map((project) => (
              <div key={project.id}>
                <i style={{ background: project.color }} />
                <span>
                  <strong>{project.name}</strong>
                  <small>{CATEGORIES.find((item) => item.key === project.categoryKey)?.label}</small>
                </span>
              </div>
            ))}
          </div>
          <form
            className="inline-form two"
            onSubmit={(event) => {
              event.preventDefault();
              void state.addTask(taskProject, taskName).then(() => setTaskName(''));
            }}
          >
            <select required value={taskProject} onChange={(event) => setTaskProject(event.target.value)}>
              <option value="">选择项目</option>
              {activeProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="项目内任务"
              value={taskName}
              onChange={(event) => setTaskName(event.target.value)}
            />
            <button className="button secondary">添加任务</button>
          </form>
        </section>
        <section className="settings-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Tags & presets</p>
              <h2>标签与快捷预设</h2>
            </div>
          </div>
          <form
            className="inline-form two"
            onSubmit={(event) => {
              event.preventDefault();
              void state.addTag(tagName, tagColor).then(() => setTagName(''));
            }}
          >
            <input
              required
              placeholder="标签名称"
              value={tagName}
              onChange={(event) => setTagName(event.target.value)}
            />
            <input
              className="color-input"
              type="color"
              value={tagColor}
              onChange={(event) => setTagColor(event.target.value)}
            />
            <button className="button secondary">添加标签</button>
          </form>
          <div className="chip-list">
            {state.tags
              .filter((tag) => !tag.deletedAt)
              .map((tag) => (
                <span key={tag.id} style={{ '--chip-color': tag.color } as React.CSSProperties}>
                  {tag.name}
                </span>
              ))}
          </div>
          <form
            className="inline-form two"
            onSubmit={(event) => {
              event.preventDefault();
              const project = activeProjects.find((item) => item.id === presetProject);
              void state
                .addPreset({
                  name: presetName,
                  title: presetName,
                  categoryKey: project?.categoryKey ?? 'main',
                  projectId: presetProject || null,
                  taskId: null,
                  tagIds: [],
                  color: project?.color ?? '#315c87'
                })
                .then(() => setPresetName(''));
            }}
          >
            <input
              required
              placeholder="快捷预设名称"
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
            />
            <select value={presetProject} onChange={(event) => setPresetProject(event.target.value)}>
              <option value="">不指定项目</option>
              {activeProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button className="button secondary">添加预设</button>
          </form>
        </section>
        <section className="settings-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Preferences</p>
              <h2>显示与时间规则</h2>
            </div>
          </div>
          <div className="form-stack">
            <label className="field">
              <span>主题</span>
              <select
                value={state.settings?.theme}
                onChange={(event) =>
                  void state.updateSettings({ theme: event.target.value as 'system' | 'light' | 'dark' })
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
                value={state.settings?.timezone}
                onChange={(event) => void state.updateSettings({ timezone: event.target.value })}
              >
                <option value="Asia/Shanghai">Asia/Shanghai（中国标准时间）</option>
                <option value="UTC">UTC</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
              </select>
            </label>
            <label className="field">
              <span>超长计时提醒（分钟）</span>
              <input
                type="number"
                min="30"
                value={state.settings?.timerWarningMinutes}
                onChange={(event) =>
                  void state.updateSettings({ timerWarningMinutes: Number(event.target.value) })
                }
              />
            </label>
          </div>
        </section>
        <section className="settings-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Sync</p>
              <h2>跨设备同步</h2>
            </div>
            <Cloud />
          </div>
          <div className="sync-overview">
            <strong>
              {cloudConfigured
                ? {
                    idle: '数据已同步',
                    syncing: '正在同步',
                    offline: '当前离线',
                    error: '同步异常',
                    local: '有本地改动'
                  }[state.syncStatus]
                : '本地演示模式'}
            </strong>
            <p>
              {cloudConfigured
                ? '数据先安全写入本机，再同步到个人 Supabase 项目。'
                : '配置 Supabase URL 与匿名公钥后启用邮箱验证码和自动同步。'}
            </p>
            {state.syncError && <p className="form-error">{state.syncError}</p>}
            <button
              className="button secondary"
              onClick={() => void state.runSync()}
              disabled={!cloudConfigured}
            >
              <RefreshCw size={17} />
              立即同步
            </button>
          </div>
          {state.conflicts.length > 0 && (
            <div className="conflict-list">
              <h3>
                <AlertTriangle />
                同步冲突
              </h3>
              {state.conflicts.map((conflict) => (
                <div key={conflict.id}>
                  <span>
                    {conflict.entityType} · {conflict.entityId.slice(0, 8)}
                  </span>
                  <button onClick={() => void state.resolveConflict(conflict, 'local')}>保留本地</button>
                  <button onClick={() => void state.resolveConflict(conflict, 'remote')}>使用云端</button>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="settings-card wide">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Data safety</p>
              <h2>备份与迁移</h2>
            </div>
            <Database />
          </div>
          <p className="muted">
            JSON 用于完整恢复，CSV 用于 Origin、Excel
            或其他统计工具。导入采用本地事务，校验失败不会清除现有数据。
          </p>
          <div className="button-row">
            <button className="button primary" onClick={() => void exportJson()}>
              <Download size={17} />
              导出 JSON
            </button>
            <button className="button secondary" onClick={exportCsv}>
              <Download size={17} />
              导出 CSV
            </button>
            <button className="button secondary" onClick={() => inputRef.current?.click()}>
              <Upload size={17} />
              导入 JSON
            </button>
            <input
              ref={inputRef}
              hidden
              type="file"
              accept="application/json,.json"
              onChange={(event) => void importFile(event.target.files?.[0])}
            />
          </div>
          <p className="hint">
            上次备份：
            {state.settings?.lastBackupAt
              ? new Date(state.settings.lastBackupAt).toLocaleString('zh-CN')
              : '尚未备份'}
          </p>
        </section>
        <section className="settings-card wide">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Recycle bin</p>
              <h2>30 天回收站</h2>
            </div>
            <span>{trash.length} 条</span>
          </div>
          {trash.length ? (
            <div className="trash-list">
              {trash.map((entry) => (
                <div key={entry.id}>
                  <span>
                    <strong>{entry.title}</strong>
                    <small>
                      {entry.dateKey} · 删除于{' '}
                      {entry.deletedAt ? new Date(entry.deletedAt).toLocaleDateString('zh-CN') : ''}
                    </small>
                  </span>
                  <button className="button ghost small" onClick={() => void state.restoreEntry(entry.id)}>
                    <RotateCcw size={15} />
                    恢复
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">回收站为空。已删除记录会在本地保留 30 天。</p>
          )}
        </section>
      </div>
      <footer className="settings-footer">
        <span>时衡 v1.0.0 · IndexedDB shiheng-v1</span>
        {cloudConfigured && (
          <button className="button ghost" onClick={() => void signOut()}>
            <LogOut size={17} />
            退出登录
          </button>
        )}
      </footer>
    </>
  );
}
