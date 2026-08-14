import { BarChart3, CalendarDays, Clock3, NotebookPen, Settings } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { cloudConfigured } from '../data/supabase';
import { useAppStore } from '../store/appStore';
import { Logo } from './Logo';

const nav = [
  { to: '/today', label: '今日', icon: Clock3 },
  { to: '/timeline', label: '时间轴', icon: CalendarDays },
  { to: '/insights', label: '洞察', icon: BarChart3 },
  { to: '/review', label: '计划复盘', icon: NotebookPen },
  { to: '/settings', label: '设置', icon: Settings }
];

function SyncChip() {
  const status = useAppStore((state) => state.syncStatus);
  const conflicts = useAppStore((state) => state.conflicts.length);
  const labels = {
    local: cloudConfigured ? '待同步' : '仅本机',
    idle: '已同步',
    syncing: '同步中',
    offline: '离线',
    error: '同步异常'
  };
  return <span className={`sync-chip ${status}`}>{conflicts ? `${conflicts} 个冲突` : labels[status]}</span>;
}

export function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <nav aria-label="主导航">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon aria-hidden="true" size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <SyncChip />
        </div>
      </aside>
      <div className="content-shell">
        <header className="mobile-header">
          <Logo />
          <SyncChip />
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav" aria-label="主导航">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon aria-hidden="true" size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
