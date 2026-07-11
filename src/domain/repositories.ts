/**
 * Kontrak repository (port). Service hanya bergantung pada interface ini —
 * implementasi konkretnya (IndexedDB sekarang, Supabase nanti) di-inject
 * lewat composition root. (Dependency Inversion Principle)
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
} from './models'

export interface PlanRepository {
  getByWorkspace(workspaceId: Id): Promise<Plan[]>
  getById(id: Id): Promise<Plan | undefined>
  save(plan: Plan): Promise<void>
  delete(id: Id): Promise<void>
}

export interface MaterialRepository {
  getByPlan(planId: Id): Promise<Material[]>
  getById(id: Id): Promise<Material | undefined>
  save(material: Material): Promise<void>
  delete(id: Id): Promise<void>
}

export interface MaterialUnitRepository {
  getByMaterial(materialId: Id): Promise<MaterialUnit[]>
  getById(id: Id): Promise<MaterialUnit | undefined>
  save(unit: MaterialUnit): Promise<void>
  saveMany(units: MaterialUnit[]): Promise<void>
  delete(id: Id): Promise<void>
  deleteByMaterial(materialId: Id): Promise<void>
}

export interface ScheduleRepository {
  getByPlan(planId: Id): Promise<ScheduleItem[]>
  getById(id: Id): Promise<ScheduleItem | undefined>
  save(item: ScheduleItem): Promise<void>
  delete(id: Id): Promise<void>
}

export interface TaskRepository {
  getByPlanAndDate(planId: Id, date: IsoDate): Promise<Task[]>
  getByPlan(planId: Id): Promise<Task[]>
  getById(id: Id): Promise<Task | undefined>
  countDoneByPlanAndDate(planId: Id, date: IsoDate): Promise<number>
  save(task: Task): Promise<void>
  saveMany(tasks: Task[]): Promise<void>
  delete(id: Id): Promise<void>
  deleteByPlan(planId: Id): Promise<void>
}

export interface CheckpointRepository {
  getByPlan(planId: Id): Promise<Checkpoint[]>
  getById(id: Id): Promise<Checkpoint | undefined>
  save(checkpoint: Checkpoint): Promise<void>
  delete(id: Id): Promise<void>
}

export interface StudyLogRepository {
  getByUserAndPlan(userId: Id, planId: Id): Promise<StudyLog[]>
  getByPlan(planId: Id): Promise<StudyLog[]>
  getByUserPlanDate(userId: Id, planId: Id, date: IsoDate): Promise<StudyLog | undefined>
  save(log: StudyLog): Promise<void>
  deleteByUserPlanDate(userId: Id, planId: Id, date: IsoDate): Promise<void>
}

export interface UserPreferenceRepository {
  get(userId: Id, workspaceId: Id, key: string): Promise<string | undefined>
  set(userId: Id, workspaceId: Id, key: string, value: string): Promise<void>
}

export interface WorkspaceRepository {
  getById(id: Id): Promise<Workspace | undefined>
  save(workspace: Workspace): Promise<void>
  updateName(workspaceId: Id, name: string): Promise<void>
  updateInviteCode(workspaceId: Id, inviteCode: string): Promise<void>
  getMembers(workspaceId: Id): Promise<WorkspaceMember[]>
  addMember(member: WorkspaceMember): Promise<void>
  removeMember(workspaceId: Id, userId: Id): Promise<void>
}

export interface UserProfileRepository {
  getById(id: Id): Promise<UserProfile | undefined>
  save(profile: UserProfile): Promise<void>
  getByWorkspace(workspaceId: Id): Promise<UserProfile[]>
}

export interface AuditRepository {
  append(event: AuditEvent): Promise<void>
  getRecent(limit: number): Promise<AuditEvent[]>
  clear(): Promise<void>
}

export interface LogRepository {
  append(entry: LogEntry): Promise<void>
  getRecent(limit: number): Promise<LogEntry[]>
  clear(): Promise<void>
}

/** Key-value kecil untuk preferensi (plan aktif, flag seeding, dll.) */
export interface MetaRepository {
  get(key: string): Promise<string | undefined>
  set(key: string, value: string): Promise<void>
}
