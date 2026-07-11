import { useEffect, useMemo, useState, useOptimistic, startTransition } from 'react'
import { useNavigate } from 'react-router'
import { differenceInCalendarDays, format, getHours, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ChevronDown, Flame, Plus, Coffee, Sparkles } from 'lucide-react'
import type { IsoDate, Task, TaskStatus } from '../../domain/models'
import { dateLocale } from '../../app/i18n'
import { useServices } from '../../core/di/ServicesProvider'
import {
  useActivePlan,
  useAllTasks,
  useSetMinutesToday,
  useStudyLogs,
  useTaskMutations,
  useTodayTasks,
} from '../../app/queries'
import { DailyProgressRing } from '../components/DailyProgressRing'
import { TaskRow } from '../components/TaskRow'
import {
  Button,
  Card,
  Chip,
  EmptyPanel,
  SectionTitle,
  TextInput,
} from '../components/primitives'
import { NoPlanEmptyState } from '../components/NoPlanEmptyState'
import { QueryErrorState } from '../components/QueryErrorState'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Sheet } from '../components/Sheet'
import { computeStudyStreak } from '../lib/streak'
import {
  hasMilestoneCelebrated,
  isStreakMilestone,
  markMilestoneCelebrated,
  type StreakMilestone,
} from '../lib/streak-celebration'
import { StreakMilestoneBanner } from '../components/StreakMilestoneBanner'
import { NavCoach } from '../components/NavCoach'
import { PlanHubSheet } from '../components/PlanHubSheet'

const DURATION_CHIPS = [
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
]

function greetingKey(hour: number): 'today.greetingMorning' | 'today.greetingAfternoon' | 'today.greetingEvening' {
  if (hour < 12) return 'today.greetingMorning'
  if (hour < 18) return 'today.greetingAfternoon'
  return 'today.greetingEvening'
}

