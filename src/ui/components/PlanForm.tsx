import { useTranslation } from 'react-i18next'
import { Button, TextInput } from './primitives'
import { DatePicker } from './DatePicker'

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
      <div className="flex gap-3">
        <label className="flex-1 space-y-1">
          <span className="px-1 text-xs text-zinc-400">{t('settings.start')}</span>
          <DatePicker value={startDate} onChange={onStartDateChange} />
        </label>
        <label className="flex-1 space-y-1">
          <span className="px-1 text-xs text-zinc-400">{t('settings.targetDate')}</span>
          <DatePicker value={targetDate} onChange={onTargetDateChange} />
        </label>
      </div>
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
