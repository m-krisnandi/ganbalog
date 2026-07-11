/**
 * Implementasi repository berbasis IndexedDB (Dexie) — adapter "local-first".
 * Kalau nanti pindah ke Supabase, cukup buat file supabase-repositories.ts
 * yang mengimplementasikan interface yang sama lalu tukar di composition root.
 */

import type {
  AuditEvent,
  Checkpoint,
  Id,
  IsoDate,
  LogEntry,
  Material,
  MaterialUnit,
  Plan,
  ScheduleItem,
  StudyLog,
  Task,
  UserProfile,
  Workspace,
  WorkspaceMember,
} from '../../domain/models'
import type {
  AuditRepository,
  CheckpointRepository,
  LogRepository,
  MaterialRepository,
  MaterialUnitRepository,
  MetaRepository,
  PlanRepository,
  ScheduleRepository,
  StudyLogRepository,
  TaskRepository,
  UserPreferenceRepository,
  UserProfileRepository,
  WorkspaceRepository,
} from '../../domain/repositories'
import type { GanbaLogDb } from './db'

export class LocalPlanRepository implements PlanRepository {
  constructor(private readonly db: GanbaLogDb) {}

  getByWorkspace(workspaceId: Id): Promise<Plan[]> {
    return this.db.plans.where('workspaceId').equals(workspaceId).toArray()
  }

  getById(id: Id): Promise<Plan | undefined> {
    return this.db.plans.get(id)
  }

  async save(plan: Plan): Promise<void> {
    await this.db.plans.put(plan)
  }

  async delete(id: Id): Promise<void> {
    await this.db.plans.delete(id)
  }
}

export class LocalMaterialRepository implements MaterialRepository {
  constructor(private readonly db: GanbaLogDb) {}

  getByPlan(planId: Id): Promise<Material[]> {
    return this.db.materials.where('planId').equals(planId).toArray()
  }

  getById(id: Id): Promise<Material | undefined> {
    return this.db.materials.get(id)
  }

  async save(material: Material): Promise<void> {
    await this.db.materials.put(material)
  }

  async delete(id: Id): Promise<void> {
    await this.db.materials.delete(id)
  }
}

export class LocalMaterialUnitRepository implements MaterialUnitRepository {
  constructor(private readonly db: GanbaLogDb) {}

  getByMaterial(materialId: Id): Promise<MaterialUnit[]> {
    return this.db.materialUnits.where('materialId').equals(materialId).toArray()
  }

  getById(id: Id): Promise<MaterialUnit | undefined> {
    return this.db.materialUnits.get(id)
  }

  async save(unit: MaterialUnit): Promise<void> {
    await this.db.materialUnits.put(unit)
  }

  async saveMany(units: MaterialUnit[]): Promise<void> {
    if (units.length > 0) await this.db.materialUnits.bulkPut(units)
  }

  async delete(id: Id): Promise<void> {
    await this.db.materialUnits.delete(id)
  }

  async deleteByMaterial(materialId: Id): Promise<void> {
    await this.db.materialUnits.where('materialId').equals(materialId).delete()
  }
}

export class LocalScheduleRepository implements ScheduleRepository {
  constructor(private readonly db: GanbaLogDb) {}

  getByPlan(planId: Id): Promise<ScheduleItem[]> {
    return this.db.scheduleItems.where('planId').equals(planId).toArray()
  }

  getById(id: Id): Promise<ScheduleItem | undefined> {
    return this.db.scheduleItems.get(id)
  }

  async save(item: ScheduleItem): Promise<void> {
    await this.db.scheduleItems.put(item)
  }

  async delete(id: Id): Promise<void> {
    await this.db.scheduleItems.delete(id)
  }
}

export class LocalTaskRepository implements TaskRepository {
  constructor(private readonly db: GanbaLogDb) {}

  getByPlanAndDate(planId: Id, date: IsoDate): Promise<Task[]> {
    return this.db.tasks.where('[planId+date]').equals([planId, date]).toArray()
  }

  getByPlan(planId: Id): Promise<Task[]> {
    return this.db.tasks.where('planId').equals(planId).toArray()
  }

  getById(id: Id): Promise<Task | undefined> {
    return this.db.tasks.get(id)
  }

  async countDoneByPlanAndDate(planId: Id, date: IsoDate): Promise<number> {
    const tasks = await this.db.tasks.where('[planId+date]').equals([planId, date]).toArray()
    return tasks.filter((t) => t.status === 'done').length
  }

  async save(task: Task): Promise<void> {
    await this.db.tasks.put(task)
  }

  async saveMany(tasks: Task[]): Promise<void> {
    await this.db.tasks.bulkPut(tasks)
  }

  async delete(id: Id): Promise<void> {
    await this.db.tasks.delete(id)
  }

  async deleteByPlan(planId: Id): Promise<void> {
    await this.db.tasks.where('planId').equals(planId).delete()
  }
}

export class LocalCheckpointRepository implements CheckpointRepository {
  constructor(private readonly db: GanbaLogDb) {}

  getByPlan(planId: Id): Promise<Checkpoint[]> {
    return this.db.checkpoints.where('planId').equals(planId).toArray()
  }

