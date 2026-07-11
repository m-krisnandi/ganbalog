import type { AuditService } from '../core/audit/audit-service'
import type { Logger } from '../core/logging/logger'
import type { PlanService } from '../domain/services/plan-service'
import type { TaskService } from '../domain/services/task-service'
import type { MetaRepository } from '../domain/repositories'
import type { Weekday } from '../domain/models'
import { isSupabaseEnabled } from './supabase/config'

const SEED_FLAG_KEY = 'seeded.v1'
const LOCALE_MIGRATION_KEY = 'seed.locale.en.v1'

/** Teks seed dalam bahasa Inggris (netral untuk semua locale UI). */
const SEED_PLAN = {
  name: 'JLPT N2 — December 2026',
  description:
    '4-month prep (August–November). Months 1–2: bunpou, kanji & tango. Add dokkai/choukai from month 3. 継続は力なり!',
  startDate: '2026-08-03',
  targetDate: '2026-12-06',
} as const

const SEED_MATERIALS = [
  { name: 'SKM Bunpou N2', unitLabel: 'chapters', totalUnits: 18 },
  { name: 'SKM Dokkai N2', unitLabel: 'sections', totalUnits: 20 },
  { name: 'SKM Choukai N2', unitLabel: 'sections', totalUnits: 15 },
  { name: 'N2 Tango 3000', unitLabel: 'words', totalUnits: 3000 },
  { name: 'Kanji Master N2', unitLabel: 'sections', totalUnits: 30 },
  { name: 'Mock Test / 過去問', unitLabel: 'set', totalUnits: 4 },
] as const

const SCHEDULE_V2_MIGRATION_KEY = 'seed.schedule.v2'

/** Mingguan fase awal: bunpou + kanji + tango dulu. Choukai/Dokkai masuk setelah fondasi kuat. */
const SEED_WEEKLY: Array<{ weekday: Weekday; title: string; materialIndex: number | null }> = [
  { weekday: 1, title: 'SKM Bunpou — 1 chapter', materialIndex: 0 },
  { weekday: 1, title: 'N2 Tango 3000 — 30 words', materialIndex: 3 },
  { weekday: 2, title: 'Kanji Master — 1 section', materialIndex: 4 },
  { weekday: 2, title: 'N2 Tango 3000 — 30 words', materialIndex: 3 },
  { weekday: 3, title: 'SKM Bunpou — 1 chapter', materialIndex: 0 },
  { weekday: 3, title: 'N2 Tango 3000 — 30 words', materialIndex: 3 },
  { weekday: 4, title: 'Kanji Master — 1 section', materialIndex: 4 },
  { weekday: 4, title: 'N2 Tango 3000 — 30 words', materialIndex: 3 },
  { weekday: 5, title: 'SKM Bunpou — 1 chapter', materialIndex: 0 },
  { weekday: 5, title: 'N2 Tango 3000 — 30 words', materialIndex: 3 },
  { weekday: 6, title: 'Weekly review', materialIndex: null },
]

/** Jadwal lama — dipakai untuk migrasi plan yang sudah ter-seed. */
const LEGACY_SCHEDULE_V1: Record<string, { title: string; materialIndex: number | null }> = {
  'Choukai — 1 section': { title: 'N2 Tango 3000 — 30 words', materialIndex: 3 },
  'Dokkai — 2 passages': { title: 'Weekly review', materialIndex: null },
}

const SEED_CHECKPOINTS = [
  { title: 'Bunpou ch. 1–6, Tango ±750 words, Kanji ±25%', dueDate: '2026-08-31' },
  { title: 'Bunpou ch. 7–12, Tango ±1500 words, Kanji ±50%', dueDate: '2026-09-30' },
  { title: 'Bunpou & Kanji done, first mock test', dueDate: '2026-10-31' },
  { title: 'Tango 3000 complete, 3+ mock tests above passing line', dueDate: '2026-11-30' },
] as const

