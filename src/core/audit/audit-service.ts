import type { AuditAction, AuditEvent, Id } from '../../domain/models'
import type { AuditRepository } from '../../domain/repositories'
import type { Clock } from '../clock'
import type { IdGenerator } from '../ids'
import type { Logger } from '../logging/logger'
import type { MutableActorContext } from '../session/actor-context'

/**
 * Audit trail: setiap perubahan domain dicatat dengan actor (siapa yang mengubah).
 */
export class AuditService {
  constructor(
    private readonly repository: AuditRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly logger: Logger,
    private readonly actor: MutableActorContext,
  ) {}

  record(action: AuditAction, entity: string, entityId: Id, detail: string): void {
    const event: AuditEvent = {
      id: this.ids.next(),
      at: this.clock.stamp(),
      action,
      entity,
      entityId,
      detail,
      actorUserId: this.actor.userId,
      actorDisplayName: this.actor.displayName,
    }
    void this.repository.append(event).catch((error) => {
      this.logger.warn('Gagal mencatat audit event', { error: String(error), event })
    })
  }

  getRecent(limit = 100): Promise<AuditEvent[]> {
    return this.repository.getRecent(limit)
  }

  clear(): Promise<void> {
    return this.repository.clear()
  }
}
