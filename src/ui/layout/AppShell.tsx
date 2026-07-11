import { NavLink, Outlet } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CalendarRange, ChartNoAxesColumn, Settings, Sun } from 'lucide-react'
import { useSheetStore } from '../../app/sheet-store'
import { useAuth } from '../../app/auth/AuthProvider'
import { LoginScreen } from './LoginScreen'

const tabs = [
  { to: '/', key: 'nav.today', icon: Sun },
  { to: '/plan', key: 'nav.plan', icon: CalendarRange },
  { to: '/progress', key: 'nav.progress', icon: ChartNoAxesColumn },
  { to: '/settings', key: 'nav.settings', icon: Settings },
]

export function AppShell() {
  const { t } = useTranslation()
  const sheetOpen = useSheetStore((s) => s.openCount > 0)
  const { cloudEnabled, session, loading } = useAuth()

  if (cloudEnabled && loading) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center justify-center">
        <div
          className="size-8 animate-spin rounded-full border-2 border-zinc-300 border-t-accent dark:border-zinc-700"
          role="status"
          aria-label="Loading"
        />
      </div>
    )
  }

  if (cloudEnabled && !session && !loading) {
    return <LoginScreen />
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className="flex-1 px-4 pt-safe pb-28">
        <Outlet />
      </main>

      <nav
        aria-label="Navigasi utama"
        aria-hidden={sheetOpen}
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/70 bg-white/90 backdrop-blur-lg transition-opacity dark:border-zinc-800 dark:bg-zinc-950/90 ${
          sheetOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around py-2">
          {tabs.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-1 cursor-pointer flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-accent' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                }`
              }
            >
              <Icon size={21} strokeWidth={2.2} />
              {t(key)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
