import { useMemo, useState } from 'react'
import { format, parseISO, type Locale } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, Globe, Search, CircleCheck, ScrollText, SearchX } from 'lucide-react'
import { applyTheme, useThemeStore, type ThemeMode } from '../../app/theme'
import { dateLocale, LANGUAGES } from '../../app/i18n'
import {
  useAuditTrail,
  useClearErrorLogs,
  useErrorLogs,
} from '../../app/queries'
import type { AuditEvent, LogEntry } from '../../domain/models'
import { Button, Card, EmptyState, SectionTitle, TextInput } from '../components/primitives'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Sheet } from '../components/Sheet'
import { PlanManager } from './settings/PlanManager'
import { DataSection } from './settings/DataSection'
import { WorkspaceSection } from './settings/WorkspaceSection'

export function SettingsPage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-6 pt-6">
      <header className="flex items-center gap-3 px-1">
        <img src="/logo.png" alt="Logo GanbaLog" className="size-10 shrink-0 rounded-xl" />
        <div>
          <h1 className="text-xl font-bold">{t('settings.title')}</h1>
          <p className="mt-0.5 text-sm text-zinc-400">{t('settings.subtitle')}</p>
        </div>
      </header>

      <LanguageSection />
      <WorkspaceSection />
      <PlanManager />
      <ThemeSection />
      <DataSection />
      <AuditSection />
      <ErrorLogSection />

      <p className="pt-2 pb-4 text-center text-xs text-zinc-300 dark:text-zinc-600">
        {t('settings.footer')}
      </p>
    </div>
  )
}

/* ----------------------------- Bahasa --------------------------------- */

function LanguageSection() {
  const { t, i18n } = useTranslation()

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 px-1">
        <Globe size={14} className="text-zinc-400" />
        <SectionTitle>{t('settings.language')}</SectionTitle>
      </div>
      <Card>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => void i18n.changeLanguage(lang.code)}
              className={`cursor-pointer rounded-full px-3 py-2.5 text-sm font-medium transition-colors ${
                i18n.language === lang.code
                  ? 'bg-accent text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </Card>
    </section>
  )
}

/* ------------------------------ Tema ---------------------------------- */

function ThemeSection() {
  const { t } = useTranslation()
  const { mode, setMode } = useThemeStore()

  const options: Array<{ value: ThemeMode; label: string }> = [
    { value: 'system', label: t('settings.system') },
    { value: 'light', label: t('settings.light') },
    { value: 'dark', label: t('settings.dark') },
  ]

  return (
    <section className="space-y-2">
      <SectionTitle>{t('settings.appearance')}</SectionTitle>
      <Card>
        <div className="flex gap-2">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setMode(option.value)
                applyTheme(option.value)
              }}
              className={`flex-1 cursor-pointer rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                mode === option.value
                  ? 'bg-accent text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Card>
    </section>
  )
}

/* --------------------------- Audit trail ------------------------------ */

const AUDIT_ENTITIES = ['plan', 'material', 'schedule', 'task', 'checkpoint', 'studyLog'] as const

function groupAuditByDay(events: AuditEvent[]): Array<{ day: string; events: AuditEvent[] }> {
  const groups = new Map<string, AuditEvent[]>()
  for (const event of events) {
    const day = event.at.slice(0, 10)
    const bucket = groups.get(day)
    if (bucket) bucket.push(event)
    else groups.set(day, [event])
  }
  return [...groups.entries()].map(([day, dayEvents]) => ({ day, events: dayEvents }))
}

