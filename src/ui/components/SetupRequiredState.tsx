import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Target } from 'lucide-react'
import { Button } from './primitives'

/** Shown on Plan / Progress when no active plan — lighter than full onboarding wizard. */
export function SetupRequiredState() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-[55dvh] flex-col items-center justify-center px-4 pt-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft dark:bg-accent-soft-dark">
        <Target size={28} className="text-accent" aria-hidden />
      </div>
      <h2 className="mt-5 text-xl font-bold">{t('setupRequired.title')}</h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        {t('setupRequired.body')}
      </p>
      <Button className="mt-6 min-w-[12rem]" onClick={() => navigate('/')}>
        {t('setupRequired.cta')}
      </Button>
    </div>
  )
}
