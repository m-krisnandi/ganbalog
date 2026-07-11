import { describe, expect, it } from 'vitest'
import { isMaterialTagId, normalizeMaterialTags } from './material-tags'

describe('material-tags', () => {
  it('accepts known tag ids', () => {
    expect(isMaterialTagId('grammar')).toBe(true)
    expect(isMaterialTagId('unknown')).toBe(false)
  })

  it('deduplicates and filters invalid tags', () => {
    expect(normalizeMaterialTags(['grammar', 'grammar', 'vocab', 'nope'])).toEqual([
      'grammar',
      'vocab',
    ])
  })

  it('returns empty array for undefined or empty input', () => {
    expect(normalizeMaterialTags(undefined)).toEqual([])
    expect(normalizeMaterialTags([])).toEqual([])
  })
})
