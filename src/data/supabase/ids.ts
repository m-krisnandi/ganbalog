const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Supabase UUID columns reject local-mode ids like `local-user`. */
export function isSupabaseUuid(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_RE.test(value)
}
