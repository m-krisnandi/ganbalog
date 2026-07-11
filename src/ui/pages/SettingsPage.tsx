import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { format, parseISO, type Locale } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { ChevronDown, ChevronRight, Globe, Search, CircleCheck, ScrollText, SearchX } from 'lucide-react'
import { AppFooter } from '../components/AppFooter'
import { applyContrast, applyTextSize, useDisplayStore } from '../../app/display'
import { applyTheme, useThemeStore } from '../../app/theme'
import { dateLocale, LANGUAGES } from '../../app/i18n'
import { useAuditTrail,
  useClearErrorLogs,
  useErrorLogs,
} from '../../app/queries'
import { useToastStore } from '../../app/toast-store'
import type { AuditEvent, LogEntry } from '../../domain/models'
import { Button, Card, EmptyState, ListPanel, PageHeader, SectionTitle, TextInput } from '../components/primitives'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Sheet } from '../components/Sheet'
import { PlanAdvancedSection } from './settings/PlanAdvancedSection'
import { DataSection } from './settings/DataSection'
import { HelpSection } from './settings/HelpSection'
import { PwaInstallSettingsRow } from '../components/PwaInstallBanner'
import { WorkspaceSection } from './settings/WorkspaceSection'

export function SettingsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [highlightImport] = useState(() => searchParams.get('import') === '1')

  useEffect(() => {
    if (!highlightImport) return
    const el = document.getElementById('settings-data')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (!searchParams.has('import')) return
    const next = new URLSearchParams(searchParams)
    next.delete('import')
    setSearchParams(next, { replace: true })
  }, [highlightImport, searchParams, setSearchParams])

  return (
    <div className="space-y-5 pt-4">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <SettingsGroup title={t('settings.sectionAccount')}>
        <WorkspaceSection />
      </SettingsGroup>

      <SettingsGroup title={t('settings.sectionPreferences')}>
        <PreferencesPanel />
      </SettingsGroup>

      <SettingsGroup title={t('settings.sectionData')}>
        <div id="settings-data" className="scroll-mt-4">
          <DataSection highlightImport={highlightImport} />
        </div>
      </SettingsGroup>

      <HelpSection />

      <AdvancedSettingsGroup />

      <AppFooter className="pt-2 pb-8" />
    </div>
  )
}

