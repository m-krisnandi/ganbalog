import type { Material } from '../models'

/** Di atas batas ini progress hanya lewat counter (+/−), bukan checklist per item. */
export const MATERIAL_CHECKLIST_MAX = 100

export function supportsMaterialChecklist(totalUnits: number): boolean {
  return totalUnits > 0 && totalUnits <= MATERIAL_CHECKLIST_MAX
}

export function materialUnitLabel(material: Material, index: number): string {
  return `${material.unitLabel} ${index}`
}
