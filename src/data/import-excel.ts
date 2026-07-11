import type { Clock } from '../core/clock'
import type { IdGenerator } from '../core/ids'
import {
  BACKUP_VERSION,
  BackupError,
  type GanbaLogBackup,
} from './backup'
import type {
  Checkpoint,
  CheckpointStatus,
  Material,
  MaterialUnit,
  Plan,
  PlanStatus,
  ScheduleItem,
  StudyLog,
  Task,
  TaskKind,
  TaskStatus,
  Weekday,
} from '../domain/models'
import { LOCAL_USER_ID, LOCAL_WORKSPACE_ID } from '../core/session/constants'

const SHEETS = [
  'Plans',
  'Materials',
  'MaterialUnits',
  'Schedule',
  'Checkpoints',
  'StudyLogs',
  'Tasks',
] as const

type DataSheet = (typeof SHEETS)[number]

type XlsxModule = typeof import('xlsx')

let xlsxModule: Promise<XlsxModule> | null = null
let xlsxRuntime: XlsxModule | null = null

function loadXlsx(): Promise<XlsxModule> {
  xlsxModule ??= import('xlsx')
  return xlsxModule
}

function requireXlsx(): XlsxModule {
  if (!xlsxRuntime) throw new Error('xlsx not loaded')
  return xlsxRuntime
}

export interface ExcelParseResult {
  backup: GanbaLogBackup
  sheetsPresent: Set<DataSheet>
}

export async function parseExcelBackup(
  buffer: ArrayBuffer,
  clock: Clock,
  ids: IdGenerator,
): Promise<ExcelParseResult> {
  const XLSX = await loadXlsx()
  xlsxRuntime = XLSX
  try {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetsPresent = new Set<DataSheet>(
    SHEETS.filter((name) => workbook.SheetNames.includes(name)),
  )

  if (!sheetsPresent.has('Plans')) {
    throw new BackupError('missingPlansSheet')
  }

  const stamp = clock.stamp()
  const exportedAt = readInfoField(workbook, 'exportedAt') || stamp

  const plans = parsePlans(sheetRows(workbook, 'Plans'), stamp, ids)
  const planRef = planResolver(plans)

  const materials = sheetsPresent.has('Materials')
    ? parseMaterials(sheetRows(workbook, 'Materials'), planRef, stamp, ids)
    : []

  const materialRef = materialResolver(materials)

  const materialUnits = sheetsPresent.has('MaterialUnits')
    ? parseMaterialUnits(sheetRows(workbook, 'MaterialUnits'), materialRef, stamp, ids)
    : []

  const scheduleItems = sheetsPresent.has('Schedule')
    ? parseSchedule(sheetRows(workbook, 'Schedule'), planRef, materialRef, stamp, ids)
    : []

  const checkpoints = sheetsPresent.has('Checkpoints')
    ? parseCheckpoints(sheetRows(workbook, 'Checkpoints'), planRef, stamp, ids)
    : []

  const studyLogs = sheetsPresent.has('StudyLogs')
    ? parseStudyLogs(sheetRows(workbook, 'StudyLogs'), planRef, stamp, ids)
    : []

  const tasks = sheetsPresent.has('Tasks')
    ? parseTasks(sheetRows(workbook, 'Tasks'), planRef, stamp, ids)
    : []

  return {
    sheetsPresent,
    backup: {
      version: BACKUP_VERSION,
      exportedAt,
      plans,
      materials,
      materialUnits,
      scheduleItems,
      tasks,
      checkpoints,
      studyLogs,
      auditEvents: [],
      logEntries: [],
      meta: {},
    },
  }
  } finally {
    xlsxRuntime = null
  }
}

