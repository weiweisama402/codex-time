import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { cloudConfigured, currentSession, supabase } from './data/supabase';
import { LOCAL_USER_ID } from './constants';
import { useAppStore } from './store/appStore';
import { AppLayout } from './components/AppLayout';
import { AuthPage } from './pages/AuthPage';
import { Onboarding } from './components/Onboarding';

const TodayPage = lazy(() => import('./pages/TodayPage').then((module) => ({ default: module.TodayPage })));
const TimelinePage = lazy(() =>
  import('./pages/TimelinePage').then((module) => ({ default: module.TimelinePage }))
);
const InsightsPage = lazy(() =>
  import('./pages/InsightsPage').then((module) => ({ default: module.InsightsPage }))
);
const ReviewPage = lazy(() =>
  import('./pages/ReviewPage').then((module) => ({ default: module.ReviewPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage }))
);

function PwaUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="update-banner" role="status">
      <span>新版本已准备好</span>
      <button className="button small" onClick={() => void updateServiceWorker(true)}>
        立即更新
      </button>
    </div>
  );
}

function SessionGate({ children }: { children: (userId: string) => ReactNode }) {
  const [loading, setLoading] = useState(cloudConfigured);
  const [userId, setUserId] = useState<string | null>(cloudConfigured ? null : LOCAL_USER_ID);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    void currentSession().then((session) => {
      setUserId(session?.user.id ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUserId(session?.user.id ?? null)
    );
    return () => data.subscription.unsubscribe();
  }, []);

  if (loading)
    return (
      <div className="app-loading">
        <div className="loader" />
        <p>正在校准时间…</p>
      </div>
    );
  if (!userId) return <AuthPage />;
  return children(userId);
}

function Workspace({ userId }: { userId: string }) {
  const initialize = useAppStore((state) => state.initialize);
  const hydrated = useAppStore((state) => state.hydrated);
  const settings = useAppStore((state) => state.settings);
  const runSync = useAppStore((state) => state.runSync);

  useEffect(() => {
    void initialize(userId);
  }, [initialize, userId]);

  useEffect(() => {
    const sync = () => void runSync();
    window.addEventListener('online', sync);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [runSync]);

  if (!hydrated || !settings)
    return (
      <div className="app-loading">
        <div className="loader" />
        <p>正在读取时间账本…</p>
      </div>
    );
  return (
    <>
      {!settings.onboardingComplete && <Onboarding />}
      <HashRouter>
        <Suspense fallback={<div className="page-loader">正在打开页面…</div>}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/today" element={<TodayPage />} />
              <Route path="/timeline" element={<TimelinePage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/today" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    </>
  );
}

export function App() {
  return (
    <>
      <SessionGate>{(userId) => <Workspace userId={userId} />}</SessionGate>
      <PwaUpdate />
    </>
  );
}
