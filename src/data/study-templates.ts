import type { AuditService } from '../core/audit/audit-service'
import type { PlanService } from '../domain/services/plan-service'
import type { Id, IsoDate, Weekday } from '../domain/models'
import type { MaterialTagId } from '../domain/material-tags'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

export type StudyTemplateId =
  | 'jlpt-n2'
  | 'jlpt-n1'
  | 'bjt'
  | 'toeic-800'
  | 'ielts-65'
  | 'toefl'

/** i18n slug under `templates.*` */
export type TemplateI18nSlug = 'jlptN2' | 'jlptN1' | 'bjt' | 'toeic800' | 'ielts65' | 'toefl'

export const TEMPLATE_I18N_SLUG: Record<StudyTemplateId, TemplateI18nSlug> = {
  'jlpt-n2': 'jlptN2',
  'jlpt-n1': 'jlptN1',
  bjt: 'bjt',
  'toeic-800': 'toeic800',
  'ielts-65': 'ielts65',
  toefl: 'toefl',
}

export const TEMPLATE_GROUPS: ReadonlyArray<{
  labelKey: string
  ids: readonly StudyTemplateId[]
}> = [
  { labelKey: 'templates.groups.japanese', ids: ['jlpt-n2', 'jlpt-n1', 'bjt'] },
  { labelKey: 'templates.groups.english', ids: ['toeic-800', 'ielts-65', 'toefl'] },
]

export interface StudyTemplate {
  id: StudyTemplateId
  plan: {
    name: string
    description: string
    startDate: IsoDate
    targetDate: IsoDate
  }
  materials: ReadonlyArray<{
    name: string
    unitLabel: string
    totalUnits: number
    tags: MaterialTagId[]
  }>
  weekly: ReadonlyArray<{ weekday: Weekday; title: string; materialIndex: number | null }>
  checkpoints: ReadonlyArray<{ title: string; dueDate: IsoDate }>
  /** Preview tasks shown in onboarding Today mock */
  previewTasks: ReadonlyArray<string>
}

export const JLPT_N2_TEMPLATE: StudyTemplate = {
  id: 'jlpt-n2',
  plan: {
    name: 'JLPT N2 — December 2026',
    description:
      '4-month prep (Aug–Nov). Months 1–2: bunpou, kanji & vocab. Add dokkai/choukai from month 3. 継続は力なり!',
    startDate: '2026-08-03',
    targetDate: '2026-12-06',
  },
  materials: [
    { name: 'SKM Bunpou N2', unitLabel: 'chapters', totalUnits: 18, tags: ['grammar'] },
    { name: 'SKM Dokkai N2', unitLabel: 'sections', totalUnits: 20, tags: ['reading'] },
    { name: 'SKM Choukai N2', unitLabel: 'sections', totalUnits: 15, tags: ['listening'] },
    { name: 'N2 Tango 3000', unitLabel: 'words', totalUnits: 3000, tags: ['vocab'] },
    { name: 'Kanji Master N2', unitLabel: 'sections', totalUnits: 30, tags: ['kanji'] },
    { name: 'Mock Test / 過去問', unitLabel: 'set', totalUnits: 4, tags: ['mock'] },
  ],
  weekly: [
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
    { weekday: 6, title: 'Weekly reflection', materialIndex: null },
  ],
  checkpoints: [
    { title: 'Month 1 — Bunpou ch. 1–6 + 600 vocab', dueDate: '2026-09-06' },
    { title: 'Month 2 — Bunpou ch. 7–12 + kanji half', dueDate: '2026-10-04' },
    { title: 'Month 3 — Start dokkai + mock test 1', dueDate: '2026-11-01' },
    { title: 'Month 4 — Full mock + review weak areas', dueDate: '2026-12-01' },
  ],
  previewTasks: [
    'SKM Bunpou — 1 chapter',
    'N2 Tango 3000 — 30 words',
    'Kanji Master — 1 section',
  ],
}

