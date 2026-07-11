import Dexie, { type EntityTable } from 'dexie'
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
  UserProfile,
  Workspace,
  WorkspaceMember,
} from '../../domain/models'
import { LOCAL_USER_ID, LOCAL_WORKSPACE_ID } from '../../core/session/constants'
import { activePlanPrefKey } from '../../core/session/actor-context'

interface MetaRow {
  key: string
  value: string
}

export class GanbaLogDb extends Dexie {
  plans!: EntityTable<Plan, 'id'>
  materials!: EntityTable<Material, 'id'>
  materialUnits!: EntityTable<MaterialUnit, 'id'>
  scheduleItems!: EntityTable<ScheduleItem, 'id'>
  tasks!: EntityTable<Task, 'id'>
  checkpoints!: EntityTable<Checkpoint, 'id'>
  studyLogs!: EntityTable<StudyLog, 'id'>
  auditEvents!: EntityTable<AuditEvent, 'id'>
  logEntries!: EntityTable<LogEntry, 'id'>
  meta!: EntityTable<MetaRow, 'key'>
  workspaces!: EntityTable<Workspace, 'id'>
  workspaceMembers!: EntityTable<WorkspaceMember, 'id'>
  userProfiles!: EntityTable<UserProfile, 'id'>

  constructor() {
    super('ganbalog')
    this.version(1).stores({
      plans: 'id, status',
      materials: 'id, planId',
      scheduleItems: 'id, planId, weekday',
      tasks: 'id, planId, date, [planId+date]',
      checkpoints: 'id, planId, dueDate',
      studyLogs: 'id, &date',
      auditEvents: 'id, at',
      logEntries: 'id, at',
      meta: 'key',
    })
    this.version(2).stores({
      materialUnits: 'id, materialId, [materialId+index]',
    })
    this.version(3)
      .stores({
        plans: 'id, workspaceId, status',
        studyLogs: 'id, userId, planId, date, [userId+planId+date]',
        workspaces: 'id',
        workspaceMembers: 'id, workspaceId, userId, [workspaceId+userId]',
        userProfiles: 'id',
      })
      .upgrade(async (tx) => {
        const plans = await tx.table<Plan>('plans').toArray()
        let activePlanId = ''
        const legacyActive = await tx.table<MetaRow>('meta').get('activePlanId')
        if (legacyActive?.value) {
          activePlanId = legacyActive.value
          await tx.table<MetaRow>('meta').put({
            key: activePlanPrefKey(LOCAL_USER_ID),
            value: legacyActive.value,
          })
          await tx.table<MetaRow>('meta').delete('activePlanId')
        }

        for (const plan of plans) {
          const patch: Partial<Plan> = {}
          if (!plan.workspaceId) patch.workspaceId = LOCAL_WORKSPACE_ID
          if (Object.keys(patch).length > 0) {
            await tx.table<Plan>('plans').update(plan.id, patch)
          }
          if (!activePlanId && plan.status === 'active') activePlanId = plan.id
        }

        const logs = await tx.table<StudyLog>('studyLogs').toArray()
        for (const log of logs) {
          const patch: Partial<StudyLog> = {}
          if (!log.userId) patch.userId = LOCAL_USER_ID
          if (!log.planId) patch.planId = activePlanId
          if (Object.keys(patch).length > 0) {
            await tx.table<StudyLog>('studyLogs').update(log.id, patch)
          }
        }

        const audits = await tx.table<AuditEvent>('auditEvents').toArray()
        for (const event of audits) {
          if (event.actorUserId === undefined) {
            await tx.table<AuditEvent>('auditEvents').update(event.id, {
              actorUserId: null,
              actorDisplayName: null,
            })
          }
        }

        const now = new Date().toISOString()
        const workspaceExists = await tx.table<Workspace>('workspaces').get(LOCAL_WORKSPACE_ID)
        if (!workspaceExists) {
          await tx.table<Workspace>('workspaces').put({
            id: LOCAL_WORKSPACE_ID,
            name: 'GanbaLog',
            createdAt: now,
          })
        }
        const memberKey = `${LOCAL_WORKSPACE_ID}:${LOCAL_USER_ID}`
        const memberExists = await tx.table<WorkspaceMember>('workspaceMembers').get(memberKey)
        if (!memberExists) {
          await tx.table<WorkspaceMember>('workspaceMembers').put({
            id: memberKey,
            workspaceId: LOCAL_WORKSPACE_ID,
            userId: LOCAL_USER_ID,
            role: 'member',
            joinedAt: now,
          })
        }
      })
  }
}

export function createDb(): GanbaLogDb {
  return new GanbaLogDb()
}
