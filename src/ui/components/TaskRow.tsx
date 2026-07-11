import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Check, RotateCcw, Trash2, Pencil } from 'lucide-react'
import type { Task } from '../../domain/models'

interface TaskRowProps {
  task: Task
  onComplete: (taskId: string) => void
  onReopen: (taskId: string) => void
  onSkip?: (taskId: string) => void
  onRemove?: (taskId: string) => void
  onEdit?: (taskId: string) => void
}

/**
 * Satu tap di mana saja pada baris (kecuali tombol Skip/Restore) = toggle selesai.
 */
export function TaskRow({ task, onComplete, onReopen, onSkip, onRemove, onEdit }: TaskRowProps) {
  const { t } = useTranslation()
  const done = task.status === 'done'
  const skipped = task.status === 'skipped'

  const toggle = () => (done ? onReopen(task.id) : onComplete(task.id))

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 rounded-2xl bg-white shadow-sm dark:bg-zinc-900"
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        aria-label={done ? t('task.reopen', { title: task.title }) : t('task.complete', { title: task.title })}
        onClick={toggle}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl px-4 py-3.5 text-left"
      >
        <span
          aria-hidden
          className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            done
              ? 'border-accent bg-accent text-white'
              : 'border-zinc-300 text-transparent dark:border-zinc-600'
          }`}
        >
          <motion.span
            initial={false}
            animate={{ scale: done ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 20 }}
            className="flex items-center justify-center"
          >
            <Check size={16} strokeWidth={3} />
          </motion.span>
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-sm font-medium transition-colors ${
              done || skipped ? 'text-zinc-400 line-through dark:text-zinc-600' : ''
            }`}
          >
            {task.title}
          </span>
          {task.kind === 'review' && (
            <span className="block text-xs text-zinc-400 dark:text-zinc-500">
              {t('task.reviewHint')}
            </span>
          )}
        </span>
      </motion.button>

      {task.kind === 'review' && task.status === 'open' && onSkip && (
        <button
          type="button"
          onClick={() => onSkip(task.id)}
          className="mr-2 shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
        >
          {t('task.skip')}
        </button>
      )}

      {task.status === 'open' && onEdit && task.kind !== 'review' && (
        <button
          type="button"
          onClick={() => onEdit(task.id)}
          aria-label={t('task.edit', { title: task.title })}
          className="shrink-0 cursor-pointer rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          <Pencil size={15} />
        </button>
      )}

      {task.status === 'open' && onRemove && task.kind !== 'review' && (
        <button
          type="button"
          onClick={() => onRemove(task.id)}
          aria-label={t('task.remove', { title: task.title })}
          className="mr-2 shrink-0 cursor-pointer rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-zinc-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
        >
          <Trash2 size={15} />
        </button>
      )}

      {skipped && (
        <button
          type="button"
          onClick={() => onReopen(task.id)}
          aria-label={t('task.restore')}
          className="mr-2 shrink-0 cursor-pointer rounded-full p-1.5 text-zinc-300 transition-colors hover:text-zinc-500 dark:text-zinc-600"
        >
          <RotateCcw size={14} />
        </button>
      )}
    </motion.div>
  )
}
