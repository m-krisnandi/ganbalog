const DISMISS_KEY = 'ganbalog.setupGuide.dismissed'

function key(planId: string): string {
  return `${DISMISS_KEY}.${planId}`
}

export function isSetupGuideDismissed(planId: string): boolean {
  try {
    return localStorage.getItem(key(planId)) === '1'
  } catch {
    return false
  }
}

export function dismissSetupGuide(planId: string): void {
  try {
    localStorage.setItem(key(planId), '1')
  } catch {
    /* ignore */
  }
}
