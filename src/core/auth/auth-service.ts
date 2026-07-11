import type { Session, SupabaseClient } from '@supabase/supabase-js'
import type { Clock } from '../clock'
import { generateInviteCode } from './invite-code'
import { captureJoinFromUrl, peekPendingJoinCode as peekJoinCode } from './join-url'
import { capturePlanImportFromUrl } from '../../data/plan-share-url'
import type { IdGenerator } from '../ids'
import type { Logger } from '../logging/logger'
import type { MutableActorContext } from '../session/actor-context'
import {
  ACTIVE_WORKSPACE_PREF_KEY,
  PENDING_JOIN_CODE_KEY,
} from '../session/constants'
import type { Id, UserProfile, Workspace } from '../../domain/models'
import type {
  UserPreferenceRepository,
  UserProfileRepository,
  WorkspaceRepository,
} from '../../domain/repositories'

export interface AuthSession {
  userId: Id
  email: string
  displayName: string
  avatarUrl: string | null
  workspaceId: Id
}

export interface WorkspaceInfo {
  workspace: Workspace
  members: UserProfile[]
}

export interface UserWorkspaceSummary {
  workspace: Workspace
  memberCount: number
}

export interface MemberTaskStats {
  userId: Id
  doneToday: number
  doneTotal: number
}