function filterAuditEvents(
  events: AuditEvent[],
  query: string,
  entityFilter: string,
  translate: (key: string) => string,
): AuditEvent[] {
  const normalizedQuery = query.trim().toLowerCase()
  return events.filter((event) => {
    if (entityFilter !== 'all' && event.entity !== entityFilter) return false
    if (!normalizedQuery) return true
    const haystack = [
      event.detail,
      event.actorDisplayName ?? '',
      translate(`audit.actions.${event.action}`),
      translate(`audit.entities.${event.entity}`),
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(normalizedQuery)
  })
}

function AuditSection() {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const { data: events = [] } = useAuditTrail(150)

  const activeEntities = useMemo(
    () => AUDIT_ENTITIES.filter((entity) => events.some((event) => event.entity === entity)),
    [events],
  )

  const filtered = useMemo(
    () => filterAuditEvents(events, query, entityFilter, t),
    [events, query, entityFilter, t],
  )
  const grouped = useMemo(() => groupAuditByDay(filtered), [filtered])
  const hasFilters = query.trim().length > 0 || entityFilter !== 'all'

  const closeSheet = () => {
    setOpen(false)
    setQuery('')
    setEntityFilter('all')
  }

  return (
    <section className="space-y-2">
      <SectionTitle>{t('settings.history')}</SectionTitle>
      <Card className="p-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left"
        >
          <div>
            <p className="text-sm font-medium">{t('settings.audit')}</p>
            <p className="text-xs text-zinc-400">
              {t('settings.auditCount', { count: events.length })}
            </p>
          </div>
          <ChevronRight size={18} className="text-zinc-300" />
        </button>
      </Card>

      <Sheet
        open={open}
        title={t('settings.audit')}
        onClose={closeSheet}
        toolbar={
          events.length > 0 ? (
            <div className="space-y-3">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-400"
              />
              <TextInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('settings.auditSearch')}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setEntityFilter('all')}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  entityFilter === 'all'
                    ? 'bg-accent text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                {t('settings.auditFilterAll')}
              </button>
              {activeEntities.map((entity) => (
                <button
                  key={entity}
                  type="button"
                  onClick={() => setEntityFilter(entity)}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    entityFilter === entity
                      ? 'bg-accent text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  {t(`audit.entities.${entity}`)}
                </button>
              ))}
            </div>
            {hasFilters && (
              <p className="text-xs text-zinc-400">
                {t('settings.auditShowing', { count: filtered.length, total: events.length })}
              </p>
            )}
          </div>
          ) : undefined
        }
      >
        {events.length === 0 ? (
          <EmptyState icon={ScrollText} text={t('settings.auditEmpty')} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={SearchX} text={t('settings.auditNoResults')} />
        ) : (
          <div className="space-y-5 pb-2">
            {grouped.map(({ day, events: dayEvents }) => (
              <section key={day}>
                <p className="sticky top-0 z-10 -mx-5 mb-2 bg-white/95 px-5 py-1.5 text-xs font-semibold text-zinc-400 backdrop-blur-sm dark:bg-zinc-900/95">
                  {format(parseISO(day), 'EEEE, d MMM yyyy', { locale })}
                </p>
                <div className="space-y-3">
                  {dayEvents.map((event) => (
                    <div key={event.id} className="flex gap-3 text-sm">
                      <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 uppercase dark:bg-zinc-800 dark:text-zinc-400">
                        {t(`audit.actions.${event.action}`)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">{event.detail}</p>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          {format(parseISO(event.at), 'HH:mm', { locale })} ·{' '}
                          {t(`audit.entities.${event.entity}`)}
                          {event.actorDisplayName
                            ? ` · ${t('settings.auditBy', { name: event.actorDisplayName })}`
                            : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Sheet>
    </section>
  )
}

/* --------------------------- Log error -------------------------------- */

function ErrorLogCard({ log, locale }: { log: LogEntry; locale: Locale }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[10px] font-bold uppercase ${
            log.level === 'error' ? 'text-red-500' : 'text-amber-500'
          }`}
        >
          {log.level}
        </span>
        <span className="text-xs text-zinc-400">
          {format(parseISO(log.at), 'd MMM, HH:mm', { locale })}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium leading-snug">{log.message}</p>
      {log.stack && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex cursor-pointer items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
            {expanded ? t('common.hideDetails') : t('common.showDetails')}
          </button>
          {expanded && (
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-white/70 p-2 text-[10px] whitespace-pre-wrap text-zinc-500 dark:bg-zinc-900/70">
              {log.stack}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

function ErrorLogSection() {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const [open, setOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const { data: logs = [] } = useErrorLogs(100)
  const clearLogs = useClearErrorLogs()

  const handleConfirmClear = () => {
    clearLogs.mutate(undefined, {
      onSuccess: () => {
        setConfirmClear(false)
        setOpen(false)
      },
    })
  }

  return (
    <section className="space-y-2">
      <SectionTitle>{t('settings.diagnostics')}</SectionTitle>
      <Card className="p-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left"
        >
          <div>
            <p className="text-sm font-medium">{t('settings.errorLog')}</p>
            <p className="text-xs text-zinc-400">
              {logs.length === 0
                ? t('settings.noErrors')
                : t('settings.entries', { count: logs.length })}
            </p>
          </div>
          <ChevronRight size={18} className="text-zinc-300" />
        </button>
      </Card>

      <Sheet
        open={open}
        title={t('settings.errorLog')}
        onClose={() => setOpen(false)}
        footer={
          logs.length > 0 ? (
            <Button
              variant="ghost"
              className="w-full text-red-500"
              disabled={clearLogs.isPending}
              onClick={() => setConfirmClear(true)}
            >
              {t('settings.clearErrorLog')}
            </Button>
          ) : undefined
        }
      >
        {logs.length === 0 ? (
          <EmptyState icon={CircleCheck} text={t('settings.errorsEmpty')} />
        ) : (
          <div className="space-y-3 pb-2">
            {logs.map((log) => (
              <ErrorLogCard key={log.id} log={log} locale={locale} />
            ))}
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmClear}
        title={t('settings.clearErrorLogTitle')}
        message={t('settings.clearErrorLogConfirm')}
        confirmLabel={t('settings.clearErrorLog')}
        variant="danger"
        loading={clearLogs.isPending}
        onClose={() => setConfirmClear(false)}
        onConfirm={handleConfirmClear}
      />
    </section>
  )
}
