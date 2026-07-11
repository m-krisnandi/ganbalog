import { getISODay, parseISO } from 'date-fns'
import type { AuditService } from '../../core/audit/audit-service'
import type { Clock } from '../../core/clock'
import type { IdGenerator } from '../../core/ids'
import type { Logger } from '../../core/logging/logger'
import type { MutableActorContext } from '../../core/session/actor-context'
import type { Id, IsoDate, Task, Weekday } from '../models'
import type { ScheduleRepository, TaskRepository } from '../repositories'
import type { ReviewPolicy } from './review-scheduler'
import type { StudyLogService } from './study-log-service'

/**
 * Mengelola task harian:
 * - Men-generate task dari jadwal mingguan saat halaman Today dibuka.
 * - Menjadwalkan fukushū otomatis saat task belajar dicentang selesai.
 * - Mencatat hari belajar (StudyLog) otomatis saat ada task selesai.
 */
export class TaskService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly schedule: ScheduleRepository,
    private readonly reviewPolicy: ReviewPolicy,
    private readonly studyLogs: StudyLogService,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly audit: AuditService,
    private readonly logger: Logger,
    private readonly actor: MutableActorContext,
  ) {}

  /**
   * Pastikan task untuk tanggal tsb sudah digenerate dari jadwal mingguan.
   * Idempotent: item jadwal yang sudah punya task di tanggal itu dilewati.
   */
  async ensureTasksForDate(planId: Id, date: IsoDate): Promise<Task[]> {
    const weekday = getISODay(parseISO(date)) as Weekday
    const [scheduleItems, existing] = await Promise.all([
      this.schedule.getByPlan(planId),
      this.tasks.getByPlanAndDate(planId, date),
    ])

    const existingScheduleIds = new Set(
      existing.filter((t) => t.scheduleItemId).map((t) => t.scheduleItemId),
    )

    const missing = scheduleItems.filter(
      (item) => item.weekday === weekday && !existingScheduleIds.has(item.id),
    )

    if (missing.length === 0) {
      await this.syncStudyLogForDate(planId, date)
      return existing
    }

    const now = this.clock.stamp()
    const created: Task[] = missing.map((item) => ({
      id: this.ids.next(),
      userId: this.actor.userId,
      planId,
      date,
      title: item.title,
      kind: 'study',
      status: 'open',
      materialId: item.materialId,
      scheduleItemId: item.id,
      reviewOfTaskId: null,
      completedAt: null,
      createdAt: now,
    }))

    await this.tasks.saveMany(created)
    this.logger.debug(`Generate ${created.length} task untuk ${date}`)
    const all = [...existing, ...created]
    await this.syncStudyLogForDate(planId, date)
    return all
  }

  getTasksForDate(planId: Id, date: IsoDate): Promise<Task[]> {
    return this.tasks.getByPlanAndDate(planId, date)
  }

  getAllTasks(planId: Id): Promise<Task[]> {
    return this.tasks.getByPlan(planId)
  }

  /** Remap judul task (mis. migrasi locale seed). Mendukung prefix review pada task review. */
  async remapTaskTitles(planId: Id, titleMap: Record<string, string>): Promise<void> {
    const tasks = await this.tasks.getByPlan(planId)
    const reviewPrefixes = ['Review: ', '復習: '] as const
    for (const task of tasks) {
      let next = titleMap[task.title]
      if (!next) {
        for (const prefix of reviewPrefixes) {
          if (!task.title.startsWith(prefix)) continue
          const mapped = titleMap[task.title.slice(prefix.length)]
          if (mapped) {
            next = `${prefix}${mapped}`
            break
          }
        }
      }
      if (next) await this.tasks.save({ ...task, title: next })
    }
  }

  /** Satu tap = selesai. Task belajar memicu jadwal fukushū otomatis. */
  async completeTask(taskId: Id): Promise<void> {
    const task = await this.tasks.getById(taskId)
    if (!task || task.status === 'done') return

    await this.tasks.save({ ...task, status: 'done', completedAt: this.clock.stamp() })
    this.audit.record('complete', 'task', taskId, task.title)

    await this.studyLogs.ensureLoggedToday()

    if (task.kind === 'study') {
      await this.scheduleReviews(task)
    }
  }

  async reopenTask(taskId: Id): Promise<void> {
    const task = await this.tasks.getById(taskId)
    if (!task) return

    if (task.status === 'skipped') {
      await this.tasks.save({ ...task, status: 'open', completedAt: null })
      this.audit.record('reopen', 'task', taskId, task.title)
      return
    }

    if (task.status !== 'done') return
    await this.tasks.save({ ...task, status: 'open', completedAt: null })
    await this.removeOpenReviewsOf(taskId)
    this.audit.record('reopen', 'task', taskId, task.title)
    await this.syncStudyLogForDate(task.planId, task.date)
  }

  private async syncStudyLogForDate(planId: Id, date: IsoDate): Promise<void> {
    const doneCount = await this.tasks.countDoneByPlanAndDate(planId, date)
    await this.studyLogs.syncForDate(planId, date, doneCount)
  }

  /** Fukushū boleh di-skip tanpa penalti. */
  async skipTask(taskId: Id): Promise<void> {
    const task = await this.tasks.getById(taskId)
    if (!task) return
    await this.tasks.save({
      ...task,
      status: 'skipped',
      completedAt: task.status === 'done' ? null : task.completedAt,
    })
    this.audit.record('skip', 'task', taskId, task.title)
    await this.syncStudyLogForDate(task.planId, task.date)
  }

  async addAdhocTask(planId: Id, date: IsoDate, title: string): Promise<Task> {
    const task: Task = {
      id: this.ids.next(),
      userId: this.actor.userId,
      planId,
      date,
      title,
      kind: 'study',
      status: 'open',
      materialId: null,
      scheduleItemId: null,
      reviewOfTaskId: null,
      completedAt: null,
      createdAt: this.clock.stamp(),
    }
    await this.tasks.save(task)
    this.audit.record('create', 'task', task.id, title)
    return task
  }

  /** Ubah judul task tambahan (ad-hoc). Task dari jadwal mingguan diubah di Plan, bukan di sini. */
  async renameAdhocTask(taskId: Id, title: string): Promise<void> {
    const task = await this.tasks.getById(taskId)
    if (!task) return
    const next = title.trim()
    if (!next || next === task.title) return
    await this.tasks.save({ ...task, title: next })
    this.audit.record('update', 'task', taskId, next)
  }

  async deleteTask(taskId: Id): Promise<void> {
    const task = await this.tasks.getById(taskId)
    await this.tasks.delete(taskId)
    this.audit.record('delete', 'task', taskId, task?.title ?? taskId)
  }

  /**
   * Hapus task dari hari ini.
   * - Jadwal mingguan: di-skip (supaya tidak generate ulang saat refresh).
   * - Ad-hoc / review: dihapus permanen.
   */
  async removeFromToday(taskId: Id): Promise<void> {
    const task = await this.tasks.getById(taskId)
    if (!task) return

    if (task.scheduleItemId) {
      await this.skipTask(taskId)
      return
    }

    await this.deleteTask(taskId)
    await this.syncStudyLogForDate(task.planId, task.date)
  }

  /** Hapus durasi hari ini. Kalau belum ada task selesai, log harian ikut dihapus. */
  async clearStudyDurationToday(planId: Id): Promise<void> {
    const today = this.clock.todayIso()
    const doneCount = await this.tasks.countDoneByPlanAndDate(planId, today)
    if (doneCount > 0) {
      await this.studyLogs.setMinutesToday(null)
      return
    }
    await this.studyLogs.removeForDate(planId, today)
  }

  private async scheduleReviews(sourceTask: Task): Promise<void> {
    const all = await this.tasks.getByPlan(sourceTask.planId)
    const alreadyScheduled = all.some((t) => t.reviewOfTaskId === sourceTask.id)
    if (alreadyScheduled) return

    const now = this.clock.stamp()
    const reviews: Task[] = this.reviewPolicy
      .reviewDates(sourceTask.date)
      .map((date) => ({
        id: this.ids.next(),
        userId: this.actor.userId,
        planId: sourceTask.planId,
        date,
        title: `Review: ${sourceTask.title}`,
        kind: 'review' as const,
        status: 'open' as const,
        materialId: sourceTask.materialId,
        scheduleItemId: null,
        reviewOfTaskId: sourceTask.id,
        completedAt: null,
        createdAt: now,
      }))

    await this.tasks.saveMany(reviews)
    this.audit.record(
      'create',
      'task',
      sourceTask.id,
      `Review +3/+7/+21: ${sourceTask.title}`,
    )
  }

  private async removeOpenReviewsOf(taskId: Id): Promise<void> {
    const task = await this.tasks.getById(taskId)
    if (!task) return
    const all = await this.tasks.getByPlan(task.planId)
    const openReviews = all.filter((t) => t.reviewOfTaskId === taskId && t.status === 'open')
    await Promise.all(openReviews.map((t) => this.tasks.delete(t.id)))
  }
}
