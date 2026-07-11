import type { Session, SupabaseClient } from '@supabase/supabase-js'
import type { Clock } from '../clock'
import type { IdGenerator } from '../ids'
import type { Logger } from '../logging/logger'
import type { MutableActorContext } from '../session/actor-context'
import type { Id } from '../../domain/models'
import type {
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

export class AuthService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly actor: MutableActorContext,
    private readonly workspaces: WorkspaceRepository,
    private readonly profiles: UserProfileRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly logger: Logger,
  ) {}

  isEnabled(): boolean {
    return true
  }

  async getSession(): Promise<Session | null> {
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
    const redirectTo = `${window.location.origin}${window.location.pathname}`
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

    const workspaceId = await this.ensureWorkspaceMembership(userId)
    this.actor.setSession(userId, workspaceId, displayName)

    return { userId, email, displayName, avatarUrl, workspaceId }
  }

  private async ensureWorkspaceMembership(userId: Id): Promise<Id> {
    const { data: memberships, error } = await this.client
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)

    if (error) throw new Error(error.message)
    if (memberships?.[0]?.workspace_id) {
      return memberships[0].workspace_id as Id
    }

    const { data: existingWorkspaces, error: wsError } = await this.client
      .from('workspaces')
      .select('id')
      .limit(1)
    if (wsError) throw new Error(wsError.message)

    const now = this.clock.stamp()
    let workspaceId: Id

    if (existingWorkspaces?.[0]?.id) {
      workspaceId = existingWorkspaces[0].id as Id
    } else {
      workspaceId = this.ids.next()
      await this.workspaces.save({
        id: workspaceId,
        name: 'GanbaLog',
        createdAt: now,
      })
    }

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
