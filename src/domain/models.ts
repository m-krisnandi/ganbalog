/**
 * Model domain murni — tidak tahu apa-apa soal storage (IndexedDB/Supabase)
 * maupun UI. Semua tanggal disimpan sebagai string:
 * - `IsoDate`  : "2026-08-03" (tanggal kalender, tanpa jam)
 * - `IsoStamp` : "2026-08-03T10:15:00.000Z" (timestamp penuh)
 */

export type Id = string
export type IsoDate = string
export type IsoStamp = string

/** ISO weekday: 1 = Senin ... 7 = Minggu */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type PlanStatus = 'active' | 'archived'

/** Built-in sample id when plan was created from a code template; null = blank/custom/imported */
export type SourceTemplateId = string | null

export interface Workspace {
  id: Id
  name: string
  inviteCode: string | null
  createdAt: IsoStamp
}

export interface UserProfile {
  id: Id
  email: string
  displayName: string
  avatarUrl: string | null
  createdAt: IsoStamp
}

export interface WorkspaceMember {
  id: Id
  workspaceId: Id
  userId: Id
  role: 'member'
  joinedAt: IsoStamp
}

export interface Plan {
  id: Id
  workspaceId: Id
  name: string
  description: string
  /** Tanggal mulai belajar */
  startDate: IsoDate
  /** Tanggal target, misal hari ujian */
  targetDate: IsoDate
  status: PlanStatus
  /** null = blank, custom, or imported from shared template */
  sourceTemplateId: SourceTemplateId
  createdAt: IsoStamp
  updatedAt: IsoStamp
}

export interface Material {
  id: Id
  planId: Id
  name: string
  /** Satuan progress, misal "chapters", "words" */
  unitLabel: string
  totalUnits: number
  doneUnits: number
  /** Categories for filtering, e.g. grammar, vocab, listening */
  tags: string[]
  createdAt: IsoStamp
  updatedAt: IsoStamp
}

/** Satuan individual dalam materi (bab 1, bab 2, …) — checklist per item. */
export interface MaterialUnit {
  id: Id
  materialId: Id
  /** Urutan 1-based di dalam materi */
  index: number
  done: boolean
  completedAt: IsoStamp | null
  createdAt: IsoStamp
}

/** Template jadwal mingguan: "setiap Senin: SKM Bunpou 1 bab" */
export interface ScheduleItem {
  id: Id
  planId: Id
  weekday: Weekday
  title: string
  materialId: Id | null
  createdAt: IsoStamp
}

export type TaskKind = 'study' | 'review'
export type TaskStatus = 'open' | 'done' | 'skipped'

/** Instance harian yang bisa dicentang di halaman Today */
export interface Task {
  id: Id
  userId: Id
  planId: Id
  date: IsoDate
  title: string
  kind: TaskKind
  status: TaskStatus
  materialId: Id | null
  /** Untuk task 'study' yang digenerate dari jadwal mingguan */
  scheduleItemId: Id | null
  /** Untuk task 'review' (fukushū): task asal yang direview */
  reviewOfTaskId: Id | null
  completedAt: IsoStamp | null
  createdAt: IsoStamp
}

export type CheckpointStatus = 'open' | 'achieved'

export interface Checkpoint {
  id: Id
  planId: Id
  title: string
  dueDate: IsoDate
  status: CheckpointStatus
  achievedAt: IsoStamp | null
  createdAt: IsoStamp
}

/** Catatan belajar per user per plan per hari. Durasi opsional (menit). */
export interface StudyLog {
  id: Id
  userId: Id
  planId: Id
  date: IsoDate
  minutes: number | null
  createdAt: IsoStamp
  updatedAt: IsoStamp
}

/* ------------------------------------------------------------------ */
/* Observability                                                       */
/* ------------------------------------------------------------------ */

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'complete'
  | 'reopen'
  | 'skip'
  | 'archive'
  | 'activate'
  | 'seed'

export interface AuditEvent {
  id: Id
  at: IsoStamp
  action: AuditAction
  entity: string
  entityId: Id
  detail: string
  actorUserId: Id | null
  actorDisplayName: string | null
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  id: Id
  at: IsoStamp
  level: LogLevel
  message: string
  stack: string | null
  context: string | null
}
