import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SummaryCards } from './SummaryCards';
import type { TimeEntry } from '../types';

describe('SummaryCards', () => {
  it('shows effective and total durations', () => {
    const entry = {
      id: '00000000-0000-4000-8000-000000000010',
      userId: '00000000-0000-4000-8000-000000000001',
      version: 0,
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
      dateKey: '2026-08-14',
      startedAt: null,
      endedAt: null,
      durationSeconds: 3600,
      categoryKey: 'main',
      projectId: null,
      taskId: null,
      tagIds: [],
      title: '研究',
      note: '',
      source: 'manual'
    } satisfies TimeEntry;
    render(<SummaryCards entries={[entry]} />);
    expect(screen.getByText('有效时间').parentElement).toHaveTextContent('1h');
    expect(screen.getByText('总记录').parentElement).toHaveTextContent('1h');
  });
});
