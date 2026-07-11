import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Plus, Sprout } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from './primitives'

export function NoPlanEmptyState({ icon: Icon = Sprout }: { icon?: LucideIcon }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
        <Icon size={22} strokeWidth={1.75} aria-hidden />
      </div>
      <p className="max-w-xs text-sm text-zinc-400">{t('common.noPlan')}</p>
      <Link to="/settings?newPlan=1" className="no-underline">
        <Button className="inline-flex items-center gap-2">
          <Plus size={16} />
          {t('common.createPlan')}
        </Button>
      </Link>
    </div>
  )
}
