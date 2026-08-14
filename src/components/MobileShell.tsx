import { BarChart3, Clock3, History, Plus, Settings } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { EntrySheet } from './EntrySheet';
import { MiniTimer } from './MiniTimer';
import { useAppStore } from '../store/appStore';
import type { TimeEntryV2 } from '../types';
import { ShellContext, type ShellContextValue } from './shellContext';

const SettingsSheet = lazy(() =>
  import('./SettingsSheet').then((module) => ({ default: module.SettingsSheet }))
);

const navigation = [
  { to: '/today', label: '今日', icon: Clock3 },
  { to: '/records', label: '记录', icon: History },
  { to: '/stats', label: '统计', icon: BarChart3 }
];

const titles: Record<string, string> = { '/today': '今日', '/records': '记录', '/stats': '统计' };

export function MobileShell({
  installPrompt,
  updateAvailable,
  applyUpdate
}: {
  installPrompt: BeforeInstallPromptEvent | null;
  updateAvailable: boolean;
  applyUpdate: () => void;
}) {
  const location = useLocation();
  const [entry, setEntry] = useState<TimeEntryV2 | 'new' | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const timer = useAppStore((state) => state.timer);
  const undo = useAppStore((state) => state.undo);
  const undoDelete = useAppStore((state) => state.undoDelete);
  const notice = useAppStore((state) => state.notice);
  const clearNotice = useAppStore((state) => state.clearNotice);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(clearNotice, 2500);
    return () => window.clearTimeout(timeout);
  }, [clearNotice, notice]);
  const context = useMemo<ShellContextValue>(
    () => ({ openEntry: (value) => setEntry(value ?? 'new'), openSettings: () => setSettingsOpen(true) }),
    []
  );

  return (
    <ShellContext.Provider value={context}>
      <div className="mobile-app">
        <header className="app-header">
          <Logo compact />
          <strong>{titles[location.pathname] ?? '时衡'}</strong>
          <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="打开设置">
            <Settings size={21} />
          </button>
        </header>
        <main
          className={`mobile-content ${timer && location.pathname !== '/today' ? 'with-mini-timer' : ''}`}
        >
          <Outlet />
        </main>
        {timer && location.pathname !== '/today' && <MiniTimer />}
        <nav className={`bottom-nav ${timer ? 'has-timer' : ''}`} aria-label="主导航">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon size={21} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
          <button className="quick-add" onClick={() => setEntry('new')} aria-label="补录时间">
            <Plus size={22} />
          </button>
        </nav>
        {entry && <EntrySheet entry={entry === 'new' ? undefined : entry} onClose={() => setEntry(null)} />}
        {settingsOpen && (
          <Suspense fallback={null}>
            <SettingsSheet
              installPrompt={installPrompt}
              updateAvailable={updateAvailable}
              applyUpdate={applyUpdate}
              onClose={() => setSettingsOpen(false)}
            />
          </Suspense>
        )}
        {undo && (
          <div className="snackbar" role="status">
            <span>已删除“{undo.title}”</span>
            <button onClick={() => void undoDelete()}>撤销</button>
          </div>
        )}
        {!undo && notice && (
          <div className="toast" role="status">
            {notice}
          </div>
        )}
      </div>
    </ShellContext.Provider>
  );
}
