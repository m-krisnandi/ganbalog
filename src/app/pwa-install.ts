import { create } from 'zustand'
import { useCallback, useEffect } from 'react'

const DISMISS_KEY = 'ganbalog-pwa-install-dismissed'
const DISMISS_DAYS = 7

export type PwaInstallMode = 'install' | 'open' | 'ios'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  const ios = /iphone|ipad|ipod/.test(ua)
  const webkit = /webkit/.test(ua)
  const notChrome = !/crios|fxios|edgios/.test(ua)
  return ios && webkit && notChrome
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const dismissedAt = Number(raw)
    if (!Number.isFinite(dismissedAt)) return false
    return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export function dismissPwaInstallPrompt(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    // ignore
  }
}

interface PwaInstallState {
  mode: PwaInstallMode | null
  promptDismissed: boolean
  iosSheetOpen: boolean
  deferredPrompt: BeforeInstallPromptEvent | null
  setMode: (mode: PwaInstallMode | null) => void
  setPromptDismissed: (value: boolean) => void
  setIosSheetOpen: (open: boolean) => void
  setDeferredPrompt: (event: BeforeInstallPromptEvent | null) => void
}

export const usePwaInstallStore = create<PwaInstallState>((set) => ({
  mode: null,
  promptDismissed: wasDismissedRecently(),
  iosSheetOpen: false,
  deferredPrompt: null,
  setMode: (mode) => set({ mode }),
  setPromptDismissed: (promptDismissed) => set({ promptDismissed }),
  setIosSheetOpen: (iosSheetOpen) => set({ iosSheetOpen }),
  setDeferredPrompt: (deferredPrompt) => set({ deferredPrompt }),
}))

/** Mount once in App — listens for install events globally. */
export function PwaInstallListener() {
  const { setMode, setDeferredPrompt } = usePwaInstallStore()

  useEffect(() => {
    if (isStandaloneDisplay()) return

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setMode('install')
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    if (isIosSafari()) {
      setMode('ios')
    } else if ('getInstalledRelatedApps' in navigator) {
      void (
        navigator as Navigator & {
          getInstalledRelatedApps: () => Promise<Array<{ platform: string }>>
        }
      )
        .getInstalledRelatedApps()
        .then((apps) => {
          if (apps.some((app) => app.platform === 'webapp')) {
            setMode('open')
          }
        })
        .catch(() => undefined)
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [setDeferredPrompt, setMode])

  return null
}

export function usePwaInstallActions() {
  const {
    mode,
    promptDismissed,
    iosSheetOpen,
    deferredPrompt,
    setMode,
    setPromptDismissed,
    setIosSheetOpen,
    setDeferredPrompt,
  } = usePwaInstallStore()

  const dismissPrompt = useCallback(() => {
    dismissPwaInstallPrompt()
    setPromptDismissed(true)
  }, [setPromptDismissed])

  const install = useCallback(async () => {
    if (mode === 'ios') {
      setIosSheetOpen(true)
      return
    }

    if (mode === 'open') {
      dismissPwaInstallPrompt()
      window.location.assign(window.location.href)
      return
    }

    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (choice.outcome === 'accepted') {
      setMode(null)
      setPromptDismissed(true)
    }
  }, [deferredPrompt, mode, setDeferredPrompt, setIosSheetOpen, setMode, setPromptDismissed])

  const canPrompt = mode !== null && !isStandaloneDisplay() && !promptDismissed
  /** Auto modal: Android + desktop only (install / open-in-app). */
  const modalVisible = canPrompt && (mode === 'install' || mode === 'open')
  const settingsVisible = canPrompt

  return {
    mode,
    modalVisible,
    settingsVisible,
    iosSheetOpen,
    setIosSheetOpen,
    install,
    dismissPrompt,
  }
}