/** Gabungkan data Excel ke backup penuh — sheet yang tidak ada di Excel tetap dari DB. */
export function mergeExcelImport(
  base: GanbaLogBackup,
  excel: GanbaLogBackup,
  sheetsPresent: Set<DataSheet>,
): GanbaLogBackup {
  const merged: GanbaLogBackup = {
    version: BACKUP_VERSION,
    exportedAt: excel.exportedAt,
    plans: sheetsPresent.has('Plans') ? excel.plans : base.plans,
    materials: sheetsPresent.has('Materials') ? excel.materials : base.materials,
    materialUnits: sheetsPresent.has('MaterialUnits') ? excel.materialUnits : base.materialUnits,
    scheduleItems: sheetsPresent.has('Schedule') ? excel.scheduleItems : base.scheduleItems,
    tasks: sheetsPresent.has('Tasks') ? excel.tasks : base.tasks,
    checkpoints: sheetsPresent.has('Checkpoints') ? excel.checkpoints : base.checkpoints,
    studyLogs: sheetsPresent.has('StudyLogs') ? excel.studyLogs : base.studyLogs,
    auditEvents: base.auditEvents,
    logEntries: base.logEntries,
    meta: { ...base.meta },
  }

  const activeId = merged.meta.activePlanId
  const activeStillValid = merged.plans.some(
    (plan) => plan.id === activeId && plan.status === 'active',
  )
  if (!activeStillValid) {
    const nextActive = merged.plans.find((plan) => plan.status === 'active')
    merged.meta.activePlanId = nextActive?.id ?? ''
  }

  return merged
}

function sheetRows(workbook: import('xlsx').WorkBook, name: string): Record<string, unknown>[] {
  const XLSX = requireXlsx()
  const sheet = workbook.Sheets[name]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
}

function readInfoField(workbook: import('xlsx').WorkBook, field: string): string {
  const rows = sheetRows(workbook, 'Info')
  const match = rows.find((row) => str(row.field) === field)
  return match ? str(match.value) : ''
}

function parsePlans(
  rows: Record<string, unknown>[],
  stamp: string,
  ids: IdGenerator,
): Plan[] {
  return rows
    .filter((row) => str(row.name))
    .map((row) => ({
      id: str(row.id) || ids.next(),
      workspaceId: LOCAL_WORKSPACE_ID,
      name: str(row.name),
      description: str(row.description),
      startDate: isoDate(row.startDate),
      targetDate: isoDate(row.targetDate),
      status: planStatus(row.status),
      sourceTemplateId: null,
      createdAt: stamp,
      updatedAt: stamp,
    }))
}

function parseMaterials(
  rows: Record<string, unknown>[],
  planRef: PlanResolver,
  stamp: string,
  ids: IdGenerator,
): Material[] {
  return rows
    .filter((row) => str(row.name))
    .map((row) => ({
      id: str(row.id) || ids.next(),
      planId: planRef.resolve(str(row.plan)),
      name: str(row.name),
      unitLabel: str(row.unitLabel) || 'units',
      totalUnits: Math.max(0, num(row.totalUnits)),
      doneUnits: Math.max(0, num(row.doneUnits)),
      tags: [],
      createdAt: stamp,
      updatedAt: stamp,
    }))
}

function parseMaterialUnits(
  rows: Record<string, unknown>[],
  materialRef: MaterialResolver,
  stamp: string,
  ids: IdGenerator,
): MaterialUnit[] {
  return rows
    .filter((row) => str(row.material))
    .map((row) => {
      const done = boolYes(row.done)
      return {
        id: str(row.id) || ids.next(),
        materialId: materialRef.resolve(str(row.material)),
        index: Math.max(1, num(row.index) || 1),
        done,
        completedAt: done ? stamp : null,
        createdAt: stamp,
      }
    })
}

function parseSchedule(
  rows: Record<string, unknown>[],
  planRef: PlanResolver,
  materialRef: MaterialResolver,
  stamp: string,
  ids: IdGenerator,
): ScheduleItem[] {
  return rows
    .filter((row) => str(row.title))
    .map((row) => {
      const materialName = str(row.material)
      return {
        id: str(row.id) || ids.next(),
        planId: planRef.resolve(str(row.plan)),
        weekday: weekday(row.weekday),
        title: str(row.title),
        materialId: materialName ? materialRef.resolveOptional(materialName) : null,
        createdAt: stamp,
      }
    })
}

function parseCheckpoints(
  rows: Record<string, unknown>[],
  planRef: PlanResolver,
  stamp: string,
  ids: IdGenerator,
): Checkpoint[] {
  return rows
    .filter((row) => str(row.title))
    .map((row) => {
      const status = checkpointStatus(row.status)
      return {
        id: str(row.id) || ids.next(),
        planId: planRef.resolve(str(row.plan)),
        title: str(row.title),
        dueDate: isoDate(row.dueDate),
        status,
        achievedAt: status === 'achieved' ? stamp : null,
        createdAt: stamp,
      }
    })
}