export function TodayPage() {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const { clock } = useServices()
  const navigate = useNavigate()
  const today = clock.todayIso()

  const { data: plan, isLoading: planLoading, isError: planError, refetch } = useActivePlan()
  const {
    data: tasks = [],
    isLoading: tasksLoading,
    isError: tasksError,
    refetch: refetchTasks,
  } = useTodayTasks(plan?.id, today)
  const { data: allTasks = [] } = useAllTasks(plan?.id)
  const { data: studyLogs = [] } = useStudyLogs()
  const { complete, reopen, skip, addAdhoc, remove, rename } = useTaskMutations(plan?.id ?? '', today)
  const setMinutes = useSetMinutesToday(plan?.id ?? '')

  const [addOpen, setAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editTask, setEditTask] = useState<{ id: string; title: string } | null>(null)
  const [milestoneBanner, setMilestoneBanner] = useState<StreakMilestone | null>(null)
  const [removeTaskId, setRemoveTaskId] = useState<string | null>(null)
  const [durationOpen, setDurationOpen] = useState(false)
  const [durationTouched, setDurationTouched] = useState(false)
  const [planHubOpen, setPlanHubOpen] = useState(false)

  const [displayTasks, applyOptimisticStatus] = useOptimistic(
    tasks,
    (current: Task[], update: { id: string; status: TaskStatus }) =>
      current.map((task) => (task.id === update.id ? { ...task, status: update.status } : task)),
  )

  const setTaskStatus = (taskId: string, status: TaskStatus, run: () => void) => {
    startTransition(() => {
      applyOptimisticStatus({ id: taskId, status })
    })
    run()
  }

  const removeTask = displayTasks.find((task) => task.id === removeTaskId)

  const todayLog = useMemo(() => studyLogs.find((l) => l.date === today), [studyLogs, today])

  const activeDates = useMemo(() => {
    const dates = new Set<IsoDate>()
    for (const task of allTasks) {
      if (task.status === 'done') dates.add(task.date)
    }
    return dates
  }, [allTasks])

  const streak = useMemo(() => computeStudyStreak(activeDates, today), [activeDates, today])

  useEffect(() => {
    if (durationTouched) return
    setDurationOpen(activeDates.size < 3)
  }, [activeDates.size, durationTouched])

  useEffect(() => {
    if (!plan) return
    if (!isStreakMilestone(streak)) return
    if (hasMilestoneCelebrated(streak)) return
    markMilestoneCelebrated(streak)
    setMilestoneBanner(streak)
  }, [plan, streak])

  if (planError) {
    return <QueryErrorState onRetry={() => void refetch()} />
  }

  if (planLoading) {
    return (
      <div className="space-y-6 pt-6 animate-pulse" aria-busy="true" aria-label={t('today.section')}>
        <div className="h-36 rounded-3xl bg-surface-muted dark:bg-surface-muted-dark" />
        <div className="space-y-2">
          <div className="h-4 w-16 rounded bg-surface-muted dark:bg-surface-muted-dark" />
          <div className="h-16 rounded-2xl bg-surface-muted dark:bg-surface-muted-dark" />
          <div className="h-16 rounded-2xl bg-surface-muted dark:bg-surface-muted-dark" />
        </div>
      </div>
    )
  }

  if (!plan) {
    return <NoPlanEmptyState />
  }

  const daysLeft = differenceInCalendarDays(parseISO(plan.targetDate), parseISO(today))
  const studyTasks = displayTasks.filter((task) => task.kind === 'study')
  const reviewTasks = displayTasks.filter((task) => task.kind === 'review')
  const sortedTasks = [...studyTasks, ...reviewTasks]
  const actionableTasks = displayTasks.filter((task) => task.status !== 'skipped')
  const doneCount = actionableTasks.filter((task) => task.status === 'done').length
  const totalCount = actionableTasks.length
  const openCount = actionableTasks.filter((task) => task.status === 'open').length
  const allDone = actionableTasks.length > 0 && openCount === 0
  const hour = getHours(clock.now())
  const targetDateLabel = format(parseISO(plan.targetDate), 'd MMM yyyy', { locale })
  const targetLabel =
    daysLeft > 0
      ? t('today.daysUntilTarget', { count: daysLeft, date: targetDateLabel })
      : daysLeft === 0
        ? t('today.targetIsToday')
        : t('today.daysPastTarget', { count: Math.abs(daysLeft) })

  return (
    <div className="space-y-6 pt-4">
      <NavCoach />
      {milestoneBanner && (
        <StreakMilestoneBanner
          milestone={milestoneBanner}
          onDismiss={() => setMilestoneBanner(null)}
        />
      )}

      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised/80 p-4 dark:border-border-subtle-dark dark:bg-surface-raised-dark/80"
      >
        <div className="flex flex-col gap-3">
          <div className="flex min-w-0 items-start gap-4">
            <DailyProgressRing
              done={doneCount}
              total={totalCount}
              label={t('today.progressLabel', { done: doneCount, total: totalCount })}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-accent">{t(greetingKey(hour))}</p>
              <button
                type="button"
                onClick={() => setPlanHubOpen(true)}
                className="mt-0.5 line-clamp-2 text-left text-lg font-bold leading-snug transition-colors hover:text-accent"
                aria-label={t('plan.switchPlan')}
              >
                {plan.name}
              </button>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {format(parseISO(today), 'EEEE, d MMMM', { locale })}
              </p>
              {streak > 0 && (
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success dark:bg-success-soft-dark dark:text-emerald-400">
                  <Flame size={13} aria-hidden />
                  {t('today.streak', { count: streak })}
                </p>
              )}
            </div>
          </div>
          <div className="rounded-2xl bg-accent-soft px-3 py-2 text-center dark:bg-accent-soft-dark">
            <p className="text-xs font-semibold leading-snug text-accent">{targetLabel}</p>
          </div>
        </div>
      </motion.header>

      {allDone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
        >
          <Card className="flex items-center gap-3 border-success/30 bg-success-soft dark:border-success/20 dark:bg-success-soft-dark">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success text-white">
              <Sparkles size={20} aria-hidden />
            </div>
            <p className="text-sm font-semibold text-success-strong dark:text-emerald-400">
              {t('today.allDone')}
            </p>
          </Card>
        </motion.div>
      )}

      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <SectionTitle>{t('today.section')}</SectionTitle>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            aria-label={t('today.addTask')}
            className="flex items-center gap-1 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent transition-all duration-200 hover:bg-accent/15 active:scale-95 dark:bg-accent-soft-dark"
          >
            <Plus size={14} /> {t('common.add')}
          </button>
        </div>
        {tasksError ? (
          <QueryErrorState compact onRetry={() => void refetchTasks()} />
        ) : tasksLoading ? (
          <div className="space-y-2 animate-pulse" aria-busy="true">
            <div className="h-16 rounded-2xl bg-surface-muted dark:bg-surface-muted-dark" />
            <div className="h-16 rounded-2xl bg-surface-muted dark:bg-surface-muted-dark" />
          </div>
        ) : sortedTasks.length === 0 ? (
          <EmptyPanel
            icon={Coffee}
            text={t('today.noSchedule')}
            actionLabel={t('today.noScheduleAction')}
            onAction={() => navigate('/plan')}
          />
        ) : (
          <div className="space-y-2">
            {reviewTasks.length > 0 && studyTasks.length > 0 && (
              <p className="px-1 text-xs text-zinc-500 dark:text-zinc-400">
                {t('today.reviewSubheading', { count: reviewTasks.length })}
              </p>
            )}
            {sortedTasks.map((task) => {
              const isAdhoc = !task.scheduleItemId && !task.reviewOfTaskId
              const isReview = task.kind === 'review'
              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={(id) => setTaskStatus(id, 'done', () => complete.mutate(id))}
                  onReopen={(id) => setTaskStatus(id, 'open', () => reopen.mutate(id))}
                  onSkip={
                    isReview
                      ? (id) => setTaskStatus(id, 'skipped', () => skip.mutate(id))
                      : undefined
                  }
                  onRemove={!isReview ? (id) => setRemoveTaskId(id) : undefined}
                  onEdit={
                    isAdhoc && !isReview
                      ? () => setEditTask({ id: task.id, title: task.title })
                      : undefined
                  }
                />
              )
            })}
          </div>
        )}
      </section>

      <section className="space-y-2.5">
        <button
          type="button"
          onClick={() => {
            setDurationTouched(true)
            setDurationOpen((value) => !value)
          }}
          aria-expanded={durationOpen}
          className="flex w-full items-center justify-between gap-2 px-1"
        >
          <div className="min-w-0 text-left">
            <SectionTitle>{t('today.logTime')}</SectionTitle>
            {!durationOpen && (
              <p className="mt-0.5 text-xs text-zinc-400">
                {todayLog?.minutes
                  ? t('today.logTimeSummary', {
                      duration: todayLog.minutes >= 60
                        ? `${Math.floor(todayLog.minutes / 60)}h${todayLog.minutes % 60 ? ` ${todayLog.minutes % 60}m` : ''}`
                        : `${todayLog.minutes}m`,
                    })
                  : t('today.logTimeHint')}
              </p>
            )}
          </div>
          <ChevronDown
            size={17}
            className={`text-zinc-400 transition-transform ${durationOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {durationOpen && (
          <Card>
            <div className="flex flex-wrap gap-2">
              {DURATION_CHIPS.map((chip) => (
                <Chip
                  key={chip.minutes}
                  active={todayLog?.minutes === chip.minutes}
                  onClick={() =>
                    setMinutes.mutate(todayLog?.minutes === chip.minutes ? null : chip.minutes)
                  }
                >
                  {chip.label}
                </Chip>
              ))}
            </div>
          </Card>
        )}
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

      <ConfirmDialog
        open={removeTaskId !== null}
        title={t('today.removeTitle')}
        message={t('today.removeConfirm', { title: removeTask?.title ?? '' })}
        confirmLabel={t('common.delete')}
        variant="danger"
        loading={remove.isPending}
        onClose={() => setRemoveTaskId(null)}
        onConfirm={() => {
          if (!removeTaskId) return
          remove.mutate(removeTaskId, { onSuccess: () => setRemoveTaskId(null) })
        }}
      />

      <PlanHubSheet open={planHubOpen} onClose={() => setPlanHubOpen(false)} />
    </div>
  )
}