export const JLPT_N1_TEMPLATE: StudyTemplate = {
  id: 'jlpt-n1',
  plan: {
    name: 'JLPT N1 — July 2027',
    description:
      '6-month prep (Feb–Jul). Months 1–2: bunpou & vocab base. Months 3–4: dokkai/choukai. Months 5–6: mocks & weak-area review.',
    startDate: '2027-02-01',
    targetDate: '2027-07-04',
  },
  materials: [
    { name: 'Shin Kanzen Bunpou N1', unitLabel: 'chapters', totalUnits: 50, tags: ['grammar'] },
    { name: 'Shin Kanzen Dokkai N1', unitLabel: 'sections', totalUnits: 24, tags: ['reading'] },
    { name: 'Shin Kanzen Choukai N1', unitLabel: 'sections', totalUnits: 20, tags: ['listening'] },
    { name: 'N1 Tango Master', unitLabel: 'words', totalUnits: 2000, tags: ['vocab'] },
    { name: 'Kanji for N1', unitLabel: 'sections', totalUnits: 40, tags: ['kanji'] },
    { name: 'Mock Test / 過去問', unitLabel: 'set', totalUnits: 6, tags: ['mock'] },
  ],
  weekly: [
    { weekday: 1, title: 'Shin Kanzen Bunpou — 1 chapter', materialIndex: 0 },
    { weekday: 1, title: 'N1 Tango Master — 25 words', materialIndex: 3 },
    { weekday: 2, title: 'Kanji for N1 — 1 section', materialIndex: 4 },
    { weekday: 2, title: 'N1 Tango Master — 25 words', materialIndex: 3 },
    { weekday: 3, title: 'Shin Kanzen Bunpou — 1 chapter', materialIndex: 0 },
    { weekday: 3, title: 'N1 Tango Master — 25 words', materialIndex: 3 },
    { weekday: 4, title: 'Shin Kanzen Dokkai — 1 section', materialIndex: 1 },
    { weekday: 5, title: 'Shin Kanzen Choukai — 1 section', materialIndex: 2 },
    { weekday: 5, title: 'N1 Tango Master — 25 words', materialIndex: 3 },
    { weekday: 6, title: 'Weekly reflection + weak areas', materialIndex: null },
  ],
  checkpoints: [
    { title: 'Month 1 — Bunpou ch. 1–15 + 400 vocab', dueDate: '2027-03-05' },
    { title: 'Month 2 — Bunpou ch. 16–30 + kanji half', dueDate: '2027-04-02' },
    { title: 'Month 3 — Bunpou done + start dokkai', dueDate: '2027-05-07' },
    { title: 'Month 4 — Choukai rhythm + 1200 vocab', dueDate: '2027-06-04' },
    { title: 'Month 5 — Mock tests 1–2', dueDate: '2027-06-25' },
    { title: 'Month 6 — Full mock + final review', dueDate: '2027-07-01' },
  ],
  previewTasks: [
    'Shin Kanzen Bunpou — 1 chapter',
    'N1 Tango Master — 25 words',
    'Shin Kanzen Dokkai — 1 section',
  ],
}

export const TOEIC_800_TEMPLATE: StudyTemplate = {
  id: 'toeic-800',
  plan: {
    name: 'TOEIC 800 — March 2027',
    description:
      '4-month prep. Months 1–2: listening & reading fundamentals + vocab. Months 3–4: timed parts + full mocks.',
    startDate: '2026-11-02',
    targetDate: '2027-03-07',
  },
  materials: [
    { name: 'ETS Official TOEIC LR Vol. 1', unitLabel: 'tests', totalUnits: 4, tags: ['mock'] },
    { name: 'Target TOEIC 800 — Listening', unitLabel: 'units', totalUnits: 24, tags: ['listening'] },
    { name: 'Target TOEIC 800 — Reading', unitLabel: 'units', totalUnits: 24, tags: ['reading'] },
    { name: 'TOEIC Essential Vocab 600', unitLabel: 'words', totalUnits: 600, tags: ['vocab'] },
    { name: 'Practice tests (full)', unitLabel: 'set', totalUnits: 6, tags: ['mock'] },
  ],
  weekly: [
    { weekday: 1, title: 'Listening unit — Part 1–4 drill', materialIndex: 1 },
    { weekday: 1, title: 'TOEIC vocab — 20 words', materialIndex: 3 },
    { weekday: 2, title: 'Reading unit — Part 5–7', materialIndex: 2 },
    { weekday: 2, title: 'TOEIC vocab — 20 words', materialIndex: 3 },
    { weekday: 3, title: 'Listening unit — timed set', materialIndex: 1 },
    { weekday: 4, title: 'Reading unit — timed set', materialIndex: 2 },
    { weekday: 5, title: 'Official test section OR mock part', materialIndex: 0 },
    { weekday: 6, title: 'Weekly reflection + wrong-answer log', materialIndex: null },
  ],
  checkpoints: [
    { title: 'Month 1 — Listening units 1–8 + 160 vocab', dueDate: '2026-12-04' },
    { title: 'Month 2 — Reading units 1–12 + half vocab', dueDate: '2027-01-08' },
    { title: 'Month 3 — First full mock + weak parts', dueDate: '2027-02-05' },
    { title: 'Month 4 — 2 full mocks + exam pace', dueDate: '2027-03-01' },
  ],
  previewTasks: [
    'Listening unit — Part 1–4 drill',
    'TOEIC vocab — 20 words',
    'Reading unit — Part 5–7',
  ],
}

