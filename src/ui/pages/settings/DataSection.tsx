import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { format, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { FileSpreadsheet, FileJson, Upload, Download } from 'lucide-react'
import { dateLocale } from '../../../app/i18n'
import { UuidGenerator } from '../../../core/ids'
import { useServices } from '../../../core/di/ServicesProvider'
import { useAuth } from '../../../app/auth/AuthProvider'
import { useExportBackup, useImportBackup, useImportExcelBackup } from '../../../app/queries'
import {
  backupSummary,
  BackupError,
  parseBackupJson,
  type GanbaLogBackup,
} from '../../../data/backup'
import { parseExcelBackup } from '../../../data/import-excel'
import { downloadExcelTemplate } from '../../../data/export-excel'
import { ListPanel } from '../../components/primitives'
import { ConfirmDialog } from '../../components/ConfirmDialog'

type PendingImport =
  | { kind: 'json'; backup: GanbaLogBackup }
  | { kind: 'excel'; buffer: ArrayBuffer; summary: { planCount: number; exportedAt: string } }

export function DataSection({ highlightImport = false }: { highlightImport?: boolean }) {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const { clock, cloudEnabled } = useServices()
  const { cloudEnabled: authCloud } = useAuth()
  const isCloud = cloudEnabled || authCloud
  const ids = useRef(new UuidGenerator())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const exportJson = useExportBackup('json')
  const exportExcel = useExportBackup('excel')
  const importJson = useImportBackup()
  const importExcel = useImportExcelBackup()
  const [templateLoading, setTemplateLoading] = useState(false)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [pulseImport, setPulseImport] = useState(highlightImport)
  const exporting = exportJson.isPending || exportExcel.isPending
  const importing = importJson.isPending || importExcel.isPending

  useEffect(() => {
    if (!highlightImport) return
    setPulseImport(true)
    const timer = window.setTimeout(() => setPulseImport(false), 2400)
    return () => window.clearTimeout(timer)
  }, [highlightImport])

  const handlePickFile = () => {
    setImportError(null)
    fileInputRef.current?.click()
  }

  const importErrorMessage = (error: unknown): string => {
    if (!(error instanceof BackupError)) return t('settings.importFailed')
    switch (error.message) {
      case 'missingPlansSheet':
        return t('settings.importMissingPlans')
      case 'unknownPlan':
      case 'unknownMaterial':
        return t('settings.importUnknownReference')
      case 'invalidDate':
        return t('settings.importInvalidDate')
      case 'invalidJson':
      case 'invalidFormat':
      case 'unsupportedVersion':
        return t('settings.importInvalid')
      default:
        return t('settings.importFailed')
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const name = file.name.toLowerCase()

    try {
      if (name.endsWith('.json')) {
        const backup = parseBackupJson(await file.text())
        setPendingImport({ kind: 'json', backup })
        return
      }

      if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const buffer = await file.arrayBuffer()
        const parsed = await parseExcelBackup(buffer, clock, ids.current)
        setPendingImport({
          kind: 'excel',
          buffer,
          summary: backupSummary(parsed.backup),
        })
        return
      }

      setImportError(t('settings.importUnsupportedFile'))
    } catch (error) {
      setImportError(importErrorMessage(error))
    }
  }

  const confirmImport = () => {
    if (!pendingImport) return

    if (pendingImport.kind === 'json') {
      importJson.mutate(pendingImport.backup, {
        onError: (error) => setImportError(importErrorMessage(error)),
        onSettled: () => setPendingImport(null),
      })
      return
    }

    importExcel.mutate(pendingImport.buffer, {
      onError: (error) => setImportError(importErrorMessage(error)),
      onSettled: () => setPendingImport(null),
    })
  }

  const summary =
    pendingImport?.kind === 'json'
      ? backupSummary(pendingImport.backup)
      : pendingImport?.kind === 'excel'
        ? pendingImport.summary
        : null

  const confirmMessage =
    pendingImport?.kind === 'excel'
      ? t('settings.importExcelConfirm', {
          count: summary?.planCount ?? 0,
          date: summary
            ? format(parseISO(summary.exportedAt), 'd MMM yyyy', { locale })
            : '',
        })
      : summary
        ? isCloud
          ? t('settings.importCloudConfirm', {
              count: summary.planCount,
              date: format(parseISO(summary.exportedAt), 'd MMM yyyy', { locale }),
            })
          : t('settings.importBackupConfirm', {
              count: summary.planCount,
              date: format(parseISO(summary.exportedAt), 'd MMM yyyy', { locale }),
            })
        : ''

  return (
    <>
      <ListPanel>
        <div className="space-y-2 px-4 py-3.5">
          <p className="text-sm font-medium">{t('settings.exportTitle')}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={exporting}
              onClick={() => exportJson.mutate(undefined)}
              className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-surface-muted px-3 text-sm font-medium transition-colors hover:bg-zinc-200/80 disabled:opacity-50 dark:bg-surface-muted-dark dark:hover:bg-zinc-700"
            >
              <FileJson size={16} aria-hidden />
              {t('settings.exportJson')}
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={() => exportExcel.mutate(undefined)}
              className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-surface-muted px-3 text-sm font-medium transition-colors hover:bg-zinc-200/80 disabled:opacity-50 dark:bg-surface-muted-dark dark:hover:bg-zinc-700"
            >
              <FileSpreadsheet size={16} aria-hidden />
              {t('settings.exportExcel')}
            </button>
          </div>
          <p className="text-[11px] text-zinc-400">{t('settings.exportHintShort')}</p>
        </div>

        <div className="border-t border-border-subtle dark:border-border-subtle-dark">
          <button
            type="button"
            disabled={templateLoading}
            onClick={() => {
              setTemplateLoading(true)
              void downloadExcelTemplate()
                .catch(() => setImportError(t('settings.templateDownloadFailed')))
                .finally(() => setTemplateLoading(false))
            }}
            className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted/40 disabled:opacity-50 dark:hover:bg-surface-muted-dark/40"
          >
            <Download size={18} className="shrink-0 text-accent" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{t('settings.downloadExcelTemplate')}</span>
              <span className="mt-0.5 block text-[11px] text-zinc-400">
                {t('settings.downloadExcelTemplateHintShort')}
              </span>
            </span>
          </button>
        </div>

        <div
          id="settings-import"
          className={`border-t border-border-subtle dark:border-border-subtle-dark ${
            pulseImport ? 'bg-accent-soft/40 dark:bg-accent-soft-dark/30' : ''
          }`}
        >
          <button
            type="button"
            disabled={importing}
            onClick={handlePickFile}
            className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted/40 disabled:opacity-50 dark:hover:bg-surface-muted-dark/40"
          >
            <Upload size={18} className="shrink-0 text-accent" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{t('settings.importBackup')}</span>
              <span className="mt-0.5 block text-[11px] text-zinc-400">
                {isCloud ? t('settings.importCloudHintShort') : t('settings.importBackupHint')}
              </span>
            </span>
          </button>
        </div>
      </ListPanel>

      {importError && <p className="px-1 text-xs text-red-500">{importError}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />

      <ConfirmDialog
        open={pendingImport !== null}
        title={
          pendingImport?.kind === 'excel'
            ? t('settings.importExcelTitle')
            : t('settings.importBackupTitle')
        }
        message={confirmMessage}
        confirmLabel={t('settings.importBackup')}
        variant="danger"
        loading={importing}
        onClose={() => setPendingImport(null)}
        onConfirm={confirmImport}
      />
    </>
  )
}
