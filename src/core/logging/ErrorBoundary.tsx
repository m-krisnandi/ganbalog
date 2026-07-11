import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import i18n from '../../app/i18n'
import type { Logger } from './logger'

interface Props {
  logger: Logger
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.logger.error('Render error', error, { componentStack: info.componentStack })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-950/50 dark:text-red-400">
          <AlertTriangle size={28} strokeWidth={1.75} aria-hidden />
        </div>
        <h1 className="text-lg font-semibold">{i18n.t('error.title')}</h1>
        <p className="max-w-sm text-sm text-zinc-500">{i18n.t('error.body')}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white"
        >
          {i18n.t('error.reload')}
        </button>
      </div>
    )
  }
}
