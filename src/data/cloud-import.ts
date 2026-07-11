import type { SupabaseClient } from '@supabase/supabase-js'
import type { Id } from '../domain/models'
import type { GanbaLogBackup } from './backup'
import { normalizeBackup } from './backup'
import {
  mapAuditEvent,
  mapAuditInsert,
  mapCheckpoint,
  mapCheckpointInsert,
  mapMaterial,
  mapMaterialInsert,
  mapMaterialUnit,
  mapMaterialUnitInsert,
  mapPlan,
  mapPlanInsert,
  mapScheduleInsert,
  mapScheduleItem,
  mapStudyLog,
  mapStudyLogInsert,
  mapTask,
  mapTaskInsert,
} from './supabase/mappers'

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

/** Upsert backup ke workspace cloud — tidak menghapus data yang sudah ada. */
export async function importBackupToCloud(
  client: SupabaseClient,
  workspaceId: Id,
  userId: Id,
  backup: GanbaLogBackup,
): Promise<void> {
  const normalized = normalizeBackup(backup)
  const plans = normalized.plans.map((plan) => ({ ...plan, workspaceId }))

  if (plans.length > 0) {
    const { error } = await client.from('plans').upsert(plans.map(mapPlanInsert))
    throwIfError(error)
  }

  if (normalized.materials.length > 0) {
    const { error } = await client
      .from('materials')
      .upsert(normalized.materials.map(mapMaterialInsert))
    throwIfError(error)
  }

  if (normalized.materialUnits.length > 0) {
    const { error } = await client
      .from('material_units')
      .upsert(normalized.materialUnits.map(mapMaterialUnitInsert))
    throwIfError(error)
  }

  if (normalized.scheduleItems.length > 0) {
    const { error } = await client
      .from('schedule_items')
      .upsert(normalized.scheduleItems.map(mapScheduleInsert))
    throwIfError(error)
  }

  if (normalized.checkpoints.length > 0) {
    const { error } = await client
      .from('checkpoints')
      .upsert(normalized.checkpoints.map(mapCheckpointInsert))
    throwIfError(error)
  }

  if (normalized.tasks.length > 0) {
    const { error } = await client.from('tasks').upsert(normalized.tasks.map(mapTaskInsert))
    throwIfError(error)
  }

  const studyLogs = normalized.studyLogs.map((log) => ({
    ...log,
    userId,
    planId: log.planId,
  }))
  if (studyLogs.length > 0) {
    const { error } = await client.from('study_logs').upsert(studyLogs.map(mapStudyLogInsert))
    throwIfError(error)
  }

  if (normalized.auditEvents.length > 0) {
    const { error } = await client
      .from('audit_events')
      .upsert(normalized.auditEvents.map((event) => mapAuditInsert(workspaceId, event)))
    throwIfError(error)
  }

  const activePlanId =
    normalized.meta.activePlanId ||
    plans.find((plan) => plan.status === 'active')?.id ||
    plans[0]?.id
  if (activePlanId) {
    const { error } = await client.from('user_preferences').upsert({
      user_id: userId,
      workspace_id: workspaceId,
      key: 'activePlanId',
      value: activePlanId,
    })
    throwIfError(error)
  }
}

export async function exportBackupFromCloud(
  client: SupabaseClient,
  workspaceId: Id,
): Promise<GanbaLogBackup> {
  const { data: plans, error: plansError } = await client
    .from('plans')
    .select('*')
    .eq('workspace_id', workspaceId)
  throwIfError(plansError)

  const planIds = (plans ?? []).map((p) => p.id as string)
  const exportedAt = new Date().toISOString()

  if (planIds.length === 0) {
    return {
      version: 1,
      exportedAt,
      plans: [],
      materials: [],
      materialUnits: [],
      scheduleItems: [],
      tasks: [],
      checkpoints: [],
      studyLogs: [],
      auditEvents: [],
      logEntries: [],
      meta: {},
    }
  }

  const [
    { data: materials, error: materialsError },
    { data: scheduleItems, error: scheduleError },
    { data: checkpoints, error: checkpointsError },
    { data: tasks, error: tasksError },
    { data: auditEvents, error: auditError },
  ] = await Promise.all([
    client.from('materials').select('*').in('plan_id', planIds),
    client.from('schedule_items').select('*').in('plan_id', planIds),
    client.from('checkpoints').select('*').in('plan_id', planIds),
    client.from('tasks').select('*').in('plan_id', planIds),
    client.from('audit_events').select('*').eq('workspace_id', workspaceId),
  ])
  throwIfError(materialsError)
  throwIfError(scheduleError)
  throwIfError(checkpointsError)
  throwIfError(tasksError)
  throwIfError(auditError)

  const materialIds = (materials ?? []).map((m) => m.id as string)
  const { data: materialUnits, error: unitsError } =
    materialIds.length > 0
      ? await client.from('material_units').select('*').in('material_id', materialIds)
      : { data: [], error: null }
  throwIfError(unitsError)

  const { data: studyLogs, error: logsError } = await client
    .from('study_logs')
    .select('*')
    .in('plan_id', planIds)
  throwIfError(logsError)

  return {
    version: 1,
    exportedAt,
    plans: (plans ?? []).map((row) => mapPlan(row as Record<string, unknown>)),
    materials: (materials ?? []).map((row) => mapMaterial(row as Record<string, unknown>)),
    materialUnits: (materialUnits ?? []).map((row) => mapMaterialUnit(row as Record<string, unknown>)),
    scheduleItems: (scheduleItems ?? []).map((row) => mapScheduleItem(row as Record<string, unknown>)),
    tasks: (tasks ?? []).map((row) => mapTask(row as Record<string, unknown>)),
    checkpoints: (checkpoints ?? []).map((row) => mapCheckpoint(row as Record<string, unknown>)),
    studyLogs: (studyLogs ?? []).map((row) => mapStudyLog(row as Record<string, unknown>)),
    auditEvents: (auditEvents ?? []).map((row) => mapAuditEvent(row as Record<string, unknown>)),
    logEntries: [],
    meta: {},
  }
}
