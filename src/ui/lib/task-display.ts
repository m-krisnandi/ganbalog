const REVIEW_PREFIXES = ['Review: ', '復習: '] as const

export function displayTaskTitle(title: string, kind: 'study' | 'review'): string {
  if (kind !== 'review') return title
  for (const prefix of REVIEW_PREFIXES) {
    if (title.startsWith(prefix)) return title.slice(prefix.length)
  }
  return title
}

export const REVIEW_TASK_PREFIX = 'Review: '
