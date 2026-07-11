import { useTranslation } from 'react-i18next'
import { Check, Flame } from 'lucide-react'
import type { StudyTemplateId } from '../../data/study-templates'
import { getStudyTemplate } from '../../data/study-templates'

/** Mini mock of Today — shown in onboarding so users see the end result before committing. */
export function TodayPreview({
  variant = 'template',
  templateId = 'jlpt-n2',
}: {
  variant?: 'template' | 'blank'
  templateId?: StudyTemplateId
}) {
  const { t } = useTranslation()

  const tasks =
    variant === 'template'
      ? getStudyTemplate(templateId).previewTasks.map((title, index) => ({
          title,
          done: index === 0,
        }))
      : [{ title: t('onboarding.previewBlankTask'), done: false }]

  const planName =
    variant === 'template' ? getStudyTemplate(templateId).plan.name : t('onboarding.previewBlankPlan')

  const doneCount = tasks.filter((task) => task.done).length

  return (
    <div
      className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-raised shadow-soft dark:border-border-subtle-dark dark:bg-surface-raised-dark"
      aria-hidden
    >
      <div className="border-b border-border-subtle px-3.5 py-2.5 dark:border-border-subtle-dark">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-accent">{t('onboarding.previewGreeting')}</p>
            <p className="truncate text-xs font-bold">{planName}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {variant === 'template' && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-success-soft px-1.5 py-0.5 text-[9px] font-semibold text-success dark:bg-success-soft-dark dark:text-emerald-400">
                <Flame size={9} aria-hidden />
                3
              </span>
            )}
            <span className="rounded-lg bg-accent-soft px-1.5 py-1 text-center dark:bg-accent-soft-dark">
              <span className="block text-[11px] font-bold leading-none text-accent">D-148</span>
            </span>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted dark:bg-surface-muted-dark">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${tasks.length ? (doneCount / tasks.length) * 100 : 0}%` }}
          />
        </div>
        <p className="mt-1 text-[9px] text-zinc-400">
          {t('today.progressLabel', { done: doneCount, total: tasks.length })}
        </p>
      </div>

      <ul className="space-y-1.5 p-2.5">
        {tasks.map((task) => (
          <li
            key={task.title}
            className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${
              task.done
                ? 'bg-success-soft/60 dark:bg-success-soft-dark/30'
                : 'bg-surface-muted dark:bg-surface-muted-dark'
            }`}
          >
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                task.done
                  ? 'border-success bg-success text-white'
                  : 'border-zinc-300 dark:border-zinc-600'
              }`}
            >
              {task.done && <Check size={11} strokeWidth={3} />}
            </span>
            <span
              className={`min-w-0 flex-1 truncate text-[11px] ${
                task.done ? 'text-zinc-400 line-through' : 'font-medium'
              }`}
            >
              {task.title}
            </span>
          </li>
        ))}
      </ul>

      <p className="border-t border-border-subtle px-3 py-2 text-center text-[10px] text-zinc-400 dark:border-border-subtle-dark">
        {t('onboarding.previewCaption')}
      </p>
    </div>
  )
}
