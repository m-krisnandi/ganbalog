import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useLocation, useSearchParams } from 'react-router'
import { Check, Minus, Pencil, Plus, Trash2, BookOpen, Flag, Sprout } from 'lucide-react'
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
import { Button, Card, EmptyState, SectionTitle, TextInput } from '../components/primitives'
import { NoPlanEmptyState } from '../components/NoPlanEmptyState'
import { DatePicker } from '../components/DatePicker'
import { ProgressBar } from '../components/ProgressBar'
import { Sheet } from '../components/Sheet'

const DAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7]

export function PlanPage() {
  const { i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const { data: plan } = useActivePlan()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const materialIdFromUrl = searchParams.get('material')

  const clearMaterialParam = () => {
    if (!searchParams.has('material')) return
    const next = new URLSearchParams(searchParams)
    next.delete('material')
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    if (!plan) return

    const scrollTo = (id: string, clearHash: boolean) => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (clearHash) {
        history.replaceState(null, '', `${location.pathname}${location.search}`)
      }
    }

    const timer = window.setTimeout(() => {
      if (location.hash === '#checkpoints') {
        scrollTo('checkpoints', true)
      } else if (materialIdFromUrl) {
        scrollTo('materials', false)
      }
    }, 50)

    return () => window.clearTimeout(timer)
  }, [location.hash, location.pathname, location.search, materialIdFromUrl, plan])

  if (!plan) {
    return <NoPlanEmptyState icon={Sprout} />
  }

  return (
    <div className="space-y-8 pt-6">
      <header className="px-1">
        <h1 className="text-xl font-bold">{plan.name}</h1>
        <p className="mt-0.5 text-sm text-zinc-400">
          {format(parseISO(plan.startDate), 'd MMM yyyy', { locale })} →{' '}
          {format(parseISO(plan.targetDate), 'd MMM yyyy', { locale })}
        </p>
      </header>

      <WeeklySchedule planId={plan.id} />
      <MaterialsSection
        planId={plan.id}
        initialMaterialId={materialIdFromUrl}
        onMaterialDetailClose={clearMaterialParam}
      />
      <CheckpointsSection planId={plan.id} />
    </div>
  )
}

/* ------------------------- Jadwal mingguan --------------------------- */

function WeeklySchedule({ planId }: { planId: string }) {
  const { t } = useTranslation()
  const { data: items = [] } = useSchedule(planId)
  const { data: materials = [] } = useMaterials(planId)
  const { add, remove } = useScheduleMutations(planId)

  const [editDay, setEditDay] = useState<Weekday | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newMaterialId, setNewMaterialId] = useState<string>('')

  const dayName = (day: Weekday) => t(`weekdays.${day}`)

  return (
    <section className="space-y-2">
      <SectionTitle>{t('plan.weekly')}</SectionTitle>
      <div className="space-y-2">
        {DAYS.map((day) => {
          const dayItems = items.filter((i) => i.weekday === day)
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
                  {dayItems.map((i) => i.title).join(' · ')}
                </p>
              )}
            </button>
          )
        })}
      </div>

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
                      onClick={() => remove.mutate(item.id)}
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
  const { data: materials = [] } = useMaterials(planId)
  const { data: schedule = [] } = useSchedule(planId)
  const { add, updateDetails, adjustProgress, toggleUnit, remove } = useMaterialMutations(planId)

  const [addOpen, setAddOpen] = useState(false)
  const [detailMaterialId, setDetailMaterialId] = useState<string | null>(null)
  const [sheetMode, setSheetMode] = useState<'view' | 'edit'>('view')
  const [name, setName] = useState('')
  const [unitLabel, setUnitLabel] = useState('')
  const [totalUnits, setTotalUnits] = useState('10')

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
    if (!initialMaterialId) return
    const material = materials.find((item) => item.id === initialMaterialId)
    if (!material) return
    setDetailMaterialId(material.id)
    setSheetMode('view')
  }, [initialMaterialId, materials])

  const startEdit = () => {
    if (!detailMaterial) return
    setName(detailMaterial.name)
    setUnitLabel(detailMaterial.unitLabel)
    setTotalUnits(String(detailMaterial.totalUnits))
    setSheetMode('edit')
  }

  useEffect(() => {
    if (sheetMode === 'edit' && detailMaterial) {
      setName(detailMaterial.name)
      setUnitLabel(detailMaterial.unitLabel)
      setTotalUnits(String(detailMaterial.totalUnits))
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

      {materials.length === 0 ? (
        <EmptyState icon={BookOpen} text={t('plan.emptyMaterials')} />
      ) : (
        <div className="space-y-2">
          {materials.map((material) => (
            <Card key={material.id}>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => openDetail(material)}
                  aria-label={t('plan.viewMaterial', { name: material.name })}
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium transition-colors hover:text-accent"
                >
                  {material.name}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustProgress.mutate({ materialId: material.id, delta: -1 })}
                    aria-label={t('plan.decrease', { name: material.name })}
                    className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Minus size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustProgress.mutate({ materialId: material.id, delta: 1 })}
                    aria-label={t('plan.increase', { name: material.name })}
                    className="rounded-full p-1.5 text-accent transition-colors hover:bg-accent-soft dark:hover:bg-accent-soft-dark"
                  >
                    <Plus size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(material.id)}
                    aria-label={t('plan.deleteItem', { name: material.name })}
                    className="rounded-full p-1.5 text-zinc-300 transition-colors hover:text-red-500 dark:text-zinc-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openDetail(material)}
                className="mt-2 flex w-full items-center gap-3 text-left"
                aria-label={t('plan.viewMaterial', { name: material.name })}
              >
                <ProgressBar value={material.doneUnits} max={material.totalUnits} />
                <span className="shrink-0 text-xs whitespace-nowrap text-zinc-400">
                  {material.doneUnits}/{material.totalUnits} {material.unitLabel}
                </span>
              </button>
            </Card>
          ))}
        </div>
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

      <Sheet open={addOpen} title={t('plan.addMaterial')} onClose={() => setAddOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            const trimmed = name.trim()
            const total = Number(totalUnits)
            if (!trimmed || !Number.isFinite(total) || total <= 0) return
            add.mutate(
              { name: trimmed, unitLabel: unitLabel.trim() || '—', totalUnits: total },
              {
                onSuccess: () => {
                  setName('')
                  setUnitLabel('')
                  setTotalUnits('10')
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
          <p className="text-xs text-zinc-400">{t('plan.materialFormHint')}</p>
          <Button type="submit" className="w-full">
            {t('common.save')}
          </Button>
        </form>
      </Sheet>
    </section>
  )
}

/* --------------------------- Checkpoint ------------------------------ */

function CheckpointsSection({ planId }: { planId: string }) {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const { clock } = useServices()
  const { data: checkpoints = [] } = useCheckpoints(planId)
  const { add, toggle, remove } = useCheckpointMutations(planId)

  const [addOpen, setAddOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')

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

  return (
    <section id="checkpoints" className="scroll-mt-6 space-y-2">
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

      {sorted.length === 0 ? (
        <EmptyState icon={Flag} text={t('plan.emptyCheckpoints')} />
      ) : (
        <div className="space-y-2">
          {sorted.map((checkpoint) => {
            const achieved = checkpoint.status === 'achieved'
            return (
              <Card key={checkpoint.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle.mutate(checkpoint)}
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
                  onClick={() => remove.mutate(checkpoint.id)}
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
    </section>
  )
}
