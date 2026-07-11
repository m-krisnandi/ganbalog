import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarRange, ChartNoAxesColumn, Settings, Sun } from 'lucide-react'
import { useSheetStore } from '../../app/sheet-store'
import { useAuth } from '../../app/auth/AuthProvider'
import { LoginScreen } from './LoginScreen'
import { OfflineBanner } from '../components/OfflineBanner'

const tabs = [
  { to: '/', key: 'nav.today', icon: Sun },
  { to: '/plan', key: 'nav.plan', icon: CalendarRange },
  { to: '/progress', key: 'nav.progress', icon: ChartNoAxesColumn },
  { to: '/settings', key: 'nav.settings', icon: Settings },
]

export function AppShell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const sheetOpen = useSheetStore((s) => s.openCount > 0)
  const { cloudEnabled, session, loading } = useAuth()

  useEffect(() => {
    if (cloudEnabled && !session && !loading) {
      navigate('/', { replace: true })
    }
  }, [cloudEnabled, loading, navigate, session])

  if (cloudEnabled && loading) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center justify-center">
        <div
          className="size-8 animate-spin rounded-full border-2 border-zinc-300 border-t-accent dark:border-zinc-700"
          role="status"
          aria-label={t('common.loading')}
        />
      </div>
    )
  }

  if (cloudEnabled && !session && !loading) {
    return <LoginScreen />
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className="flex-1 px-4 pt-safe pb-[calc(var(--nav-height)+env(safe-area-inset-bottom,0px)+0.75rem)]">
        <OfflineBanner />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="motion-reduce:transform-none"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <nav
        aria-label={t('nav.mainAria')}
        aria-hidden={sheetOpen}
        className={`fixed inset-x-0 bottom-0 z-30 px-4 pb-safe transition-opacity ${
          sheetOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div className="mx-auto max-w-lg">
          <div className="mb-2 flex items-stretch justify-around gap-1 rounded-2xl border border-border-subtle bg-surface-raised/95 p-1.5 shadow-nav backdrop-blur-xl dark:border-border-subtle-dark dark:bg-surface-raised-dark/95">
            {tabs.map(({ to, key, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex min-h-[52px] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl py-2.5 text-[11px] font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-accent-soft text-accent dark:bg-accent-soft-dark'
                      : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                  }`
                }
              >
                <Icon size={22} strokeWidth={2.2} />
                {t(key)}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  )
}
