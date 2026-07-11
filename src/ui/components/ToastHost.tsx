import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { useToastStore } from '../../app/toast-store'

export function ToastHost() {
  const { t } = useTranslation()
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[300] flex flex-col items-center gap-2 px-4 pt-safe"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            aria-live={toast.kind === 'error' ? 'assertive' : 'polite'}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex max-w-lg items-start gap-2 rounded-2xl border px-4 py-3 shadow-soft-lg ${
              toast.kind === 'error'
                ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/90 dark:text-red-200'
                : 'border-success/30 bg-success-soft text-success-strong dark:border-success/20 dark:bg-success-soft-dark dark:text-emerald-300'
            }`}
          >
            {toast.kind === 'error' ? (
              <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
            ) : (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden />
            )}
            <p className="min-w-0 flex-1 text-sm font-medium">{toast.message}</p>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.()
                  dismiss(toast.id)
                }}
                className="shrink-0 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-inherit transition-colors hover:bg-white dark:bg-black/20 dark:hover:bg-black/40"
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label={t('common.close')}
              className="shrink-0 rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
