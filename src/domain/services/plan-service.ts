import type { AuditService } from '../../core/audit/audit-service'
import type { Clock } from '../../core/clock'
import type { IdGenerator } from '../../core/ids'
import { activePlanPrefKey, type MutableActorContext } from '../../core/session/actor-context'
import { LOCAL_WORKSPACE_ID } from '../../core/session/constants'
import type {
  Checkpoint,
  Id,
  IsoDate,
  Material,
  MaterialUnit,
  Plan,
  ScheduleItem,
  Weekday,
} from '../models'
import type {
  CheckpointRepository,
  MaterialRepository,
  MaterialUnitRepository,
  MetaRepository,
  PlanRepository,
  ScheduleRepository,
  TaskRepository,
  UserPreferenceRepository,
} from '../repositories'
import {
  supportsMaterialChecklist,
} from './material-units'
import { normalizeMaterialTags } from '../material-tags'

export { MATERIAL_CHECKLIST_MAX, supportsMaterialChecklist } from './material-units'

export interface UpdateMaterialInput {
  name: string
  unitLabel: string
  totalUnits: number
  tags: string[]
}

const ACTIVE_PLAN_KEY = 'activePlanId'

export interface NewPlanInput {
  name: string
  description: string
  startDate: IsoDate
  targetDate: IsoDate
  sourceTemplateId?: string | null
}

export interface UpdatePlanInput {
  name: string
  description: string
  startDate: IsoDate
  targetDate: IsoDate
}

/** Mengelola plan, materi, jadwal mingguan, dan checkpoint. */
export class PlanService {
  constructor(
    private readonly plans: PlanRepository,
    private readonly materials: MaterialRepository,
    private readonly materialUnits: MaterialUnitRepository,
    private readonly schedule: ScheduleRepository,
    private readonly checkpoints: CheckpointRepository,
    private readonly tasks: TaskRepository,
    private readonly preferences: UserPreferenceRepository,
    private readonly meta: MetaRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly audit: AuditService,
    private readonly actor: MutableActorContext,
  ) {}

  private prefKey(): string {
    return activePlanPrefKey(this.actor.userId)
  }

  private async getActivePlanId(): Promise<string | undefined> {
    const scoped = await this.preferences.get(
      this.actor.userId,
      this.actor.workspaceId,
      ACTIVE_PLAN_KEY,
    )
    if (scoped) return scoped
    return this.meta.get(this.prefKey())
  }

  private async setActivePlanId(planId: Id): Promise<void> {
    await this.preferences.set(
      this.actor.userId,
      this.actor.workspaceId,
      ACTIVE_PLAN_KEY,
      planId,
    )
    await this.meta.set(this.prefKey(), planId)
  }

  /* ----------------------------- Plan ------------------------------ */

  getPlans(): Promise<Plan[]> {
    return this.plans.getByWorkspace(this.actor.workspaceId)
  }

  async getActivePlan(): Promise<Plan | undefined> {
    const activeId = await this.getActivePlanId()
    if (activeId) {
      const plan = await this.plans.getById(activeId)
      if (plan && plan.status === 'active') return plan
    }
    const all = await this.getPlans()
    const firstActive = all.find((p) => p.status === 'active')
    if (firstActive) await this.setActivePlanId(firstActive.id)
    return firstActive
  }

  async setActivePlan(planId: Id): Promise<void> {
    await this.setActivePlanId(planId)
    const plan = await this.plans.getById(planId)
    this.audit.record('activate', 'plan', planId, plan?.name ?? planId)
  }

  async createPlan(input: NewPlanInput): Promise<Plan> {
    const now = this.clock.stamp()
    const plan: Plan = {
      id: this.ids.next(),
      workspaceId: this.actor.workspaceId || LOCAL_WORKSPACE_ID,
      name: input.name,
      description: input.description,
      startDate: input.startDate,
      targetDate: input.targetDate,
      status: 'active',
      sourceTemplateId: input.sourceTemplateId ?? null,
      createdAt: now,
      updatedAt: now,
    }
    await this.plans.save(plan)
    this.audit.record('create', 'plan', plan.id, plan.name)
    return plan
  }

