import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { CalendarCheck, ChartNoAxesColumn, LogIn, Target, Users } from 'lucide-react'
import { useAuth } from '../../app/auth/AuthProvider'
import { peekPendingJoinCode } from '../../core/auth/join-url'
import { Button } from '../components/primitives'
import { AppFooter } from '../components/AppFooter'

const BENEFITS = [
  { icon: Target, key: 'login.benefitPlan' as const },
  { icon: CalendarCheck, key: 'login.benefitToday' as const },
  { icon: ChartNoAxesColumn, key: 'login.benefitProgress' as const },
] as const

export function LoginScreen() {
  const { t } = useTranslation()
  const { loading, authError, signInWithGoogle } = useAuth()
  const pendingJoin = peekPendingJoinCode()

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-8 pt-safe pb-24">
      <div className="flex w-full max-w-xs flex-col items-center text-center">
        <div className="rounded-3xl border border-border-subtle bg-surface-raised p-3 shadow-soft-lg dark:border-border-subtle-dark dark:bg-surface-raised-dark">
          <img src="/logo.png" alt="GanbaLog" className="size-20 rounded-2xl" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">GanbaLog</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">{t('app.mission')}</p>
        <p className="mt-1 text-xs text-zinc-400">{t('app.tagline')}</p>

        <ul className="mt-5 w-full space-y-2 text-left">
          {BENEFITS.map(({ icon: Icon, key }) => (
            <li
              key={key}
              className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-raised px-3.5 py-2.5 dark:border-border-subtle-dark dark:bg-surface-raised-dark"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent dark:bg-accent-soft-dark">
                <Icon size={16} aria-hidden />
              </div>
              <span className="text-sm font-medium leading-snug text-zinc-700 dark:text-zinc-200">
                {t(key)}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 rounded-2xl bg-surface-muted px-4 py-3 text-sm text-zinc-600 dark:bg-surface-muted-dark dark:text-zinc-400">
          {t('settings.workspaceSignInHint')}
        </p>

        {pendingJoin && (
          <p className="mt-4 flex w-full items-start gap-2 rounded-2xl border border-accent/30 bg-accent-soft/30 px-4 py-3 text-left text-sm text-zinc-700 dark:border-accent/20 dark:bg-accent-soft-dark/30 dark:text-zinc-300">
            <Users size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            <span>{t('settings.workspacePendingJoin', { code: pendingJoin })}</span>
          </p>
        )}

        {authError && (
          <p className="mt-4 w-full rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-500">
            {authError}
          </p>
        )}

        <Button
          className="mt-6 w-full gap-2.5"
          disabled={loading}
          onClick={() => void signInWithGoogle()}
        >
          <LogIn size={16} strokeWidth={2.25} className="shrink-0" aria-hidden />
          {loading ? t('settings.signingIn') : t('settings.signInGoogle')}
        </Button>

        <p className="mt-4 text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
          {t('login.privacyNoteShort')}{' '}
          <Link to="/legal" className="font-medium text-accent underline-offset-2 hover:underline">
            {t('legal.link')}
          </Link>
        </p>
      </div>

      <AppFooter className="absolute bottom-8 px-8" />
    </div>
  )
}
