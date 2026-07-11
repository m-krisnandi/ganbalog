import { useTranslation } from 'react-i18next'
import { Check, RotateCcw, Trash2, Pencil } from 'lucide-react'
import type { Task } from '../../domain/models'
import { displayTaskTitle } from '../lib/task-display'

interface TaskRowProps {
  task: Task
  onComplete: (taskId: string) => void
  onReopen: (taskId: string) => void
  onSkip?: (taskId: string) => void
  onRemove?: (taskId: string) => void
  onEdit?: (taskId: string) => void
}

/** Fully controlled by parent task.status — parent owns optimistic updates. */
export function TaskRow({ task, onComplete, onReopen, onSkip, onRemove, onEdit }: TaskRowProps) {
  const { t } = useTranslation()
  const done = task.status === 'done'
  const skipped = task.status === 'skipped'
  const isReview = task.kind === 'review'

  const toggle = () => {
    if (done || skipped) {
      onReopen(task.id)
      return
    }
    onComplete(task.id)
  }

  return (
    <div
      className={`flex min-h-[52px] items-center gap-2 rounded-xl border transition-colors duration-150 ${
        done
          ? 'border-success/20 bg-success-soft/60 dark:border-success/15 dark:bg-success-soft-dark/40'
          : isReview
            ? 'border-amber-200/60 bg-surface-raised dark:border-amber-900/40 dark:bg-surface-raised-dark'
            : 'border-border-subtle bg-surface-raised dark:border-border-subtle-dark dark:bg-surface-raised-dark'
      }`}
    >
      <button
        type="button"
        aria-label={
          done ? t('task.reopen', { title: task.title }) : t('task.complete', { title: task.title })
        }
        onClick={toggle}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl px-4 py-4 text-left active:scale-[0.99] motion-safe:transition-transform"
      >
        <span
          aria-hidden
          className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150 ${
            done
              ? 'border-success bg-success text-white shadow-soft'
              : 'border-zinc-300 bg-surface-muted dark:border-zinc-600 dark:bg-surface-muted-dark'
          }`}
        >
          {done && <Check size={16} strokeWidth={3} />}
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-sm font-medium transition-colors ${
              done || skipped ? 'text-zinc-400 line-through dark:text-zinc-500' : 'text-zinc-800 dark:text-zinc-100'
            }`}
          >
            {displayTaskTitle(task.title, task.kind)}
          </span>
          {isReview && task.status === 'open' && (
            <span className="mt-0.5 block text-xs text-amber-600/80 dark:text-amber-400/80">
              {t('task.reviewHint')}
            </span>
          )}
        </span>
      </button>

      {isReview && task.status === 'open' && onSkip && (
        <button
          type="button"
          onClick={() => onSkip(task.id)}
          className="mr-2 shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-surface-muted hover:text-zinc-600 dark:hover:bg-surface-muted-dark"
        >
          {t('task.skip')}
        </button>
      )}

      {task.status === 'open' && onEdit && !isReview && (
        <button
          type="button"
          onClick={() => onEdit(task.id)}
          aria-label={t('task.edit', { title: task.title })}
          className="shrink-0 cursor-pointer rounded-full p-2 text-zinc-400 transition-colors hover:bg-surface-muted hover:text-zinc-600 dark:hover:bg-surface-muted-dark"
        >
          <Pencil size={15} />
        </button>
      )}

      {task.status === 'open' && onRemove && !isReview && (
        <button
          type="button"
          onClick={() => onRemove(task.id)}
          aria-label={t('task.remove', { title: task.title })}
          className="mr-2 shrink-0 cursor-pointer rounded-full p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
        >
          <Trash2 size={15} />
        </button>
      )}

      {skipped && (
        <button
          type="button"
          onClick={() => onReopen(task.id)}
          aria-label={t('task.restore')}
          className="mr-2 shrink-0 cursor-pointer rounded-full p-2 text-zinc-400 transition-colors hover:text-zinc-600"
        >
          <RotateCcw size={14} />
        </button>
      )}
    </div>
  )
}