export const IELTS_65_TEMPLATE: StudyTemplate = {
  id: 'ielts-65',
  plan: {
    name: 'IELTS Band 6.5 — June 2027',
    description:
      '5-month prep. Build listening/reading base, then writing Task 1–2 & speaking fluency. Monthly full tests.',
    startDate: '2027-01-04',
    targetDate: '2027-06-05',
  },
  materials: [
    { name: 'Cambridge IELTS 18', unitLabel: 'tests', totalUnits: 4, tags: ['mock'] },
    { name: 'Listening practice bank', unitLabel: 'sets', totalUnits: 30, tags: ['listening'] },
    { name: 'Reading (Academic) passages', unitLabel: 'passages', totalUnits: 40, tags: ['reading'] },
    { name: 'Writing Task 1 & 2 workbook', unitLabel: 'tasks', totalUnits: 30, tags: ['grammar'] },
    { name: 'Speaking cue cards + record', unitLabel: 'sessions', totalUnits: 24, tags: ['other'] },
    { name: 'Academic Word List', unitLabel: 'words', totalUnits: 500, tags: ['vocab'] },
  ],
  weekly: [
    { weekday: 1, title: 'Listening set — 1 practice', materialIndex: 1 },
    { weekday: 1, title: 'AWL — 15 words', materialIndex: 5 },
    { weekday: 2, title: 'Reading — 2 passages timed', materialIndex: 2 },
    { weekday: 3, title: 'Writing — 1 Task 1 or Task 2', materialIndex: 3 },
    { weekday: 4, title: 'Speaking — record 1 cue card', materialIndex: 4 },
    { weekday: 5, title: 'Listening OR reading weak area', materialIndex: 1 },
    { weekday: 6, title: 'Weekly reflection + vocab recycle', materialIndex: null },
  ],
  checkpoints: [
    { title: 'Month 1 — Listening rhythm + 120 AWL', dueDate: '2027-02-05' },
    { title: 'Month 2 — Reading speed + 10 writing tasks', dueDate: '2027-03-05' },
    { title: 'Month 3 — Cambridge test 1 full + speaking log', dueDate: '2027-04-02' },
    { title: 'Month 4 — Test 2 + writing feedback loop', dueDate: '2027-05-07' },
    { title: 'Month 5 — Tests 3–4 + exam simulation', dueDate: '2027-06-01' },
  ],
  previewTasks: [
    'Listening set — 1 practice',
    'AWL — 15 words',
    'Writing — 1 Task 1 or Task 2',
  ],
}

