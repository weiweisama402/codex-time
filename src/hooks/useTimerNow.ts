import { useEffect, useState } from 'react';

export function useTimerNow(running: boolean) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [running]);

  return now;
}
