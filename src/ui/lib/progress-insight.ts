import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { IsoDate, Material } from '../../domain/models'

export type ProgressInsight =
  | { kind: 'lagging'; material: Material; percent: number }
  | { kind: 'gap'; days: number }
  | { kind: 'onTrack' }

export function computeProgressInsight(
  materials: Material[],
  studyDates: IsoDate[],
  today: IsoDate,
): ProgressInsight {
  const sortedDates = [...studyDates].sort((a, b) => b.localeCompare(a))
  const lastStudy = sortedDates[0]

  if (lastStudy) {
    const gap = differenceInCalendarDays(parseISO(today), parseISO(lastStudy))
    if (gap >= 3) return { kind: 'gap', days: gap }
  }

  const lagging = materials
    .filter((material) => material.totalUnits > 0 && material.doneUnits < material.totalUnits)
    .map((material) => ({
      material,
      percent: Math.round((material.doneUnits / material.totalUnits) * 100),
    }))
    .sort((a, b) => a.percent - b.percent)[0]

  if (lagging && lagging.percent < 50) {
    return { kind: 'lagging', material: lagging.material, percent: lagging.percent }
  }

  return { kind: 'onTrack' }
}