  async updatePlan(plan: Plan): Promise<void> {
    await this.plans.save({ ...plan, updatedAt: this.clock.stamp() })
    this.audit.record('update', 'plan', plan.id, plan.name)
  }

  async updatePlanDetails(planId: Id, input: UpdatePlanInput): Promise<void> {
    const plan = await this.plans.getById(planId)
    if (!plan) return
    await this.updatePlan({
      ...plan,
      name: input.name.trim(),
      description: input.description.trim(),
      startDate: input.startDate,
      targetDate: input.targetDate,
    })
  }

  async archivePlan(planId: Id): Promise<void> {
    const plan = await this.plans.getById(planId)
    if (!plan || plan.status === 'archived') return
    await this.plans.save({ ...plan, status: 'archived', updatedAt: this.clock.stamp() })

    const activeId = await this.getActivePlanId()
    if (activeId === planId) {
      const nextActive = (await this.getPlans()).find((p) => p.status === 'active')
      await this.setActivePlanId(nextActive?.id ?? '')
    }

    this.audit.record('archive', 'plan', planId, plan.name)
  }

  async restorePlan(planId: Id): Promise<void> {
    const plan = await this.plans.getById(planId)
    if (!plan || plan.status !== 'archived') return
    await this.plans.save({ ...plan, status: 'active', updatedAt: this.clock.stamp() })
    this.audit.record('update', 'plan', planId, `${plan.name} (restored)`)
  }

  /** Hapus plan beserta materi, jadwal, task, dan checkpoint. Study log global tidak ikut terhapus. */
  async deletePlanPermanently(planId: Id): Promise<void> {
    const plan = await this.plans.getById(planId)
    if (!plan) return

    const materials = await this.materials.getByPlan(planId)
    for (const material of materials) {
      await this.materialUnits.deleteByMaterial(material.id)
      await this.materials.delete(material.id)
    }

    for (const item of await this.schedule.getByPlan(planId)) {
      await this.schedule.delete(item.id)
    }

    for (const checkpoint of await this.checkpoints.getByPlan(planId)) {
      await this.checkpoints.delete(checkpoint.id)
    }

    await this.tasks.deleteByPlan(planId)

    const activeId = await this.getActivePlanId()
    if (activeId === planId) {
      const nextActive = (await this.getPlans()).find(
        (p) => p.id !== planId && p.status === 'active',
      )
      await this.setActivePlanId(nextActive?.id ?? '')
    }

    await this.plans.delete(planId)
    this.audit.record('delete', 'plan', planId, plan.name)
  }

  /* --------------------------- Material ---------------------------- */

  getMaterials(planId: Id): Promise<Material[]> {
    return this.materials.getByPlan(planId)
  }

  async addMaterial(
    planId: Id,
    name: string,
    unitLabel: string,
    totalUnits: number,
    tags: string[] = [],
  ): Promise<Material> {
    const now = this.clock.stamp()
    const material: Material = {
      id: this.ids.next(),
      planId,
      name,
      unitLabel,
      totalUnits,
      doneUnits: 0,
      tags: normalizeMaterialTags(tags),
      createdAt: now,
      updatedAt: now,
    }
    await this.materials.save(material)
    await this.syncMaterialUnits(material, 0)
    this.audit.record('create', 'material', material.id, name)
    return material
  }

  async getMaterialUnits(materialId: Id): Promise<MaterialUnit[]> {
    const material = await this.materials.getById(materialId)
    if (!material || !supportsMaterialChecklist(material.totalUnits)) return []
    const existing = await this.materialUnits.getByMaterial(materialId)
    await this.syncMaterialUnits(material, existing.length === 0 ? material.doneUnits : undefined)
    const units = await this.materialUnits.getByMaterial(materialId)
    return units.sort((a, b) => a.index - b.index)
  }

