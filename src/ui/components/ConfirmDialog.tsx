import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { sheetClosed, sheetOpened } from '../../app/sheet-store'
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
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    sheetOpened()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopImmediatePropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus()
    }, 50)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown, true)
      sheetClosed()
      previouslyFocused?.focus()
    }
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
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={messageId}
            className="relative z-[111] w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 420 }}
          >
            <h3 id={titleId} className="text-base font-semibold">
              {title}
            </h3>
            <p id={messageId} className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
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
