import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { CalendarRange, ChartNoAxesColumn, Settings, Sun, X } from 'lucide-react'
import { dismissNavCoach, isNavCoachDismissed } from '../lib/nav-coach'

const HINTS = [
  { icon: Sun, key: 'navCoach.today' as const },
  { icon: CalendarRange, key: 'navCoach.plan' as const },
  { icon: ChartNoAxesColumn, key: 'navCoach.progress' as const },
  { icon: Settings, key: 'navCoach.settings' as const },
]

export function NavCoach() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(!isNavCoachDismissed())

  if (!open) return null

  const handleDismiss = () => {
    dismissNavCoach()
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          className="mb-1"
          role="dialog"
          aria-label={t('navCoach.title')}
        >
          <div className="rounded-2xl border border-border-subtle bg-surface-raised p-3.5 shadow-soft dark:border-border-subtle-dark dark:bg-surface-raised-dark">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold">{t('navCoach.title')}</p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {t('navCoach.subtitle')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label={t('navCoach.dismiss')}
                className="shrink-0 rounded-full p-1 text-zinc-400 transition-colors hover:bg-surface-muted hover:text-zinc-600 dark:hover:bg-surface-muted-dark"
              >
                <X size={16} />
              </button>
            </div>

            <ul className="mt-3 grid grid-cols-2 gap-2">
              {HINTS.map(({ icon: Icon, key }) => (
                <li
                  key={key}
                  className="flex items-start gap-2 rounded-xl bg-surface-muted/80 px-2.5 py-2 dark:bg-surface-muted-dark/80"
                >
                  <Icon size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                  <span className="text-[11px] leading-snug text-zinc-600 dark:text-zinc-300">
                    {t(key)}
                  </span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={handleDismiss}
              className="mt-3 w-full cursor-pointer rounded-full bg-accent py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t('navCoach.gotIt')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
