import { createContext, useContext } from 'react';
import type { TimeEntryV2 } from '../types';

export type ShellContextValue = {
  openEntry: (entry?: TimeEntryV2) => void;
  openSettings: () => void;
};

export const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell() {
  const value = useContext(ShellContext);
  if (!value) throw new Error('Shell context is unavailable');
  return value;
}
