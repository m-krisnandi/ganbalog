import { useRef, useState } from 'react'
import { addMonths, format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import {
  BookOpen,
  CalendarCheck,
  CalendarRange,
  ChartNoAxesColumn,
  ChevronRight,
  Sparkles,
  Sun,
  Target,
} from 'lucide-react'
import type { IsoDate } from '../../domain/models'
import { useServices } from '../../core/di/ServicesProvider'
import { usePlanMutations, invalidateWorkspaceQueries } from '../../app/queries'
import type { StudyTemplateId } from '../../data/study-templates'
import { createStudyTemplatePlan } from '../../data/study-templates'
import { useQueryClient } from '@tanstack/react-query'
import { Button, TextInput } from './primitives'
import { DateRangeFields } from './DatePicker'
import { SamplePlanPicker, TemplateSummary } from './SamplePlanPicker'

const STEPS = ['welcome', 'how', 'plan', 'done'] as const
type Step = (typeof STEPS)[number]

type PlanMode = 'blank' | 'template'

const STEP_LABEL_KEYS = {
  welcome: 'onboarding.stepWelcome',
  how: 'onboarding.stepHow',
  plan: 'onboarding.stepPlan',
  done: 'onboarding.stepDone',
} as const satisfies Record<Step, string>

const slideVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 28 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -28 }),
}

