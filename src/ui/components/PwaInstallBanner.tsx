import { useTranslation } from 'react-i18next'
import { Download, Share, X } from 'lucide-react'
import { useActivePlan } from '../../app/queries'
import { usePwaInstallActions } from '../../app/pwa-install'
import { Button } from './primitives'
import { Sheet } from './Sheet'

/** Auto install modal — Android & desktop (HRMS-style flow, GanbaLog look). */
export function PwaInstallPrompt() {
  const { t } = useTranslation()
  const { data: plan } = useActivePlan()
  const { mode, modalVisible, iosSheetOpen, setIosSheetOpen, install, dismissPrompt } =
    usePwaInstallActions()

  if (!plan) return null
  if (!modalVisible || !mode || mode === 'ios') return null

  const title =
    mode === 'open' ? t('pwa.openModalTitle') : t('pwa.installModalTitle')
  const subtitle =
    mode === 'open' ? t('pwa.openModalSubtitle') : t('pwa.installModalSubtitle')
  const body = mode === 'open' ? t('pwa.openModalBody') : t('pwa.installModalBody')
  const actionLabel = mode === 'open' ? t('pwa.openInApp') : t('pwa.installApp')

  return (
    <>
      <div
        className="fixed inset-0 z-[260] flex items-center justify-center bg-zinc-900/35 p-6 backdrop-blur-[2px]"
        role="presentation"
        onClick={dismissPrompt}
        onKeyDown={(event) => {
          if (event.key === 'Escape') dismissPrompt()
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          className="relative w-full max-w-sm"
          onClick={(event) => event.stopPropagation()}
        >
          <img
            src="/logo.png"
            alt=""
            className="absolute top-0 left-1/2 z-10 size-16 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-subtle bg-surface-raised shadow-soft dark:border-border-subtle-dark dark:bg-surface-raised-dark"
            aria-hidden
          />

          <div className="rounded-2xl border border-border-subtle bg-surface-raised px-5 pb-5 pt-12 shadow-soft-lg dark:border-border-subtle-dark dark:bg-surface-raised-dark">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="pwa-install-title" className="text-lg font-bold leading-snug">
                  {title}
                </h2>
                <p className="mt-0.5 text-sm font-medium text-accent">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={dismissPrompt}
                aria-label={t('common.close')}
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-surface-muted hover:text-zinc-600 dark:hover:bg-surface-muted-dark dark:hover:text-zinc-200"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {body}
            </p>

            <Button
              className="mt-5 flex min-h-[48px] w-full justify-center gap-2.5"
              onClick={() => void install()}
            >
              <Download size={18} strokeWidth={2.25} className="shrink-0" aria-hidden />
              <span>{actionLabel}</span>
            </Button>
          </div>
        </div>
      </div>

      <PwaIosInstallSheet
        open={iosSheetOpen}
        onClose={() => setIosSheetOpen(false)}
      />
    </>
  )
}

export function PwaIosInstallSheet({
  open,
  onClose,
  onDismiss,
}: {
  open: boolean
  onClose: () => void
  onDismiss?: () => void
}) {
  const { t } = useTranslation()

  return (
    <Sheet open={open} title={t('pwa.iosTitle')} onClose={onClose}>
      <div className="space-y-4 pb-2">
        <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-muted/50 px-4 py-3 dark:border-border-subtle-dark dark:bg-surface-muted-dark/50">
          <img src="/logo.png" alt="" className="size-10 rounded-xl" aria-hidden />
          <div>
            <p className="font-semibold">{t('pwa.iosBrand')}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('pwa.iosTagline')}</p>
          </div>
        </div>
        <ol className="space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent dark:bg-accent-soft-dark">
              1
            </span>
            <span>{t('pwa.iosStep1')}</span>
          </li>
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent dark:bg-accent-soft-dark">
              2
            </span>
            <span className="inline-flex flex-wrap items-center gap-1">
              {t('pwa.iosStep2')}
              <Share size={15} className="inline shrink-0 text-accent" aria-hidden />
              {t('pwa.iosStep2Suffix')}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent dark:bg-accent-soft-dark">
              3
            </span>
            <span>{t('pwa.iosStep3')}</span>
          </li>
        </ol>
        <Button
          variant="ghost"
          className="min-h-[44px] w-full"
          onClick={() => {
            onDismiss?.()
            onClose()
          }}
        >
          {t('pwa.iosGotIt')}
        </Button>
      </div>
    </Sheet>
  )
}

export function PwaInstallSettingsRow() {
  const { t } = useTranslation()
  const { mode, settingsVisible, iosSheetOpen, setIosSheetOpen, install } =
    usePwaInstallActions()

  if (!settingsVisible || !mode) return null

  const label =
    mode === 'open'
      ? t('pwa.openInApp')
      : mode === 'ios'
        ? t('pwa.addToHomeScreen')
        : t('pwa.installApp')

  return (
    <>
      <button
        type="button"
        onClick={() => void install()}
        className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 rounded-xl border border-border-subtle bg-surface-raised px-4 py-3.5 text-left transition-colors hover:bg-surface-muted/50 dark:border-border-subtle-dark dark:bg-surface-raised-dark dark:hover:bg-surface-muted-dark/50"
      >
        <img src="/logo.png" alt="" className="size-9 rounded-lg" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('pwa.installHint')}</p>
        </div>
        <Download size={18} className="shrink-0 text-accent" aria-hidden />
      </button>
      <PwaIosInstallSheet open={iosSheetOpen} onClose={() => setIosSheetOpen(false)} />
    </>
  )
}
