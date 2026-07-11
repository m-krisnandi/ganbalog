import { describe, expect, it } from 'vitest'
import { displayTaskTitle, REVIEW_TASK_PREFIX } from './task-display'

describe('displayTaskTitle', () => {
  it('strips Review prefix from review tasks', () => {
    expect(displayTaskTitle('Review: SKM Bunpou — 1 chapter', 'review')).toBe(
      'SKM Bunpou — 1 chapter',
    )
  })

  it('strips legacy Japanese prefix', () => {
    expect(displayTaskTitle('復習: N2 Tango', 'review')).toBe('N2 Tango')
  })

  it('leaves study task titles unchanged', () => {
    expect(displayTaskTitle('Weekly reflection', 'study')).toBe('Weekly reflection')
  })
})

describe('REVIEW_TASK_PREFIX', () => {
  it('uses English prefix for new review tasks', () => {
    expect(REVIEW_TASK_PREFIX).toBe('Review: ')
  })
})
