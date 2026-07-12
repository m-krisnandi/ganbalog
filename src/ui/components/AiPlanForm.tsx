import { useTranslation } from 'react-i18next'
import type { AiPlanIntensity } from '../../data/generate-plan-ai'
import type { Weekday } from '../../domain/models'
import { Button, TextArea, TextInput } from './primitives'
import { DateRangeFields } from './DatePicker'

const ALL_WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7]
const INTENSITIES: AiPlanIntensity[] = ['light', 'standard', 'intense']

export function AiPlanForm({
  goal,
  description,
  startDate,
  targetDate,
  weekdays,
  intensity,
  submitting,
  signedIn,
  onGoalChange,
  onDescriptionChange,
  onStartDateChange,
  onTargetDateChange,
  onWeekdaysChange,
  onIntensityChange,
  onSubmit,
  onCancel,
  onSignIn,
}: {
  goal: string
  description: string
  startDate: string
  targetDate: string
  weekdays: Weekday[]
  intensity: AiPlanIntensity
  submitting: boolean
  signedIn: boolean
  onGoalChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onStartDateChange: (value: string) => void
  onTargetDateChange: (value: string) => void
  onWeekdaysChange: (value: Weekday[]) => void
  onIntensityChange: (value: AiPlanIntensity) => void
  onSubmit: () => void
  onCancel: () => void
  onSignIn: () => void
}) {
  const { t } = useTranslation()
  const weekdaySet = new Set(weekdays)

  const toggleWeekday = (day: Weekday) => {
    if (weekdaySet.has(day)) {
      if (weekdays.length <= 1) return
      onWeekdaysChange(weekdays.filter((d) => d !== day))
    } else {
      onWeekdaysChange([...weekdays, day].sort((a, b) => a - b) as Weekday[])
    }
  }

  return (
    <form
      className="space-y-3 pb-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!signedIn || submitting) return
        onSubmit()
      }}
    >
      {!signedIn && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-200">
          <p>{t('plan.aiSignInRequired')}</p>
          <Button type="button" variant="ghost" className="mt-2 w-full" onClick={onSignIn}>
            {t('settings.signInGoogle')}
          </Button>
        </div>
      )}

      <TextInput
        autoFocus
        placeholder={t('plan.aiGoalPlaceholder')}
        value={goal}
        onChange={(e) => onGoalChange(e.target.value)}
        disabled={submitting}
      />
      <TextArea
        placeholder={t('plan.aiDescPlaceholder')}
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        disabled={submitting}
      />

      <DateRangeFields
        startDate={startDate}
        targetDate={targetDate}
        onStartDateChange={onStartDateChange}
        onTargetDateChange={onTargetDateChange}
        startLabel={t('settings.start')}
        targetLabel={t('settings.targetDate')}
      />

      <div className="space-y-1.5">
        <p className="px-1 text-xs text-zinc-400">{t('plan.aiStudyDays')}</p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_WEEKDAYS.map((day) => {
            const selected = weekdaySet.has(day)
            return (
              <button
                key={day}
                type="button"
                disabled={submitting}
                aria-pressed={selected}
                onClick={() => toggleWeekday(day)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-accent text-white'
                    : 'bg-surface-muted text-zinc-600 dark:bg-surface-muted-dark dark:text-zinc-300'
                }`}
              >
                {t(`weekdaysShort.${day}`)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="px-1 text-xs text-zinc-400">{t('plan.aiIntensity')}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {INTENSITIES.map((level) => {
            const selected = intensity === level
            return (
              <button
                key={level}
                type="button"
                disabled={submitting}
                aria-pressed={selected}
                onClick={() => onIntensityChange(level)}
                className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-accent text-white'
                    : 'bg-surface-muted text-zinc-600 dark:bg-surface-muted-dark dark:text-zinc-300'
                }`}
              >
                {t(`plan.aiIntensity_${level}`)}
              </button>
            )
          })}
        </div>
      </div>

      <p className="px-1 text-xs text-zinc-400">{t('plan.aiHint')}</p>

      <div className="flex gap-3">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel} disabled={submitting}>
          {t('common.close')}
        </Button>
        <Button type="submit" className="flex-1" disabled={!signedIn || submitting}>
          {submitting ? t('plan.aiGenerating') : t('plan.createWithAi')}
        </Button>
      </div>
    </form>
  )
}
