import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useLocation, useSearchParams } from 'react-router'
import {
  Check,
  ChevronDown,
  ChevronsUpDown,
  Minus,
  Pencil,
  Plus,
  Trash2,
  BookOpen,
  Flag,
  CalendarRange,
} from 'lucide-react'
import type { Material, MaterialUnit, Weekday } from '../../domain/models'
import {
  MATERIAL_CHECKLIST_MAX,
  materialUnitLabel,
  supportsMaterialChecklist,
} from '../../domain/services/material-units'
import { dateLocale } from '../../app/i18n'
import { useServices } from '../../core/di/ServicesProvider'
import {
  useActivePlan,
  useCheckpointMutations,
  useCheckpoints,
  useMaterialMutations,
  useMaterialUnits,
  useMaterials,
  useSchedule,
  useScheduleMutations,
} from '../../app/queries'
import { Button, Card, EmptyPanel, ListPanel, PageHeader, SectionTitle, TextInput } from '../components/primitives'
import { MaterialTagBadges, MaterialTagPicker } from '../components/MaterialTagPicker'
import { normalizeMaterialTags, type MaterialTagId } from '../../domain/material-tags'
import { NoPlanEmptyState } from '../components/NoPlanEmptyState'
import { QueryErrorState } from '../components/QueryErrorState'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ConfettiBurst } from '../components/ConfettiBurst'
import { DatePicker } from '../components/DatePicker'
import { ProgressBar } from '../components/ProgressBar'
import { Sheet } from '../components/Sheet'
import { PageLoadingSkeleton } from '../components/PageLoadingSkeleton'
import { SetupGuide } from '../components/SetupGuide'
import { PlanHubSheet } from '../components/PlanHubSheet'

const DAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7]
const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5]
const WEEKEND: Weekday[] = [6, 7]

type PlanSegment = 'schedule' | 'materials' | 'milestones'
type HubView = 'list' | 'create' | 'samples' | 'manage'

function normalizeSegment(value: string | null): PlanSegment | null {
  if (value === 'materials' || value === 'milestones' || value === 'schedule') return value
  if (value === 'books') return 'materials'
  return null
}

