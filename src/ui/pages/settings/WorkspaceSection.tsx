import { useTranslation } from 'react-i18next'
import { Cloud, LogIn, LogOut, Users } from 'lucide-react'
import { useAuth } from '../../../app/auth/AuthProvider'
import { useServices } from '../../../core/di/ServicesProvider'
import { Button, Card, SectionTitle } from '../../components/primitives'

export function WorkspaceSection() {
  const { t } = useTranslation()
  const { cloudEnabled, session, loading, authError, signInWithGoogle, signOut } = useAuth()
  const { actor } = useServices()

  if (!cloudEnabled) {
    return (
      <section className="space-y-2">
        <SectionTitle>{t('settings.workspace')}</SectionTitle>
        <Card>
          <p className="text-sm text-zinc-500">{t('settings.workspaceLocal')}</p>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 px-1">
        <Users size={14} className="text-zinc-400" />
        <SectionTitle>{t('settings.workspace')}</SectionTitle>
      </div>
      <Card className="space-y-3">
        <div className="flex items-start gap-3">
          <Cloud size={18} className="mt-0.5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t('settings.workspaceShared')}</p>
            {session ? (
              <p className="mt-0.5 text-xs text-zinc-400">
                {t('settings.workspaceSignedInAs', { name: session.displayName })}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-zinc-400">{t('settings.workspaceSignInHint')}</p>
            )}
          </div>
        </div>

        {authError && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{authError}</p>
        )}

        {session ? (
          <Button variant="ghost" className="w-full" disabled={loading} onClick={() => void signOut()}>
            <span className="inline-flex items-center gap-2">
              <LogOut size={16} />
              {t('settings.signOut')}
            </span>
          </Button>
        ) : (
          <Button
            variant="primary"
            className="w-full"
            disabled={loading}
            onClick={() => void signInWithGoogle()}
          >
            <span className="inline-flex items-center gap-2">
              <LogIn size={16} />
              {loading ? t('settings.signingIn') : t('settings.signInGoogle')}
            </span>
          </Button>
        )}

        {session && (
          <p className="text-xs text-zinc-400">
            {t('settings.workspaceActivePlanHint', { name: actor.displayName })}
          </p>
        )}
      </Card>
    </section>
  )
}
