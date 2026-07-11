import type { AuditService } from '../core/audit/audit-service'
import type { PlanService } from '../domain/services/plan-service'
import type { Id, IsoDate, Weekday } from '../domain/models'

export const PLAN_TEMPLATE_VERSION = 1 as const

/** Structure-only export — no tasks, logs, or progress. Shareable between users. */
export interface PlanTemplatePayload {
  version: typeof PLAN_TEMPLATE_VERSION
  exportedAt: string
  name: string
  description: string
  startDate: IsoDate
  targetDate: IsoDate
  sourceTemplateId: string | null
  materials: ReadonlyArray<{
    name: string
    unitLabel: string
    totalUnits: number
    tags: string[]
  }>
  schedule: ReadonlyArray<{
    weekday: Weekday
    title: string
    materialIndex: number | null
  }>
  checkpoints: ReadonlyArray<{ title: string; dueDate: IsoDate }>
}

export class PlanTemplateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlanTemplateError'
  }
}

export async function exportPlanTemplate(
  planService: PlanService,
  planId: Id,
  exportedAt: string,
): Promise<PlanTemplatePayload> {
  const plan = await planService.getPlans().then((plans) => plans.find((p) => p.id === planId))
  if (!plan) throw new PlanTemplateError('planNotFound')

  const materials = await planService.getMaterials(planId)
  const schedule = await planService.getSchedule(planId)
  const checkpoints = await planService.getCheckpoints(planId)
  const materialIndex = new Map(materials.map((m, i) => [m.id, i]))

  return {
    version: PLAN_TEMPLATE_VERSION,
    exportedAt,
    name: plan.name,
    description: plan.description,
    startDate: plan.startDate,
    targetDate: plan.targetDate,
    sourceTemplateId: plan.sourceTemplateId,
    materials: materials.map((m) => ({
      name: m.name,
      unitLabel: m.unitLabel,
      totalUnits: m.totalUnits,
      tags: m.tags,
    })),
    schedule: schedule.map((item) => ({
      weekday: item.weekday,
      title: item.title,
      materialIndex: item.materialId === null ? null : (materialIndex.get(item.materialId) ?? null),
    })),
    checkpoints: checkpoints.map((cp) => ({ title: cp.title, dueDate: cp.dueDate })),
  }
}

export async function importPlanTemplate(
  planService: PlanService,
  audit: AuditService,
  payload: PlanTemplatePayload,
  options?: { activate?: boolean },
): Promise<Id> {
  validatePlanTemplate(payload)

  const plan = await planService.createPlan({
    name: payload.name,
    description: payload.description,
    startDate: payload.startDate,
    targetDate: payload.targetDate,
    sourceTemplateId: payload.sourceTemplateId ?? null,
  })

  const materials = []
  for (const item of payload.materials) {
    materials.push(
      await planService.addMaterial(
        plan.id,
        item.name,
        item.unitLabel,
        item.totalUnits,
        item.tags,
      ),
    )
  }

  for (const item of payload.schedule) {
    const materialId = item.materialIndex === null ? null : materials[item.materialIndex]?.id ?? null
    await planService.addScheduleItem(plan.id, item.weekday, item.title, materialId)
  }

  for (const checkpoint of payload.checkpoints) {
    await planService.addCheckpoint(plan.id, checkpoint.title, checkpoint.dueDate)
  }

  if (options?.activate !== false) {
    await planService.setActivePlan(plan.id)
  }

  audit.record('create', 'plan', plan.id, `${plan.name} (imported template)`)
  return plan.id
}

export function parsePlanTemplateJson(text: string): PlanTemplatePayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new PlanTemplateError('invalidJson')
  }
  validatePlanTemplate(parsed)
  return parsed as PlanTemplatePayload
}

function validatePlanTemplate(data: unknown): asserts data is PlanTemplatePayload {
  if (!data || typeof data !== 'object') throw new PlanTemplateError('invalidFormat')
  const payload = data as Partial<PlanTemplatePayload>
  if (payload.version !== PLAN_TEMPLATE_VERSION) throw new PlanTemplateError('unsupportedVersion')
  if (!validText(payload.name, 120) || !validText(payload.description, 2_000, true)) {
    throw new PlanTemplateError('invalidFormat')
  }
  if (!validDate(payload.startDate) || !validDate(payload.targetDate)) {
    throw new PlanTemplateError('invalidFormat')
  }
  if (payload.targetDate < payload.startDate) throw new PlanTemplateError('invalidFormat')
  if (
    payload.sourceTemplateId !== undefined &&
    payload.sourceTemplateId !== null &&
    !validText(payload.sourceTemplateId, 64)
  ) {
    throw new PlanTemplateError('invalidFormat')
  }
  if (!Array.isArray(payload.materials) || !Array.isArray(payload.schedule)) {
    throw new PlanTemplateError('invalidFormat')
  }
  if (!Array.isArray(payload.checkpoints)) throw new PlanTemplateError('invalidFormat')
  if (
    payload.materials.length > 100 ||
    payload.schedule.length > 200 ||
    payload.checkpoints.length > 100
  ) {
    throw new PlanTemplateError('tooLarge')
  }

  for (const material of payload.materials) {
    if (
      !material ||
      !validText(material.name, 160) ||
      !validText(material.unitLabel, 40) ||
      !Number.isInteger(material.totalUnits) ||
      material.totalUnits < 1 ||
      material.totalUnits > 100_000 ||
      !Array.isArray(material.tags) ||
      material.tags.length > 10 ||
      material.tags.some((tag: unknown) => !validText(tag, 32))
    ) {
      throw new PlanTemplateError('invalidFormat')
    }
  }

  for (const item of payload.schedule) {
    if (
      !item ||
      !Number.isInteger(item.weekday) ||
      item.weekday! < 1 ||
      item.weekday! > 7 ||
      !validText(item.title, 200) ||
      (item.materialIndex !== null &&
        (!Number.isInteger(item.materialIndex) ||
          item.materialIndex! < 0 ||
          item.materialIndex! >= payload.materials.length))
    ) {
      throw new PlanTemplateError('invalidFormat')
    }
  }

  for (const checkpoint of payload.checkpoints) {
    if (
      !checkpoint ||
      !validText(checkpoint.title, 200) ||
      !validDate(checkpoint.dueDate)
    ) {
      throw new PlanTemplateError('invalidFormat')
    }
  }
}

function validText(value: unknown, max: number, allowEmpty = false): value is string {
  return (
    typeof value === 'string' &&
    value.length <= max &&
    (allowEmpty || value.trim().length > 0)
  )
}

function validDate(value: unknown): value is IsoDate {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function downloadPlanTemplateFile(payload: PlanTemplatePayload): void {
  const slug = payload.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  const date = payload.exportedAt.slice(0, 10)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `ganbalog-plan-${slug || 'template'}-${date}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
