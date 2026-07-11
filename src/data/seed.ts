import type { AuditService } from '../core/audit/audit-service'
import type { Logger } from '../core/logging/logger'
import type { PlanService } from '../domain/services/plan-service'
import type { TaskService } from '../domain/services/task-service'
import type { MetaRepository } from '../domain/repositories'
import { JLPT_N2_TEMPLATE, SEED_PLAN } from './study-templates'

const LOCALE_MIGRATION_KEY = 'seed.locale.en.v1'
const SCHEDULE_V2_MIGRATION_KEY = 'seed.schedule.v2'
const SCHEDULE_V3_MIGRATION_KEY = 'seed.schedule.v3'

const LEGACY_SCHEDULE_V1: Record<string, { title: string; materialIndex: number | null }> = {
  'Choukai — 1 section': { title: 'N2 Tango 3000 — 30 words', materialIndex: 3 },
  'Dokkai — 2 passages': { title: 'Weekly reflection', materialIndex: null },
}

const LEGACY_ID = {
  planName: 'JLPT N2 — Desember 2026',
  unitLabels: { bab: 'chapters', bagian: 'sections', kata: 'words', set: 'set' },
  scheduleTitles: {
    'SKM Bunpou — 1 bab': 'SKM Bunpou — 1 chapter',
    'N2 Tango 3000 — 30 kata': 'N2 Tango 3000 — 30 words',
    'Kanji Master — 1 bagian': 'Kanji Master — 1 section',
    'Choukai — 1 bagian': 'Choukai — 1 section',
    'Dokkai — 2 teks': 'Dokkai — 2 passages',
    'Review mingguan': 'Weekly reflection',
  },
  checkpointTitles: {
    'Bulan 1 — Bunpou bab 1–6 + 600 tango': 'Month 1 — Bunpou ch. 1–6 + 600 vocab',
    'Bulan 2 — Bunpou bab 7–12 + kanji setengah': 'Month 2 — Bunpou ch. 7–12 + kanji half',
    'Bulan 3 — Mulai dokkai + mock test 1': 'Month 3 — Start dokkai + mock test 1',
    'Bulan 4 — Mock penuh + review area lemah': 'Month 4 — Full mock + review weak areas',
  },
} as const

export { createJlptN2TemplatePlan, createStudyTemplatePlan, SEED_PLAN } from './study-templates'

/**
 * Migrasi data seed lama saja — tidak auto-buat plan baru.
 * Plan pertama kali dibuat lewat onboarding wizard.
 */
export async function seedIfNeeded(
  planService: PlanService,
  taskService: TaskService,
  meta: MetaRepository,
  _audit: AuditService,
  logger: Logger,
): Promise<void> {
  if (typeof meta?.get !== 'function' || typeof meta?.set !== 'function') {
    throw new Error(
      'seedIfNeeded: argumen meta tidak valid — pastikan urutan: planService, taskService, meta, audit, logger',
    )
  }

  await migrateLegacyIndonesianSeed(planService, taskService, meta, logger)
  await migrateSeedScheduleV2(planService, taskService, meta, logger)
  await migrateSeedScheduleV3(planService, taskService, meta, logger)
}

async function migrateLegacyIndonesianSeed(
  planService: PlanService,
  taskService: TaskService,
  meta: MetaRepository,
  logger: Logger,
): Promise<void> {
  if (await meta.get(LOCALE_MIGRATION_KEY)) return

  const plans = await planService.getPlans()
  let migrated = false

  for (const plan of plans) {
    if (plan.name !== LEGACY_ID.planName) continue
    migrated = true

    await planService.updatePlan({
      ...plan,
      name: SEED_PLAN.name,
      description: SEED_PLAN.description,
    })

    const materials = await planService.getMaterials(plan.id)
    for (const material of materials) {
      const nextUnit =
        LEGACY_ID.unitLabels[material.unitLabel as keyof typeof LEGACY_ID.unitLabels]
      if (nextUnit) await planService.updateMaterial({ ...material, unitLabel: nextUnit })
    }

    const schedule = await planService.getSchedule(plan.id)
    for (const item of schedule) {
      const nextTitle =
        LEGACY_ID.scheduleTitles[item.title as keyof typeof LEGACY_ID.scheduleTitles]
      if (nextTitle) await planService.updateScheduleItem({ ...item, title: nextTitle })
    }

    const checkpoints = await planService.getCheckpoints(plan.id)
    for (const checkpoint of checkpoints) {
      const nextTitle =
        LEGACY_ID.checkpointTitles[checkpoint.title as keyof typeof LEGACY_ID.checkpointTitles]
      if (nextTitle) await planService.updateCheckpoint({ ...checkpoint, title: nextTitle })
    }

    await taskService.remapTaskTitles(plan.id, LEGACY_ID.scheduleTitles)
  }

  await meta.set(LOCALE_MIGRATION_KEY, new Date().toISOString())
  if (migrated) logger.info('Migrasi seed Indonesia → Inggris selesai')
}

