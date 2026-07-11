import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  hasMilestoneCelebrated,
  isStreakMilestone,
  markMilestoneCelebrated,
} from './streak-celebration'

function createStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
  }
}

describe('streak-celebration', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('detects milestone streak values', () => {
    expect(isStreakMilestone(7)).toBe(true)
    expect(isStreakMilestone(30)).toBe(true)
    expect(isStreakMilestone(8)).toBe(false)
  })

  it('tracks celebrated milestones in localStorage', () => {
    expect(hasMilestoneCelebrated(7)).toBe(false)
    markMilestoneCelebrated(7)
    expect(hasMilestoneCelebrated(7)).toBe(true)
  })
})
