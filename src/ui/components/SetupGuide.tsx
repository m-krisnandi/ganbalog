import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { BookOpen, CalendarRange, Check, ChevronRight, ListChecks, X } from 'lucide-react'
import { useMaterials, useSchedule } from '../../app/queries'
import { Button, Card } from './primitives'
import { dismissSetupGuide, isSetupGuideDismissed } from '../lib/setup-guide'

interface SetupGuideProps {
  planId: string
  sourceTemplateId?: string | null
}

export function SetupGuide({ planId, sourceTemplateId }: SetupGuideProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: materials = [] } = useMaterials(planId)
  const { data: schedule = [] } = useSchedule(planId)
  const [hidden, setHidden] = useState(() => isSetupGuideDismissed(planId))

  if (hidden || sourceTemplateId) return null

  const hasMaterials = materials.length > 0
  const hasSchedule = schedule.length > 0
  if (hasMaterials && hasSchedule) return null

  const steps = [
    {
      id: 'materials',
      icon: BookOpen,
      title: t('setupGuide.stepMaterialsTitle'),
      body: t('setupGuide.stepMaterialsBody'),
      done: hasMaterials,
      action: () => navigate('/plan?segment=materials'),
      actionLabel: t('setupGuide.goMaterials'),
    },
    {
      id: 'schedule',
      icon: CalendarRange,
      title: t('setupGuide.stepScheduleTitle'),
      body: t('setupGuide.stepScheduleBody'),
      done: hasSchedule,
      action: () => navigate('/plan?segment=schedule'),
      actionLabel: t('setupGuide.goSchedule'),
    },
  ]

  const handleDismiss = () => {
    dismissSetupGuide(planId)
    setHidden(true)
  }

  return (
    <Card className="relative border-accent/20 bg-accent-soft/40 dark:border-accent/15 dark:bg-accent-soft-dark/30">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('setupGuide.dismiss')}
        className="absolute top-3 right-3 rounded-full p-1 text-zinc-400 transition-colors hover:bg-white/60 hover:text-zinc-600 dark:hover:bg-zinc-800"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
          <ListChecks size={20} aria-hidden />
        </div>
        <div>
          <h2 className="text-sm font-bold">{t('setupGuide.title')}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t('setupGuide.subtitle')}
          </p>
        </div>
      </div>

      <ol className="mt-4 space-y-2">
        {steps.map((step, index) => {
          const Icon = step.icon
          return (
            <li
              key={step.id}
              className={`rounded-2xl border px-3.5 py-3 ${
                step.done
                  ? 'border-success/30 bg-success-soft/50 dark:border-success/20 dark:bg-success-soft-dark/20'
                  : 'border-border-subtle bg-surface-raised dark:border-border-subtle-dark dark:bg-surface-raised-dark'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    step.done
                      ? 'bg-success text-white'
                      : 'bg-surface-muted text-zinc-500 dark:bg-surface-muted-dark'
                  }`}
                  aria-hidden
                >
                  {step.done ? <Check size={14} strokeWidth={3} /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <Icon size={14} className="text-accent" aria-hidden />
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {step.body}
                  </p>
                  {!step.done && (
                    <Button
                      variant="ghost"
                      className="mt-2 h-8 px-0 text-xs font-semibold text-accent"
                      onClick={step.action}
                    >
                      <span className="inline-flex items-center gap-1">
                        {step.actionLabel}
                        <ChevronRight size={14} />
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
