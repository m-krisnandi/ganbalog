import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import type { StudyLog, UserProfile } from '../../domain/models'
import type { MemberTaskStats as AuthMemberTaskStats } from '../../core/auth/auth-service'
import { useServices } from '../../core/di/ServicesProvider'
import { computeStudyStreak } from '../lib/streak'
import { MemberAvatar } from './MemberAvatar'
import { ListPanel, SectionTitle } from './primitives'

interface GroupProgressProps {
  members: UserProfile[]
  logs: StudyLog[]
  taskStats: AuthMemberTaskStats[]
  currentUserId: string
}

function memberStats(userId: string, logs: StudyLog[], today: string) {
  const userLogs = logs.filter((log) => log.userId === userId)
  const dates = new Set(userLogs.map((log) => log.date))
  const totalMinutes = userLogs.reduce((sum, log) => sum + (log.minutes ?? 0), 0)
  const streak = computeStudyStreak(dates, today)
  const studiedToday = dates.has(today)
  return { studyDays: dates.size, totalMinutes, streak, studiedToday }
}

function taskStatsForUser(userId: string, taskStats: AuthMemberTaskStats[]) {
  return taskStats.find((s) => s.userId === userId) ?? { userId, doneToday: 0, doneTotal: 0 }
}

function shortEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  if (local.length <= 4) return email
  return `${local.slice(0, 3)}…@${domain}`
}

/** Compact leaderboard — stays scannable with 5+ members. */
export function GroupProgress({ members, logs, taskStats, currentUserId }: GroupProgressProps) {
  const { t } = useTranslation()
  const { clock } = useServices()
  const today = clock.todayIso()
  const [expanded, setExpanded] = useState(false)

  const rows = useMemo(() => {
    const nameCounts = new Map<string, number>()
    for (const member of members) {
      nameCounts.set(member.displayName, (nameCounts.get(member.displayName) ?? 0) + 1)
    }

    return [...members]
      .map((member) => ({
        member,
        stats: memberStats(member.id, logs, today),
        tasks: taskStatsForUser(member.id, taskStats),
        showEmail: (nameCounts.get(member.displayName) ?? 0) > 1 && Boolean(member.email),
      }))
      .sort((a, b) => {
        if (a.member.id === currentUserId) return -1
        if (b.member.id === currentUserId) return 1
        if (a.stats.studiedToday !== b.stats.studiedToday) {
          return a.stats.studiedToday ? -1 : 1
        }
        return b.stats.studyDays - a.stats.studyDays || b.tasks.doneToday - a.tasks.doneToday
      })
  }, [members, logs, taskStats, today, currentUserId])

  if (members.length <= 1) return null

  const studiedTodayCount = rows.filter((row) => row.stats.studiedToday).length
  const compact = members.length >= 4
  const visibleRows = compact && !expanded ? rows.slice(0, 3) : rows
  const hiddenCount = rows.length - visibleRows.length

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <SectionTitle>{t('progress.groupTitle')}</SectionTitle>
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-accent dark:bg-accent-soft-dark">
          {t('progress.groupTodayCount', {
            studied: studiedTodayCount,
            total: members.length,
          })}
        </span>
      </div>

      <ListPanel>
        {visibleRows.map(({ member, stats, tasks, showEmail }) => {
          const isYou = member.id === currentUserId
          return (
            <div
              key={member.id}
              className={`flex min-h-[48px] items-center gap-3 px-3.5 py-2.5 ${
                isYou ? 'bg-accent-soft/30 dark:bg-accent-soft-dark/20' : ''
              }`}
            >
              <div className="relative shrink-0">
                <MemberAvatar
                  displayName={member.displayName}
                  avatarUrl={member.avatarUrl}
                  size="sm"
                />
                {stats.studiedToday && (
                  <span
                    className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-surface-raised bg-success dark:border-surface-raised-dark"
                    title={t('progress.groupStudiedToday')}
                    aria-label={t('progress.groupStudiedToday')}
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight">
                  {member.displayName}
                  {isYou && (
                    <span className="ml-1 text-xs font-normal text-zinc-400">
                      ({t('progress.groupYou')})
                    </span>
                  )}
                </p>
                {showEmail && member.email && (
                  <p className="truncate text-[10px] text-zinc-400">{shortEmail(member.email)}</p>
                )}
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-bold tabular-nums text-accent">
                  {tasks.doneToday}
                  <span className="text-[10px] font-medium text-zinc-400">
                    {' '}
                    {t('progress.groupTodayShort')}
                  </span>
                </p>
                <p className="text-[10px] tabular-nums text-zinc-400">
                  {t('progress.groupStreakShort', { count: stats.streak })}
                </p>
              </div>
            </div>
          )
        })}

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex min-h-[44px] w-full items-center justify-center gap-1 border-t border-border-subtle px-3 text-xs font-medium text-accent dark:border-border-subtle-dark"
          >
            {t('progress.groupShowMore', { count: hiddenCount })}
            <ChevronDown size={14} aria-hidden />
          </button>
        )}

        {compact && expanded && rows.length > 3 && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="flex min-h-[44px] w-full items-center justify-center gap-1 border-t border-border-subtle px-3 text-xs font-medium text-zinc-400 dark:border-border-subtle-dark"
          >
            {t('progress.groupShowLess')}
          </button>
        )}
      </ListPanel>

      <p className="px-1 text-xs text-zinc-400">{t('progress.groupHint')}</p>
    </section>
  )
}
