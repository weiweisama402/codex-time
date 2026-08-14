import Dexie, { type Table } from 'dexie';
import type {
  ActiveTimer,
  EntityType,
  MetaRecord,
  OutboxMutation,
  Plan,
  Project,
  Review,
  SyncConflict,
  SyncedEntity,
  Tag,
  Task,
  TimeEntry,
  TimerPreset,
  UserSettings
} from '../types';

export class ShihengDatabase extends Dexie {
  projects!: Table<Project, string>;
  tasks!: Table<Task, string>;
  tags!: Table<Tag, string>;
  entries!: Table<TimeEntry, string>;
  timers!: Table<ActiveTimer, string>;
  presets!: Table<TimerPreset, string>;
  plans!: Table<Plan, string>;
  reviews!: Table<Review, string>;
  settings!: Table<UserSettings, string>;
  outbox!: Table<OutboxMutation, number>;
  conflicts!: Table<SyncConflict, string>;
  meta!: Table<MetaRecord, string>;

  constructor() {
    super('shiheng-v1');
    this.version(1).stores({
      projects: 'id,userId,categoryKey,archivedAt,updatedAt,deletedAt',
      tasks: 'id,userId,projectId,archivedAt,updatedAt,deletedAt',
      tags: 'id,userId,name,updatedAt,deletedAt',
      entries: 'id,userId,dateKey,categoryKey,projectId,taskId,updatedAt,deletedAt',
      timers: 'id,userId,status,updatedAt,deletedAt',
      presets: 'id,userId,sortOrder,updatedAt,deletedAt',
      plans: 'id,userId,[periodType+periodStart],scopeType,scopeId,updatedAt,deletedAt',
      reviews: 'id,userId,[periodType+periodStart],updatedAt,deletedAt',
      settings: 'id,userId,updatedAt',
      outbox: '++seq,userId,[entityType+entityId],createdAt',
      conflicts: 'id,userId,[entityType+entityId],createdAt',
      meta: 'key'
    });
  }
}

export const db = new ShihengDatabase();

export function tableFor(type: EntityType): Table<SyncedEntity, string> {
  const tables: Record<EntityType, Table<any, string>> = {
    project: db.projects,
    task: db.tasks,
    tag: db.tags,
    entry: db.entries,
    timer: db.timers,
    preset: db.presets,
    plan: db.plans,
    review: db.reviews,
    settings: db.settings
  };
  return tables[type] as Table<SyncedEntity, string>;
}

export async function allForUser<T extends { userId: string }>(
  table: Table<T, any>,
  userId: string
): Promise<T[]> {
  return table.where('userId').equals(userId).toArray();
}
