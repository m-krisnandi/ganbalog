import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useServices } from '../core/di/ServicesProvider'
import { invalidateWorkspaceQueries } from './queries'
import { useToastStore } from '../app/toast-store'
import { useAuth } from './auth/AuthProvider'
import {
  clearPendingPlanImportRaw,
  decodePlanPayloadFromUrl,
  peekPendingPlanImportRaw,
} from '../data/plan-share-url'
import { importPlanTemplate, type PlanTemplatePayload } from '../data/plan-template'
import { ConfirmDialog } from '../ui/components/ConfirmDialog'

/** Handles ?importPlan= links captured at bootstrap — offers to create a new plan. */
export function PlanImportHandler() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { planService, audit } = useServices()
  const { cloudEnabled, session, loading: authLoading } = useAuth()
  const [pending, setPending] = useState<PlanTemplatePayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [decodeError, setDecodeError] = useState(false)

  useEffect(() => {
    if (authLoading || (cloudEnabled && !session)) return
    const raw = peekPendingPlanImportRaw()
    if (!raw) return

    void (async () => {
      try {
        const payload = await decodePlanPayloadFromUrl(raw)
        setPending(payload)
      } catch {
        clearPendingPlanImportRaw()
        setDecodeError(true)
      }
    })()
  }, [authLoading, cloudEnabled, session])

  useEffect(() => {
    if (!decodeError) return
    useToastStore.getState().show(t('settings.importPlanLinkInvalid'), 'error')
    setDecodeError(false)
  }, [decodeError, t])

  const handleClose = () => {
    clearPendingPlanImportRaw()
    setPending(null)
  }

  const handleConfirm = async () => {
    if (!pending || loading) return
    setLoading(true)
    try {
      await importPlanTemplate(planService, audit, pending)
      invalidateWorkspaceQueries(queryClient)
      useToastStore.getState().show(t('settings.importPlanTemplateSuccess'), 'success')
      handleClose()
    } catch {
      useToastStore.getState().show(t('settings.importPlanTemplateFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ConfirmDialog
      open={pending !== null}
      title={t('settings.importPlanLinkTitle')}
      message={pending ? t('settings.importPlanLinkConfirm', { name: pending.name }) : ''}
      confirmLabel={t('settings.importPlanLinkAction')}
      loading={loading}
      onClose={handleClose}
      onConfirm={() => void handleConfirm()}
    />
  )
}
