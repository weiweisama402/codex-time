import Dexie, { type EntityTable } from 'dexie';
import type { ActiveTimerV2, MetaRecord, MobileSettingsV2, TimeEntryV2 } from '../types';

export class ShihengV2Database extends Dexie {
  entries!: EntityTable<TimeEntryV2, 'id'>;
  timers!: EntityTable<ActiveTimerV2, 'id'>;
  settings!: EntityTable<MobileSettingsV2, 'id'>;
  meta!: EntityTable<MetaRecord, 'key'>;

  constructor(name = 'shiheng-v2') {
    super(name);
    this.version(1).stores({
      entries: 'id, dateKey, updatedAt, deletedAt',
      timers: 'id',
      settings: 'id',
      meta: 'key'
    });
  }
}

export const db = new ShihengV2Database();
