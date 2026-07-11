import { useMemo, useState, type ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Flag,
  Lightbulb,
  Moon,
  Timer,
} from 'lucide-react'
import type { Checkpoint, IsoDate, StudyLog, Task } from '../../domain/models'
import { dateLocale } from '../../app/i18n'
import {
  useActivePlan,
  useAllTasks,
  useCheckpoints,
  useGroupStudyLogs,
  useGroupTaskStats,
  useMaterials,
  useStudyLogs,
  useWorkspaceInfo,
} from '../../app/queries'
import { useAuth } from '../../app/auth/AuthProvider'
import { useServices } from '../../core/di/ServicesProvider'
import { Button, EmptyState, ListPanel, PageHeader, SectionTitle, StatTile } from '../components/primitives'
import { NoPlanEmptyState } from '../components/NoPlanEmptyState'
import { QueryErrorState } from '../components/QueryErrorState'
import { ProgressBar } from '../components/ProgressBar'
import { Heatmap } from '../components/Heatmap'
import { GroupProgress } from '../components/GroupProgress'
import { Sheet } from '../components/Sheet'
import { PageLoadingSkeleton } from '../components/PageLoadingSkeleton'
import {
  MATERIAL_TAG_IDS,
  normalizeMaterialTags,
  type MaterialTagId,
} from '../../domain/material-tags'
import { displayTaskTitle } from '../lib/task-display'
import { computeProgressInsight, type ProgressInsight } from '../lib/progress-insight'

type StatSheet = 'studyDays' | 'tasksDone' | 'hoursLogged'
type TaskKindFilter = 'all' | 'study' | 'review'
type MaterialTagFilter = 'all' | MaterialTagId
type CheckpointFilter = 'all' | 'open' | 'achieved'

function formatStudyDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '—'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function ProgressPage() {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const navigate = useNavigate()
  const {
    data: plan,
    isLoading: planLoading,
    isError: planError,
    refetch,
  } = useActivePlan()
  const { session, cloudEnabled } = useAuth()
  const { clock } = useServices()
  const workspaceQuery = useWorkspaceInfo(session?.workspaceId)
  const groupLogsQuery = useGroupStudyLogs(plan?.id)
  const groupTaskStatsQuery = useGroupTaskStats(plan?.id)
  const tasksQuery = useAllTasks(plan?.id)
  const materialsQuery = useMaterials(plan?.id)
  const checkpointsQuery = useCheckpoints(plan?.id)
  const studyLogsQuery = useStudyLogs()

  const { data: workspaceInfo } = workspaceQuery
  const { data: groupLogs = [] } = groupLogsQuery
  const { data: groupTaskStats = [] } = groupTaskStatsQuery
  const { data: tasks = [] } = tasksQuery
  const { data: materials = [] } = materialsQuery
  const { data: checkpoints = [] } = checkpointsQuery
  const { data: studyLogs = [] } = studyLogsQuery

  const secondaryError =
    tasksQuery.isError ||
    materialsQuery.isError ||
    checkpointsQuery.isError ||
    studyLogsQuery.isError ||
    groupLogsQuery.isError ||
    groupTaskStatsQuery.isError ||
    workspaceQuery.isError

  const retrySecondary = () => {
    void tasksQuery.refetch()
    void materialsQuery.refetch()
    void checkpointsQuery.refetch()
    void studyLogsQuery.refetch()
    void groupLogsQuery.refetch()
    void groupTaskStatsQuery.refetch()
    void workspaceQuery.refetch()
  }
  const [selectedDate, setSelectedDate] = useState<IsoDate | null>(null)
  const [statSheet, setStatSheet] = useState<StatSheet | null>(null)
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null)
  const [taskKindFilter, setTaskKindFilter] = useState<TaskKindFilter>('all')
  const [materialTagFilter, setMaterialTagFilter] = useState<MaterialTagFilter>('all')
  const [checkpointFilter, setCheckpointFilter] = useState<CheckpointFilter>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [heatmapWeeks, setHeatmapWeeks] = useState(8)
  const activeFilterCount =
    Number(taskKindFilter !== 'all') +
    Number(materialTagFilter !== 'all') +
    Number(checkpointFilter !== 'all')

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (taskKindFilter !== 'all' && task.kind !== taskKindFilter) return false
      if (materialTagFilter !== 'all') {
        if (!task.materialId) return false
        const material = materials.find((item) => item.id === task.materialId)
        if (!material || !normalizeMaterialTags(material.tags).includes(materialTagFilter)) {
          return false
        }
      }
      return true
    })
  }, [tasks, taskKindFilter, materialTagFilter, materials])

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const task of filteredTasks) {
      if (task.status !== 'done') continue
      map.set(task.date, (map.get(task.date) ?? 0) + 1)
    }
    for (const log of studyLogs) {
      if (!map.has(log.date)) map.set(log.date, 1)
    }
    return map
  }, [filteredTasks, studyLogs])

  const doneTasks = filteredTasks.filter((task) => task.status === 'done').length
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
    for (const task of filteredTasks) {
      if (task.status !== 'done') continue
      const bucket = map.get(task.date)
      if (bucket) bucket.push(task)
      else map.set(task.date, [task])
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [filteredTasks])

  const logsWithMinutes = useMemo(
    () =>
      [...studyLogs]
        .filter((log) => log.minutes != null && log.minutes > 0)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [studyLogs],
  )

  const dayTasks = useMemo(() => {
    if (!selectedDate) return []
    return filteredTasks.filter((task) => task.date === selectedDate && task.status === 'done')
  }, [filteredTasks, selectedDate])

  const dayLog = useMemo(() => {
    if (!selectedDate) return undefined
    return studyLogs.find((log) => log.date === selectedDate)
  }, [studyLogs, selectedDate])

  const openDayDetail = (date: IsoDate) => {
    setStatSheet(null)
    setSelectedCheckpoint(null)
    setSelectedDate(date)
  }

  const nextOpenCheckpoint = useMemo(() => {
    const pool =
      checkpointFilter === 'all'
        ? checkpoints.filter((cp) => cp.status === 'open')
        : checkpointFilter === 'open'
          ? checkpoints.filter((cp) => cp.status === 'open')
          : checkpoints.filter((cp) => cp.status === 'achieved')

    if (checkpointFilter === 'achieved') {
      return (
        [...pool].sort((a, b) => b.dueDate.localeCompare(a.dueDate))[0] ?? null
      )
    }

    return [...pool].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null
  }, [checkpoints, checkpointFilter])

  const topMaterials = useMemo(() => {
    return [...materials]
      .filter((material) => material.totalUnits > 0)
      .sort(
        (a, b) =>
          b.doneUnits / b.totalUnits - a.doneUnits / a.totalUnits ||
          b.doneUnits - a.doneUnits,
      )
      .slice(0, 3)
  }, [materials])

  const showHeatmap = studyDays >= 7
  const showFilters =
    studyDays >= 14 || materials.some((material) => normalizeMaterialTags(material.tags).length > 0)

  const progressInsight = useMemo(
    () =>
      computeProgressInsight(
        materials,
        studyDayEntries.map((entry) => entry.date),
        clock.todayIso(),
      ),
    [materials, studyDayEntries, clock],
  )

  if (planError) {
    return <QueryErrorState onRetry={() => void refetch()} />
  }

  if (planLoading) {
    return <PageLoadingSkeleton label={t('progress.title')} />
  }

  if (!plan) {
    return <NoPlanEmptyState variant="compact" />
  }

  const selectedDateLabel = selectedDate
    ? format(parseISO(selectedDate), 'EEEE, d MMM yyyy', { locale })
    : ''
  const hoursPart = Math.floor(totalMinutes / 60)
  const minutesPart = totalMinutes % 60

  return (
    <div className="space-y-6 pt-4">
      <PageHeader title={t('progress.title')} subtitle={t('progress.subtitle')} />

      {secondaryError && (
        <QueryErrorState compact onRetry={retrySecondary} />
      )}

      <div className="grid grid-cols-3 gap-2">
        <StatTile
          value={String(studyDays)}
          label={t('progress.studyDays')}
          onClick={() => setStatSheet('studyDays')}
        />
        <StatTile
          value={String(doneTasks)}
          label={t('progress.tasksDone')}
          onClick={() => setStatSheet('tasksDone')}
        />
        <StatTile
          value={formatStudyDuration(totalMinutes)}
          label={t('progress.hoursLogged')}
          onClick={() => setStatSheet('hoursLogged')}
        />
      </div>

      {cloudEnabled && workspaceInfo && (
        <GroupProgress
          members={workspaceInfo.members}
          logs={groupLogs}
          taskStats={groupTaskStats}
          currentUserId={session?.userId ?? ''}
        />
      )}

      <ProgressInsightCard insight={progressInsight} />

      {studyDayEntries.length > 0 && (
        <ListPanel>
          <div className="px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
              {t('progress.recentActivity')}
            </p>
            <ul className="mt-2 space-y-1">
              {studyDayEntries.slice(0, 7).map(({ date, count }) => (
                <li key={date}>
                  <button
                    type="button"
                    onClick={() => openDayDetail(date)}
                    className="flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-muted dark:hover:bg-surface-muted-dark"
                  >
                    <span>{format(parseISO(date), 'EEE, d MMM', { locale })}</span>
                    <span className="text-xs text-zinc-400">
                      {t('progress.studyDayEntry', { count })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {studyDayEntries.length > 7 && (
              <button
                type="button"
                onClick={() => setStatSheet('studyDays')}
                className="mt-2 min-h-[44px] w-full text-center text-xs font-medium text-accent"
              >
                {t('progress.seeAllActivity')}
              </button>
            )}
          </div>
        </ListPanel>
      )}

      {showFilters && (
      <ListPanel>
        <button
          type="button"
          onClick={() => setFiltersOpen((value) => !value)}
          aria-expanded={filtersOpen}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-surface-muted/50 dark:hover:bg-surface-muted-dark/50"
        >
          <span className="min-w-0 flex-1 text-sm font-medium">{t('progress.filters')}</span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            size={17}
            className={`text-zinc-400 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {filtersOpen && (
          <div className="space-y-4 border-t border-border-subtle px-4 py-4 dark:border-border-subtle-dark">
            <FilterGroup label={t('progress.filterTaskType')}>
              {(['all', 'study', 'review'] as const).map((kind) => (
                <FilterChip
                  key={kind}
                  active={taskKindFilter === kind}
                  label={t(
                    kind === 'all'
                      ? 'progress.filterAll'
                      : kind === 'study'
                        ? 'progress.filterStudy'
                        : 'progress.filterReview',
                  )}
                  onClick={() => setTaskKindFilter(kind)}
                />
              ))}
            </FilterGroup>
            <FilterGroup label={t('progress.filterByTag')}>
              <FilterChip
                active={materialTagFilter === 'all'}
                label={t('progress.filterAll')}
                onClick={() => setMaterialTagFilter('all')}
              />
              {MATERIAL_TAG_IDS.map((tag) => (
                <FilterChip
                  key={tag}
                  active={materialTagFilter === tag}
                  label={t(`materialTags.${tag}`)}
                  onClick={() => setMaterialTagFilter(tag)}
                />
              ))}
            </FilterGroup>
            <FilterGroup label={t('progress.filterCheckpointStatus')}>
              {(['all', 'open', 'achieved'] as const).map((status) => (
                <FilterChip
                  key={status}
                  active={checkpointFilter === status}
                  label={t(
                    status === 'all'
                      ? 'progress.filterAll'
                      : status === 'open'
                        ? 'progress.filterOpen'
                        : 'progress.filterAchieved',
                  )}
                  onClick={() => setCheckpointFilter(status)}
                />
              ))}
            </FilterGroup>
          </div>
        )}
      </ListPanel>
      )}

      <section className="space-y-2">
        <SectionTitle>{t('progress.consistency')}</SectionTitle>
        {showHeatmap ? (
          <div className="rounded-xl border border-border-subtle bg-surface-raised p-4 dark:border-border-subtle-dark dark:bg-surface-raised-dark">
            <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">{t('progress.heatmapHint')}</p>
            <Heatmap counts={counts} weeks={heatmapWeeks} onSelectDate={openDayDetail} />
            {heatmapWeeks < 18 && (
              <button
                type="button"
                onClick={() => setHeatmapWeeks(18)}
                className="mt-3 min-h-[44px] w-full text-center text-xs font-medium text-accent"
              >
                {t('progress.expandHeatmap')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-dashed border-border-subtle px-4 py-6 text-center dark:border-border-subtle-dark">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {t('progress.heatmapLocked', { count: Math.max(0, 7 - studyDays) })}
            </p>
            <Button variant="ghost" className="mx-auto text-xs" onClick={() => navigate('/')}>
              {t('progress.heatmapLockedCta')}
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <SectionTitle>{t('progress.planSnapshot')}</SectionTitle>
          <Button variant="ghost" className="h-8 min-h-[44px] px-2 text-xs" onClick={() => navigate('/plan')}>
            {t('progress.editPlan')}
          </Button>
        </div>

        <ListPanel>
          <div className="border-b border-border-subtle px-4 py-3.5 dark:border-border-subtle-dark">
            <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
              {checkpointFilter === 'achieved'
                ? t('progress.latestMilestone')
                : t('progress.nextMilestone')}
            </p>
            {nextOpenCheckpoint ? (
              <button
                type="button"
                onClick={() => setSelectedCheckpoint(nextOpenCheckpoint)}
                className="mt-2 flex w-full cursor-pointer items-center gap-3 text-left"
              >
                <Flag size={16} className="shrink-0 text-accent" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{nextOpenCheckpoint.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {format(parseISO(nextOpenCheckpoint.dueDate), 'd MMM yyyy', { locale })}
                  </p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-zinc-300" />
              </button>
            ) : (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {t('progress.noOpenMilestone')}
              </p>
            )}
          </div>

          <div className="px-4 py-3.5">
            <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
              {t('progress.bookProgress')}
            </p>
            {topMaterials.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {t('plan.emptyMaterials')}
              </p>
            ) : (
              <ul className="mt-2 space-y-3">
                {topMaterials.map((material) => (
                  <li key={material.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/plan?material=${material.id}`)}
                      className="flex w-full cursor-pointer items-center gap-3 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-medium">{material.name}</p>
                          <span className="shrink-0 text-xs text-zinc-400">
                            {material.doneUnits}/{material.totalUnits}
                          </span>
                        </div>
                        <ProgressBar value={material.doneUnits} max={material.totalUnits} />
                      </div>
                      <ChevronRight size={18} className="shrink-0 text-zinc-300" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {materials.length > topMaterials.length && (
              <Button
                variant="ghost"
                className="mt-3 w-full text-xs"
                onClick={() => navigate('/plan#materials')}
              >
                {t('progress.viewAllInPlan')}
              </Button>
            )}
          </div>
        </ListPanel>
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

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function ProgressInsightCard({ insight }: { insight: ProgressInsight }) {
  const { t } = useTranslation()

  const message =
    insight.kind === 'gap'
      ? t('progress.insight.gap', { days: insight.days })
      : insight.kind === 'lagging'
        ? t('progress.insight.lagging', {
            name: insight.material.name,
            percent: insight.percent,
          })
        : t('progress.insight.onTrack')

  return (
    <div className="flex gap-3 rounded-2xl border border-accent/20 bg-accent-soft/40 px-4 py-3.5 dark:border-accent-soft-dark/40 dark:bg-accent-soft-dark/30">
      <Lightbulb size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">
          {t('progress.insight.title')}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">{message}</p>
      </div>
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer rounded-full px-3 py-2 text-[11px] font-medium transition-colors ${
        active
          ? 'bg-accent text-white'
          : 'bg-surface-muted text-zinc-500 hover:bg-zinc-200 dark:bg-surface-muted-dark dark:text-zinc-400'
      }`}
    >
      {label}
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
                  <p>{displayTaskTitle(task.title, task.kind)}</p>
                  {task.kind === 'review' && (
                    <p className="mt-0.5 text-xs text-zinc-400">{t('task.reviewHint')}</p>
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
