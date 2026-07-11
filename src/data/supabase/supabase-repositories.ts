import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AuditEvent,
  Checkpoint,
  Id,
  IsoDate,
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
  MaterialRepository,
  MaterialUnitRepository,
  PlanRepository,
  ScheduleRepository,
  StudyLogRepository,
  TaskRepository,
  UserPreferenceRepository,
  UserProfileRepository,
  WorkspaceRepository,
} from '../../domain/repositories'
import type { MutableActorContext } from '../../core/session/actor-context'
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
  mapUserProfile,
  mapUserProfileInsert,
  mapWorkspace,
  mapWorkspaceMember,
} from './mappers'

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

export class SupabasePlanRepository implements PlanRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getByWorkspace(workspaceId: Id): Promise<Plan[]> {
    const { data, error } = await this.client
      .from('plans')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at')
    throwIfError(error)
    return (data ?? []).map((row) => mapPlan(row as Record<string, unknown>))
  }

  async getById(id: Id): Promise<Plan | undefined> {
    const { data, error } = await this.client.from('plans').select('*').eq('id', id).maybeSingle()
    throwIfError(error)
    return data ? mapPlan(data as Record<string, unknown>) : undefined
  }

  async save(plan: Plan): Promise<void> {
    const { error } = await this.client.from('plans').upsert(mapPlanInsert(plan))
    throwIfError(error)
  }

  async delete(id: Id): Promise<void> {
    const { error } = await this.client.from('plans').delete().eq('id', id)
    throwIfError(error)
  }
}

export class SupabaseMaterialRepository implements MaterialRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getByPlan(planId: Id): Promise<Material[]> {
    const { data, error } = await this.client.from('materials').select('*').eq('plan_id', planId)
    throwIfError(error)
    return (data ?? []).map((row) => mapMaterial(row as Record<string, unknown>))
  }

  async getById(id: Id): Promise<Material | undefined> {
    const { data, error } = await this.client
      .from('materials')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    throwIfError(error)
    return data ? mapMaterial(data as Record<string, unknown>) : undefined
  }

  async save(material: Material): Promise<void> {
    const { error } = await this.client.from('materials').upsert(mapMaterialInsert(material))
    throwIfError(error)
  }

  async delete(id: Id): Promise<void> {
    const { error } = await this.client.from('materials').delete().eq('id', id)
    throwIfError(error)
  }
}

export class SupabaseMaterialUnitRepository implements MaterialUnitRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getByMaterial(materialId: Id): Promise<MaterialUnit[]> {
    const { data, error } = await this.client
      .from('material_units')
      .select('*')
      .eq('material_id', materialId)
    throwIfError(error)
    return (data ?? []).map((row) => mapMaterialUnit(row as Record<string, unknown>))
  }

  async getById(id: Id): Promise<MaterialUnit | undefined> {
    const { data, error } = await this.client
      .from('material_units')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    throwIfError(error)
    return data ? mapMaterialUnit(data as Record<string, unknown>) : undefined
  }

  async save(unit: MaterialUnit): Promise<void> {
    const { error } = await this.client.from('material_units').upsert(mapMaterialUnitInsert(unit))
    throwIfError(error)
  }

  async saveMany(units: MaterialUnit[]): Promise<void> {
    if (units.length === 0) return
    const { error } = await this.client
      .from('material_units')
      .upsert(units.map(mapMaterialUnitInsert))
    throwIfError(error)
  }

  async delete(id: Id): Promise<void> {
    const { error } = await this.client.from('material_units').delete().eq('id', id)
    throwIfError(error)
  }

  async deleteByMaterial(materialId: Id): Promise<void> {
    const { error } = await this.client.from('material_units').delete().eq('material_id', materialId)
    throwIfError(error)
  }
}

export class SupabaseScheduleRepository implements ScheduleRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getByPlan(planId: Id): Promise<ScheduleItem[]> {
    const { data, error } = await this.client
      .from('schedule_items')
      .select('*')
      .eq('plan_id', planId)
    throwIfError(error)
    return (data ?? []).map((row) => mapScheduleItem(row as Record<string, unknown>))
  }

  async getById(id: Id): Promise<ScheduleItem | undefined> {
    const { data, error } = await this.client
      .from('schedule_items')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    throwIfError(error)
    return data ? mapScheduleItem(data as Record<string, unknown>) : undefined
  }

  async save(item: ScheduleItem): Promise<void> {
    const { error } = await this.client.from('schedule_items').upsert(mapScheduleInsert(item))
    throwIfError(error)
  }

  async delete(id: Id): Promise<void> {
    const { error } = await this.client.from('schedule_items').delete().eq('id', id)
    throwIfError(error)
  }
}

