import { PENDING_JOIN_CODE_KEY } from '../session/constants'

/** Simpan ?join= dari URL sebelum OAuth / render login. */
export function captureJoinFromUrl(): void {
  const code = new URL(window.location.href).searchParams.get('join')?.trim()
  if (!code) return
  try {
    sessionStorage.setItem(PENDING_JOIN_CODE_KEY, code.toUpperCase())
  } catch {
    /* ignore */
  }
  const url = new URL(window.location.href)
  url.searchParams.delete('join')
  const query = url.searchParams.toString()
  window.history.replaceState(
    {},
    '',
    `${url.pathname}${query ? `?${query}` : ''}${url.hash}`,
  )
}

export function peekPendingJoinCode(): string | null {
  try {
    return sessionStorage.getItem(PENDING_JOIN_CODE_KEY)
  } catch {
    return null
  }
}
