/** App-level material categories — not tied to a specific exam. */
export const MATERIAL_TAG_IDS = [
  'grammar',
  'vocab',
  'kanji',
  'reading',
  'listening',
  'mock',
  'other',
] as const

export type MaterialTagId = (typeof MATERIAL_TAG_IDS)[number]

export function isMaterialTagId(value: string): value is MaterialTagId {
  return (MATERIAL_TAG_IDS as readonly string[]).includes(value)
}

export function normalizeMaterialTags(tags: readonly string[] | undefined): MaterialTagId[] {
  if (!tags?.length) return []
  const seen = new Set<MaterialTagId>()
  for (const tag of tags) {
    if (isMaterialTagId(tag)) seen.add(tag)
  }
  return [...seen]
}
