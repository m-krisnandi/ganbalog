import { describe, expect, it } from 'vitest'
import { computeStudyStreak } from './streak'

describe('computeStudyStreak', () => {
  it('counts consecutive days including today', () => {
    const dates = new Set(['2026-07-09', '2026-07-10', '2026-07-11'])
    expect(computeStudyStreak(dates, '2026-07-11')).toBe(3)
  })

  it('returns zero when today has no activity', () => {
    const dates = new Set(['2026-07-09', '2026-07-10'])
    expect(computeStudyStreak(dates, '2026-07-11')).toBe(0)
  })

  it('stops at first gap', () => {
    const dates = new Set(['2026-07-08', '2026-07-10', '2026-07-11'])
    expect(computeStudyStreak(dates, '2026-07-11')).toBe(2)
  })
})
