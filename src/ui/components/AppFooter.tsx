import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { APP_VERSION } from '../../core/version'
import { useAuth } from '../../app/auth/AuthProvider'

export function AppFooter({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const { cloudEnabled, session } = useAuth()
  const key = cloudEnabled && session ? 'settings.footerCloud' : 'settings.footerLocal'

  return (
    <p className={`text-center text-xs text-zinc-300 dark:text-zinc-600 ${className}`}>
      {t(key, { version: APP_VERSION })}
      {' · '}
      <Link to="/legal" className="text-zinc-400 underline-offset-2 hover:underline dark:text-zinc-500">
        {t('legal.link')}
      </Link>
    </p>
  )
}
