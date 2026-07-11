import { useRef, useState, type ChangeEvent } from 'react'
import { format, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { FileSpreadsheet, FileJson, Upload } from 'lucide-react'
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
import { Button, Card, SectionTitle } from '../../components/primitives'
import { ConfirmDialog } from '../../components/ConfirmDialog'

type PendingImport =
  | { kind: 'json'; backup: GanbaLogBackup }
  | { kind: 'excel'; buffer: ArrayBuffer; summary: { planCount: number; exportedAt: string } }

export function DataSection() {
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
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const exporting = exportJson.isPending || exportExcel.isPending
  const importing = importJson.isPending || importExcel.isPending

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
        const parsed = parseExcelBackup(buffer, clock, ids.current)
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
    <section className="space-y-2">
      <SectionTitle>{t('settings.data')}</SectionTitle>
      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            className="w-full"
            disabled={exporting}
            onClick={() => exportJson.mutate(undefined)}
          >
            <span className="inline-flex items-center gap-2">
              <FileJson size={16} />
              {t('settings.exportJson')}
            </span>
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            disabled={exporting}
            onClick={() => exportExcel.mutate(undefined)}
          >
            <span className="inline-flex items-center gap-2">
              <FileSpreadsheet size={16} />
              {t('settings.exportExcel')}
            </span>
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-zinc-400">
          {t('settings.exportExcelHint')}. {t('settings.exportJsonHint')}.
        </p>
        <Button
          variant="ghost"
          className="w-full"
          disabled={importing}
          onClick={handlePickFile}
        >
          <span className="inline-flex items-center gap-2">
            <Upload size={16} />
            {t('settings.importBackup')}
          </span>
        </Button>
        <p className="text-xs text-zinc-400">
          {isCloud ? t('settings.importCloudHint') : t('settings.importBackupHint')}
        </p>
        {importError && <p className="text-xs text-red-500">{importError}</p>}
      </Card>

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
    </section>
  )
}
