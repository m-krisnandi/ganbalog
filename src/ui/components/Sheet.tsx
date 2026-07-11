import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { sheetClosed, sheetOpened } from '../../app/sheet-store'

interface SheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Area tetap di bawah judul (mis. search / filter). */
  toolbar?: ReactNode
  /** Tetap terlihat di bawah saat isi sheet di-scroll (mis. tombol aksi). */
  footer?: ReactNode
}

/**
 * Bottom sheet di-render via portal ke <body> supaya tidak tertutup/terganggu
 * stacking context halaman. Bottom nav disembunyikan saat sheet terbuka.
 */
export function Sheet({ open, title, onClose, children, toolbar, footer }: SheetProps) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  const titleId = useId()
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    sheetOpened()
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRef.current()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) {
        event.preventDefault()
        panelRef.current.focus()
        return
      }
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
    window.addEventListener('keydown', onKeyDown)

    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('button, input, select, textarea')?.focus()
    }, 80)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
      sheetClosed()
      document.body.style.overflow = ''
      previouslyFocused?.focus()
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div data-sheet-root>
          <motion.div
            className="fixed inset-0 z-[100] bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fixed inset-x-0 bottom-0 z-[101] mx-auto flex w-full max-w-lg max-h-[min(90dvh,100%)] flex-col rounded-t-[1.75rem] border border-border-subtle bg-surface-raised shadow-soft-lg dark:border-border-subtle-dark dark:bg-surface-raised-dark"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
          >
            <div className="shrink-0 flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            </div>

            <div className="shrink-0 flex items-center justify-between px-5 pb-3">
              <h2 id={titleId} className="text-base font-semibold">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                className="cursor-pointer rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            {toolbar && <div className="shrink-0 px-5 pb-3">{toolbar}</div>}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-3">
              {children}
            </div>

            {footer && (
              <div className="shrink-0 border-t border-zinc-100 px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] dark:border-zinc-800">
                {footer}
              </div>
            )}

            {!footer && (
              <div className="shrink-0 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))]" />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
