import type { ToastKind } from './toast-store'

const FLASH_TOAST_KEY = 'ganbalog.flashToast'

interface FlashToastPayload {
  messageKey: string
  kind: ToastKind
}

export function queueFlashToast(messageKey: string, kind: ToastKind = 'success'): void {
  try {
    sessionStorage.setItem(FLASH_TOAST_KEY, JSON.stringify({ messageKey, kind }))
  } catch {
    /* ignore */
  }
}

export function consumeFlashToast(): FlashToastPayload | null {
  try {
    const raw = sessionStorage.getItem(FLASH_TOAST_KEY)
    if (!raw) return null
    sessionStorage.removeItem(FLASH_TOAST_KEY)
    return JSON.parse(raw) as FlashToastPayload
  } catch {
    return null
  }
}
