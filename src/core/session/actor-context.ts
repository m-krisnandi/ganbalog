import type { Id } from '../../domain/models'
import {
  ACTIVE_PLAN_PREF_KEY,
  LOCAL_USER_DISPLAY_NAME,
  LOCAL_USER_ID,
  LOCAL_WORKSPACE_ID,
} from './constants'

export interface ActorContext {
  readonly userId: Id
  readonly workspaceId: Id
  readonly displayName: string
}

export class MutableActorContext implements ActorContext {
  userId: Id = LOCAL_USER_ID
  workspaceId: Id = LOCAL_WORKSPACE_ID
  displayName: string = LOCAL_USER_DISPLAY_NAME

  setSession(userId: Id, workspaceId: Id, displayName: string): void {
    this.userId = userId
    this.workspaceId = workspaceId
    this.displayName = displayName
  }

  resetToLocal(): void {
    this.userId = LOCAL_USER_ID
    this.workspaceId = LOCAL_WORKSPACE_ID
    this.displayName = LOCAL_USER_DISPLAY_NAME
  }
}

export function userPrefKey(userId: Id, key: string): string {
  return `pref:${userId}:${key}`
}

export function activePlanPrefKey(userId: Id): string {
  return userPrefKey(userId, ACTIVE_PLAN_PREF_KEY)
}
