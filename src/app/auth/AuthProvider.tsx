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
import { useServices } from '../../core/di/ServicesProvider'
import type { AuthSession } from '../../core/auth/auth-service'
import { seedIfNeeded } from '../../data/seed'
import { invalidateWorkspaceQueries, keys } from '../queries'
import { useRealtimeSync } from '../realtime/useRealtimeSync'

interface AuthContextValue {
  session: AuthSession | null
  loading: boolean
  authError: string | null
  cloudEnabled: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function RealtimeBridge(): null {
  useRealtimeSync()
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth, planService, taskService, meta, audit, logger } = useServices()
  const queryClient = useQueryClient()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(Boolean(auth))
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
        const supabaseSession = await auth.getSession()
        const next = await auth.bootstrapFromSession(supabaseSession)
        if (next) {
          await seedIfNeeded(planService, taskService, meta, audit, logger)
        }
        setSession(next)
        setAuthError(null)
        invalidateWorkspaceQueries(queryClient)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error('Gagal bootstrap session', error)
        setSession(null)
        setAuthError(message)
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
  }, [auth, audit, logger, meta, planService, queryClient, taskService])

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
    await auth.signInWithGoogle()
  }, [auth])

  const signOut = useCallback(async () => {
    if (!auth) return
    await auth.signOut()
    setSession(null)
    queryClient.clear()
    void queryClient.invalidateQueries({ queryKey: keys.plans })
  }, [auth, queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      authError,
      cloudEnabled: Boolean(auth),
      signInWithGoogle,
      signOut,
    }),
    [auth, authError, loading, session, signInWithGoogle, signOut],
  )

  return (
    <AuthContext.Provider value={value}>
      {auth && session ? <RealtimeBridge /> : null}
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    return {
      session: null,
      loading: false,
      authError: null,
      cloudEnabled: false,
      signInWithGoogle: async () => {},
      signOut: async () => {},
    }
  }
  return ctx
}
