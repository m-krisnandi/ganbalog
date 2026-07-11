const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Kode undangan 8 karakter — mudah dibaca & diketik. */
export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}
