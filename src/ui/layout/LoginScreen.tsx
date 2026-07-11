import { useTranslation } from 'react-i18next'
import { LogIn } from 'lucide-react'
import { useAuth } from '../../app/auth/AuthProvider'
import { Button } from '../components/primitives'

export function LoginScreen() {
  const { t } = useTranslation()
  const { loading, authError, signInWithGoogle } = useAuth()

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-8 pt-safe">
      <div className="flex w-full max-w-xs flex-col items-center text-center">
        <img src="/logo.png" alt="GanbaLog" className="size-20 rounded-3xl shadow-sm" />
        <h1 className="mt-6 text-2xl font-bold">GanbaLog</h1>
        <p className="mt-2 text-sm text-zinc-400">{t('settings.subtitle')}</p>
        <p className="mt-6 text-sm text-zinc-500">{t('settings.workspaceSignInHint')}</p>

        {authError && (
          <p className="mt-4 w-full rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">
            {authError}
          </p>
        )}

        <Button
          className="mt-6 w-full"
          disabled={loading}
          onClick={() => void signInWithGoogle()}
        >
          <span className="inline-flex items-center gap-2">
            <LogIn size={16} />
            {loading ? t('settings.signingIn') : t('settings.signInGoogle')}
          </span>
        </Button>
      </div>

      <p className="absolute bottom-8 px-8 text-center text-xs text-zinc-300 dark:text-zinc-600">
        {t('settings.footer')}
      </p>
    </div>
  )
}
