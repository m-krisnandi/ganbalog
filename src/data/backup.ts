import type { Clock } from '../core/clock'
import type { IdGenerator } from '../core/ids'
import type {
  AuditEvent,
  Checkpoint,
  LogEntry,
  Material,
  MaterialUnit,
  Plan,
  ScheduleItem,
  StudyLog,
  Task,
} from '../domain/models'
import type { GanbaLogDb } from './local/db'
import { LOCAL_USER_ID, LOCAL_WORKSPACE_ID } from '../core/session/constants'
import { exportBackupFromCloud, importBackupToCloud } from './cloud-import'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Id } from '../domain/models'

export interface CloudBackupDeps {
  client: SupabaseClient
  getWorkspaceId: () => Id
  getUserId: () => Id
}

export const BACKUP_VERSION = 1 as const

export interface GanbaLogBackup {
  version: typeof BACKUP_VERSION
  exportedAt: string
  plans: Plan[]
  materials: Material[]
  materialUnits: MaterialUnit[]
  scheduleItems: ScheduleItem[]
  tasks: Task[]
  checkpoints: Checkpoint[]
  studyLogs: StudyLog[]
  auditEvents: AuditEvent[]
  logEntries: LogEntry[]
  meta: Record<string, string>
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
}

export class BackupService {
  constructor(
    private readonly db: GanbaLogDb,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly cloud?: CloudBackupDeps,
  ) {}

  async export(): Promise<GanbaLogBackup> {
    if (this.cloud) {
      return exportBackupFromCloud(this.cloud.client, this.cloud.getWorkspaceId())
    }

    const [
      plans,
      materials,
      materialUnits,
      scheduleItems,
      tasks,
      checkpoints,
      studyLogs,
      auditEvents,
      logEntries,
      metaRows,
    ] = await Promise.all([
      this.db.plans.toArray(),
      this.db.materials.toArray(),
      this.db.materialUnits.toArray(),
      this.db.scheduleItems.toArray(),
      this.db.tasks.toArray(),
      this.db.checkpoints.toArray(),
      this.db.studyLogs.toArray(),
      this.db.auditEvents.toArray(),
      this.db.logEntries.toArray(),
      this.db.meta.toArray(),
    ])

    return {
      version: BACKUP_VERSION,
      exportedAt: this.clock.stamp(),
      plans,
      materials,
      materialUnits,
      scheduleItems,
      tasks,
      checkpoints,
      studyLogs,
      auditEvents,
      logEntries,
      meta: Object.fromEntries(metaRows.map((row) => [row.key, row.value])),
    }
  }

  async import(backup: GanbaLogBackup): Promise<void> {
    validateBackup(backup)
    const normalized = normalizeBackup(backup)

    if (this.cloud) {
      await importBackupToCloud(
        this.cloud.client,
        this.cloud.getWorkspaceId(),
        this.cloud.getUserId(),
        normalized,
      )
      return
    }

    const metaRows = Object.entries(normalized.meta).map(([key, value]) => ({ key, value }))

    await this.db.transaction(
      'rw',
      [
        this.db.plans,
        this.db.materials,
        this.db.materialUnits,
        this.db.scheduleItems,
        this.db.tasks,
        this.db.checkpoints,
        this.db.studyLogs,
        this.db.auditEvents,
        this.db.logEntries,
        this.db.meta,
      ],
      async () => {
        await Promise.all([
          this.db.plans.clear(),
          this.db.materials.clear(),
          this.db.materialUnits.clear(),
          this.db.scheduleItems.clear(),
          this.db.tasks.clear(),
          this.db.checkpoints.clear(),
          this.db.studyLogs.clear(),
          this.db.auditEvents.clear(),
          this.db.logEntries.clear(),
          this.db.meta.clear(),
        ])

        await Promise.all([
          this.db.plans.bulkPut(normalized.plans),
          this.db.materials.bulkPut(normalized.materials),
          this.db.materialUnits.bulkPut(normalized.materialUnits),
          this.db.scheduleItems.bulkPut(normalized.scheduleItems),
          this.db.tasks.bulkPut(normalized.tasks),
          this.db.checkpoints.bulkPut(normalized.checkpoints),
          this.db.studyLogs.bulkPut(normalized.studyLogs),
          this.db.auditEvents.bulkPut(normalized.auditEvents),
          this.db.logEntries.bulkPut(backup.logEntries),
          this.db.meta.bulkPut(metaRows),
        ])
      },
    )
  }

  async importFromExcel(buffer: ArrayBuffer): Promise<void> {
    const { parseExcelBackup, mergeExcelImport } = await import('./import-excel')
    const current = await this.export()
    const { backup: partial, sheetsPresent } = await parseExcelBackup(buffer, this.clock, this.ids)
    const merged = mergeExcelImport(current, partial, sheetsPresent)
    await this.import(merged)
  }
}

export function parseBackupJson(text: string): GanbaLogBackup {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new BackupError('invalidJson')
  }
  validateBackup(parsed)
  return normalizeBackup(parsed)
}

export function downloadBackupFile(backup: GanbaLogBackup): void {
  const date = backup.exportedAt.slice(0, 10)
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `ganbalog-backup-${date}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function normalizeBackup(backup: GanbaLogBackup): GanbaLogBackup {
  const defaultPlanId = backup.plans.find((p) => p.status === 'active')?.id ?? backup.plans[0]?.id ?? ''
  const plans = backup.plans.map((plan) => ({
    ...plan,
    workspaceId: plan.workspaceId ?? LOCAL_WORKSPACE_ID,
    sourceTemplateId: plan.sourceTemplateId ?? null,
  }))
  const materials = backup.materials.map((material) => ({
    ...material,
    tags: material.tags ?? [],
  }))
  const studyLogs = backup.studyLogs.map((log) => ({
    ...log,
    userId: log.userId ?? LOCAL_USER_ID,
    planId: log.planId ?? defaultPlanId,
  }))
  const tasks = backup.tasks.map((task) => ({
    ...task,
    userId: task.userId ?? LOCAL_USER_ID,
  }))
  const auditEvents = backup.auditEvents.map((event) => ({
    ...event,
    actorUserId: event.actorUserId ?? null,
    actorDisplayName: event.actorDisplayName ?? null,
  }))
  return { ...backup, plans, materials, studyLogs, tasks, auditEvents }
}

function validateBackup(data: unknown): asserts data is GanbaLogBackup {
  if (!data || typeof data !== 'object') throw new BackupError('invalidFormat')

  const backup = data as Partial<GanbaLogBackup>
  if (backup.version !== BACKUP_VERSION) throw new BackupError('unsupportedVersion')

  const arrays = [
    'plans',
    'materials',
    'materialUnits',
    'scheduleItems',
    'tasks',
    'checkpoints',
    'studyLogs',
    'auditEvents',
    'logEntries',
  ] as const

  for (const key of arrays) {
    if (!Array.isArray(backup[key])) throw new BackupError('invalidFormat')
  }

  if (!backup.meta || typeof backup.meta !== 'object' || Array.isArray(backup.meta)) {
    throw new BackupError('invalidFormat')
  }

  if (typeof backup.exportedAt !== 'string') throw new BackupError('invalidFormat')
}

export function backupSummary(backup: GanbaLogBackup): {
  planCount: number
  exportedAt: string
} {
  return {
    planCount: backup.plans.length,
    exportedAt: backup.exportedAt,
  }
}