export function PlanPage() {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const { data: plan, isLoading, isError, refetch } = useActivePlan()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const materialIdFromUrl = searchParams.get('material')
  const segmentParam = searchParams.get('segment')
  const [segment, setSegment] = useState<PlanSegment>(() => {
    return normalizeSegment(segmentParam) ?? 'schedule'
  })
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [hubInitialView, setHubInitialView] = useState<HubView>('list')

  const changeSegment = (nextSegment: PlanSegment) => {
    setSegment(nextSegment)
    const next = new URLSearchParams(searchParams)
    next.set('segment', nextSegment)
    setSearchParams(next, { replace: true })
  }

  const clearMaterialParam = () => {
    if (!searchParams.has('material')) return
    const next = new URLSearchParams(searchParams)
    next.delete('material')
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    if (!plan) return
    if (location.hash === '#checkpoints') {
      setSegment('milestones')
      history.replaceState(null, '', `${location.pathname}${location.search}`)
    } else if (location.hash === '#materials' || materialIdFromUrl) {
      setSegment('materials')
      if (location.hash === '#materials') {
        history.replaceState(null, '', `${location.pathname}${location.search}`)
      }
    }
  }, [location.hash, location.pathname, location.search, materialIdFromUrl, plan])

  useEffect(() => {
    const normalized = normalizeSegment(segmentParam)
    if (!normalized) return
    setSegment(normalized)
    if (segmentParam === 'books') {
      const next = new URLSearchParams(searchParams)
      next.set('segment', 'materials')
      setSearchParams(next, { replace: true })
    }
    // Only react to segment query changes — avoid looping on searchParams identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentParam])

  useEffect(() => {
    if (searchParams.get('newPlan') !== '1') return
    setHubInitialView('create')
    setSwitcherOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('newPlan')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  if (isError) {
    return <QueryErrorState onRetry={() => void refetch()} />
  }

  if (isLoading) {
    return <PageLoadingSkeleton label={t('nav.plan')} />
  }

  if (!plan) {
    return (
      <>
        <NoPlanEmptyState variant="compact" />
        <PlanHubSheet
          open={switcherOpen}
          initialView={hubInitialView}
          onClose={() => {
            setSwitcherOpen(false)
            setHubInitialView('list')
          }}
        />
      </>
    )
  }

  const segments: Array<{ id: PlanSegment; label: string }> = [
    { id: 'schedule', label: t('plan.segmentSchedule') },
    { id: 'materials', label: t('plan.segmentBooks') },
    { id: 'milestones', label: t('plan.segmentMilestones') },
  ]

  return (
    <div className="space-y-5 pt-4">
      <PageHeader
        title={
          <button
            type="button"
            onClick={() => setSwitcherOpen(true)}
            className="flex w-full items-center gap-2 text-left"
            aria-label={t('plan.switchPlan')}
          >
            <span className="min-w-0 flex-1 truncate">{plan.name}</span>
            <ChevronsUpDown size={18} className="shrink-0 text-zinc-400" aria-hidden />
          </button>
        }
        subtitle={
          <>
            {format(parseISO(plan.startDate), 'd MMM yyyy', { locale })} →{' '}
            {format(parseISO(plan.targetDate), 'd MMM yyyy', { locale })}
          </>
        }
      />

      <div
        role="tablist"
        aria-label={t('plan.segmentAria')}
        className="flex gap-1 rounded-2xl bg-surface-muted p-1 dark:bg-surface-muted-dark"
      >
        {segments.map((seg) => (
          <button
            key={seg.id}
            type="button"
            role="tab"
            aria-selected={segment === seg.id}
            onClick={() => changeSegment(seg.id)}
            className={`flex-1 cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              segment === seg.id
                ? 'bg-surface-raised text-accent shadow-sm dark:bg-surface-raised-dark'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {seg.label}
          </button>
        ))}
      </div>

      <SetupGuide planId={plan.id} sourceTemplateId={plan.sourceTemplateId} />

      {segment === 'schedule' && <WeeklySchedule planId={plan.id} />}
      {segment === 'materials' && (
        <MaterialsSection
          planId={plan.id}
          initialMaterialId={materialIdFromUrl}
          onMaterialDetailClose={clearMaterialParam}
        />
      )}
      {segment === 'milestones' && <CheckpointsSection planId={plan.id} />}

      <PlanHubSheet
        open={switcherOpen}
        initialView={hubInitialView}
        onClose={() => {
          setSwitcherOpen(false)
          setHubInitialView('list')
        }}
      />
    </div>
  )
}

/* ------------------------- Jadwal mingguan --------------------------- */

function WeeklySchedule({ planId }: { planId: string }) {
  const { t } = useTranslation()
  const {
    data: items = [],
    isError: scheduleError,
    refetch: refetchSchedule,
  } = useSchedule(planId)
  const { data: materials = [], isError: materialsError, refetch: refetchMaterials } =
    useMaterials(planId)
  const { add, remove } = useScheduleMutations(planId)
  const sectionError = scheduleError || materialsError
  const retrySection = () => {
    void refetchSchedule()
    void refetchMaterials()
  }

  const [editDay, setEditDay] = useState<Weekday | null>(null)
  const [weekdaysExpanded, setWeekdaysExpanded] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newMaterialId, setNewMaterialId] = useState<string>('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const pendingItem = items.find((i) => i.id === pendingDeleteId)

  const dayName = (day: Weekday) => t(`weekdays.${day}`)
  const scheduleEmpty = items.length === 0

  const weekdaysWithItems = WEEKDAYS.filter((day) => items.some((item) => item.weekday === day))
  const weekdayItemCount = items.filter((item) => WEEKDAYS.includes(item.weekday)).length
  const canCollapseWeekdays = weekdaysWithItems.length >= 2
  const restDayCount = DAYS.filter(
    (day) => !items.some((item) => item.weekday === day),
  ).length

  const renderDayRow = (day: Weekday) => {
    const dayItems = items.filter((item) => item.weekday === day)
    return (
      <button
        key={day}
        type="button"
        onClick={() => setEditDay(day)}
        className="w-full rounded-2xl bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold">{dayName(day)}</p>
          <span className="text-xs text-zinc-400">
            {dayItems.length > 0
              ? t('plan.items', { count: dayItems.length })
              : t('plan.dayOff')}
          </span>
        </div>
        {dayItems.length > 0 && (
          <p className="mt-1 truncate text-xs text-zinc-400">
            {dayItems.map((item) => item.title).join(' · ')}
          </p>
        )}
      </button>
    )
  }

  return (
    <section className="space-y-2">
      <SectionTitle>{t('plan.weekly')}</SectionTitle>
      {sectionError ? (
        <QueryErrorState compact onRetry={retrySection} />
      ) : (
        <>
      {scheduleEmpty && (
        <EmptyPanel
          className="border-accent/30 bg-accent-soft/30 dark:border-accent/20 dark:bg-accent-soft-dark/20"
          icon={CalendarRange}
          text={t('plan.emptySchedule')}
          actionLabel={t('plan.emptyScheduleAction')}
          onAction={() => setEditDay(1)}
        />
      )}
      <div className="space-y-2">
        {canCollapseWeekdays && !weekdaysExpanded ? (
          <>
            <button
              type="button"
              onClick={() => setWeekdaysExpanded(true)}
              aria-expanded={false}
              className="w-full rounded-2xl bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{t('plan.weekdayBlock')}</p>
                <ChevronDown size={16} className="shrink-0 text-zinc-400" aria-hidden />
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                {t('plan.weekdaySummary', {
                  days: weekdaysWithItems.length,
                  count: weekdayItemCount,
                })}
              </p>
            </button>
            {WEEKEND.map((day) => {
              const dayItems = items.filter((item) => item.weekday === day)
              if (dayItems.length === 0) return null
              return renderDayRow(day)
            })}
            {restDayCount > 0 && (
              <p className="px-1 text-xs text-zinc-400">
                {t('plan.restDaysSummary', { count: restDayCount })}
              </p>
            )}
          </>
        ) : (
          <>
            {canCollapseWeekdays && (
              <button
                type="button"
                onClick={() => setWeekdaysExpanded(false)}
                aria-expanded
                className="flex w-full items-center justify-center gap-1 py-1 text-xs font-medium text-accent"
              >
                {t('plan.collapseWeekdays')}
                <ChevronDown size={14} className="rotate-180" aria-hidden />
              </button>
            )}
            {DAYS.map((day) => renderDayRow(day))}
          </>
        )}
      </div>
        </>
      )}

      <Sheet
        open={editDay !== null}
        title={editDay ? t('plan.scheduleFor', { day: dayName(editDay) }) : ''}
        onClose={() => setEditDay(null)}
      >
        {editDay && (
          <div className="space-y-4">
            <div className="space-y-2">
              {items
                .filter((i) => i.weekday === editDay)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl bg-zinc-100 px-3.5 py-2.5 dark:bg-zinc-800"
                  >
                    <p className="min-w-0 flex-1 truncate text-sm">{item.title}</p>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(item.id)}
                      aria-label={t('plan.deleteItem', { name: item.title })}
                      className="ml-2 rounded-full p-1.5 text-zinc-400 transition-colors hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              {items.filter((i) => i.weekday === editDay).length === 0 && (
                <p className="py-2 text-center text-sm text-zinc-400">{t('plan.noItems')}</p>
              )}
            </div>

            <form
              className="space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800"
              onSubmit={(e) => {
                e.preventDefault()
                const title = newTitle.trim()
                if (!title) return
                add.mutate(
                  { weekday: editDay, title, materialId: newMaterialId || null },
                  {
                    onSuccess: () => {
                      setNewTitle('')
                      setNewMaterialId('')
                    },
                  },
                )
              }}
            >
              <TextInput
                placeholder={t('plan.itemPlaceholder')}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <select
                value={newMaterialId}
                onChange={(e) => setNewMaterialId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">{t('plan.noMaterial')}</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <Button type="submit" className="w-full">
                {t('plan.addTo', { day: dayName(editDay) })}
              </Button>
            </form>
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title={t('plan.deleteScheduleTitle')}
        message={t('plan.deleteScheduleConfirm', { name: pendingItem?.title ?? '' })}
        confirmLabel={t('common.delete')}
        variant="danger"
        loading={remove.isPending}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (!pendingDeleteId) return
          remove.mutate(pendingDeleteId, { onSuccess: () => setPendingDeleteId(null) })
        }}
      />
    </section>
  )
}

/* ----------------------------- Materi -------------------------------- */

function MaterialUnitRow({
  material,
  unit,
  onToggle,
}: {
  material: Material
  unit: MaterialUnit
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const label = materialUnitLabel(material, unit.index)

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-label={
          unit.done ? t('plan.reopenUnit', { label }) : t('plan.completeUnit', { label })
        }
        className="flex w-full items-center gap-3 rounded-xl bg-zinc-100 px-3.5 py-2.5 text-left transition-colors hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700"
      >
        <span
          aria-hidden
          className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            unit.done
              ? 'border-accent bg-accent text-white'
              : 'border-zinc-300 text-transparent dark:border-zinc-600'
          }`}
        >
          <Check size={14} strokeWidth={3} />
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-sm ${
            unit.done ? 'text-zinc-400 line-through' : 'font-medium'
          }`}
        >
          {label}
        </span>
      </button>
    </li>
  )
}

function MaterialsSection({
  planId,
  initialMaterialId,
  onMaterialDetailClose,
}: {
  planId: string
  initialMaterialId?: string | null
  onMaterialDetailClose?: () => void
}) {
  const { t } = useTranslation()
  const {
    data: materials = [],
    isLoading: materialsLoading,
    isError: materialsError,
    refetch: refetchMaterials,
  } = useMaterials(planId)
  const { data: schedule = [] } = useSchedule(planId)
  const { add, updateDetails, adjustProgress, toggleUnit, remove } = useMaterialMutations(planId)

  const [addOpen, setAddOpen] = useState(false)
  const [detailMaterialId, setDetailMaterialId] = useState<string | null>(null)
  const [sheetMode, setSheetMode] = useState<'view' | 'edit'>('view')
  const [name, setName] = useState('')
  const [unitLabel, setUnitLabel] = useState('')
  const [totalUnits, setTotalUnits] = useState('10')
  const [tags, setTags] = useState<MaterialTagId[]>([])
  const [showTagOptions, setShowTagOptions] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const pendingMaterial = materials.find((m) => m.id === pendingDeleteId)

  const detailMaterial = useMemo(
    () => materials.find((m) => m.id === detailMaterialId),
    [materials, detailMaterialId],
  )
  const { data: units = [] } = useMaterialUnits(detailMaterialId ?? undefined)

  const linkedItems = detailMaterial
    ? schedule.filter((item) => item.materialId === detailMaterial.id)
    : []

  const openDetail = (material: Material) => {
    setDetailMaterialId(material.id)
    setSheetMode('view')
  }

  const closeDetail = () => {
    setDetailMaterialId(null)
    setSheetMode('view')
    onMaterialDetailClose?.()
  }

  useEffect(() => {
    if (!initialMaterialId || materialsLoading) return
    const material = materials.find((item) => item.id === initialMaterialId)
    if (!material) {
      onMaterialDetailClose?.()
      return
    }
    setDetailMaterialId(material.id)
    setSheetMode('view')
  }, [initialMaterialId, materials, materialsLoading, onMaterialDetailClose])

  const startEdit = () => {
    if (!detailMaterial) return
    setName(detailMaterial.name)
    setUnitLabel(detailMaterial.unitLabel)
    setTotalUnits(String(detailMaterial.totalUnits))
    setTags(normalizeMaterialTags(detailMaterial.tags))
    setSheetMode('edit')
  }

  useEffect(() => {
    if (sheetMode === 'edit' && detailMaterial) {
      setName(detailMaterial.name)
      setUnitLabel(detailMaterial.unitLabel)
      setTotalUnits(String(detailMaterial.totalUnits))
      setTags(normalizeMaterialTags(detailMaterial.tags))
    }
  }, [detailMaterial, sheetMode])

  const hasChecklist =
    detailMaterial !== undefined && supportsMaterialChecklist(detailMaterial.totalUnits)

  return (
    <section id="materials" className="scroll-mt-6 space-y-2">
      <div className="flex items-center justify-between">
        <SectionTitle>{t('plan.materials')}</SectionTitle>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent-soft dark:hover:bg-accent-soft-dark"
        >
          <Plus size={14} /> {t('common.add')}
        </button>
      </div>

      {materialsError ? (
        <QueryErrorState compact onRetry={() => void refetchMaterials()} />
      ) : materials.length === 0 ? (
        <EmptyPanel
          icon={BookOpen}
          text={t('plan.emptyMaterials')}
          actionLabel={t('plan.emptyMaterialsAction')}
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <ListPanel className="space-y-0">
          {materials.map((material) => (
            <div key={material.id}>
              <button
                type="button"
                onClick={() => openDetail(material)}
                aria-label={t('plan.viewMaterial', { name: material.name })}
                className="w-full cursor-pointer px-4 py-3.5 text-left transition-colors hover:bg-surface-muted/50 dark:hover:bg-surface-muted-dark/50"
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {material.name}
                  </span>
                  <span className="shrink-0 text-xs whitespace-nowrap text-zinc-400">
                    {material.doneUnits}/{material.totalUnits} {material.unitLabel}
                  </span>
                </div>
                <MaterialTagBadges tags={material.tags} />
                <div className="mt-1.5">
                  <ProgressBar value={material.doneUnits} max={material.totalUnits} />
                </div>
              </button>
            </div>
          ))}
        </ListPanel>
      )}

      <Sheet
        open={detailMaterialId !== null}
        title={
          sheetMode === 'edit'
            ? t('plan.editMaterial')
            : (detailMaterial?.name ?? t('plan.materialDetail'))
        }
        onClose={closeDetail}
      >
        {detailMaterial && sheetMode === 'view' && (
          <div className="space-y-4">
            <div>
              <ProgressBar value={detailMaterial.doneUnits} max={detailMaterial.totalUnits} />
              <p className="mt-2 text-sm font-medium">
                {t('plan.materialProgress', {
                  done: detailMaterial.doneUnits,
                  total: detailMaterial.totalUnits,
                  unit: detailMaterial.unitLabel,
                })}
              </p>
              <p className="mt-1 text-xs text-zinc-400">{t('plan.materialCounterHint')}</p>
              <div className="mt-2">
                <MaterialTagBadges tags={detailMaterial.tags} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  adjustProgress.mutate({ materialId: detailMaterial.id, delta: -1 })
                }
                aria-label={t('plan.decrease', { name: detailMaterial.name })}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <Minus size={18} />
              </button>
              <button
                type="button"
                onClick={() =>
                  adjustProgress.mutate({ materialId: detailMaterial.id, delta: 1 })
                }
                aria-label={t('plan.increase', { name: detailMaterial.name })}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent-soft text-sm font-semibold text-accent transition-colors hover:bg-accent/15 dark:bg-accent-soft-dark"
              >
                <Plus size={18} /> {t('plan.logProgress')}
              </button>
            </div>

            <button
              type="button"
              onClick={startEdit}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <Pencil size={15} />
              {t('plan.editMaterial')}
            </button>

            <div>
              <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                {t('plan.materialChecklist')}
              </p>
              {hasChecklist ? (
                <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
                  {units.map((unit) => (
                    <MaterialUnitRow
                      key={unit.id}
                      material={detailMaterial}
                      unit={unit}
                      onToggle={() =>
                        toggleUnit.mutate({ unitId: unit.id, materialId: detailMaterial.id })
                      }
                    />
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-zinc-400">
                  {t('plan.materialChecklistTooMany', { max: MATERIAL_CHECKLIST_MAX })}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                {t('plan.linkedSchedule')}
              </p>
              {linkedItems.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {linkedItems.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl bg-zinc-100 px-3.5 py-2 text-sm dark:bg-zinc-800"
                    >
                      {t(`weekdays.${item.weekday}`)} · {item.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-zinc-400">{t('plan.noLinkedSchedule')}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setPendingDeleteId(detailMaterial.id)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
            >
              <Trash2 size={15} />
              {t('plan.deleteMaterialTitle')}
            </button>
          </div>
        )}

        {detailMaterial && sheetMode === 'edit' && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              const trimmed = name.trim()
              const total = Number(totalUnits)
              if (!trimmed || !Number.isFinite(total) || total <= 0) return
              updateDetails.mutate(
                {
                  materialId: detailMaterial.id,
                  name: trimmed,
                  unitLabel: unitLabel.trim() || '—',
                  totalUnits: total,
                  tags,
                },
                { onSuccess: () => setSheetMode('view') },
              )
            }}
          >
            <TextInput
              autoFocus
              placeholder={t('plan.materialName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="flex gap-3">
              <TextInput
                placeholder={t('plan.unitPlaceholder')}
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                aria-label={t('plan.unit')}
              />
              <TextInput
                type="number"
                min={1}
                placeholder={t('plan.totalPlaceholder')}
                value={totalUnits}
                onChange={(e) => setTotalUnits(e.target.value)}
                aria-label={t('plan.total')}
              />
            </div>
            <MaterialTagPicker value={tags} onChange={setTags} />
            <p className="text-xs text-zinc-400">{t('plan.materialFormHint')}</p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setSheetMode('view')}
              >
                {t('common.close')}
              </Button>
              <Button type="submit" className="flex-1">
                {t('common.save')}
              </Button>
            </div>
          </form>
        )}
      </Sheet>

      <Sheet
        open={addOpen}
        title={t('plan.addMaterial')}
        onClose={() => {
          setAddOpen(false)
          setShowTagOptions(false)
        }}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            const trimmed = name.trim()
            const total = Number(totalUnits)
            if (!trimmed || !Number.isFinite(total) || total <= 0) return
            add.mutate(
              { name: trimmed, unitLabel: unitLabel.trim() || '—', totalUnits: total, tags },
              {
                onSuccess: () => {
                  setName('')
                  setUnitLabel('')
                  setTotalUnits('10')
                  setTags([])
                  setAddOpen(false)
                },
              },
            )
          }}
        >
          <TextInput
            autoFocus
            placeholder={t('plan.materialName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex gap-3">
            <TextInput
              placeholder={t('plan.unitPlaceholder')}
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              aria-label={t('plan.unit')}
            />
            <TextInput
              type="number"
              min={1}
              placeholder={t('plan.totalPlaceholder')}
              value={totalUnits}
              onChange={(e) => setTotalUnits(e.target.value)}
              aria-label={t('plan.total')}
            />
          </div>
          {!showTagOptions ? (
            <button
              type="button"
              onClick={() => setShowTagOptions(true)}
              className="text-xs font-medium text-accent"
            >
              {t('plan.moreOptions')}
            </button>
          ) : (
            <MaterialTagPicker value={tags} onChange={setTags} />
          )}
          <p className="text-xs text-zinc-400">{t('plan.materialFormHint')}</p>
          <Button type="submit" className="w-full">
            {t('common.save')}
          </Button>
        </form>
      </Sheet>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title={t('plan.deleteMaterialTitle')}
        message={t('plan.deleteMaterialConfirm', { name: pendingMaterial?.name ?? '' })}
        confirmLabel={t('common.delete')}
        variant="danger"
        loading={remove.isPending}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (!pendingDeleteId) return
          remove.mutate(pendingDeleteId, {
            onSuccess: () => {
              setPendingDeleteId(null)
              closeDetail()
            },
          })
        }}
      />
    </section>
  )
}

/* --------------------------- Checkpoint ------------------------------ */

function CheckpointsSection({ planId }: { planId: string }) {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const { clock } = useServices()
  const {
    data: checkpoints = [],
    isError: checkpointsError,
    refetch: refetchCheckpoints,
  } = useCheckpoints(planId)
  const { add, toggle, remove } = useCheckpointMutations(planId)

  const [addOpen, setAddOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const pendingCheckpoint = checkpoints.find((c) => c.id === pendingDeleteId)

  const sorted = [...checkpoints].sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const openAdd = () => {
    setDueDate(clock.todayIso())
    setAddOpen(true)
  }

  const closeAdd = () => {
    setAddOpen(false)
    setTitle('')
    setDueDate('')
  }

  const handleToggle = (checkpoint: (typeof checkpoints)[number]) => {
    const achieving = checkpoint.status !== 'achieved'
    toggle.mutate(checkpoint, {
      onSuccess: () => {
        if (achieving) setCelebrate(true)
      },
    })
  }

  return (
    <section id="checkpoints" className="scroll-mt-6 space-y-2">
      <ConfettiBurst active={celebrate} onComplete={() => setCelebrate(false)} />
      <div className="flex items-center justify-between">
        <SectionTitle>{t('plan.checkpoints')}</SectionTitle>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent-soft dark:hover:bg-accent-soft-dark"
        >
          <Plus size={14} /> {t('common.add')}
        </button>
      </div>

      {checkpointsError ? (
        <QueryErrorState compact onRetry={() => void refetchCheckpoints()} />
      ) : sorted.length === 0 ? (
        <EmptyPanel
          icon={Flag}
          text={t('plan.emptyCheckpoints')}
          actionLabel={t('plan.emptyCheckpointsAction')}
          onAction={openAdd}
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((checkpoint) => {
            const achieved = checkpoint.status === 'achieved'
            return (
              <Card key={checkpoint.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(checkpoint)}
                  aria-label={checkpoint.title}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl py-0.5 text-left"
                >
                  <span
                    aria-hidden
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      achieved
                        ? 'border-accent bg-accent text-white'
                        : 'border-zinc-300 text-transparent dark:border-zinc-600'
                    }`}
                  >
                    <Check size={15} strokeWidth={3} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm font-medium ${achieved ? 'text-zinc-400 line-through' : ''}`}
                    >
                      {checkpoint.title}
                    </span>
                    <span className="block text-xs text-zinc-400">
                      {format(parseISO(checkpoint.dueDate), 'd MMMM yyyy', { locale })}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(checkpoint.id)}
                  aria-label={t('plan.deleteItem', { name: checkpoint.title })}
                  className="shrink-0 rounded-full p-1.5 text-zinc-300 transition-colors hover:text-red-500 dark:text-zinc-600"
                >
                  <Trash2 size={15} />
                </button>
              </Card>
            )
          })}
        </div>
      )}

      <Sheet open={addOpen} title={t('plan.addCheckpoint')} onClose={closeAdd}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            const trimmed = title.trim()
            if (!trimmed || !dueDate) return
            add.mutate(
              { title: trimmed, dueDate },
              {
                onSuccess: () => {
                  closeAdd()
                },
              },
            )
          }}
        >
          <TextInput
            autoFocus
            placeholder={t('plan.checkpointPlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <DatePicker value={dueDate} onChange={setDueDate} />
          <Button type="submit" className="w-full">
            {t('common.save')}
          </Button>
        </form>
      </Sheet>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title={t('plan.deleteCheckpointTitle')}
        message={t('plan.deleteCheckpointConfirm', { name: pendingCheckpoint?.title ?? '' })}
        confirmLabel={t('common.delete')}
        variant="danger"
        loading={remove.isPending}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (!pendingDeleteId) return
          remove.mutate(pendingDeleteId, { onSuccess: () => setPendingDeleteId(null) })
        }}
      />
    </section>
  )
}
