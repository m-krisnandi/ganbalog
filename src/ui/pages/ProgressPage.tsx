import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Flag,
  Moon,
  Sprout,
  Timer,
} from 'lucide-react'
import type { Checkpoint, IsoDate, StudyLog, Task } from '../../domain/models'
import { dateLocale } from '../../app/i18n'
import {
  useActivePlan,
  useAllTasks,
  useCheckpoints,
  useMaterials,
  useStudyLogs,
} from '../../app/queries'
import { Button, Card, EmptyState, SectionTitle } from '../components/primitives'
import { NoPlanEmptyState } from '../components/NoPlanEmptyState'
import { ProgressBar } from '../components/ProgressBar'
import { Heatmap } from '../components/Heatmap'
import { Sheet } from '../components/Sheet'

type StatSheet = 'studyDays' | 'tasksDone' | 'hoursLogged'

export function ProgressPage() {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const navigate = useNavigate()
  const { data: plan } = useActivePlan()
  const { data: tasks = [] } = useAllTasks(plan?.id)
  const { data: materials = [] } = useMaterials(plan?.id)
  const { data: checkpoints = [] } = useCheckpoints(plan?.id)
  const { data: studyLogs = [] } = useStudyLogs()
  const [selectedDate, setSelectedDate] = useState<IsoDate | null>(null)
  const [statSheet, setStatSheet] = useState<StatSheet | null>(null)
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null)

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const task of tasks) {
      if (task.status !== 'done') continue
      map.set(task.date, (map.get(task.date) ?? 0) + 1)
    }
    for (const log of studyLogs) {
      if (!map.has(log.date)) map.set(log.date, 1)
    }
    return map
  }, [tasks, studyLogs])

  const doneTasks = tasks.filter((task) => task.status === 'done').length
  const studyDays = new Set([...counts.keys()]).size
  const totalMinutes = studyLogs.reduce((sum, log) => sum + (log.minutes ?? 0), 0)

  const studyDayEntries = useMemo(
    () =>
      [...counts.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, count]) => ({ date, count })),
    [counts],
  )

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of tasks) {
      if (task.status !== 'done') continue
      const bucket = map.get(task.date)
      if (bucket) bucket.push(task)
      else map.set(task.date, [task])
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [tasks])

  const logsWithMinutes = useMemo(
    () =>
      [...studyLogs]
        .filter((log) => log.minutes != null && log.minutes > 0)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [studyLogs],
  )

  const dayTasks = useMemo(() => {
    if (!selectedDate) return []
    return tasks.filter((task) => task.date === selectedDate && task.status === 'done')
  }, [tasks, selectedDate])

  const dayLog = useMemo(() => {
    if (!selectedDate) return undefined
    return studyLogs.find((log) => log.date === selectedDate)
  }, [studyLogs, selectedDate])

  const openDayDetail = (date: IsoDate) => {
    setStatSheet(null)
    setSelectedCheckpoint(null)
    setSelectedDate(date)
  }

  if (!plan) {
    return <NoPlanEmptyState icon={Sprout} />
  }

  const sortedCheckpoints = [...checkpoints].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const selectedDateLabel = selectedDate
    ? format(parseISO(selectedDate), 'EEEE, d MMM yyyy', { locale })
    : ''
  const hoursPart = Math.floor(totalMinutes / 60)
  const minutesPart = totalMinutes % 60

  return (
    <div className="space-y-6 pt-6">
      <header className="px-1">
        <h1 className="text-xl font-bold">{t('progress.title')}</h1>
        <p className="mt-0.5 text-sm text-zinc-400">{t('progress.subtitle')}</p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <StatCard
          value={String(studyDays)}
          label={t('progress.studyDays')}
          onClick={() => setStatSheet('studyDays')}
        />
        <StatCard
          value={String(doneTasks)}
          label={t('progress.tasksDone')}
          onClick={() => setStatSheet('tasksDone')}
        />
        <StatCard
          value={totalMinutes > 0 ? String(Math.round(totalMinutes / 60)) : '—'}
          label={t('progress.hoursLogged')}
          onClick={() => setStatSheet('hoursLogged')}
        />
      </div>

      <section className="space-y-2">
        <SectionTitle>{t('progress.consistency')}</SectionTitle>
        <Card>
          <Heatmap counts={counts} onSelectDate={openDayDetail} />
        </Card>
      </section>

      <section className="space-y-2">
        <SectionTitle>{t('plan.materials')}</SectionTitle>
        {materials.length === 0 ? (
          <EmptyState icon={BookOpen} text={t('plan.emptyMaterials')} />
        ) : (
          <Card className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
            {materials.map((material) => (
              <button
                key={material.id}
                type="button"
                onClick={() => navigate(`/plan?material=${material.id}`)}
                aria-label={t('plan.viewMaterial', { name: material.name })}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">{material.name}</p>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {material.doneUnits}/{material.totalUnits} {material.unitLabel}
                    </span>
                  </div>
                  <ProgressBar value={material.doneUnits} max={material.totalUnits} />
                </div>
                <ChevronRight size={18} className="shrink-0 text-zinc-300" />
              </button>
            ))}
          </Card>
        )}
      </section>

      <section className="space-y-2">
        <SectionTitle>{t('plan.checkpoints')}</SectionTitle>
        {sortedCheckpoints.length === 0 ? (
          <EmptyState icon={Flag} text={t('plan.emptyCheckpoints')} />
        ) : (
          <Card className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
            {sortedCheckpoints.map((checkpoint) => (
              <button
                key={checkpoint.id}
                type="button"
                onClick={() => setSelectedCheckpoint(checkpoint)}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              >
                <span
                  className={`size-2.5 shrink-0 rounded-full ${
                    checkpoint.status === 'achieved' ? 'bg-accent' : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                />
                <p
                  className={`min-w-0 flex-1 text-sm ${
                    checkpoint.status === 'achieved' ? 'text-zinc-400 line-through' : ''
                  }`}
                >
                  {checkpoint.title}
                </p>
                <span className="shrink-0 text-xs text-zinc-400">
                  {format(parseISO(checkpoint.dueDate), 'd MMM', { locale })}
                </span>
                <ChevronRight size={18} className="shrink-0 text-zinc-300" />
              </button>
            ))}
          </Card>
        )}
      </section>

      <Sheet
        open={selectedDate !== null}
        title={t('progress.dayDetail', { date: selectedDateLabel })}
        onClose={() => setSelectedDate(null)}
      >
        {selectedDate && <StudyDayDetail tasks={dayTasks} studyLog={dayLog} />}
      </Sheet>

      <Sheet
        open={statSheet === 'studyDays'}
        title={t('progress.studyDaysDetail')}
        onClose={() => setStatSheet(null)}
      >
        {studyDayEntries.length === 0 ? (
          <EmptyState icon={CalendarDays} text={t('progress.dayEmpty')} />
        ) : (
          <ul className="space-y-1.5 pb-2">
            {studyDayEntries.map(({ date, count }) => (
              <li key={date}>
                <button
                  type="button"
                  onClick={() => openDayDetail(date)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-xl bg-zinc-100 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                >
                  <span>{format(parseISO(date), 'EEE, d MMM yyyy', { locale })}</span>
                  <span className="text-xs text-zinc-400">
                    {t('progress.studyDayEntry', { count })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <Sheet
        open={statSheet === 'tasksDone'}
        title={t('progress.tasksDoneDetail')}
        onClose={() => setStatSheet(null)}
      >
        {tasksByDate.length === 0 ? (
          <EmptyState icon={CircleCheck} text={t('progress.dayNoTasks')} />
        ) : (
          <div className="space-y-4 pb-2">
            {tasksByDate.map(([date, dayTasksList]) => (
              <section key={date}>
                <button
                  type="button"
                  onClick={() => openDayDetail(date)}
                  className="cursor-pointer text-xs font-semibold text-zinc-400 uppercase transition-colors hover:text-accent"
                >
                  {format(parseISO(date), 'EEE, d MMM yyyy', { locale })}
                </button>
                <ul className="mt-2 space-y-1.5">
                  {dayTasksList.map((task) => (
                    <li
                      key={task.id}
                      className="rounded-xl bg-zinc-100 px-3.5 py-2.5 text-sm dark:bg-zinc-800"
                    >
                      {task.title}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Sheet>

      <Sheet
        open={statSheet === 'hoursLogged'}
        title={t('progress.hoursLoggedDetail')}
        onClose={() => setStatSheet(null)}
      >
        {logsWithMinutes.length === 0 ? (
          <EmptyState icon={Timer} text={t('progress.hoursNone')} />
        ) : (
          <div className="space-y-4 pb-2">
            <p className="text-sm font-medium text-accent">
              {t('progress.hoursTotal', { hours: hoursPart, minutes: minutesPart })}
            </p>
            <ul className="space-y-1.5">
              {logsWithMinutes.map((log) => (
                <li key={log.id}>
                  <button
                    type="button"
                    onClick={() => openDayDetail(log.date)}
                    className="flex w-full cursor-pointer items-center justify-between rounded-xl bg-zinc-100 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  >
                    <span>{format(parseISO(log.date), 'EEE, d MMM yyyy', { locale })}</span>
                    <span className="text-xs text-zinc-400">
                      {t('progress.dayMinutes', { minutes: log.minutes ?? 0 })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Sheet>

      <Sheet
        open={selectedCheckpoint !== null}
        title={selectedCheckpoint?.title ?? t('plan.checkpoints')}
        onClose={() => setSelectedCheckpoint(null)}
        footer={
          selectedCheckpoint ? (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setSelectedCheckpoint(null)
                navigate('/plan#checkpoints')
              }}
            >
              {t('progress.manageInPlan')}
            </Button>
          ) : undefined
        }
      >
        {selectedCheckpoint && (
          <CheckpointDetail checkpoint={selectedCheckpoint} locale={locale} />
        )}
      </Sheet>
    </div>
  )
}

function StatCard({
  value,
  label,
  onClick,
}: {
  value: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer text-left transition-transform active:scale-[0.98]"
    >
      <Card className="text-center transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
        <p className="text-2xl font-bold text-accent">{value}</p>
        <p className="text-[11px] text-zinc-400">{label}</p>
      </Card>
    </button>
  )
}

function CheckpointDetail({
  checkpoint,
  locale,
}: {
  checkpoint: Checkpoint
  locale: ReturnType<typeof dateLocale>
}) {
  const { t } = useTranslation()
  const achieved = checkpoint.status === 'achieved'

  return (
    <div className="space-y-4 pb-2">
      <div>
        <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
          {t('progress.checkpointDueLabel')}
        </p>
        <p className="mt-1 text-sm">
          {format(parseISO(checkpoint.dueDate), 'EEEE, d MMMM yyyy', { locale })}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
          {t('progress.checkpointStatusLabel')}
        </p>
        <p
          className={`mt-1 text-sm font-medium ${achieved ? 'text-accent' : 'text-zinc-600 dark:text-zinc-300'}`}
        >
          {achieved ? t('progress.checkpointStatusAchieved') : t('progress.checkpointStatusOpen')}
        </p>
        {achieved && checkpoint.achievedAt && (
          <p className="mt-1 text-xs text-zinc-400">
            {t('progress.checkpointAchievedOn', {
              date: format(parseISO(checkpoint.achievedAt), 'd MMM yyyy', { locale }),
            })}
          </p>
        )}
      </div>
    </div>
  )
}

function StudyDayDetail({
  tasks,
  studyLog,
}: {
  tasks: Task[]
  studyLog: StudyLog | undefined
}) {
  const { t } = useTranslation()
  const hasActivity = tasks.length > 0 || studyLog !== undefined

  if (!hasActivity) {
    return <EmptyState icon={Moon} text={t('progress.dayEmpty')} />
  }

  return (
    <div className="space-y-4 pb-2">
      {studyLog?.minutes != null && studyLog.minutes > 0 && (
        <p className="text-sm font-medium text-accent">
          {t('progress.dayMinutes', { minutes: studyLog.minutes })}
        </p>
      )}

      <div>
        <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
          {t('progress.dayTasksHeading')}
        </p>
        {tasks.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">{t('progress.dayNoTasks')}</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-start gap-2 rounded-xl bg-zinc-100 px-3.5 py-2.5 text-sm dark:bg-zinc-800"
              >
                <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-accent" />
                <div className="min-w-0 flex-1">
                  <p>{task.title}</p>
                  {task.kind === 'review' && (
                    <p className="mt-0.5 text-xs text-zinc-400">{t('today.review')}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