  async toggleMaterialUnit(unitId: Id): Promise<void> {
    const unit = await this.materialUnits.getById(unitId)
    if (!unit) return
    const done = !unit.done
    const now = this.clock.stamp()
    await this.materialUnits.save({
      ...unit,
      done,
      completedAt: done ? now : null,
    })
    await this.syncMaterialDoneCount(unit.materialId)
    const material = await this.materials.getById(unit.materialId)
    this.audit.record(
      done ? 'complete' : 'reopen',
      'materialUnit',
      unitId,
      material ? `${material.name} #${unit.index}` : unitId,
    )
  }

  async updateMaterialDetails(materialId: Id, input: UpdateMaterialInput): Promise<void> {
    const material = await this.materials.getById(materialId)
    if (!material) return

    const totalUnits = Math.max(1, Math.floor(input.totalUnits))
    const next: Material = {
      ...material,
      name: input.name.trim(),
      unitLabel: input.unitLabel.trim() || '—',
      totalUnits,
      tags: normalizeMaterialTags(input.tags),
      doneUnits: Math.min(material.doneUnits, totalUnits),
      updatedAt: this.clock.stamp(),
    }
    await this.materials.save(next)

    if (supportsMaterialChecklist(totalUnits)) {
      const existing = await this.materialUnits.getByMaterial(materialId)
      await this.syncMaterialUnits(next, existing.length === 0 ? next.doneUnits : undefined)
    } else {
      await this.materialUnits.deleteByMaterial(materialId)
    }

    this.audit.record('update', 'material', materialId, next.name)
  }

  async updateMaterial(material: Material): Promise<void> {
    await this.materials.save({ ...material, updatedAt: this.clock.stamp() })
    this.audit.record('update', 'material', material.id, material.name)
  }

  async adjustMaterialProgress(materialId: Id, delta: number): Promise<void> {
    const material = await this.materials.getById(materialId)
    if (!material || delta === 0) return

    if (supportsMaterialChecklist(material.totalUnits)) {
      await this.syncMaterialUnits(material, material.doneUnits)
      const units = (await this.materialUnits.getByMaterial(materialId)).sort(
        (a, b) => a.index - b.index,
      )
      const now = this.clock.stamp()
      if (delta > 0) {
        const next = units.find((u) => !u.done)
        if (next) {
          await this.materialUnits.save({ ...next, done: true, completedAt: now })
        }
      } else {
        const last = [...units].reverse().find((u) => u.done)
        if (last) {
          await this.materialUnits.save({ ...last, done: false, completedAt: null })
        }
      }
      await this.syncMaterialDoneCount(materialId)
      const updated = await this.materials.getById(materialId)
      if (updated) {
        this.audit.record(
          'update',
          'material',
          materialId,
          `${updated.name}: ${updated.doneUnits}/${updated.totalUnits} ${updated.unitLabel}`,
        )
      }
      return
    }

    const doneUnits = Math.max(0, Math.min(material.totalUnits, material.doneUnits + delta))
    await this.materials.save({ ...material, doneUnits, updatedAt: this.clock.stamp() })
    this.audit.record(
      'update',
      'material',
      materialId,
      `${material.name}: ${doneUnits}/${material.totalUnits} ${material.unitLabel}`,
    )
  }

  async deleteMaterial(materialId: Id): Promise<void> {
    const material = await this.materials.getById(materialId)
    await this.materialUnits.deleteByMaterial(materialId)
    await this.materials.delete(materialId)
    this.audit.record('delete', 'material', materialId, material?.name ?? materialId)
  }

  private async syncMaterialDoneCount(materialId: Id): Promise<void> {
    const material = await this.materials.getById(materialId)
    if (!material) return
    const units = await this.materialUnits.getByMaterial(materialId)
    const doneUnits = units.filter((u) => u.done).length
    await this.materials.save({
      ...material,
      doneUnits,
      updatedAt: this.clock.stamp(),
    })
  }

