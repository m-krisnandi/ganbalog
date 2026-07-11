import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { dismissPwaInstallPrompt, isStandaloneDisplay } from './pwa-install'

describe('pwa-install helpers', () => {
  beforeEach(() => {
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem(key: string) {
        return store[key] ?? null
      },
      setItem(key: string, value: string) {
        store[key] = value
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('detects standalone display mode', () => {
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        matches: query.includes('standalone'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
      navigator: { standalone: false },
    })

    expect(isStandaloneDisplay()).toBe(true)
  })

  it('persists dismiss timestamp', () => {
    dismissPwaInstallPrompt()
    expect(localStorage.getItem('ganbalog-pwa-install-dismissed')).toBeTruthy()
  })
})
