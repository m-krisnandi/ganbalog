import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Flame, X } from 'lucide-react'
import type { StreakMilestone } from '../lib/streak-celebration'
import { ConfettiBurst } from './ConfettiBurst'

interface StreakMilestoneBannerProps {
  milestone: StreakMilestone
  onDismiss: () => void
}

export function StreakMilestoneBanner({ milestone, onDismiss }: StreakMilestoneBannerProps) {
  const { t } = useTranslation()
  const key = milestone === 7 ? 'today.milestone7' : 'today.milestone30'

  return (
    <>
      <ConfettiBurst active onComplete={() => {}} />
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        className="relative overflow-hidden rounded-2xl border border-amber-300/60 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-soft dark:border-amber-700/40 dark:from-amber-950/40 dark:to-orange-950/30"
      >
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('common.close')}
          className="absolute top-3 right-3 rounded-full p-1 text-amber-600/70 transition-colors hover:bg-amber-100/80 dark:text-amber-400/70 dark:hover:bg-amber-900/40"
        >
          <X size={16} />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-soft">
            <Flame size={22} aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
              {t('today.milestoneTitle', { count: milestone })}
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-amber-800/80 dark:text-amber-200/80">
              {t(key)}
            </p>
          </div>
        </div>
      </motion.div>
    </>
  )
}
