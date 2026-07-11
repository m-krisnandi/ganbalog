import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { format, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ArchiveRestore, Trash2, Upload } from 'lucide-react'
import type { Plan } from '../../../domain/models'
import { dateLocale } from '../../../app/i18n'
import { useServices } from '../../../core/di/ServicesProvider'
import {
  usePlanMutations,
  usePlans,
  invalidateWorkspaceQueries,
} from '../../../app/queries'
import {
  importPlanTemplate,
  parsePlanTemplateJson,
  PlanTemplateError,
  type PlanTemplatePayload,
} from '../../../data/plan-template'
import { useToastStore } from '../../../app/toast-store'
import { Button, Card, SectionTitle } from '../../components/primitives'
import { QueryErrorState } from '../../components/QueryErrorState'
import { ConfirmDialog } from '../../components/ConfirmDialog'

/** Archived plans, permanent delete, and JSON file import — for Settings → Advanced. */
export function PlanAdvancedSection({ embedded = false }: { embedded?: boolean }) {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const queryClient = useQueryClient()
  const { planService, audit } = useServices()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: plans = [], isError: plansError, refetch: refetchPlans } = usePlans()
  const { restore, deletePermanently } = usePlanMutations()

  const [pendingDelete, setPendingDelete] = useState<Plan | null>(null)
  const [pendingTemplateImport, setPendingTemplateImport] = useState<PlanTemplatePayload | null>(null)
  const [templateImportError, setTemplateImportError] = useState<string | null>(null)
  const [importingTemplate, setImportingTemplate] = useState(false)
  const templateFileRef = useRef<HTMLInputElement>(null)

  const archivedPlans = plans.filter((plan) => plan.status === 'archived')

  useEffect(() => {
    if (searchParams.get('plansAdvanced') !== '1') return
    const next = new URLSearchParams(searchParams)
    next.delete('plansAdvanced')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const handlePickTemplateImport = () => {
    setTemplateImportError(null)
    templateFileRef.current?.click()
  }

  const handleTemplateFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const payload = parsePlanTemplateJson(await file.text())
      setPendingTemplateImport(payload)
    } catch (error) {
      setTemplateImportError(
        error instanceof PlanTemplateError
          ? t('settings.importPlanTemplateFailed')
          : t('settings.importFailed'),
      )
    }
  }

  const handleConfirmTemplateImport = async () => {
    if (!pendingTemplateImport || importingTemplate) return
    setImportingTemplate(true)
    try {
      await importPlanTemplate(planService, audit, pendingTemplateImport)
      invalidateWorkspaceQueries(queryClient)
      useToastStore.getState().show(t('settings.importPlanTemplateSuccess'), 'success')
      setPendingTemplateImport(null)
      setTemplateImportError(null)
    } catch {
      setTemplateImportError(t('settings.importPlanTemplateFailed'))
    } finally {
      setImportingTemplate(false)
    }
  }

  return (
    <section className="space-y-3">
      {!embedded && <SectionTitle>{t('settings.plansAdvanced')}</SectionTitle>}

      <Card className="space-y-3">
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {t('settings.importPlanTemplateHint')}
        </p>
        <Button variant="ghost" className="w-full" onClick={handlePickTemplateImport}>
          <Upload size={15} className="mr-2" />
          {t('settings.importPlanTemplate')}
        </Button>
      </Card>

      <input
        ref={templateFileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => void handleTemplateFileChange(e)}
      />

      {templateImportError && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {templateImportError}
        </p>
      )}

      {plansError ? (
        <QueryErrorState compact onRetry={() => void refetchPlans()} />
      ) : archivedPlans.length === 0 ? (
        <p className="px-1 text-xs text-zinc-400">{t('settings.noArchivedPlans')}</p>
      ) : (
        <div className="space-y-2">
          <p className="px-1 text-xs font-medium text-zinc-500">{t('settings.archivedPlans')}</p>
          {archivedPlans.map((plan) => (
            <Card key={plan.id} className="flex items-center gap-2 opacity-90">
              <div className="min-w-0 flex-1 py-1">
                <p className="truncate text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {plan.name}
                </p>
                <p className="text-xs text-zinc-400">
                  {t('settings.target')}{' '}
                  {format(parseISO(plan.targetDate), 'd MMM yyyy', { locale })}
                </p>
              </div>
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
                onClick={() => setPendingDelete(plan)}
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

      <ConfirmDialog
        open={pendingTemplateImport !== null}
        title={t('settings.importPlanTemplateTitle')}
        message={
          pendingTemplateImport
            ? t('settings.importPlanTemplateConfirm', { name: pendingTemplateImport.name })
            : ''
        }
        confirmLabel={t('common.confirm')}
        loading={importingTemplate}
        onClose={() => setPendingTemplateImport(null)}
        onConfirm={() => void handleConfirmTemplateImport()}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('settings.deletePlanTitle')}
        message={
          pendingDelete ? t('settings.deletePlanConfirm', { name: pendingDelete.name }) : ''
        }
        confirmLabel={t('common.delete')}
        variant="danger"
        loading={deletePermanently.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return
          deletePermanently.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) })
        }}
      />
    </section>
  )
}