function AdvancedSettingsGroup() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [open, setOpen] = useState(() => searchParams.get('plansAdvanced') === '1')

  return (
    <section className="space-y-3">
      <h2 className="px-1 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
        {t('settings.sectionAdvanced')}
      </h2>
      <ListPanel>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3.5 text-left"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t('settings.advancedTitle')}</p>
            <p className="text-xs text-zinc-400">{t('settings.advancedHint')}</p>
          </div>
          <ChevronDown
            size={18}
            className={`shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {open && (
          <div className="space-y-4 border-t border-border-subtle px-4 py-4 dark:border-border-subtle-dark">
            <PlanAdvancedSection embedded />
            <AuditSection embedded />
            <ErrorLogSection embedded />
          </div>
        )}
      </ListPanel>
    </section>
  )
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`min-h-[36px] cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === option.value
              ? 'bg-accent text-white'
              : 'bg-surface-muted text-zinc-600 hover:bg-zinc-200/80 dark:bg-surface-muted-dark dark:text-zinc-300 dark:hover:bg-zinc-700'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function PreferenceRow({
  label,
  children,
  hint,
}: {
  label: ReactNode
  children: ReactNode
  hint?: ReactNode
}) {
  return (
    <div className="space-y-2 px-4 py-3.5">
      <p className="text-sm font-medium">{label}</p>
      {children}
      {hint && <p className="text-[11px] leading-relaxed text-zinc-400">{hint}</p>}
    </div>
  )
}

function PreferencesPanel() {
  const { t, i18n } = useTranslation()
  const { mode, setMode } = useThemeStore()
  const { textSize, setTextSize, contrast, setContrast, reminderEnabled, reminderHour, setReminderEnabled, setReminderHour } =
    useDisplayStore()
  const showToast = useToastStore((s) => s.show)

  const toggleReminder = async () => {
    if (!reminderEnabled) {
      if (typeof Notification === 'undefined') {
        showToast(t('settings.reminderUnsupported'), 'error')
        return
      }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        showToast(t('settings.reminderDenied'), 'error')
        return
      }
      setReminderEnabled(true)
      return
    }
    setReminderEnabled(false)
  }

  return (
    <div className="space-y-2">
      <PwaInstallSettingsRow />
      <ListPanel>
      <PreferenceRow
        label={
          <span className="inline-flex items-center gap-1.5">
            <Globe size={14} className="text-zinc-400" aria-hidden />
            {t('settings.language')}
          </span>
        }
      >
        <SegmentedControl
          value={(LANGUAGES.find((lang) => i18n.language.startsWith(lang.code))?.code ?? 'en') as string}
          onChange={(code) => void i18n.changeLanguage(code)}
          options={LANGUAGES.map((lang) => ({ value: lang.code, label: lang.label }))}
        />
      </PreferenceRow>

      <div className="border-t border-border-subtle dark:border-border-subtle-dark">
        <PreferenceRow label={t('settings.appearance')}>
          <SegmentedControl
            value={mode}
            onChange={(next) => {
              setMode(next)
              applyTheme(next)
            }}
            options={[
              { value: 'system', label: t('settings.system') },
              { value: 'light', label: t('settings.light') },
              { value: 'dark', label: t('settings.dark') },
            ]}
          />
        </PreferenceRow>
      </div>

      <div className="border-t border-border-subtle dark:border-border-subtle-dark">
        <PreferenceRow label={t('settings.textSize')}>
          <SegmentedControl
            value={textSize}
            onChange={(next) => {
              setTextSize(next)
              applyTextSize(next)
            }}
            options={[
              { value: 'default', label: t('settings.textSizeDefault') },
              { value: 'large', label: t('settings.textSizeLarge') },
            ]}
          />
        </PreferenceRow>
      </div>

      <div className="border-t border-border-subtle dark:border-border-subtle-dark">
        <PreferenceRow label={t('settings.contrast')}>
          <SegmentedControl
            value={contrast}
            onChange={(next) => {
              setContrast(next)
              applyContrast(next)
            }}
            options={[
              { value: 'default', label: t('settings.contrastDefault') },
              { value: 'high', label: t('settings.contrastHigh') },
            ]}
          />
        </PreferenceRow>
      </div>

      <div className="border-t border-border-subtle dark:border-border-subtle-dark">
        <div className="px-4 py-3.5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={() => void toggleReminder()}
              className="mt-1 size-4 accent-accent"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{t('settings.reminderEnable')}</span>
              <span className="mt-0.5 block text-[11px] text-zinc-400">{t('settings.reminderHintShort')}</span>
            </span>
          </label>
          {reminderEnabled && (
            <div className="mt-3 flex items-center gap-2 pl-7">
              <label htmlFor="reminder-hour" className="text-xs text-zinc-500">
                {t('settings.reminderTime')}
              </label>
              <select
                id="reminder-hour"
                value={reminderHour}
                onChange={(event) => setReminderHour(Number(event.target.value))}
                className="rounded-lg border border-border-subtle bg-white px-2 py-1.5 text-sm dark:border-border-subtle-dark dark:bg-zinc-900"
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      </ListPanel>
    </div>
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

function AuditSection({ embedded = false }: { embedded?: boolean }) {
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
      {!embedded && <SectionTitle>{t('settings.history')}</SectionTitle>}
      <Card className={embedded ? 'border-0 p-0 shadow-none' : 'p-0'}>
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

function ErrorLogSection({ embedded = false }: { embedded?: boolean }) {
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
      {!embedded && <SectionTitle>{t('settings.diagnostics')}</SectionTitle>}
      <Card className={embedded ? 'border-0 p-0 shadow-none' : 'p-0'}>
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
