export const STREAK_MILESTONES = [7, 30] as const

export type StreakMilestone = (typeof STREAK_MILESTONES)[number]

export function isStreakMilestone(streak: number): streak is StreakMilestone {
  return (STREAK_MILESTONES as readonly number[]).includes(streak)
}

const STORAGE_KEY = 'ganbalog.streakMilestones'

function readCelebrated(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as number[])
  } catch {
    return new Set()
  }
}

export function hasMilestoneCelebrated(milestone: number): boolean {
  return readCelebrated().has(milestone)
}

export function markMilestoneCelebrated(milestone: number): void {
  const set = readCelebrated()
  set.add(milestone)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}
