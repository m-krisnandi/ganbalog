function readSupabaseKey(): string | undefined {
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (typeof anon === 'string' && anon.length > 0) return anon
  const publishable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (typeof publishable === 'string' && publishable.length > 0) return publishable
  return undefined
}

export function isSupabaseEnabled(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = readSupabaseKey()
  return typeof url === 'string' && url.length > 0 && typeof key === 'string' && key.length > 0
}

export function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = readSupabaseKey()
  if (!url || !anonKey) {
    throw new Error(
      'Supabase belum dikonfigurasi. Set VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY.',
    )
  }
  return { url, anonKey }
}
