import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { isDesktopOnly } from './lib/device';
import { MobileShell } from './components/MobileShell';
import { RecordsPage } from './pages/RecordsPage';
import { StatsPage } from './pages/StatsPage';
import { TodayPage } from './pages/TodayPage';
import { useAppStore } from './store/appStore';

const DesktopOnly = lazy(() =>
  import('./components/DesktopOnly').then((module) => ({ default: module.DesktopOnly }))
);

export function App() {
  const hydrated = useAppStore((state) => state.hydrated);
  const initialize = useAppStore((state) => state.initialize);
  const syncCloud = useAppStore((state) => state.syncCloud);
  const initialized = useRef(false);
  const [desktop, setDesktop] = useState(isDesktopOnly);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker
  } = useRegisterSW();

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      void initialize();
    }
    const media = window.matchMedia('(min-width: 768px) and (pointer: fine)');
    const onMedia = () => setDesktop(media.matches);
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onSync = () => void syncCloud();
    const onVisibility = () => document.visibilityState === 'visible' && onSync();
    media.addEventListener('change', onMedia);
    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('online', onSync);
    window.addEventListener('focus', onSync);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      media.removeEventListener('change', onMedia);
      window.removeEventListener('beforeinstallprompt', onInstall);
      window.removeEventListener('online', onSync);
      window.removeEventListener('focus', onSync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [initialize, syncCloud]);

  if (!hydrated)
    return (
      <main className="app-loading">
        <div className="loader" />
        <p>正在打开时间账本…</p>
      </main>
    );
  if (desktop)
    return (
      <Suspense fallback={<main className="app-loading" />}>
        <DesktopOnly />
      </Suspense>
    );

  return (
    <HashRouter>
      <Routes>
        <Route
          element={
            <MobileShell
              installPrompt={installPrompt}
              updateAvailable={needRefresh}
              applyUpdate={() => void updateServiceWorker(true)}
            />
          }
        >
          <Route path="/today" element={<TodayPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
