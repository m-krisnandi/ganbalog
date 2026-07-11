import { useCallback, useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ChevronLeft,
  Download,
  Link2,
  Pencil,
  Plus,
  Sparkles,
} from 'lucide-react'
import type { Plan } from '../../domain/models'
import type { StudyTemplateId } from '../../data/study-templates'
import { createStudyTemplatePlan } from '../../data/study-templates'
import {
  downloadPlanTemplateFile,
  exportPlanTemplate,
  PlanTemplateError,
} from '../../data/plan-template'
import { copyPlanShareLink } from '../../data/plan-share-url'
import { dateLocale } from '../../app/i18n'
import { defaultNewPlanDates } from '../../core/plan-dates'
import { useServices } from '../../core/di/ServicesProvider'
import {
  invalidateWorkspaceQueries,
  useActivePlan,
  usePlanMutations,
  usePlans,
} from '../../app/queries'
import { useToastStore } from '../../app/toast-store'
import { dismissNavCoach } from '../lib/nav-coach'
import { Button } from './primitives'
import { PlanForm } from './PlanForm'
import { Sheet } from './Sheet'
import { TemplateGrid, TemplateSummary } from './SamplePlanPicker'

type HubView = 'list' | 'create' | 'samples' | 'manage'

export function PlanHubSheet({
  open,
  initialView = 'list',
  onClose,
}: {
  open: boolean
  initialView?: HubView
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { clock, planService, audit } = useServices()
  const { data: plans = [] } = usePlans()
  const { data: activePlan } = useActivePlan()
  const { create, updateDetails, archive, setActive } = usePlanMutations()

  const [view, setView] = useState<HubView>(initialView)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [templateId, setTemplateId] = useState<StudyTemplateId>('jlpt-n2')
  const [submittingSample, setSubmittingSample] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [copyingLink, setCopyingLink] = useState(false)

  const activePlans = plans.filter((plan) => plan.status === 'active')

  const resetForm = useCallback(() => {
    setName('')
    setDescription('')
    setStartDate('')
    setTargetDate('')
  }, [])

  const openCreate = useCallback(() => {
    const dates = defaultNewPlanDates(clock.todayIso())
    setName('')
    setDescription('')
    setStartDate(dates.startDate)
    setTargetDate(dates.targetDate)
    setView('create')
  }, [clock])

  const openManage = useCallback(() => {
    if (!activePlan) return
    setName(activePlan.name)
    setDescription(activePlan.description)
    setStartDate(activePlan.startDate)
    setTargetDate(activePlan.targetDate)
    setView('manage')
  }, [activePlan])

  useEffect(() => {
    if (!open) return
    setView(initialView)
  }, [open, initialView])

  const handleClose = () => {
    setView('list')
    resetForm()
    onClose()
  }

  const handleExport = async () => {
    if (!activePlan || exporting) return
    setExporting(true)
    try {
      const payload = await exportPlanTemplate(planService, activePlan.id, clock.stamp())
      downloadPlanTemplateFile(payload)
    } finally {
      setExporting(false)
    }
  }

  const handleCopyShareLink = async () => {
    if (!activePlan || copyingLink) return
    setCopyingLink(true)
    try {
      const payload = await exportPlanTemplate(planService, activePlan.id, clock.stamp())
      await copyPlanShareLink(payload)
      useToastStore.getState().show(t('settings.copyPlanShareLinkSuccess'), 'success')
    } catch (error) {
      if (error instanceof PlanTemplateError && error.message === 'tooLarge') {
        useToastStore.getState().show(t('settings.sharePlanTooLarge'), 'error')
      } else {
        useToastStore.getState().show(t('settings.importPlanTemplateFailed'), 'error')
      }
    } finally {
      setCopyingLink(false)
    }
  }

  const createSamplePlan = async () => {
    if (submittingSample) return
    setSubmittingSample(true)
    try {
      await createStudyTemplatePlan(templateId, planService, audit)
      dismissNavCoach()
      invalidateWorkspaceQueries(queryClient)
      useToastStore.getState().show(t('settings.samplePlanCreated'), 'success')
      handleClose()
    } finally {
      setSubmittingSample(false)
    }
  }

  const title =
    view === 'create'
      ? t('plan.newPlan')
      : view === 'samples'
        ? t('settings.samplePlans')
        : view === 'manage'
          ? t('plan.managePlan')
          : t('plan.switchPlan')

  return (
    <Sheet
      open={open}
      title={title}
      onClose={handleClose}
      toolbar={
        view !== 'list' ? (
          <button
            type="button"
            onClick={() => setView('list')}
            className="inline-flex items-center gap-1 text-sm font-medium text-accent"
          >
            <ChevronLeft size={16} aria-hidden />
            {t('plan.backToPlans')}
          </button>
        ) : undefined
      }
    >
      {view === 'list' && (
        <div className="space-y-4 pb-2">
          <div className="space-y-2">
            {activePlans.map((plan: Plan) => {
              const isActive = plan.id === activePlan?.id
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => {
                    if (!isActive) setActive.mutate(plan.id)
                  }}
                  aria-pressed={isActive}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                    isActive
                      ? 'border-accent bg-accent-soft dark:bg-accent-soft-dark'
                      : 'border-border-subtle bg-surface-raised hover:bg-surface-muted dark:border-border-subtle-dark dark:bg-surface-raised-dark dark:hover:bg-surface-muted-dark'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{plan.name}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {format(parseISO(plan.targetDate), 'd MMM yyyy', { locale })}
                      {plan.sourceTemplateId ? ` · ${t('settings.fromSample')}` : ''}
                    </p>
                  </div>
                  {isActive && (
                    <span className="shrink-0 text-xs font-semibold text-accent">
                      {t('plan.activeBadge')}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" className="justify-center gap-1.5" onClick={openCreate}>
              <Plus size={16} /> {t('plan.newPlan')}
            </Button>
            <Button
              variant="ghost"
              className="justify-center gap-1.5"
              onClick={() => setView('samples')}
            >
              <Sparkles size={16} /> {t('plan.fromSample')}
            </Button>
          </div>

          {activePlan && (
            <button
              type="button"
              onClick={openManage}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-subtle px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-muted dark:border-border-subtle-dark dark:hover:bg-surface-muted-dark"
            >
              <Pencil size={15} />
              {t('plan.managePlan')}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              handleClose()
              navigate('/settings?plansAdvanced=1')
            }}
            className="w-full text-center text-xs text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline dark:hover:text-zinc-300"
          >
            {t('plan.advancedPlansLink')}
          </button>
        </div>
      )}

      {view === 'create' && (
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
          onCancel={() => setView('list')}
          onSubmit={() => {
            const trimmed = name.trim()
            if (!trimmed || !startDate || !targetDate || targetDate < startDate) return
            create.mutate(
              { name: trimmed, description: description.trim(), startDate, targetDate },
              { onSuccess: handleClose },
            )
          }}
        />
      )}

      {view === 'samples' && (
        <div className="space-y-4 pb-2">
          <TemplateGrid templateId={templateId} onTemplateIdChange={setTemplateId} />
          <TemplateSummary templateId={templateId} />
          <Button
            className="w-full"
            disabled={submittingSample}
            onClick={() => void createSamplePlan()}
          >
            {submittingSample ? '…' : t('settings.createSamplePlan')}
          </Button>
        </div>
      )}

      {view === 'manage' && activePlan && (
        <div className="space-y-4 pb-2">
          <PlanForm
            name={name}
            description={description}
            startDate={startDate}
            targetDate={targetDate}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onStartDateChange={setStartDate}
            onTargetDateChange={setTargetDate}
            onCancel={handleClose}
            onSubmit={() => {
              const trimmed = name.trim()
              if (!trimmed || !startDate || !targetDate || targetDate < startDate) return
              updateDetails.mutate(
                {
                  planId: activePlan.id,
                  name: trimmed,
                  description: description.trim(),
                  startDate,
                  targetDate,
                },
                { onSuccess: handleClose },
              )
            }}
          />

          <div className="space-y-2 border-t border-border-subtle pt-4 dark:border-border-subtle-dark">
            <p className="text-xs text-zinc-400">{t('settings.sharePlanHint')}</p>
            <button
              type="button"
              onClick={() => void handleCopyShareLink()}
              disabled={copyingLink}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent-soft/50 px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent-soft dark:border-accent/20 dark:bg-accent-soft-dark/40"
            >
              <Link2 size={15} />
              {copyingLink ? '…' : t('settings.copyPlanShareLink')}
            </button>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-subtle px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-muted dark:border-border-subtle-dark dark:hover:bg-surface-muted-dark"
            >
              <Download size={15} />
              {exporting ? '…' : t('settings.exportPlanTemplate')}
            </button>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-center gap-2"
            onClick={() => {
              archive.mutate(activePlan.id, { onSuccess: handleClose })
            }}
          >
            <Archive size={15} />
            {t('settings.archivePlan')}
          </Button>
        </div>
      )}
    </Sheet>
  )
}