export class AuthService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly actor: MutableActorContext,
    private readonly workspaces: WorkspaceRepository,
    private readonly profiles: UserProfileRepository,
    private readonly preferences: UserPreferenceRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly logger: Logger,
  ) {}

  isEnabled(): boolean {
    return true
  }

  /** Simpan kode join dari URL sebelum OAuth redirect. */
  capturePendingJoinFromUrl(): void {
    captureJoinFromUrl()
  }

  consumePendingJoinCode(): string | null {
    try {
      const code = sessionStorage.getItem(PENDING_JOIN_CODE_KEY)
      if (code) sessionStorage.removeItem(PENDING_JOIN_CODE_KEY)
      return code
    } catch {
      return null
    }
  }

  peekPendingJoinCode(): string | null {
    return peekJoinCode()
  }

  async getSession(): Promise<Session | null> {
    this.capturePendingJoinFromUrl()

    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    if (code) {
      const { data, error } = await this.client.auth.exchangeCodeForSession(code)
      if (error) {
        this.logger.error('OAuth code exchange gagal', error)
        throw error
      }
      url.searchParams.delete('code')
      const query = url.searchParams.toString()
      const cleanUrl = `${url.pathname}${query ? `?${query}` : ''}${url.hash}`
      window.history.replaceState({}, '', cleanUrl)
      return data.session
    }

    const { data, error } = await this.client.auth.getSession()
    if (error) {
      this.logger.warn('Gagal membaca session Supabase', { error: error.message })
      return null
    }
    return data.session
  }

  async signInWithGoogle(): Promise<void> {
    captureJoinFromUrl()
    capturePlanImportFromUrl()
    const redirectTo = `${window.location.origin}/`
    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) throw error
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut()
    if (error) throw error
    this.actor.resetToLocal()
  }

  onAuthStateChange(
    callback: (session: Session | null) => void,
  ): { unsubscribe: () => void } {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      callback(session)
    })
    return { unsubscribe: () => data.subscription.unsubscribe() }
  }

  async bootstrapFromSession(session: Session | null): Promise<AuthSession | null> {
    if (!session?.user) {
      this.actor.resetToLocal()
      return null
    }

    const userId = session.user.id
    const email = session.user.email ?? ''
    const displayName =
      (session.user.user_metadata?.full_name as string | undefined) ??
      (session.user.user_metadata?.name as string | undefined) ??
      email.split('@')[0] ??
      'User'
    const avatarUrl =
      (session.user.user_metadata?.avatar_url as string | undefined) ??
      (session.user.user_metadata?.picture as string | undefined) ??
      null
    const now = this.clock.stamp()

    await this.profiles.save({
      id: userId,
      email,
      displayName,
      avatarUrl,
      createdAt: now,
    })

    const pendingJoin = this.consumePendingJoinCode()
    let workspaceId: Id

    if (pendingJoin) {
      workspaceId = await this.joinWorkspaceByCode(pendingJoin, userId)
    } else {
      workspaceId = await this.resolveActiveWorkspace(userId, displayName)
    }

    await this.setActiveWorkspacePref(userId, workspaceId)
    this.actor.setSession(userId, workspaceId, displayName)

    return { userId, email, displayName, avatarUrl, workspaceId }
  }

  async getWorkspaceInfo(workspaceId: Id): Promise<WorkspaceInfo | null> {
    const workspace = await this.workspaces.getById(workspaceId)
    if (!workspace) return null
    const members = await this.profiles.getByWorkspace(workspaceId)
    return { workspace, members }
  }

  async joinWorkspaceByCode(code: string, userId: Id): Promise<Id> {
    const normalized = code.trim().toUpperCase()
    if (!normalized) throw new Error('Invite code is required')

    const { data, error } = await this.client.rpc('join_workspace_by_invite', {
      p_code: normalized,
    })
    if (error) throw new Error(error.message)

    const workspaceId = data as Id
    await this.setActiveWorkspacePref(userId, workspaceId)
    this.logger.info('Bergabung ke workspace via invite', { workspaceId, userId })
    return workspaceId
  }

  async regenerateInviteCode(workspaceId: Id): Promise<string> {
    const code = generateInviteCode()
    await this.workspaces.updateInviteCode(workspaceId, code)
    return code
  }

  async ensureInviteCode(workspaceId: Id): Promise<string> {
    const workspace = await this.workspaces.getById(workspaceId)
    if (!workspace) throw new Error('Workspace not found')
    if (workspace.inviteCode) return workspace.inviteCode
    return this.regenerateInviteCode(workspaceId)
  }

  async listUserWorkspaces(userId: Id): Promise<UserWorkspaceSummary[]> {
    const workspaceIds = await this.listMembershipWorkspaceIds(userId)
    const summaries = await Promise.all(
      workspaceIds.map(async (workspaceId) => {
        const workspace = await this.workspaces.getById(workspaceId)
        if (!workspace) return null
        const members = await this.profiles.getByWorkspace(workspaceId)
        return { workspace, memberCount: members.length }
      }),
    )
    return summaries
      .filter((item): item is UserWorkspaceSummary => item !== null)
      .sort((a, b) => a.workspace.name.localeCompare(b.workspace.name))
  }

  async switchActiveWorkspace(userId: Id, workspaceId: Id, displayName: string): Promise<void> {
    const memberships = await this.listMembershipWorkspaceIds(userId)
    if (!memberships.includes(workspaceId)) {
      throw new Error('Not a member of this workspace')
    }
    await this.setActiveWorkspacePref(userId, workspaceId)
    this.actor.setSession(userId, workspaceId, displayName)
    this.logger.info('Workspace aktif diganti', { workspaceId, userId })
  }

  async renameWorkspace(workspaceId: Id, name: string): Promise<void> {
    const trimmed = name.trim()
    if (trimmed.length < 2) throw new Error('Workspace name is too short')
    await this.workspaces.updateName(workspaceId, trimmed)
    this.logger.info('Workspace di-rename', { workspaceId, name: trimmed })
  }

  async leaveWorkspace(userId: Id, workspaceId: Id, displayName: string): Promise<Id> {
    const { data, error } = await this.client.rpc('leave_workspace', {
      p_workspace_id: workspaceId,
    })
    if (error) throw new Error(error.message)

    const nextWorkspaceId = data as Id
    await this.setActiveWorkspacePref(userId, nextWorkspaceId)
    this.actor.setSession(userId, nextWorkspaceId, displayName)
    this.logger.info('Keluar dari workspace', { workspaceId, userId, nextWorkspaceId })
    return nextWorkspaceId
  }

  async createNewWorkspace(userId: Id, displayName: string, name?: string): Promise<Id> {
    const label = name?.trim() || `${displayName.trim() || 'Study'}'s study group`
    const workspaceId = await this.createWorkspaceRecord(userId, label)
    await this.setActiveWorkspacePref(userId, workspaceId)
    this.actor.setSession(userId, workspaceId, displayName)
    this.logger.info('Workspace baru dibuat', { workspaceId, userId })
    return workspaceId
  }

  async getPlanMemberTaskStats(planId: Id, today: string): Promise<MemberTaskStats[]> {
    const { data, error } = await this.client.rpc('get_plan_member_task_stats', {
      p_plan_id: planId,
      p_today: today,
    })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: { user_id: string; done_today: number; done_total: number }) => ({
      userId: row.user_id as Id,
      doneToday: row.done_today ?? 0,
      doneTotal: row.done_total ?? 0,
    }))
  }

  private async resolveActiveWorkspace(userId: Id, displayName: string): Promise<Id> {
    const memberships = await this.listMembershipWorkspaceIds(userId)
    if (memberships.length === 0) {
      return this.createPersonalWorkspace(userId, displayName)
    }

    for (const wsId of memberships) {
      const pref = await this.preferences.get(userId, wsId, ACTIVE_WORKSPACE_PREF_KEY)
      if (pref === '1') return wsId
    }

    return memberships[0]
  }

  private async setActiveWorkspacePref(userId: Id, workspaceId: Id): Promise<void> {
    const memberships = await this.listMembershipWorkspaceIds(userId)
    await Promise.all(
      memberships.map((wsId) =>
        this.preferences.set(userId, wsId, ACTIVE_WORKSPACE_PREF_KEY, wsId === workspaceId ? '1' : '0'),
      ),
    )
    if (!memberships.includes(workspaceId)) {
      await this.preferences.set(userId, workspaceId, ACTIVE_WORKSPACE_PREF_KEY, '1')
    }
  }

  private async listMembershipWorkspaceIds(userId: Id): Promise<Id[]> {
    const { data, error } = await this.client
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => row.workspace_id as Id)
  }

  private async createPersonalWorkspace(userId: Id, displayName: string): Promise<Id> {
    const label = displayName.trim() || 'Study'
    return this.createWorkspaceRecord(userId, `${label}'s study group`)
  }

  private async createWorkspaceRecord(userId: Id, workspaceName: string): Promise<Id> {
    const now = this.clock.stamp()
    const workspaceId = this.ids.next()
    const inviteCode = generateInviteCode()

    await this.workspaces.save({
      id: workspaceId,
      name: workspaceName,
      inviteCode,
      createdAt: now,
    })

    await this.workspaces.addMember({
      id: this.ids.next(),
      workspaceId,
      userId,
      role: 'member',
      joinedAt: now,
    })

    return workspaceId
  }
}