function parseStudyLogs(
  rows: Record<string, unknown>[],
  planRef: PlanResolver,
  stamp: string,
  ids: IdGenerator,
): StudyLog[] {
  const defaultPlanId = planRef.defaultPlanId
  return rows
    .filter((row) => str(row.date))
    .map((row) => {
      const minutesRaw = str(row.minutes)
      const planName = str(row.plan)
      const planId = planName ? planRef.resolve(planName) : defaultPlanId
      return {
        id: str(row.id) || ids.next(),
        userId: str(row.userId) || LOCAL_USER_ID,
        planId: str(row.planId) || planId,
        date: isoDate(row.date),
        minutes: minutesRaw ? num(row.minutes) : null,
        createdAt: stamp,
        updatedAt: stamp,
      }
    })
}

function parseTasks(
  rows: Record<string, unknown>[],
  planRef: PlanResolver,
  stamp: string,
  ids: IdGenerator,
): Task[] {
  return rows
    .filter((row) => str(row.title) && str(row.date))
    .map((row) => {
      const status = taskStatus(row.status)
      return {
        id: str(row.id) || ids.next(),
        userId: str(row.userId) || LOCAL_USER_ID,
        planId: planRef.resolve(str(row.plan)),
        date: isoDate(row.date),
        title: str(row.title),
        kind: taskKind(row.kind),
        status,
        materialId: null,
        scheduleItemId: null,
        reviewOfTaskId: null,
        completedAt: status === 'done' ? stamp : null,
        createdAt: stamp,
      }
    })
}

type PlanResolver = ReturnType<typeof planResolver>
type MaterialResolver = ReturnType<typeof materialResolver>

function planResolver(plans: Plan[]) {
  const byId = new Map(plans.map((plan) => [plan.id, plan.id]))
  const byName = new Map(plans.map((plan) => [plan.name, plan.id]))

  return {
    defaultPlanId: plans[0]?.id ?? '',
    resolve(ref: string): string {
      if (!ref) throw new BackupError('invalidFormat')
      return byId.get(ref) ?? byName.get(ref) ?? (() => { throw new BackupError('unknownPlan') })()
    },
  }
}

function materialResolver(materials: Material[]) {
  const byId = new Map(materials.map((material) => [material.id, material.id]))
  const byName = new Map(materials.map((material) => [material.name, material.id]))

  return {
    resolve(ref: string): string {
      if (!ref) throw new BackupError('invalidFormat')
      return byId.get(ref) ?? byName.get(ref) ?? (() => { throw new BackupError('unknownMaterial') })()
    },
    resolveOptional(ref: string): string | null {
      if (!ref) return null
      return byId.get(ref) ?? byName.get(ref) ?? null
    },
  }
}

function str(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).trim()
}

function num(value: unknown): number {
  if (typeof value === 'number') return value
  const parsed = Number(String(value).replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function boolYes(value: unknown): boolean {
  const normalized = str(value).toLowerCase()
  return normalized === 'yes' || normalized === 'true' || normalized === '1' || value === true
}

function isoDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  const text = str(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  if (typeof value === 'number') {
    const parsed = requireXlsx().SSF.parse_date_code(value)
    if (parsed) {
      const y = parsed.y
      const m = String(parsed.m).padStart(2, '0')
      const d = String(parsed.d).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }
  throw new BackupError('invalidDate')
}

function planStatus(value: unknown): PlanStatus {
  const status = str(value)
  return status === 'archived' ? 'archived' : 'active'
}

function checkpointStatus(value: unknown): CheckpointStatus {
  return str(value) === 'achieved' ? 'achieved' : 'open'
}

function taskStatus(value: unknown): TaskStatus {
  const status = str(value)
  if (status === 'done' || status === 'skipped') return status
  return 'open'
}

function taskKind(value: unknown): TaskKind {
  return str(value) === 'review' ? 'review' : 'study'
}

function weekday(value: unknown): Weekday {
  const day = num(value)
  if (day >= 1 && day <= 7) return day as Weekday
  throw new BackupError('invalidFormat')
}
