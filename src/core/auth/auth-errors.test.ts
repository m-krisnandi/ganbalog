import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import { formatAuthError } from './auth-errors'

const t = ((key: string) => key) as TFunction

describe('formatAuthError', () => {
  it('maps popup closed errors', () => {
    expect(formatAuthError('Popup closed by user', t)).toBe('login.popupClosed')
  })

  it('maps network errors', () => {
    expect(formatAuthError('Failed to fetch', t)).toBe('login.networkError')
  })

  it('falls back to generic auth failure', () => {
    expect(formatAuthError('Something weird happened', t)).toBe('login.authFailed')
  })
})