export class SupabaseTaskRepository implements TaskRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly getUserId: () => Id,
  ) {}

  async getByPlanAndDate(planId: Id, date: IsoDate): Promise<Task[]> {
    const { data, error } = await this.client
      .from('tasks')
      .select('*')
      .eq('plan_id', planId)
      .eq('date', date)
      .eq('user_id', this.getUserId())
    throwIfError(error)
    return (data ?? []).map((row) => mapTask(row as Record<string, unknown>))
  }

  async getByPlan(planId: Id): Promise<Task[]> {
    const { data, error } = await this.client
      .from('tasks')
      .select('*')
      .eq('plan_id', planId)
      .eq('user_id', this.getUserId())
    throwIfError(error)
    return (data ?? []).map((row) => mapTask(row as Record<string, unknown>))
  }

  async getById(id: Id): Promise<Task | undefined> {
    const { data, error } = await this.client.from('tasks').select('*').eq('id', id).maybeSingle()
    throwIfError(error)
    return data ? mapTask(data as Record<string, unknown>) : undefined
  }

  async countDoneByPlanAndDate(planId: Id, date: IsoDate): Promise<number> {
    const { count, error } = await this.client
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('plan_id', planId)
      .eq('date', date)
      .eq('user_id', this.getUserId())
      .eq('status', 'done')
    throwIfError(error)
    return count ?? 0
  }

  async save(task: Task): Promise<void> {
    const { error } = await this.client.from('tasks').upsert(mapTaskInsert(task))
    throwIfError(error)
  }

  async saveMany(tasks: Task[]): Promise<void> {
    if (tasks.length === 0) return
    const { error } = await this.client.from('tasks').upsert(tasks.map(mapTaskInsert))
    throwIfError(error)
  }

  async delete(id: Id): Promise<void> {
    const { error } = await this.client.from('tasks').delete().eq('id', id)
    throwIfError(error)
  }

  async deleteByPlan(planId: Id): Promise<void> {
    const { error } = await this.client.from('tasks').delete().eq('plan_id', planId)
    throwIfError(error)
  }
}

export class SupabaseCheckpointRepository implements CheckpointRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getByPlan(planId: Id): Promise<Checkpoint[]> {
    const { data, error } = await this.client
      .from('checkpoints')
      .select('*')
      .eq('plan_id', planId)
    throwIfError(error)
    return (data ?? []).map((row) => mapCheckpoint(row as Record<string, unknown>))
  }

  async getById(id: Id): Promise<Checkpoint | undefined> {
    const { data, error } = await this.client
      .from('checkpoints')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    throwIfError(error)
    return data ? mapCheckpoint(data as Record<string, unknown>) : undefined
  }

  async save(checkpoint: Checkpoint): Promise<void> {
    const { error } = await this.client
      .from('checkpoints')
      .upsert(mapCheckpointInsert(checkpoint))
    throwIfError(error)
  }

  async delete(id: Id): Promise<void> {
    const { error } = await this.client.from('checkpoints').delete().eq('id', id)
    throwIfError(error)
  }
}

export class SupabaseStudyLogRepository implements StudyLogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getByUserAndPlan(userId: Id, planId: Id): Promise<StudyLog[]> {
    const { data, error } = await this.client
      .from('study_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_id', planId)
    throwIfError(error)
    return (data ?? []).map((row) => mapStudyLog(row as Record<string, unknown>))
  }

  async getByPlan(planId: Id): Promise<StudyLog[]> {
    const { data, error } = await this.client
      .from('study_logs')
      .select('*')
      .eq('plan_id', planId)
    throwIfError(error)
    return (data ?? []).map((row) => mapStudyLog(row as Record<string, unknown>))
  }

  async getByUserPlanDate(
    userId: Id,
    planId: Id,
    date: IsoDate,
  ): Promise<StudyLog | undefined> {
    const { data, error } = await this.client
      .from('study_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_id', planId)
      .eq('date', date)
      .maybeSingle()
    throwIfError(error)
    return data ? mapStudyLog(data as Record<string, unknown>) : undefined
  }

  async save(log: StudyLog): Promise<void> {
    const { error } = await this.client.from('study_logs').upsert(mapStudyLogInsert(log))
    throwIfError(error)
  }

  async deleteByUserPlanDate(userId: Id, planId: Id, date: IsoDate): Promise<void> {
    const { error } = await this.client
      .from('study_logs')
      .delete()
      .eq('user_id', userId)
      .eq('plan_id', planId)
      .eq('date', date)
    throwIfError(error)
  }
}

const MAX_AUDIT_EVENTS = 2000

