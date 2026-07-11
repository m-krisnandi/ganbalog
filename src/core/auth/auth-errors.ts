import type { TFunction } from 'i18next'

/** Map raw Supabase/OAuth errors to user-facing i18n keys. */
export function formatAuthError(message: string, t: TFunction): string {
  const lower = message.toLowerCase()

  if (lower.includes('popup') && lower.includes('closed')) {
    return t('login.popupClosed')
  }
  if (lower.includes('access_denied') || lower.includes('user cancelled')) {
    return t('login.signInCancelled')
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return t('login.networkError')
  }
  if (lower.includes('session') && lower.includes('expired')) {
    return t('login.sessionExpired')
  }

  return t('login.authFailed')
}
