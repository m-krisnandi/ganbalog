import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Button } from './primitives'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  loading?: boolean
  onClose: () => void
  onConfirm: () => void
}

/**
 * Dialog konfirmasi in-app — tampil di atas sheet/modal lain.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  loading = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-5">
          <motion.button
            type="button"
            aria-label={t('common.close')}
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
            className="relative z-[111] w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 420 }}
          >
            <h3 id="confirm-dialog-title" className="text-base font-semibold">
              {title}
            </h3>
            <p id="confirm-dialog-message" className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {message}
            </p>
            <div className="mt-5 flex gap-2">
              <Button variant="ghost" className="flex-1" disabled={loading} onClick={onClose}>
                {cancelLabel ?? t('common.cancel')}
              </Button>
              <Button
                variant={variant === 'danger' ? 'danger' : 'primary'}
                className="flex-1"
                disabled={loading}
                onClick={onConfirm}
              >
                {confirmLabel ?? t('common.confirm')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
