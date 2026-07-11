import { useTranslation } from 'react-i18next'
import {
  MATERIAL_TAG_IDS,
  type MaterialTagId,
  normalizeMaterialTags,
} from '../../domain/material-tags'

export function MaterialTagPicker({
  value,
  onChange,
  compact = false,
}: {
  value: readonly string[]
  onChange: (tags: MaterialTagId[]) => void
  compact?: boolean
}) {
  const { t } = useTranslation()
  const selected = new Set(normalizeMaterialTags(value))

  const toggle = (tag: MaterialTagId) => {
    const next = new Set(selected)
    if (next.has(tag)) next.delete(tag)
    else next.add(tag)
    onChange([...next])
  }

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      {!compact && (
        <p className="px-0.5 text-xs text-zinc-400">{t('plan.materialTagsLabel')}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {MATERIAL_TAG_IDS.map((tag) => {
          const active = selected.has(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              aria-pressed={active}
              className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                active
                  ? 'bg-accent text-white'
                  : 'bg-surface-muted text-zinc-500 hover:bg-zinc-200 dark:bg-surface-muted-dark dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              {t(`materialTags.${tag}`)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function MaterialTagBadges({ tags }: { tags: readonly string[] }) {
  const { t } = useTranslation()
  const normalized = normalizeMaterialTags(tags)
  if (!normalized.length) return null

  return (
    <div className="flex flex-wrap gap-1">
      {normalized.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent dark:bg-accent-soft-dark"
        >
          {t(`materialTags.${tag}`)}
        </span>
      ))}
    </div>
  )
}
