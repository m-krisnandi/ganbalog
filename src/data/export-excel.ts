import type { GanbaLogBackup } from './backup'

type XlsxModule = typeof import('xlsx')

let xlsxModule: Promise<XlsxModule> | null = null

function loadXlsx(): Promise<XlsxModule> {
  xlsxModule ??= import('xlsx')
  return xlsxModule
}

/** Sheet utama yang mudah diedit di Excel / Google Sheets. */
export async function downloadExcelBackup(backup: GanbaLogBackup): Promise<void> {
  const XLSX = await loadXlsx()
  const planName = new Map(backup.plans.map((plan) => [plan.id, plan.name]))
  const materialName = new Map(backup.materials.map((material) => [material.id, material.name]))

  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(
    workbook,
    sheet(XLSX, [
      { key: 'exportedAt', value: backup.exportedAt },
      { key: 'plans', value: backup.plans.length },
      { key: 'materials', value: backup.materials.length },
      { key: 'tasks', value: backup.tasks.length },
    ]),
    'Info',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    rows(XLSX,
      ['name', 'description', 'startDate', 'targetDate', 'status', 'id'],
      backup.plans.map((plan) => [
        plan.name,
        plan.description,
        plan.startDate,
        plan.targetDate,
        plan.status,
        plan.id,
      ]),
    ),
    'Plans',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    rows(XLSX,
      ['plan', 'name', 'unitLabel', 'doneUnits', 'totalUnits', 'id'],
      backup.materials.map((material) => [
        planName.get(material.planId) ?? material.planId,
        material.name,
        material.unitLabel,
        material.doneUnits,
        material.totalUnits,
        material.id,
      ]),
    ),
    'Materials',
  )

  if (backup.materialUnits.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      rows(XLSX,
        ['material', 'index', 'done', 'id'],
        backup.materialUnits.map((unit) => [
          materialName.get(unit.materialId) ?? unit.materialId,
          unit.index,
          unit.done ? 'yes' : 'no',
          unit.id,
        ]),
      ),
      'MaterialUnits',
    )
  }

  XLSX.utils.book_append_sheet(
    workbook,
    rows(XLSX,
      ['plan', 'weekday', 'title', 'material', 'id'],
      backup.scheduleItems.map((item) => [
        planName.get(item.planId) ?? item.planId,
        item.weekday,
        item.title,
        item.materialId ? (materialName.get(item.materialId) ?? item.materialId) : '',
        item.id,
      ]),
    ),
    'Schedule',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    rows(XLSX,
      ['plan', 'title', 'dueDate', 'status', 'id'],
      backup.checkpoints.map((checkpoint) => [
        planName.get(checkpoint.planId) ?? checkpoint.planId,
        checkpoint.title,
        checkpoint.dueDate,
        checkpoint.status,
        checkpoint.id,
      ]),
    ),
    'Checkpoints',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    rows(XLSX,
      ['date', 'plan', 'minutes', 'userId', 'planId', 'id'],
      backup.studyLogs.map((log) => [
        log.date,
        planName.get(log.planId) ?? log.planId,
        log.minutes ?? '',
        log.userId,
        log.planId,
        log.id,
      ]),
    ),
    'StudyLogs',
  )

  if (backup.tasks.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      rows(XLSX,
        ['plan', 'date', 'title', 'kind', 'status', 'id'],
        backup.tasks.map((task) => [
          planName.get(task.planId) ?? task.planId,
          task.date,
          task.title,
          task.kind,
          task.status,
          task.id,
        ]),
      ),
      'Tasks',
    )
  }

  const date = backup.exportedAt.slice(0, 10)
  XLSX.writeFile(workbook, `ganbalog-${date}.xlsx`)
}

/** Blank spreadsheet with example rows — for editing in Excel before import. */
export async function downloadExcelTemplate(): Promise<void> {
  const XLSX = await loadXlsx()
  const workbook = XLSX.utils.book_new()
  const examplePlan = 'JLPT N2 — December 2026'

  XLSX.utils.book_append_sheet(
    workbook,
    sheet(XLSX, [
      { key: 'exportedAt', value: new Date().toISOString() },
      { key: 'note', value: 'Example template — edit rows below, then import in GanbaLog Settings' },
    ]),
    'Info',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    rows(XLSX, ['name', 'description', 'startDate', 'targetDate', 'status', 'id'], [
      [
        examplePlan,
        '4-month JLPT N2 prep plan',
        '2026-08-03',
        '2026-12-06',
        'active',
        '',
      ],
    ]),
    'Plans',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    rows(XLSX, ['plan', 'name', 'unitLabel', 'doneUnits', 'totalUnits', 'id'], [
      [examplePlan, 'N2 Tango 3000', 'words', 0, 3000, ''],
      [examplePlan, 'SKM Bunpou N2', 'chapters', 0, 18, ''],
    ]),
    'Materials',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    rows(XLSX, ['plan', 'weekday', 'title', 'material', 'id'], [
      [examplePlan, 1, 'N2 Tango 3000 — 30 words', 'N2 Tango 3000', ''],
      [examplePlan, 3, 'SKM Bunpou — 1 chapter', 'SKM Bunpou N2', ''],
      [examplePlan, 6, 'Weekly reflection', '', ''],
    ]),
    'Schedule',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    rows(XLSX, ['plan', 'title', 'dueDate', 'status', 'id'], [
      [examplePlan, 'Month 1 — Bunpou ch. 1–6 + 600 vocab', '2026-09-06', 'open', ''],
    ]),
    'Checkpoints',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    rows(XLSX, ['column', 'required', 'format', 'notes'], [
      ['Plans.name', 'yes', 'text', 'Plan title — required on every row'],
      ['Plans.startDate / targetDate', 'yes', 'YYYY-MM-DD', 'e.g. 2026-08-03'],
      ['Plans.status', 'no', 'active | archived', 'Defaults to active'],
      ['Plans.id', 'no', 'uuid', 'Leave empty for new plans'],
      ['Materials.plan', 'yes', 'text', 'Must match Plans.name exactly'],
      ['Materials.unitLabel', 'no', 'text', 'e.g. words, chapters, pages'],
      ['Schedule.weekday', 'yes', '1–7', '1 = Monday, 7 = Sunday'],
      ['Schedule.material', 'no', 'text', 'Material name from Materials sheet'],
      ['Checkpoints.status', 'no', 'open | achieved', 'Defaults to open'],
      ['StudyLogs / Tasks', 'no', '—', 'Optional sheets — add only if needed'],
    ]),
    'Guide',
  )

  XLSX.writeFile(workbook, 'ganbalog-template.xlsx')
}

function sheet(XLSX: XlsxModule, entries: Array<{ key: string; value: string | number }>) {
  return XLSX.utils.aoa_to_sheet([
    ['field', 'value'],
    ...entries.map((entry) => [entry.key, entry.value]),
  ])
}

function rows(XLSX: XlsxModule, headers: string[], data: Array<Array<string | number>>) {
  return XLSX.utils.aoa_to_sheet([headers, ...data])
}
