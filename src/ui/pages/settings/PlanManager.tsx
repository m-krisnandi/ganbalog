import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { Archive, ArchiveRestore, CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Plan } from '../../../domain/models'
import { dateLocale } from '../../../app/i18n'
import { defaultNewPlanDates } from '../../../core/plan-dates'
import { useServices } from '../../../core/di/ServicesProvider'
import {
  usePlanMutations,
  usePlans,
  useActivePlan,
} from '../../../app/queries'
import { Button, Card, SectionTitle, TextInput } from '../../components/primitives'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DatePicker } from '../../components/DatePicker'
import { Sheet } from '../../components/Sheet'

export function PlanManager() {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const { clock } = useServices()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: plans = [] } = usePlans()
  const { data: activePlan } = useActivePlan()
  const { create, updateDetails, archive, restore, deletePermanently, setActive } =
    usePlanMutations()

  const [addOpen, setAddOpen] = useState(false)
  const [detailPlanId, setDetailPlanId] = useState<string | null>(null)
  const [sheetMode, setSheetMode] = useState<'view' | 'edit'>('view')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Plan | null>(null)

  const detailPlan = useMemo(
    () => plans.find((plan) => plan.id === detailPlanId),
    [plans, detailPlanId],
  )

  const activePlans = plans.filter((plan) => plan.status === 'active')
  const archivedPlans = plans.filter((plan) => plan.status === 'archived')

  const openAdd = () => {
    const { startDate: start, targetDate: target } = defaultNewPlanDates(clock.todayIso())
    setStartDate(start)
    setTargetDate(target)
    setName('')
    setDescription('')
    setAddOpen(true)
  }

  useEffect(() => {
    if (searchParams.get('newPlan') !== '1') return
    openAdd()
    const next = new URLSearchParams(searchParams)
    next.delete('newPlan')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const closeAdd = () => {
    setAddOpen(false)
    setName('')
    setDescription('')
    setStartDate('')
    setTargetDate('')
  }

  const openDetail = (plan: Plan) => {
    setDetailPlanId(plan.id)
    setSheetMode('view')
  }

  const closeDetail = () => {
    setDetailPlanId(null)
    setSheetMode('view')
  }

  const startEdit = () => {
    if (!detailPlan) return
    setName(detailPlan.name)
    setDescription(detailPlan.description)
    setStartDate(detailPlan.startDate)
    setTargetDate(detailPlan.targetDate)
    setSheetMode('edit')
  }

  useEffect(() => {
    if (sheetMode === 'edit' && detailPlan) {
      setName(detailPlan.name)
      setDescription(detailPlan.description)
      setStartDate(detailPlan.startDate)
      setTargetDate(detailPlan.targetDate)
    }
  }, [detailPlan, sheetMode])

  const requestDelete = (plan: Plan) => {
    setPendingDelete(plan)
  }

  const handleConfirmDelete = () => {
    if (!pendingDelete) return
    deletePermanently.mutate(pendingDelete.id, {
      onSuccess: () => {
        setPendingDelete(null)
        closeDetail()
      },
    })
  }

  const isArchived = detailPlan?.status === 'archived'

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <SectionTitle>{t('settings.plans')}</SectionTitle>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent-soft dark:hover:bg-accent-soft-dark"
        >
          <Plus size={14} /> {t('settings.newPlan')}
        </button>
      </div>

      <div className="space-y-2">
        {activePlans.map((plan) => {
          const isActive = plan.id === activePlan?.id
          return (
            <Card key={plan.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActive.mutate(plan.id)}
                title={t('settings.setActivePlan')}
                aria-label={t('settings.setActivePlan')}
                className="shrink-0 rounded-full p-1 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <CheckCircle2
                  size={20}
                  className={
                    isActive ? 'text-accent' : 'text-zinc-300 dark:text-zinc-600'
                  }
                />
              </button>
              <button
                type="button"
                onClick={() => openDetail(plan)}
                aria-label={t('settings.viewPlan', { name: plan.name })}
                className="min-w-0 flex-1 py-1 text-left"
              >
                <p className="truncate text-sm font-medium transition-colors hover:text-accent">
                  {plan.name}
                </p>
                <p className="text-xs text-zinc-400">
                  {t('settings.target')}{' '}
                  {format(parseISO(plan.targetDate), 'd MMM yyyy', { locale })}
                  {isActive && ` · ${t('settings.active')}`}
                </p>
              </button>
              <button
                type="button"
                onClick={() => archive.mutate(plan.id)}
                title={t('settings.archivePlan')}
                aria-label={t('settings.archiveAria', { name: plan.name })}
                className="shrink-0 rounded-full p-2 text-zinc-300 transition-colors hover:text-zinc-500 dark:text-zinc-600"
              >
                <Archive size={16} />
              </button>
            </Card>
          )
        })}

        {archivedPlans.length > 0 && (
          <div className="space-y-2 pt-3">
            <SectionTitle>{t('settings.archivedPlans')}</SectionTitle>
            {archivedPlans.map((plan) => (
              <Card key={plan.id} className="flex items-center gap-2 opacity-90">
                <button
                  type="button"
                  onClick={() => openDetail(plan)}
                  aria-label={t('settings.viewPlan', { name: plan.name })}
                  className="min-w-0 flex-1 py-1 text-left"
                >
                  <p className="truncate text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {plan.name}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {t('settings.target')}{' '}
                    {format(parseISO(plan.targetDate), 'd MMM yyyy', { locale })}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => restore.mutate(plan.id)}
                  title={t('settings.restorePlan')}
                  aria-label={t('settings.restorePlan')}
                  className="shrink-0 rounded-full p-2 text-zinc-400 transition-colors hover:text-accent"
                >
                  <ArchiveRestore size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => requestDelete(plan)}
                  title={t('settings.deletePlanPermanently')}
                  aria-label={t('settings.deletePlanPermanently')}
                  className="shrink-0 rounded-full p-2 text-zinc-300 transition-colors hover:text-red-500 dark:text-zinc-600"
                >
                  <Trash2 size={16} />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Sheet
        open={detailPlanId !== null}
        title={
          sheetMode === 'edit'
            ? t('settings.editPlan')
            : (detailPlan?.name ?? t('settings.planDetail'))
        }
        onClose={closeDetail}
      >
        {detailPlan && sheetMode === 'view' && (
          <div className="space-y-4">
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                  {t('settings.planDescription')}
                </p>
                <p className="mt-1">
                  {detailPlan.description.trim() || t('settings.noDescription')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                    {t('settings.start')}
                  </p>
                  <p className="mt-1 font-medium">
                    {format(parseISO(detailPlan.startDate), 'd MMMM yyyy', { locale })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                    {t('settings.targetDate')}
                  </p>
                  <p className="mt-1 font-medium">
                    {format(parseISO(detailPlan.targetDate), 'd MMMM yyyy', { locale })}
                  </p>
                </div>
              </div>
              {isArchived ? (
                <p className="text-xs font-medium text-zinc-400">{t('settings.archivedPlans')}</p>
              ) : detailPlan.id === activePlan?.id ? (
                <p className="text-xs font-medium text-accent">{t('settings.active')}</p>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setActive.mutate(detailPlan.id)}
                >
                  {t('settings.setActivePlan')}
                </Button>
              )}
            </div>

            {!isArchived && (
              <button
                type="button"
                onClick={startEdit}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <Pencil size={15} />
                {t('settings.editPlan')}
              </button>
            )}

            {isArchived && (
              <Button
                type="button"
                className="flex w-full items-center justify-center gap-2"
                onClick={() => {
                  restore.mutate(detailPlan.id)
                  closeDetail()
                }}
              >
                <ArchiveRestore size={15} />
                {t('settings.restorePlan')}
              </Button>
            )}

            {!isArchived && (
              <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <p className="mb-3 text-xs text-zinc-400">{t('settings.archivePlanHint')}</p>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex w-full items-center justify-center gap-2"
                  onClick={() => {
                    archive.mutate(detailPlan.id)
                    closeDetail()
                  }}
                >
                  <Archive size={15} />
                  {t('settings.archivePlan')}
                </Button>
              </div>
            )}

            <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <Button
                type="button"
                variant="danger"
                className="flex w-full items-center justify-center gap-2"
                onClick={() => requestDelete(detailPlan)}
              >
                <Trash2 size={15} />
                {t('settings.deletePlanPermanently')}
              </Button>
            </div>
          </div>
        )}

        {detailPlan && sheetMode === 'edit' && (
          <PlanForm
            name={name}
            description={description}
            startDate={startDate}
            targetDate={targetDate}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onStartDateChange={setStartDate}
            onTargetDateChange={setTargetDate}
            onCancel={() => setSheetMode('view')}
            onSubmit={() => {
              const trimmed = name.trim()
              if (!trimmed || !startDate || !targetDate || targetDate < startDate) return
              updateDetails.mutate(
                {
                  planId: detailPlan.id,
                  name: trimmed,
                  description: description.trim(),
                  startDate,
                  targetDate,
                },
                { onSuccess: () => setSheetMode('view') },
              )
            }}
          />
        )}
      </Sheet>

      <Sheet open={addOpen} title={t('settings.newPlan')} onClose={closeAdd}>
        <PlanForm
          autoFocus
          name={name}
          description={description}
          startDate={startDate}
          targetDate={targetDate}
          onNameChange={setName}
          onDescriptionChange={setDescription}
          onStartDateChange={setStartDate}
          onTargetDateChange={setTargetDate}
          submitLabel={t('settings.create')}
          onSubmit={() => {
            const trimmed = name.trim()
            if (!trimmed || !startDate || !targetDate || targetDate < startDate) return
            create.mutate(
              { name: trimmed, description: description.trim(), startDate, targetDate },
              { onSuccess: closeAdd },
            )
          }}
        />
      </Sheet>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('settings.deletePlanTitle')}
        message={
          pendingDelete
            ? t('settings.deletePlanConfirm', { name: pendingDelete.name })
            : ''
        }
        confirmLabel={t('common.delete')}
        variant="danger"
        loading={deletePermanently.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </section>
  )
}

function PlanForm({
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
