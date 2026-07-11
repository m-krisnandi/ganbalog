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
  Weekday,
  Workspace,
  WorkspaceMember,
} from '../../domain/models'

function toIsoDate(value: string): IsoDate {
  return value.slice(0, 10) as IsoDate
}

export function mapPlan(row: Record<string, unknown>): Plan {
  return {
    id: row.id as Id,
    workspaceId: row.workspace_id as Id,
    name: row.name as string,
    description: (row.description as string) ?? '',
    startDate: toIsoDate(row.start_date as string),
    targetDate: toIsoDate(row.target_date as string),
    status: row.status as Plan['status'],
    sourceTemplateId: (row.source_template_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function mapPlanInsert(plan: Plan): Record<string, unknown> {
  return {
    id: plan.id,
    workspace_id: plan.workspaceId,
    name: plan.name,
    description: plan.description,
    start_date: plan.startDate,
    target_date: plan.targetDate,
    status: plan.status,
    source_template_id: plan.sourceTemplateId,
    created_at: plan.createdAt,
    updated_at: plan.updatedAt,
  }
}

export function mapMaterial(row: Record<string, unknown>): Material {
  return {
    id: row.id as Id,
    planId: row.plan_id as Id,
    name: row.name as string,
    unitLabel: row.unit_label as string,
    totalUnits: row.total_units as number,
    doneUnits: row.done_units as number,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function mapMaterialInsert(material: Material): Record<string, unknown> {
  return {
    id: material.id,
    plan_id: material.planId,
    name: material.name,
    unit_label: material.unitLabel,
    total_units: material.totalUnits,
    done_units: material.doneUnits,
    tags: material.tags,
    created_at: material.createdAt,
    updated_at: material.updatedAt,
  }
}

export function mapMaterialUnit(row: Record<string, unknown>): MaterialUnit {
  return {
    id: row.id as Id,
    materialId: row.material_id as Id,
    index: row.index as number,
    done: row.done as boolean,
    completedAt: (row.completed_at as string | null) ?? null,
    createdAt: row.created_at as string,
  }
}

export function mapMaterialUnitInsert(unit: MaterialUnit): Record<string, unknown> {
  return {
    id: unit.id,
    material_id: unit.materialId,
    index: unit.index,
    done: unit.done,
    completed_at: unit.completedAt,
    created_at: unit.createdAt,
  }
}

export function mapScheduleItem(row: Record<string, unknown>): ScheduleItem {
  return {
    id: row.id as Id,
    planId: row.plan_id as Id,
    weekday: row.weekday as Weekday,
    title: row.title as string,
    materialId: (row.material_id as Id | null) ?? null,
    createdAt: row.created_at as string,
  }
}

export function mapScheduleInsert(item: ScheduleItem): Record<string, unknown> {
  return {
    id: item.id,
    plan_id: item.planId,
    weekday: item.weekday,
    title: item.title,
    material_id: item.materialId,
    created_at: item.createdAt,
  }
}

export function mapTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as Id,
    userId: (row.user_id as Id) ?? ('local-user' as Id),
    planId: row.plan_id as Id,
    date: toIsoDate(row.date as string),
    title: row.title as string,
    kind: row.kind as Task['kind'],
    status: row.status as Task['status'],
    materialId: (row.material_id as Id | null) ?? null,
    scheduleItemId: (row.schedule_item_id as Id | null) ?? null,
    reviewOfTaskId: (row.review_of_task_id as Id | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    createdAt: row.created_at as string,
  }
}

export function mapTaskInsert(task: Task): Record<string, unknown> {
  return {
    id: task.id,
    user_id: task.userId,
    plan_id: task.planId,
    date: task.date,
    title: task.title,
    kind: task.kind,
    status: task.status,
    material_id: task.materialId,
    schedule_item_id: task.scheduleItemId,
    review_of_task_id: task.reviewOfTaskId,
    completed_at: task.completedAt,
    created_at: task.createdAt,
  }
}

export function mapCheckpoint(row: Record<string, unknown>): Checkpoint {
  return {
    id: row.id as Id,
    planId: row.plan_id as Id,
    title: row.title as string,
    dueDate: toIsoDate(row.due_date as string),
    status: row.status as Checkpoint['status'],
    achievedAt: (row.achieved_at as string | null) ?? null,
    createdAt: row.created_at as string,
  }
}

export function mapCheckpointInsert(checkpoint: Checkpoint): Record<string, unknown> {
  return {
    id: checkpoint.id,
    plan_id: checkpoint.planId,
    title: checkpoint.title,
    due_date: checkpoint.dueDate,
    status: checkpoint.status,
    achieved_at: checkpoint.achievedAt,
    created_at: checkpoint.createdAt,
  }
}

export function mapStudyLog(row: Record<string, unknown>): StudyLog {
  return {
    id: row.id as Id,
    userId: row.user_id as Id,
    planId: row.plan_id as Id,
    date: toIsoDate(row.date as string),
    minutes: (row.minutes as number | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function mapStudyLogInsert(log: StudyLog): Record<string, unknown> {
  return {
    id: log.id,
    user_id: log.userId,
    plan_id: log.planId,
    date: log.date,
    minutes: log.minutes,
    created_at: log.createdAt,
    updated_at: log.updatedAt,
  }
}

export function mapAuditEvent(row: Record<string, unknown>): AuditEvent {
  return {
    id: row.id as Id,
    at: row.at as string,
    action: row.action as AuditEvent['action'],
    entity: row.entity as string,
    entityId: row.entity_id as Id,
    detail: row.detail as string,
    actorUserId: (row.actor_user_id as Id | null) ?? null,
    actorDisplayName: (row.actor_display_name as string | null) ?? null,
  }
}

export function mapAuditInsert(
  workspaceId: Id,
  event: AuditEvent,
): Record<string, unknown> {
  return {
    id: event.id,
    workspace_id: workspaceId,
    at: event.at,
    action: event.action,
    entity: event.entity,
    entity_id: event.entityId,
    detail: event.detail,
    actor_user_id: event.actorUserId,
    actor_display_name: event.actorDisplayName,
  }
}

export function mapWorkspace(row: Record<string, unknown>): Workspace {
  return {
    id: row.id as Id,
    name: row.name as string,
    inviteCode: (row.invite_code as string | null) ?? null,
    createdAt: row.created_at as string,
  }
}

export function mapWorkspaceMember(row: Record<string, unknown>): WorkspaceMember {
  return {
    id: row.id as Id,
    workspaceId: row.workspace_id as Id,
    userId: row.user_id as Id,
    role: 'member',
    joinedAt: row.joined_at as string,
  }
}

export function mapUserProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as Id,
    email: row.email as string,
    displayName: row.display_name as string,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    createdAt: row.created_at as string,
  }
}

export function mapUserProfileInsert(profile: UserProfile): Record<string, unknown> {
  return {
    id: profile.id,
    email: profile.email,
    display_name: profile.displayName,
    avatar_url: profile.avatarUrl,
    created_at: profile.createdAt,
  }
}
