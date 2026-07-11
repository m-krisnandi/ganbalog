import { describe, expect, it } from 'vitest'
import { computeProgressInsight } from './progress-insight'
import type { Material } from '../../domain/models'

function material(overrides: Partial<Material> = {}): Material {
  return {
    id: 'm1',
    planId: 'p1',
    name: 'Listening',
    unitLabel: 'chapters',
    totalUnits: 100,
    doneUnits: 10,
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('computeProgressInsight', () => {
  it('prioritizes study gap over lagging material', () => {
    const insight = computeProgressInsight(
      [material({ doneUnits: 5 })],
      ['2026-07-01'],
      '2026-07-11',
    )
    expect(insight).toEqual({ kind: 'gap', days: 10 })
  })

  it('surfaces lagging material when study is recent', () => {
    const insight = computeProgressInsight(
      [material({ name: 'Grammar', doneUnits: 20 })],
      ['2026-07-10'],
      '2026-07-11',
    )
    expect(insight).toEqual({
      kind: 'lagging',
      material: expect.objectContaining({ name: 'Grammar' }),
      percent: 20,
    })
  })

  it('returns onTrack when progress is healthy', () => {
    const insight = computeProgressInsight(
      [material({ doneUnits: 80 })],
      ['2026-07-10'],
      '2026-07-11',
    )
    expect(insight).toEqual({ kind: 'onTrack' })
  })
})
