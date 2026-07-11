import type { AuditService } from '../../core/audit/audit-service'
import type { Clock } from '../../core/clock'
import type { IdGenerator } from '../../core/ids'
import type { Id, IsoDate, StudyLog } from '../models'
import type { StudyLogRepository } from '../repositories'
import type { MutableActorContext } from '../../core/session/actor-context'
import type { PlanService } from './plan-service'

/** Catatan hari belajar per user per plan. Durasi opsional lewat chip cepat. */
export class StudyLogService {
  constructor(
    private readonly logs: StudyLogRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly audit: AuditService,
    private readonly actor: MutableActorContext,
    private readonly plans: PlanService,
  ) {}

  private async scope(): Promise<{ userId: Id; planId: Id } | null> {
    const plan = await this.plans.getActivePlan()
    if (!plan) return null
    return { userId: this.actor.userId, planId: plan.id }
  }

  async getAllForActivePlan(): Promise<StudyLog[]> {
    const plan = await this.plans.getActivePlan()
    if (!plan) return []
    return this.logs.getByPlan(plan.id)
  }

  async getForActivePlan(): Promise<StudyLog[]> {
    const ctx = await this.scope()
    if (!ctx) return []
    return this.logs.getByUserAndPlan(ctx.userId, ctx.planId)
  }

  async getByDate(date: IsoDate): Promise<StudyLog | undefined> {
    const ctx = await this.scope()
    if (!ctx) return undefined
    return this.logs.getByUserPlanDate(ctx.userId, ctx.planId, date)
  }

  async ensureLoggedToday(): Promise<void> {
    await this.ensureLoggedForDateScoped(this.clock.todayIso())
  }

  async syncForDate(planId: Id, date: IsoDate, doneTaskCount: number): Promise<void> {
    const userId = this.actor.userId
    if (doneTaskCount > 0) {
      await this.ensureLoggedForDate(planId, userId, date)
      return
    }
    await this.removeOrphanForDate(planId, date)
  }

  /** Hapus log harian tanpa durasi (sisa auto-log setelah task dibatalkan). */
  private async removeOrphanForDate(planId: Id, date: IsoDate): Promise<void> {
    const userId = this.actor.userId
    const existing = await this.logs.getByUserPlanDate(userId, planId, date)
    if (!existing) return
    if (existing.minutes != null) return
    await this.logs.deleteByUserPlanDate(userId, planId, date)
    this.audit.record('delete', 'studyLog', existing.id, date)
  }

  /** Hapus log harian sepenuhnya (mis. user membatalkan pilihan durasi). */
  async removeForDate(planId: Id, date: IsoDate): Promise<void> {
    const userId = this.actor.userId
    const existing = await this.logs.getByUserPlanDate(userId, planId, date)
    if (!existing) return
    await this.logs.deleteByUserPlanDate(userId, planId, date)
    this.audit.record('delete', 'studyLog', existing.id, date)
  }

  async setMinutesToday(minutes: number | null): Promise<void> {
    const ctx = await this.scope()
    if (!ctx) return
    const today = this.clock.todayIso()
    const existing = await this.logs.getByUserPlanDate(ctx.userId, ctx.planId, today)
    if (minutes === null) {
      if (!existing) return
      const now = this.clock.stamp()
      await this.logs.save({ ...existing, minutes: null, updatedAt: now })
      this.audit.record('update', 'studyLog', existing.id, `${today}: cleared`)
      return
    }
    const now = this.clock.stamp()
    const log: StudyLog = existing
      ? { ...existing, minutes, updatedAt: now }
      : {
          id: this.ids.next(),
          userId: ctx.userId,
          planId: ctx.planId,
          date: today,
          minutes,
          createdAt: now,
          updatedAt: now,
        }
    await this.logs.save(log)
    this.audit.record('update', 'studyLog', log.id, `${today}: ${minutes}m`)
  }

  private async ensureLoggedForDate(planId: Id, userId: Id, date: IsoDate): Promise<void> {
    const existing = await this.logs.getByUserPlanDate(userId, planId, date)
    if (existing) return
    const now = this.clock.stamp()
    const log: StudyLog = {
      id: this.ids.next(),
      userId,
      planId,
      date,
      minutes: null,
      createdAt: now,
      updatedAt: now,
    }
    await this.logs.save(log)
    this.audit.record('create', 'studyLog', log.id, date)
  }

  private async ensureLoggedForDateScoped(date: IsoDate): Promise<void> {
    const ctx = await this.scope()
    if (!ctx) return
    await this.ensureLoggedForDate(ctx.planId, ctx.userId, date)
  }
}
