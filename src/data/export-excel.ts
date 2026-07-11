import * as XLSX from 'xlsx'
import type { GanbaLogBackup } from './backup'

/** Sheet utama yang mudah diedit di Excel / Google Sheets. */
export function downloadExcelBackup(backup: GanbaLogBackup): void {
  const planName = new Map(backup.plans.map((plan) => [plan.id, plan.name]))
  const materialName = new Map(backup.materials.map((material) => [material.id, material.name]))

  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(
    workbook,
    sheet([
      { key: 'exportedAt', value: backup.exportedAt },
      { key: 'plans', value: backup.plans.length },
      { key: 'materials', value: backup.materials.length },
      { key: 'tasks', value: backup.tasks.length },
    ]),
    'Info',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    rows(
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
    rows(
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
      rows(
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
    rows(
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
    rows(
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
    rows(
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
      rows(
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

function sheet(entries: Array<{ key: string; value: string | number }>) {
  return XLSX.utils.aoa_to_sheet([
    ['field', 'value'],
    ...entries.map((entry) => [entry.key, entry.value]),
  ])
}

function rows(headers: string[], data: Array<Array<string | number>>) {
  return XLSX.utils.aoa_to_sheet([headers, ...data])
}
