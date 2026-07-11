import { useMemo, useState } from 'react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { Plus, Coffee, Sprout } from 'lucide-react'
import { dateLocale } from '../../app/i18n'
import { useServices } from '../../core/di/ServicesProvider'
import {
  useActivePlan,
  useSetMinutesToday,
  useStudyLogs,
  useTaskMutations,
  useTodayTasks,
} from '../../app/queries'
import { TaskRow } from '../components/TaskRow'
import { Button, Card, EmptyState, SectionTitle, TextInput } from '../components/primitives'
import { NoPlanEmptyState } from '../components/NoPlanEmptyState'
import { Sheet } from '../components/Sheet'

const DURATION_CHIPS = [
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
]

export function TodayPage() {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const { clock } = useServices()
  const today = clock.todayIso()

  const { data: plan, isLoading: planLoading } = useActivePlan()
  const { data: tasks = [] } = useTodayTasks(plan?.id, today)
  const { data: studyLogs = [] } = useStudyLogs()
  const { complete, reopen, skip, addAdhoc, remove, rename } = useTaskMutations(plan?.id ?? '', today)
  const setMinutes = useSetMinutesToday(plan?.id ?? '')

  const [addOpen, setAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editTask, setEditTask] = useState<{ id: string; title: string } | null>(null)

  const todayLog = useMemo(() => studyLogs.find((l) => l.date === today), [studyLogs, today])

  if (planLoading) {
    return (
      <div className="space-y-6 pt-6 animate-pulse" aria-busy="true" aria-label={t('today.section')}>
        <div className="flex items-start justify-between px-1">
          <div className="space-y-2">
            <div className="h-6 w-48 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-32 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="h-14 w-16 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    )
  }

  if (!plan) {
    return <NoPlanEmptyState icon={Sprout} />
  }

  const daysLeft = differenceInCalendarDays(parseISO(plan.targetDate), parseISO(today))
  const studyTasks = tasks.filter(
    (task) => task.kind === 'study' && task.status !== 'skipped',
  )
  const reviewTasks = tasks.filter((task) => task.kind === 'review')
  const openCount = tasks.filter((task) => task.status === 'open').length
  const allDone = tasks.length > 0 && openCount === 0

  return (
    <div className="space-y-6 pt-6">
      <header className="flex items-start justify-between px-1">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="size-10 shrink-0 rounded-xl" />
          <div>
            <h1 className="text-xl font-bold">{plan.name}</h1>
            <p className="mt-0.5 text-sm text-zinc-400">
              {format(parseISO(today), 'EEEE, d MMMM', { locale })}
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-accent-soft px-3.5 py-2 text-center dark:bg-accent-soft-dark">
          <p className="text-lg leading-tight font-bold text-accent">D-{Math.max(0, daysLeft)}</p>
          <p className="text-[10px] text-accent/70">{t('today.toTarget')}</p>
        </div>
      </header>

      {allDone && (
        <Card className="border border-accent/20 bg-accent-soft text-center dark:bg-accent-soft-dark">
          <p className="text-sm font-semibold text-accent">{t('today.allDone')}</p>
        </Card>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionTitle>{t('today.section')}</SectionTitle>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            aria-label={t('today.addTask')}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent-soft dark:hover:bg-accent-soft-dark"
          >
            <Plus size={14} /> {t('common.add')}
          </button>
        </div>
        {studyTasks.length === 0 ? (
          <EmptyState icon={Coffee} text={t('today.noSchedule')} />
        ) : (
          <div className="space-y-2">
            {studyTasks.map((task) => {
              const isAdhoc = !task.scheduleItemId && !task.reviewOfTaskId
              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={(id) => complete.mutate(id)}
                  onReopen={(id) => reopen.mutate(id)}
                  onRemove={(id) => remove.mutate(id)}
                  onEdit={
                    isAdhoc
                      ? () => setEditTask({ id: task.id, title: task.title })
                      : undefined
                  }
                />
              )
            })}
          </div>
        )}
      </section>

      {reviewTasks.length > 0 && (
        <section className="space-y-2">
          <SectionTitle>{t('today.review')}</SectionTitle>
          <div className="space-y-2">
            {reviewTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onComplete={(id) => complete.mutate(id)}
                onReopen={(id) => reopen.mutate(id)}
                onSkip={(id) => skip.mutate(id)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <SectionTitle>{t('today.duration')}</SectionTitle>
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            {DURATION_CHIPS.map((chip) => {
              const active = todayLog?.minutes === chip.minutes
              return (
                <button
                  key={chip.minutes}
                  type="button"
                  onClick={() => setMinutes.mutate(active ? null : chip.minutes)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-accent text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
        </Card>
      </section>

      <Sheet open={addOpen} title={t('today.adhocTitle')} onClose={() => setAddOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            const title = newTitle.trim()
            if (!title) return
            addAdhoc.mutate(title, {
              onSuccess: () => {
                setNewTitle('')
                setAddOpen(false)
              },
            })
          }}
        >
          <TextInput
            autoFocus
            placeholder={t('today.adhocPlaceholder')}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Button type="submit" className="w-full">
            {t('common.add')}
          </Button>
        </form>
      </Sheet>

      <Sheet
        open={editTask !== null}
        title={t('today.editTitle')}
        onClose={() => setEditTask(null)}
      >
        {editTask && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              const title = editTask.title.trim()
              if (!title) return
              rename.mutate(
                { taskId: editTask.id, title },
                { onSuccess: () => setEditTask(null) },
              )
            }}
          >
            <TextInput
              autoFocus
              placeholder={t('today.adhocPlaceholder')}
              value={editTask.title}
              onChange={(e) =>
                setEditTask((prev) => (prev ? { ...prev, title: e.target.value } : prev))
              }
            />
            <Button type="submit" className="w-full">
              {t('common.save')}
            </Button>
          </form>
        )}
      </Sheet>
    </div>
  )
}
