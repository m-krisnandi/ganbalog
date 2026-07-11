import { useTranslation } from 'react-i18next'
import { RefreshCw, WifiOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, Card } from './primitives'

export function QuerySectionGuard({
  error,
  onRetry,
  children,
}: {
  error: boolean
  onRetry: () => void
  children: ReactNode
}) {
  if (error) return <QueryErrorState compact onRetry={onRetry} />
  return children
}

export function QueryErrorState({
  onRetry,
  compact = false,
}: {
  onRetry: () => void
  compact?: boolean
}) {
  const { t } = useTranslation()

  if (compact) {
    return (
      <div className="rounded-xl bg-surface-muted px-3 py-3 dark:bg-surface-muted-dark">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('common.loadErrorBody')}</p>
        <Button variant="ghost" className="mt-2 h-8 w-full text-xs" onClick={onRetry}>
          <span className="inline-flex items-center gap-1.5">
            <RefreshCw size={14} />
            {t('common.retry')}
          </span>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center px-4 pt-6">
      <Card className="max-w-sm text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-surface-muted text-zinc-400 dark:bg-surface-muted-dark">
          <WifiOff size={22} aria-hidden />
        </div>
        <h2 className="mt-4 text-base font-semibold">{t('common.loadErrorTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {t('common.loadErrorBody')}
        </p>
        <Button className="mt-4 w-full" onClick={onRetry}>
          <span className="inline-flex items-center gap-2">
            <RefreshCw size={16} />
            {t('common.retry')}
          </span>
        </Button>
      </Card>
    </div>
  )
}