export function OnboardingWizard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { clock, planService, audit } = useServices()
  const { create } = usePlanMutations()

  const today = clock.todayIso()
  const defaultTarget = format(addMonths(clock.now(), 6), 'yyyy-MM-dd') as IsoDate

  const [step, setStep] = useState<Step>('welcome')
  const [planMode, setPlanMode] = useState<PlanMode>('blank')
  const [templateId, setTemplateId] = useState<StudyTemplateId>('jlpt-n2')
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState<IsoDate>(today)
  const [targetDate, setTargetDate] = useState<IsoDate>(defaultTarget)
  const [submitting, setSubmitting] = useState(false)
  const directionRef = useRef(1)

  const stepIndex = STEPS.indexOf(step)

  const goToStep = (next: Step) => {
    const nextIndex = STEPS.indexOf(next)
    directionRef.current = nextIndex >= stepIndex ? 1 : -1
    setStep(next)
  }

  const submitPlan = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      if (planMode === 'template') {
        await createStudyTemplatePlan(templateId, planService, audit)
        invalidateWorkspaceQueries(queryClient)
        goToStep('done')
        return
      }

      const trimmed = name.trim()
      if (!trimmed || !startDate || !targetDate || targetDate < startDate) {
        setSubmitting(false)
        return
      }
      create.mutate(
        { name: trimmed, description: '', startDate, targetDate },
        {
          onSuccess: () => goToStep('done'),
          onSettled: () => setSubmitting(false),
        },
      )
      return
    } catch {
      /* toast from mutation layer */
    } finally {
      if (planMode === 'template') setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[70dvh] flex-col pt-6">
      <div className="mb-2">
        <div
          className="flex justify-center gap-2"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepIndex + 1}
          aria-label={t(STEP_LABEL_KEYS[step])}
        >
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= stepIndex ? 'w-8 bg-accent' : 'w-4 bg-surface-muted dark:bg-surface-muted-dark'
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-center text-xs font-medium text-zinc-400">
          {t(STEP_LABEL_KEYS[step])} · {stepIndex + 1}/{STEPS.length}
        </p>
      </div>

      <AnimatePresence mode="wait" custom={directionRef.current}>
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            custom={directionRef.current}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="flex flex-1 flex-col items-center text-center"
          >
            <div className="rounded-3xl border border-border-subtle bg-surface-raised p-4 shadow-soft-lg dark:border-border-subtle-dark dark:bg-surface-raised-dark">
              <img src="/logo.png" alt="" className="size-20 rounded-2xl" />
            </div>
            <h1 className="mt-6 text-2xl font-bold tracking-tight">{t('onboarding.welcomeTitle')}</h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {t('onboarding.welcomeBody')}
            </p>

            <ul className="mt-8 w-full max-w-sm space-y-3 text-left">
              {[
                { icon: Target, text: t('onboarding.benefit1') },
                { icon: BookOpen, text: t('onboarding.benefit2') },
                { icon: CalendarCheck, text: t('onboarding.benefit3') },
              ].map(({ icon: Icon, text }, i) => (
                <motion.li
                  key={text}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i, type: 'spring', stiffness: 400, damping: 28 }}
                  className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-raised px-4 py-3 dark:border-border-subtle-dark dark:bg-surface-raised-dark"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent dark:bg-accent-soft-dark">
                    <Icon size={18} aria-hidden />
                  </div>
                  <span className="text-sm font-medium">{text}</span>
                </motion.li>
              ))}
            </ul>

            <Button
              className="mt-auto w-full max-w-sm gap-2.5 self-center"
              onClick={() => goToStep('how')}
            >
              {t('onboarding.getStarted')}
              <ChevronRight size={16} strokeWidth={2.25} className="shrink-0" aria-hidden />
            </Button>
            <button
              type="button"
              onClick={() => navigate('/settings?import=1')}
              className="mt-3 text-xs font-medium text-zinc-400 underline-offset-2 transition-colors hover:text-accent hover:underline"
            >
              {t('onboarding.haveBackup')}
            </button>
          </motion.div>
        )}

        {step === 'how' && (
          <motion.div
            key="how"
            custom={directionRef.current}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="flex flex-1 flex-col"
          >
            <h2 className="text-xl font-bold">{t('onboarding.howTitle')}</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('onboarding.howBody')}</p>

            <div className="mt-6 space-y-3">
              {[
                {
                  icon: Sun,
                  title: t('onboarding.flowTodayTitle'),
                  body: t('onboarding.flowTodayBody'),
                  color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
                },
                {
                  icon: CalendarRange,
                  title: t('onboarding.flowPlanTitle'),
                  body: t('onboarding.flowPlanBody'),
                  color: 'bg-accent-soft text-accent dark:bg-accent-soft-dark',
                },
                {
                  icon: ChartNoAxesColumn,
                  title: t('onboarding.flowProgressTitle'),
                  body: t('onboarding.flowProgressBody'),
                  color: 'bg-success-soft text-success-strong dark:bg-success-soft-dark dark:text-emerald-300',
                },
              ].map(({ icon: Icon, title, body, color }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.07 * i, type: 'spring', stiffness: 400, damping: 28 }}
                  className="flex gap-3 rounded-2xl border border-border-subtle bg-surface-raised p-4 dark:border-border-subtle-dark dark:bg-surface-raised-dark"
                >
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${color}`}
                  >
                    <Icon size={20} aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-auto flex gap-3 pt-8">
              <Button variant="ghost" className="flex-1" onClick={() => goToStep('welcome')}>
                {t('common.back')}
              </Button>
              <Button className="flex-1" onClick={() => goToStep('plan')}>
                {t('onboarding.continue')}
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'plan' && (
          <motion.div
            key="plan"
            custom={directionRef.current}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="flex flex-1 flex-col"
          >
            <h2 className="text-xl font-bold">{t('onboarding.planTitle')}</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('onboarding.planBody')}</p>

            <SamplePlanPicker
              mode={planMode}
              templateId={templateId}
              onModeChange={setPlanMode}
              onTemplateIdChange={setTemplateId}
            />

            {planMode === 'blank' ? (
              <form
                className="mt-4 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  void submitPlan()
                }}
              >
                <TextInput
                  autoFocus
                  placeholder={t('settings.planNamePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <DateRangeFields
                  startDate={startDate}
                  targetDate={targetDate}
                  onStartDateChange={setStartDate}
                  onTargetDateChange={setTargetDate}
                  startLabel={t('settings.start')}
                  targetLabel={t('settings.targetDate')}
                />
                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" type="button" className="flex-1" onClick={() => goToStep('how')}>
                    {t('common.back')}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={submitting || !name.trim() || targetDate < startDate}
                  >
                    {submitting ? t('common.loading') : t('settings.create')}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-4">
                <TemplateSummary templateId={templateId} />
                <div className="flex gap-3">
                  <Button variant="ghost" className="flex-1" onClick={() => goToStep('how')}>
                    {t('common.back')}
                  </Button>
                  <Button className="flex-1" disabled={submitting} onClick={() => void submitPlan()}>
                    {submitting ? t('common.loading') : t('onboarding.useTemplate')}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div
            key="done"
            custom={directionRef.current}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="flex flex-1 flex-col items-center justify-center text-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22, delay: 0.05 }}
              className="flex size-16 items-center justify-center rounded-full bg-success text-white shadow-soft-lg"
            >
              <Sparkles size={28} aria-hidden />
            </motion.div>
            <h2 className="mt-6 text-xl font-bold">{t('onboarding.doneTitle')}</h2>
            <p className="mt-2 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
              {planMode === 'template' ? t('onboarding.doneTemplateBody') : t('onboarding.doneBody')}
            </p>

            <div className="mt-8 flex w-full max-w-sm flex-col gap-2">
              <Button className="w-full" onClick={() => navigate('/')}>
                {t('onboarding.goToday')}
              </Button>
              {planMode === 'blank' && (
                <Button variant="ghost" className="w-full" onClick={() => navigate('/plan')}>
                  {t('onboarding.goPlan')}
                </Button>
              )}
            </div>
            <p className="mt-4 text-xs text-zinc-400">{t('onboarding.doneHint')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