async function migrateSeedScheduleV2(
  planService: PlanService,
  taskService: TaskService,
  meta: MetaRepository,
  logger: Logger,
): Promise<void> {
  if (await meta.get(SCHEDULE_V2_MIGRATION_KEY)) return

  const plans = await planService.getPlans()
  let migrated = false

  for (const plan of plans) {
    if (plan.name !== JLPT_N2_TEMPLATE.plan.name) continue

    const materials = await planService.getMaterials(plan.id)
    const materialByIndex = (index: number) => materials[index]?.id ?? null

    const schedule = await planService.getSchedule(plan.id)
    for (const item of schedule) {
      const next = LEGACY_SCHEDULE_V1[item.title]
      if (!next) continue
      migrated = true
      await planService.updateScheduleItem({
        ...item,
        title: next.title,
        materialId: next.materialIndex === null ? null : materialByIndex(next.materialIndex),
      })
    }

    if (plan.description !== JLPT_N2_TEMPLATE.plan.description) {
      migrated = true
      await planService.updatePlan({ ...plan, description: JLPT_N2_TEMPLATE.plan.description })
    }

    const titleMap: Record<string, string> = {}
    for (const [oldTitle, next] of Object.entries(LEGACY_SCHEDULE_V1)) {
      titleMap[oldTitle] = next.title
    }
    if (Object.keys(titleMap).length > 0) {
      await taskService.remapTaskTitles(plan.id, titleMap)
    }
  }

  await meta.set(SCHEDULE_V2_MIGRATION_KEY, new Date().toISOString())
  if (migrated) logger.info('Migrasi jadwal seed v2 (fondasi dulu) selesai')
  else logger.debug('Migrasi jadwal seed v2: tidak ada perubahan')
}

async function migrateSeedScheduleV3(
  planService: PlanService,
  taskService: TaskService,
  meta: MetaRepository,
  logger: Logger,
): Promise<void> {
  if (await meta.get(SCHEDULE_V3_MIGRATION_KEY)) return

  const plans = await planService.getPlans()
  let migrated = false
  const titleMap: Record<string, string> = {
    'Weekly review': 'Weekly reflection',
    'Weekly review + weak areas': 'Weekly reflection + weak areas',
    'Weekly review + wrong-answer log': 'Weekly reflection + wrong-answer log',
    'Weekly review + vocab recycle': 'Weekly reflection + vocab recycle',
  }

  for (const plan of plans) {
    const schedule = await planService.getSchedule(plan.id)

    for (const item of schedule) {
      const nextTitle = titleMap[item.title]
      if (nextTitle) {
        migrated = true
        await planService.updateScheduleItem({ ...item, title: nextTitle })
      }
    }

    const refreshed = await planService.getSchedule(plan.id)
    const byWeekday = new Map<number, typeof refreshed>()
    for (const item of refreshed) {
      const bucket = byWeekday.get(item.weekday) ?? []
      bucket.push(item)
      byWeekday.set(item.weekday, bucket)
    }

    for (const items of byWeekday.values()) {
      const seen = new Set<string>()
      for (const item of items) {
        const key = item.title.trim().toLowerCase()
        if (seen.has(key)) {
          migrated = true
          await planService.deleteScheduleItem(item.id)
        } else {
          seen.add(key)
        }
      }
    }

    if (Object.keys(titleMap).length > 0) {
      await taskService.remapTaskTitles(plan.id, titleMap)
    }
  }

  await meta.set(SCHEDULE_V3_MIGRATION_KEY, new Date().toISOString())
  if (migrated) logger.info('Migrasi jadwal seed v3 (weekly reflection + dedupe) selesai')
  else logger.debug('Migrasi jadwal seed v3: tidak ada perubahan')
}