export const BJT_TEMPLATE: StudyTemplate = {
  id: 'bjt',
  plan: {
    name: 'BJT (Business Japanese) — June 2027',
    description:
      '5-month Business Japanese / ビジネス日本語 (BJT) prep. Months 1–2: keigo & business vocab. Months 3–4: reading/listening cases. Month 5: full mocks & weak areas.',
    startDate: '2027-01-05',
    targetDate: '2027-06-06',
  },
  materials: [
    { name: 'BJT Official Guide / 公式問題集', unitLabel: 'tests', totalUnits: 3, tags: ['mock'] },
    { name: 'Business keigo workbook', unitLabel: 'chapters', totalUnits: 20, tags: ['grammar'] },
    { name: 'Business reading (メール・文書)', unitLabel: 'passages', totalUnits: 40, tags: ['reading'] },
    { name: 'Business listening drills', unitLabel: 'sets', totalUnits: 30, tags: ['listening'] },
    { name: 'Business vocab 1500', unitLabel: 'words', totalUnits: 1500, tags: ['vocab'] },
    { name: 'Role-play / speaking notes', unitLabel: 'sessions', totalUnits: 20, tags: ['other'] },
  ],
  weekly: [
    { weekday: 1, title: 'Keigo workbook — 1 chapter', materialIndex: 1 },
    { weekday: 1, title: 'Business vocab — 25 words', materialIndex: 4 },
    { weekday: 2, title: 'Reading — 2 business passages', materialIndex: 2 },
    { weekday: 3, title: 'Listening — 1 drill set', materialIndex: 3 },
    { weekday: 3, title: 'Business vocab — 25 words', materialIndex: 4 },
    { weekday: 4, title: 'Reading OR email writing practice', materialIndex: 2 },
    { weekday: 5, title: 'Listening timed set + review', materialIndex: 3 },
    { weekday: 6, title: 'Role-play session OR weekly reflection', materialIndex: 5 },
  ],
  checkpoints: [
    { title: 'Month 1 — Keigo ch. 1–6 + 300 vocab', dueDate: '2027-02-05' },
    { title: 'Month 2 — Keigo half + reading rhythm', dueDate: '2027-03-05' },
    { title: 'Month 3 — First official mock + weak log', dueDate: '2027-04-02' },
    { title: 'Month 4 — Listening cases + 1000 vocab', dueDate: '2027-05-07' },
    { title: 'Month 5 — Full mocks + exam pace', dueDate: '2027-06-01' },
  ],
  previewTasks: [
    'Keigo workbook — 1 chapter',
    'Business vocab — 25 words',
    'Listening — 1 drill set',
  ],
}

export const TOEFL_TEMPLATE: StudyTemplate = {
  id: 'toefl',
  plan: {
    name: 'TOEFL iBT 90 — May 2027',
    description:
      '5-month TOEFL iBT prep targeting ~90. Build reading/listening base, then integrated speaking & writing. Monthly full practice tests.',
    startDate: '2026-12-07',
    targetDate: '2027-05-08',
  },
  materials: [
    { name: 'Official TOEFL iBT Practice Tests', unitLabel: 'tests', totalUnits: 4, tags: ['mock'] },
    { name: 'Reading practice passages', unitLabel: 'passages', totalUnits: 40, tags: ['reading'] },
    { name: 'Listening lectures & conversations', unitLabel: 'sets', totalUnits: 36, tags: ['listening'] },
    { name: 'Speaking (independent + integrated)', unitLabel: 'tasks', totalUnits: 28, tags: ['other'] },
    { name: 'Writing (integrated + academic)', unitLabel: 'essays', totalUnits: 24, tags: ['grammar'] },
    { name: 'Academic vocab bank', unitLabel: 'words', totalUnits: 600, tags: ['vocab'] },
  ],
  weekly: [
    { weekday: 1, title: 'Reading — 1–2 passages timed', materialIndex: 1 },
    { weekday: 1, title: 'Vocab — 15 words', materialIndex: 5 },
    { weekday: 2, title: 'Listening — 1 lecture set', materialIndex: 2 },
    { weekday: 3, title: 'Speaking — 1 independent + 1 integrated', materialIndex: 3 },
    { weekday: 4, title: 'Writing — 1 integrated OR academic essay', materialIndex: 4 },
    { weekday: 5, title: 'Reading OR listening weak area', materialIndex: 1 },
    { weekday: 6, title: 'Weekly reflection + vocab recycle', materialIndex: null },
  ],
  checkpoints: [
    { title: 'Month 1 — Reading rhythm + 120 vocab', dueDate: '2027-01-08' },
    { title: 'Month 2 — Listening base + speaking log', dueDate: '2027-02-05' },
    { title: 'Month 3 — First full practice test', dueDate: '2027-03-05' },
    { title: 'Month 4 — Writing feedback loop + test 2', dueDate: '2027-04-02' },
    { title: 'Month 5 — Tests 3–4 + exam simulation', dueDate: '2027-05-01' },
  ],
  previewTasks: [
    'Reading — 1–2 passages timed',
    'Vocab — 15 words',
    'Speaking — 1 independent + 1 integrated',
  ],
}

