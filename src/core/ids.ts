/** Abstraksi pembuatan ID supaya bisa diganti/dimock. */
export interface IdGenerator {
  next(): string
}

export class UuidGenerator implements IdGenerator {
  next(): string {
    return crypto.randomUUID()
  }
}
