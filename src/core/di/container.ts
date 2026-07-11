/**
 * Composition root — satu-satunya tempat implementasi konkret dirakit.
 * Mode lokal (IndexedDB) atau cloud (Supabase) dipilih lewat env.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { SystemClock, type Clock } from '../clock'
import { UuidGenerator, type IdGenerator } from '../ids'
import { CompositeLogger, ConsoleSink, type Logger } from '../logging/logger'
import { PersistentSink } from '../logging/persistent-sink'
import { AuditService } from '../audit/audit-service'
import { AuthService } from '../auth/auth-service'
import { MutableActorContext } from '../session/actor-context'
import { createDb } from '../../data/local/db'
import {
  LocalAuditRepository,
  LocalCheckpointRepository,
  LocalLogRepository,
  LocalMaterialRepository,
  LocalMaterialUnitRepository,
  LocalMetaRepository,
  LocalPlanRepository,
  LocalScheduleRepository,
  LocalStudyLogRepository,
  LocalTaskRepository,
  LocalUserPreferenceRepository,
} from '../../data/local/local-repositories'
import { PlanService } from '../../domain/services/plan-service'
import { TaskService } from '../../domain/services/task-service'
import { StudyLogService } from '../../domain/services/study-log-service'
import { FixedIntervalReviewPolicy } from '../../domain/services/review-scheduler'
import { BackupService } from '../../data/backup'
import { isSupabaseEnabled } from '../../data/supabase/config'
import { getSupabaseClient } from '../../data/supabase/client'
import {
  SupabaseAuditRepository,
  SupabaseCheckpointRepository,
  SupabaseMaterialRepository,
  SupabaseMaterialUnitRepository,
  SupabasePlanRepository,
  SupabaseScheduleRepository,
  SupabaseStudyLogRepository,
  SupabaseTaskRepository,
  SupabaseUserPreferenceRepository,
  SupabaseUserProfileRepository,
  SupabaseWorkspaceRepository,
} from '../../data/supabase/supabase-repositories'
import type { LogRepository, MetaRepository } from '../../domain/repositories'

export interface Container {
  clock: Clock
  logger: Logger
  audit: AuditService
  planService: PlanService
  taskService: TaskService
  studyLogService: StudyLogService
  meta: MetaRepository
  logRepository: LogRepository
  backupService: BackupService
  actor: MutableActorContext
  auth: AuthService | null
  supabase: SupabaseClient | null
  cloudEnabled: boolean
}

export function buildContainer(): Container {
  const clock: Clock = new SystemClock()
  const ids: IdGenerator = new UuidGenerator()
  const actor = new MutableActorContext()
  const cloudEnabled = isSupabaseEnabled()

  if (cloudEnabled) {
    return buildSupabaseContainer(clock, ids, actor)
  }
  return buildLocalContainer(clock, ids, actor)
}

function buildLocalContainer(
  clock: Clock,
  ids: IdGenerator,
  actor: MutableActorContext,
): Container {
  const db = createDb()

  const logRepository = new LocalLogRepository(db)
  const logger: Logger = new CompositeLogger([
    new ConsoleSink(),
    new PersistentSink(logRepository, clock, ids),
  ])

  const audit = new AuditService(new LocalAuditRepository(db), clock, ids, logger, actor)
  const preferences = new LocalUserPreferenceRepository(db)
  const meta = new LocalMetaRepository(db)

  const taskRepository = new LocalTaskRepository(db)
  const scheduleRepository = new LocalScheduleRepository(db)

  const planService = new PlanService(
    new LocalPlanRepository(db),
    new LocalMaterialRepository(db),
    new LocalMaterialUnitRepository(db),
    scheduleRepository,
    new LocalCheckpointRepository(db),
    taskRepository,
    preferences,
    meta,
    clock,
    ids,
    audit,
    actor,
  )

  const studyLogService = new StudyLogService(
    new LocalStudyLogRepository(db),
    clock,
    ids,
    audit,
    actor,
    planService,
  )

  const taskService = new TaskService(
    taskRepository,
    scheduleRepository,
    new FixedIntervalReviewPolicy(),
    studyLogService,
    clock,
    ids,
    audit,
    logger,
  )

  return {
    clock,
    logger,
    audit,
    planService,
    taskService,
    studyLogService,
    meta,
    logRepository,
    backupService: new BackupService(db, clock, ids),
    actor,
    auth: null,
    supabase: null,
    cloudEnabled: false,
  }
}

function buildSupabaseContainer(
  clock: Clock,
  ids: IdGenerator,
  actor: MutableActorContext,
): Container {
  const supabase = getSupabaseClient()
  const db = createDb()

  const logRepository = new LocalLogRepository(db)
  const logger: Logger = new CompositeLogger([
    new ConsoleSink(),
    new PersistentSink(logRepository, clock, ids),
  ])

  const workspaces = new SupabaseWorkspaceRepository(supabase)
  const profiles = new SupabaseUserProfileRepository(supabase)
  const preferences = new SupabaseUserPreferenceRepository(supabase)

  const audit = new AuditService(
    new SupabaseAuditRepository(supabase, actor),
    clock,
    ids,
    logger,
    actor,
  )

  const taskRepository = new SupabaseTaskRepository(supabase)
  const scheduleRepository = new SupabaseScheduleRepository(supabase)

  const planService = new PlanService(
    new SupabasePlanRepository(supabase),
    new SupabaseMaterialRepository(supabase),
    new SupabaseMaterialUnitRepository(supabase),
    scheduleRepository,
    new SupabaseCheckpointRepository(supabase),
    taskRepository,
    preferences,
    new LocalMetaRepository(db),
    clock,
    ids,
    audit,
    actor,
  )

  const studyLogService = new StudyLogService(
    new SupabaseStudyLogRepository(supabase),
    clock,
    ids,
    audit,
    actor,
    planService,
  )

  const taskService = new TaskService(
    taskRepository,
    scheduleRepository,
    new FixedIntervalReviewPolicy(),
    studyLogService,
    clock,
    ids,
    audit,
    logger,
  )

  const auth = new AuthService(
    supabase,
    actor,
    workspaces,
    profiles,
    clock,
    ids,
    logger,
  )

  return {
    clock,
    logger,
    audit,
    planService,
    taskService,
    studyLogService,
    meta: new LocalMetaRepository(db),
    logRepository,
    backupService: new BackupService(db, clock, ids, {
      client: supabase,
      getWorkspaceId: () => actor.workspaceId,
      getUserId: () => actor.userId,
    }),
    actor,
    auth,
    supabase,
    cloudEnabled: true,
  }
}