export const STUDY_TEMPLATES: Record<StudyTemplateId, StudyTemplate> = {
  'jlpt-n2': JLPT_N2_TEMPLATE,
  'jlpt-n1': JLPT_N1_TEMPLATE,
  bjt: BJT_TEMPLATE,
  'toeic-800': TOEIC_800_TEMPLATE,
  'ielts-65': IELTS_65_TEMPLATE,
  toefl: TOEFL_TEMPLATE,
}

export const STUDY_TEMPLATE_IDS: StudyTemplateId[] = [
  'jlpt-n2',
  'jlpt-n1',
  'bjt',
  'toeic-800',
  'ielts-65',
  'toefl',
]

export function getStudyTemplate(id: StudyTemplateId): StudyTemplate {
  return STUDY_TEMPLATES[id]
}

function resolveTemplateDates(template: StudyTemplate): {
  name: string
  startDate: IsoDate
  targetDate: IsoDate
  checkpoints: StudyTemplate['checkpoints']
} {
  const today = new Date()
  const blueprintStart = parseISO(template.plan.startDate)
  if (blueprintStart >= today) {
    return {
      name: template.plan.name,
      startDate: template.plan.startDate,
      targetDate: template.plan.targetDate,
      checkpoints: template.checkpoints,
    }
  }

  const weekday = today.getDay()
  const daysUntilMonday = ((8 - weekday) % 7) || 7
  const start = addDays(today, daysUntilMonday)
  const shiftDays = differenceInCalendarDays(start, blueprintStart)
  const target = addDays(parseISO(template.plan.targetDate), shiftDays)
  const baseName = template.plan.name.split(' — ')[0]

  return {
    name: `${baseName} — ${format(target, 'MMMM yyyy')}`,
    startDate: format(start, 'yyyy-MM-dd') as IsoDate,
    targetDate: format(target, 'yyyy-MM-dd') as IsoDate,
    checkpoints: template.checkpoints.map((checkpoint) => ({
      ...checkpoint,
      dueDate: format(addDays(parseISO(checkpoint.dueDate), shiftDays), 'yyyy-MM-dd') as IsoDate,
    })),
  }
}

export async function createStudyTemplatePlan(
  templateId: StudyTemplateId,
  planService: PlanService,
  audit: AuditService,
): Promise<Id> {
  const template = getStudyTemplate(templateId)
  const resolved = resolveTemplateDates(template)
  const plan = await planService.createPlan({
    name: resolved.name,
    description: template.plan.description,
    startDate: resolved.startDate,
    targetDate: resolved.targetDate,
    sourceTemplateId: templateId,
  })

  const materials = []
  for (const item of template.materials) {
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

  for (const item of template.weekly) {
    const materialId = item.materialIndex === null ? null : materials[item.materialIndex].id
    await planService.addScheduleItem(plan.id, item.weekday, item.title, materialId)
  }

  for (const checkpoint of resolved.checkpoints) {
    await planService.addCheckpoint(plan.id, checkpoint.title, checkpoint.dueDate)
  }

  await planService.setActivePlan(plan.id)
  audit.record('seed', 'plan', plan.id, plan.name)
  return plan.id
}

/** @deprecated Use createStudyTemplatePlan('jlpt-n2', ...) */
export async function createJlptN2TemplatePlan(
  planService: PlanService,
  audit: AuditService,
): Promise<Id> {
  return createStudyTemplatePlan('jlpt-n2', planService, audit)
}

/** N2 seed constants — used by legacy migrations only */
export const SEED_PLAN = JLPT_N2_TEMPLATE.plan