  /** Buat / sesuaikan jumlah checklist unit. initialDone hanya dipakai saat pertama kali dibuat. */
  private async syncMaterialUnits(material: Material, initialDone?: number): Promise<void> {
    if (!supportsMaterialChecklist(material.totalUnits)) return

    const existing = (await this.materialUnits.getByMaterial(material.id)).sort(
      (a, b) => a.index - b.index,
    )
    const now = this.clock.stamp()
    const target = material.totalUnits

    if (existing.length === 0) {
      const doneCount = Math.min(target, Math.max(0, initialDone ?? 0))
      const units: MaterialUnit[] = Array.from({ length: target }, (_, i) => {
        const index = i + 1
        const done = index <= doneCount
        return {
          id: this.ids.next(),
          materialId: material.id,
          index,
          done,
          completedAt: done ? now : null,
          createdAt: now,
        }
      })
      await this.materialUnits.saveMany(units)
      await this.syncMaterialDoneCount(material.id)
      return
    }

    if (target > existing.length) {
      const extra: MaterialUnit[] = Array.from({ length: target - existing.length }, (_, i) => ({
        id: this.ids.next(),
        materialId: material.id,
        index: existing.length + i + 1,
        done: false,
        completedAt: null,
        createdAt: now,
      }))
      await this.materialUnits.saveMany(extra)
    } else if (target < existing.length) {
      const toRemove = existing.filter((u) => u.index > target)
      for (const unit of toRemove) await this.materialUnits.delete(unit.id)
    }

    await this.syncMaterialDoneCount(material.id)
  }

  /* ------------------------ Jadwal mingguan ------------------------ */

  getSchedule(planId: Id): Promise<ScheduleItem[]> {
    return this.schedule.getByPlan(planId)
  }

  async addScheduleItem(
    planId: Id,
    weekday: Weekday,
    title: string,
    materialId: Id | null,
  ): Promise<ScheduleItem> {
    const item: ScheduleItem = {
      id: this.ids.next(),
      planId,
      weekday,
      title,
      materialId,
      createdAt: this.clock.stamp(),
    }
    await this.schedule.save(item)
    this.audit.record('create', 'schedule', item.id, title)
    return item
  }

  async updateScheduleItem(item: ScheduleItem): Promise<void> {
    await this.schedule.save(item)
    this.audit.record('update', 'schedule', item.id, item.title)
  }

  async deleteScheduleItem(itemId: Id): Promise<void> {
    const item = await this.schedule.getById(itemId)
    await this.schedule.delete(itemId)
    this.audit.record('delete', 'schedule', itemId, item?.title ?? itemId)
  }

  /* --------------------------- Checkpoint -------------------------- */

  getCheckpoints(planId: Id): Promise<Checkpoint[]> {
    return this.checkpoints.getByPlan(planId)
  }

  async addCheckpoint(planId: Id, title: string, dueDate: IsoDate): Promise<Checkpoint> {
    const checkpoint: Checkpoint = {
      id: this.ids.next(),
      planId,
      title,
      dueDate,
      status: 'open',
      achievedAt: null,
      createdAt: this.clock.stamp(),
    }
    await this.checkpoints.save(checkpoint)
    this.audit.record('create', 'checkpoint', checkpoint.id, title)
    return checkpoint
  }

  async toggleCheckpoint(checkpointId: Id): Promise<void> {
    const checkpoint = await this.checkpoints.getById(checkpointId)
    if (!checkpoint) return
    const achieved = checkpoint.status !== 'achieved'
    await this.checkpoints.save({
      ...checkpoint,
      status: achieved ? 'achieved' : 'open',
      achievedAt: achieved ? this.clock.stamp() : null,
    })
    this.audit.record(
      achieved ? 'complete' : 'reopen',
      'checkpoint',
      checkpointId,
      checkpoint.title,
    )
  }

  async updateCheckpoint(checkpoint: Checkpoint): Promise<void> {
    await this.checkpoints.save(checkpoint)
    this.audit.record('update', 'checkpoint', checkpoint.id, checkpoint.title)
  }

  async deleteCheckpoint(checkpointId: Id): Promise<void> {
    const checkpoint = await this.checkpoints.getById(checkpointId)
    await this.checkpoints.delete(checkpointId)
    this.audit.record('delete', 'checkpoint', checkpointId, checkpoint?.title ?? checkpointId)
  }
}
