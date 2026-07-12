import { useTranslation } from 'react-i18next'
import { Button, TextInput } from './primitives'
import { DateRangeFields } from './DatePicker'

export function PlanForm({
  name,
  description,
  startDate,
  targetDate,
  onNameChange,
  onDescriptionChange,
  onStartDateChange,
  onTargetDateChange,
  onSubmit,
  onCancel,
  submitLabel,
  autoFocus,
}: {
  name: string
  description: string
  startDate: string
  targetDate: string
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onStartDateChange: (value: string) => void
  onTargetDateChange: (value: string) => void
  onSubmit: () => void
  onCancel?: () => void
  submitLabel?: string
  autoFocus?: boolean
}) {
  const { t } = useTranslation()

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <TextInput
        autoFocus={autoFocus}
        placeholder={t('settings.planNamePlaceholder')}
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
      />
      <TextInput
        placeholder={t('settings.planDescPlaceholder')}
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
      />
      <DateRangeFields
        startDate={startDate}
        targetDate={targetDate}
        onStartDateChange={onStartDateChange}
        onTargetDateChange={onTargetDateChange}
        startLabel={t('settings.start')}
        targetLabel={t('settings.targetDate')}
      />
      {onCancel ? (
        <div className="flex gap-3">
          <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>
            {t('common.close')}
          </Button>
          <Button type="submit" className="flex-1">
            {submitLabel ?? t('common.save')}
          </Button>
        </div>
      ) : (
        <Button type="submit" className="w-full">
          {submitLabel ?? t('common.save')}
        </Button>
      )}
    </form>
  )
}