/** Versi Indonesia lama — dipakai sekali untuk migrasi data yang sudah ter-seed. */
const LEGACY_ID = {
  planName: 'JLPT N2 — Desember 2026',
  planDescription: 'Persiapan 4 bulan (Agustus–November). 継続は力なり!',
  unitLabels: { bab: 'chapters', bagian: 'sections', kata: 'words' } as const,
  scheduleTitles: {
    'SKM Bunpou — 1 bab': 'SKM Bunpou — 1 chapter',
    'Tango 3000 — 30 kata': 'N2 Tango 3000 — 30 words',
    'Kanji Master — 1 bagian': 'Kanji Master — 1 section',
    'Choukai — 1 bagian': 'Choukai — 1 section',
    'Dokkai — 2 soal': 'Dokkai — 2 passages',
    'Fukushū minggu ini': 'Weekly review',
  } as const,
  checkpointTitles: {
    'Bunpou bab 1–6, Tango ±750 kata, Kanji ±25%': 'Bunpou ch. 1–6, Tango ±750 words, Kanji ±25%',
    'Bunpou bab 7–12, Tango ±1500 kata, Kanji ±50%': 'Bunpou ch. 7–12, Tango ±1500 words, Kanji ±50%',
    'Bunpou & Kanji SELESAI, mock test pertama': 'Bunpou & Kanji done, first mock test',
    'Tango 3000 selesai, 3+ mock test di atas passing line':
      'Tango 3000 complete, 3+ mock tests above passing line',
  } as const,
}

/**
 * Seed satu kali: plan JLPT N2 sesuai draft jadwal 4 bulan,
 * lengkap dengan materi, jadwal mingguan, dan checkpoint per bulan.
 */
export async function seedIfNeeded(
  planService: PlanService,
  taskService: TaskService,
  meta: MetaRepository,
  audit: AuditService,
  logger: Logger,
): Promise<void> {
  if (typeof meta?.get !== 'function' || typeof meta?.set !== 'function') {
    throw new Error(
      'seedIfNeeded: argumen meta tidak valid — pastikan urutan: planService, taskService, meta, audit, logger',
    )
  }

  await migrateLegacyIndonesianSeed(planService, taskService, meta, logger)
  await migrateSeedScheduleV2(planService, taskService, meta, logger)

  const existingPlans = await planService.getPlans()
  if (existingPlans.length > 0) return

  const seeded = await meta.get(SEED_FLAG_KEY)
  if (seeded && !isSupabaseEnabled()) return

  logger.info('Seeding plan JLPT N2 pertama kali')

  const plan = await planService.createPlan({
    name: SEED_PLAN.name,
    description: SEED_PLAN.description,
    startDate: SEED_PLAN.startDate,
    targetDate: SEED_PLAN.targetDate,
  })

  const materials = []
  for (const item of SEED_MATERIALS) {
    materials.push(
      await planService.addMaterial(plan.id, item.name, item.unitLabel, item.totalUnits),
    )
  }

  for (const item of SEED_WEEKLY) {
    const materialId = item.materialIndex === null ? null : materials[item.materialIndex].id
    await planService.addScheduleItem(plan.id, item.weekday, item.title, materialId)
  }

  for (const checkpoint of SEED_CHECKPOINTS) {
    await planService.addCheckpoint(plan.id, checkpoint.title, checkpoint.dueDate)
  }

  await planService.setActivePlan(plan.id)
  await meta.set(SEED_FLAG_KEY, new Date().toISOString())
  audit.record('seed', 'plan', plan.id, plan.name)
}

/** Ubah data seed lama (bahasa Indonesia) ke Inggris untuk install yang sudah ada. */
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

/** Jadwal mingguan v2: hapus choukai/dokkai di awal, fokus fondasi dulu. */
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
    if (plan.name !== SEED_PLAN.name) continue

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

    if (plan.description !== SEED_PLAN.description) {
      migrated = true
      await planService.updatePlan({ ...plan, description: SEED_PLAN.description })
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