export class SupabaseAuditRepository implements AuditRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly actor: MutableActorContext,
  ) {}

  async append(event: AuditEvent): Promise<void> {
    const { error } = await this.client
      .from('audit_events')
      .upsert(mapAuditInsert(this.actor.workspaceId, event))
    throwIfError(error)

    const { count, error: countError } = await this.client
      .from('audit_events')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', this.actor.workspaceId)
    throwIfError(countError)
    if ((count ?? 0) <= MAX_AUDIT_EVENTS) return

    const { data: oldest, error: oldestError } = await this.client
      .from('audit_events')
      .select('id')
      .eq('workspace_id', this.actor.workspaceId)
      .order('at', { ascending: true })
      .limit((count ?? 0) - MAX_AUDIT_EVENTS)
    throwIfError(oldestError)
    if (!oldest?.length) return
    const { error: deleteError } = await this.client
      .from('audit_events')
      .delete()
      .in(
        'id',
        oldest.map((row) => row.id as string),
      )
    throwIfError(deleteError)
  }

  async getRecent(limit: number): Promise<AuditEvent[]> {
    const { data, error } = await this.client
      .from('audit_events')
      .select('*')
      .eq('workspace_id', this.actor.workspaceId)
      .order('at', { ascending: false })
      .limit(limit)
    throwIfError(error)
    return (data ?? []).map((row) => mapAuditEvent(row as Record<string, unknown>))
  }

  async clear(): Promise<void> {
    const { error } = await this.client
      .from('audit_events')
      .delete()
      .eq('workspace_id', this.actor.workspaceId)
    throwIfError(error)
  }
}

export class SupabaseUserPreferenceRepository implements UserPreferenceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async get(userId: Id, workspaceId: Id, key: string): Promise<string | undefined> {
    const { data, error } = await this.client
      .from('user_preferences')
      .select('value')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .eq('key', key)
      .maybeSingle()
    throwIfError(error)
    return (data?.value as string | undefined) ?? undefined
  }

  async set(userId: Id, workspaceId: Id, key: string, value: string): Promise<void> {
    const { error } = await this.client.from('user_preferences').upsert({
      user_id: userId,
      workspace_id: workspaceId,
      key,
      value,
    })
    throwIfError(error)
  }
}

export class SupabaseWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getById(id: Id): Promise<Workspace | undefined> {
    const { data, error } = await this.client
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    throwIfError(error)
    return data ? mapWorkspace(data as Record<string, unknown>) : undefined
  }

  async save(workspace: Workspace): Promise<void> {
    const { error } = await this.client.from('workspaces').upsert({
      id: workspace.id,
      name: workspace.name,
      invite_code: workspace.inviteCode,
      created_at: workspace.createdAt,
    })
    throwIfError(error)
  }

  async updateInviteCode(workspaceId: Id, inviteCode: string): Promise<void> {
    const { error } = await this.client
      .from('workspaces')
      .update({ invite_code: inviteCode })
      .eq('id', workspaceId)
    throwIfError(error)
  }

  async updateName(workspaceId: Id, name: string): Promise<void> {
    const { error } = await this.client.from('workspaces').update({ name }).eq('id', workspaceId)
    throwIfError(error)
  }

  async getMembers(workspaceId: Id): Promise<WorkspaceMember[]> {
    const { data, error } = await this.client
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
    throwIfError(error)
    return (data ?? []).map((row) => mapWorkspaceMember(row as Record<string, unknown>))
  }

  async addMember(member: WorkspaceMember): Promise<void> {
    const { error } = await this.client.from('workspace_members').insert({
      id: member.id,
      workspace_id: member.workspaceId,
      user_id: member.userId,
      role: member.role,
      joined_at: member.joinedAt,
    })
    throwIfError(error)
  }

  async removeMember(workspaceId: Id, userId: Id): Promise<void> {
    const { error } = await this.client
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
    throwIfError(error)
  }
}

export class SupabaseUserProfileRepository implements UserProfileRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getById(id: Id): Promise<UserProfile | undefined> {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    throwIfError(error)
    return data ? mapUserProfile(data as Record<string, unknown>) : undefined
  }

  async save(profile: UserProfile): Promise<void> {
    const { error } = await this.client.from('user_profiles').upsert(mapUserProfileInsert(profile))
    throwIfError(error)
  }

  async getByWorkspace(workspaceId: Id): Promise<UserProfile[]> {
    const { data: members, error } = await this.client
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
    throwIfError(error)
    const ids = (members ?? []).map((m) => m.user_id as string)
    if (ids.length === 0) return []
    const { data, error: profileError } = await this.client
      .from('user_profiles')
      .select('*')
      .in('id', ids)
    throwIfError(profileError)
    return (data ?? []).map((row) => mapUserProfile(row as Record<string, unknown>))
  }
}
