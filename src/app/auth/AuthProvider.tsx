import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useServices } from '../../core/di/ServicesProvider'
import type { AuthSession } from '../../core/auth/auth-service'
import { seedIfNeeded } from '../../data/seed'
import { invalidateWorkspaceQueries, keys } from '../queries'
import { useToastStore } from '../toast-store'
import { formatAuthError } from '../../core/auth/auth-errors'
import { useRealtimeSync } from '../realtime/useRealtimeSync'

interface AuthContextValue {
  session: AuthSession | null
  loading: boolean
  authError: string | null
  cloudEnabled: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  joinWorkspace: (code: string) => Promise<void>
  switchWorkspace: (workspaceId: string) => Promise<void>
  renameWorkspace: (name: string) => Promise<void>
  leaveWorkspace: () => Promise<void>
  createWorkspace: (name?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function RealtimeBridge(): null {
  useRealtimeSync()
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth, planService, taskService, meta, audit, logger } = useServices()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(Boolean(auth))
  const [signingIn, setSigningIn] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const refreshInFlight = useRef<Promise<void> | null>(null)

  const refreshSession = useCallback(async () => {
    if (!auth) {
      setSession(null)
      setAuthError(null)
      setLoading(false)
      return
    }

    if (refreshInFlight.current) {
      await refreshInFlight.current
      return
    }

    const run = (async () => {
      setLoading(true)
      try {
        const pendingJoin = auth.peekPendingJoinCode()
        const supabaseSession = await auth.getSession()
        const next = await auth.bootstrapFromSession(supabaseSession)
        if (next) {
          await seedIfNeeded(planService, taskService, meta, audit, logger)
        }
        setSession(next)
        setAuthError(null)
        invalidateWorkspaceQueries(queryClient)
        if (next && pendingJoin) {
          useToastStore.getState().show(t('settings.workspaceJoinSuccess'), 'success')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error('Gagal bootstrap session', error)
        setSession(null)
        setAuthError(formatAuthError(message, t))
      } finally {
        setLoading(false)
      }
    })()

    refreshInFlight.current = run
    try {
      await run
    } finally {
      refreshInFlight.current = null
    }
  }, [auth, audit, logger, meta, planService, queryClient, t, taskService])

  useEffect(() => {
    void refreshSession()
    if (!auth) return

    const { unsubscribe } = auth.onAuthStateChange(() => {
      void refreshSession()
    })
    return unsubscribe
  }, [auth, refreshSession])

  const signInWithGoogle = useCallback(async () => {
    if (!auth) return
    setSigningIn(true)
    setAuthError(null)
    try {
      await auth.signInWithGoogle()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setAuthError(formatAuthError(message, t))
      setSigningIn(false)
    }
  }, [auth, t])

  const signOut = useCallback(async () => {
    if (!auth) return
    await auth.signOut()
    setSession(null)
    queryClient.clear()
    void queryClient.invalidateQueries({ queryKey: keys.plans })
    useToastStore.getState().show(t('settings.signOutSuccess'), 'success', {
      label: t('settings.signInAgain'),
      onAction: () => void signInWithGoogle(),
    })
  }, [auth, queryClient, signInWithGoogle, t])

  const joinWorkspace = useCallback(
    async (code: string) => {
      if (!auth || !session) return
      try {
        await auth.joinWorkspaceByCode(code, session.userId)
        await refreshSession()
        useToastStore.getState().show(t('settings.workspaceJoinSuccess'), 'success')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        useToastStore.getState().show(message, 'error')
        throw error
      }
    },
    [auth, refreshSession, session, t],
  )

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!auth || !session || session.workspaceId === workspaceId) return
      try {
        await auth.switchActiveWorkspace(session.userId, workspaceId, session.displayName)
        setSession({ ...session, workspaceId })
        invalidateWorkspaceQueries(queryClient)
        const info = await auth.getWorkspaceInfo(workspaceId)
        useToastStore.getState().show(
          t('settings.workspaceSwitchSuccess', { name: info?.workspace.name ?? '' }),
          'success',
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        useToastStore.getState().show(message, 'error')
        throw error
      }
    },
    [auth, queryClient, session, t],
  )

  const renameWorkspace = useCallback(
    async (name: string) => {
      if (!auth || !session) return
      try {
        await auth.renameWorkspace(session.workspaceId, name)
        invalidateWorkspaceQueries(queryClient)
        useToastStore.getState().show(t('settings.workspaceRenameSuccess'), 'success')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        useToastStore.getState().show(message, 'error')
        throw error
      }
    },
    [auth, queryClient, session, t],
  )

  const leaveWorkspace = useCallback(async () => {
    if (!auth || !session) return
    try {
      const nextWorkspaceId = await auth.leaveWorkspace(
        session.userId,
        session.workspaceId,
        session.displayName,
      )
      setSession({ ...session, workspaceId: nextWorkspaceId })
      invalidateWorkspaceQueries(queryClient)
      useToastStore.getState().show(t('settings.workspaceLeaveSuccess'), 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      useToastStore.getState().show(message, 'error')
      throw error
    }
  }, [auth, queryClient, session, t])

  const createWorkspace = useCallback(
    async (name?: string) => {
      if (!auth || !session) return
      try {
        const workspaceId = await auth.createNewWorkspace(
          session.userId,
          session.displayName,
          name,
        )
        setSession({ ...session, workspaceId })
        invalidateWorkspaceQueries(queryClient)
        const info = await auth.getWorkspaceInfo(workspaceId)
        useToastStore.getState().show(
          t('settings.workspaceCreateSuccess', { name: info?.workspace.name ?? '' }),
          'success',
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        useToastStore.getState().show(message, 'error')
        throw error
      }
    },
    [auth, queryClient, session, t],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading: loading || signingIn,
      authError,
      cloudEnabled: Boolean(auth),
      signInWithGoogle,
      signOut,
      joinWorkspace,
      switchWorkspace,
      renameWorkspace,
      leaveWorkspace,
      createWorkspace,
    }),
    [
      auth,
      authError,
      createWorkspace,
      joinWorkspace,
      leaveWorkspace,
      loading,
      renameWorkspace,
      session,
      signInWithGoogle,
      signOut,
      signingIn,
      switchWorkspace,
    ],
  )

  return (
    <AuthContext.Provider value={value}>
      {auth && session ? <RealtimeBridge key={session.workspaceId} /> : null}
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