  getById(id: Id): Promise<Checkpoint | undefined> {
    return this.db.checkpoints.get(id)
  }

  async save(checkpoint: Checkpoint): Promise<void> {
    await this.db.checkpoints.put(checkpoint)
  }

  async delete(id: Id): Promise<void> {
    await this.db.checkpoints.delete(id)
  }
}

export class LocalStudyLogRepository implements StudyLogRepository {
  constructor(private readonly db: GanbaLogDb) {}

  getByUserAndPlan(userId: Id, planId: Id): Promise<StudyLog[]> {
    return this.db.studyLogs.where('[userId+planId]').equals([userId, planId]).toArray()
  }

  getByUserPlanDate(userId: Id, planId: Id, date: IsoDate): Promise<StudyLog | undefined> {
    return this.db.studyLogs
      .where('[userId+planId+date]')
      .equals([userId, planId, date])
      .first()
  }

  async save(log: StudyLog): Promise<void> {
    await this.db.studyLogs.put(log)
  }

  async deleteByUserPlanDate(userId: Id, planId: Id, date: IsoDate): Promise<void> {
    const log = await this.getByUserPlanDate(userId, planId, date)
    if (log) await this.db.studyLogs.delete(log.id)
  }
}

const MAX_AUDIT_EVENTS = 2000
const MAX_LOG_ENTRIES = 500

export class LocalAuditRepository implements AuditRepository {
  constructor(private readonly db: GanbaLogDb) {}

  async append(event: AuditEvent): Promise<void> {
    await this.db.auditEvents.put(event)
    const count = await this.db.auditEvents.count()
    if (count > MAX_AUDIT_EVENTS) {
      const oldest = await this.db.auditEvents
        .orderBy('at')
        .limit(count - MAX_AUDIT_EVENTS)
        .toArray()
      await this.db.auditEvents.bulkDelete(oldest.map((e) => e.id))
    }
  }

  getRecent(limit: number): Promise<AuditEvent[]> {
    return this.db.auditEvents.orderBy('at').reverse().limit(limit).toArray()
  }

  async clear(): Promise<void> {
    await this.db.auditEvents.clear()
  }
}

export class LocalLogRepository implements LogRepository {
  constructor(private readonly db: GanbaLogDb) {}

  async append(entry: LogEntry): Promise<void> {
    await this.db.logEntries.put(entry)
    const count = await this.db.logEntries.count()
    if (count > MAX_LOG_ENTRIES) {
      const oldest = await this.db.logEntries
        .orderBy('at')
        .limit(count - MAX_LOG_ENTRIES)
        .toArray()
      await this.db.logEntries.bulkDelete(oldest.map((e) => e.id))
    }
  }

  getRecent(limit: number): Promise<LogEntry[]> {
    return this.db.logEntries.orderBy('at').reverse().limit(limit).toArray()
  }

  async clear(): Promise<void> {
    await this.db.logEntries.clear()
  }
}

export class LocalMetaRepository implements MetaRepository {
  constructor(private readonly db: GanbaLogDb) {}

  async get(key: string): Promise<string | undefined> {
    const row = await this.db.meta.get(key)
    return row?.value
  }

  async set(key: string, value: string): Promise<void> {
    await this.db.meta.put({ key, value })
  }
}

function prefStorageKey(userId: Id, workspaceId: Id, key: string): string {
  return `pref:${userId}:${workspaceId}:${key}`
}

export class LocalUserPreferenceRepository implements UserPreferenceRepository {
  constructor(private readonly db: GanbaLogDb) {}

  get(userId: Id, workspaceId: Id, key: string): Promise<string | undefined> {
    return this.db.meta.get(prefStorageKey(userId, workspaceId, key)).then((row) => row?.value)
  }

  async set(userId: Id, workspaceId: Id, key: string, value: string): Promise<void> {
    await this.db.meta.put({ key: prefStorageKey(userId, workspaceId, key), value })
  }
}

export class LocalWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly db: GanbaLogDb) {}

  getById(id: Id): Promise<Workspace | undefined> {
    return this.db.workspaces.get(id)
  }

  async save(workspace: Workspace): Promise<void> {
    await this.db.workspaces.put(workspace)
  }

  getMembers(workspaceId: Id): Promise<WorkspaceMember[]> {
    return this.db.workspaceMembers.where('workspaceId').equals(workspaceId).toArray()
  }

  async addMember(member: WorkspaceMember): Promise<void> {
    await this.db.workspaceMembers.put(member)
  }
}

export class LocalUserProfileRepository implements UserProfileRepository {
  constructor(private readonly db: GanbaLogDb) {}

  getById(id: Id): Promise<UserProfile | undefined> {
    return this.db.userProfiles.get(id)
  }

  async save(profile: UserProfile): Promise<void> {
    await this.db.userProfiles.put(profile)
  }

  async getByWorkspace(workspaceId: Id): Promise<UserProfile[]> {
    const members = await this.db.workspaceMembers
      .where('workspaceId')
      .equals(workspaceId)
      .toArray()
    const profiles = await Promise.all(members.map((m) => this.getById(m.userId)))
    return profiles.filter((p): p is UserProfile => p !== undefined)
  }
}
