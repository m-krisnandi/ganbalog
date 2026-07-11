import { useTranslation } from 'react-i18next'
import type { StudyTemplateId } from '../../data/study-templates'
import {
  TEMPLATE_GROUPS,
  TEMPLATE_I18N_SLUG,
  getStudyTemplate,
} from '../../data/study-templates'
import { TodayPreview } from './TodayPreview'

export type SamplePlanMode = 'blank' | 'template'

function TemplateGrid({
  templateId,
  onTemplateIdChange,
}: {
  templateId: StudyTemplateId
  onTemplateIdChange: (id: StudyTemplateId) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      {TEMPLATE_GROUPS.map((group) => (
        <div key={group.labelKey}>
          <p className="mb-1.5 px-0.5 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
            {t(group.labelKey)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {group.ids.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onTemplateIdChange(id)}
                aria-pressed={templateId === id}
                className={`cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  templateId === id
                    ? 'border-accent ring-1 ring-accent/30 dark:ring-accent/20'
                    : 'border-border-subtle bg-surface-muted dark:border-border-subtle-dark dark:bg-surface-muted-dark'
                }`}
              >
                <p className="text-sm font-semibold">
                  {t(`templates.${TEMPLATE_I18N_SLUG[id]}.title`)}
                </p>
                <p className="mt-0.5 text-[10px] text-zinc-400">
                  {t(`templates.${TEMPLATE_I18N_SLUG[id]}.hint`)}
                </p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function SamplePlanPicker({
  mode,
  templateId,
  onModeChange,
  onTemplateIdChange,
  showPreview = true,
  compact = false,
}: {
  mode: SamplePlanMode
  templateId: StudyTemplateId
  onModeChange: (mode: SamplePlanMode) => void
  onTemplateIdChange: (id: StudyTemplateId) => void
  showPreview?: boolean
  compact?: boolean
}) {
  const { t } = useTranslation()

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        <button
          type="button"
          onClick={() => onModeChange('blank')}
          aria-pressed={mode === 'blank'}
          className={`cursor-pointer rounded-2xl border px-4 py-3.5 text-left transition-colors ${
            mode === 'blank'
              ? 'border-accent bg-accent-soft ring-1 ring-accent/25 dark:bg-accent-soft-dark dark:ring-accent/20'
              : 'border-border-subtle bg-surface-raised dark:border-border-subtle-dark dark:bg-surface-raised-dark'
          }`}
        >
          <p className="text-sm font-semibold">{t('onboarding.blankTitle')}</p>
          <p className="mt-1 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
            {t('onboarding.blankHint')}
          </p>
          {mode === 'blank' && (
            <p className="mt-2 text-[10px] font-medium text-accent">{t('onboarding.blankRecommended')}</p>
          )}
        </button>

        <button
          type="button"
          onClick={() => onModeChange('template')}
          aria-pressed={mode === 'template'}
          className={`cursor-pointer rounded-2xl border px-4 py-3 text-left transition-colors ${
            mode === 'template'
              ? 'border-accent bg-accent-soft dark:bg-accent-soft-dark'
              : 'border-border-subtle bg-surface-muted/60 dark:border-border-subtle-dark dark:bg-surface-muted-dark/60'
          }`}
        >
          <p className="text-sm font-semibold">{t('onboarding.sampleTitle')}</p>
          <p className="mt-1 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
            {t('onboarding.sampleHint')}
          </p>
        </button>
      </div>

      {mode === 'template' && (
        <div>
          <p className="mb-2 px-0.5 text-xs font-medium text-zinc-400">
            {t('onboarding.templatePickLabel')}
          </p>
          <TemplateGrid templateId={templateId} onTemplateIdChange={onTemplateIdChange} />
        </div>
      )}

      {showPreview && (
        <div>
          <p className="mb-2 px-0.5 text-xs font-medium text-zinc-400">
            {t('onboarding.previewLabel')}
          </p>
          <TodayPreview
            variant={mode === 'template' ? 'template' : 'blank'}
            templateId={templateId}
          />
        </div>
      )}
    </div>
  )
}

export function TemplateSummary({ templateId }: { templateId: StudyTemplateId }) {
  const { t } = useTranslation()
  const tmpl = getStudyTemplate(templateId)
  const slug = TEMPLATE_I18N_SLUG[templateId]

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-muted px-4 py-3 text-sm dark:border-border-subtle-dark dark:bg-surface-muted-dark">
      <p className="font-medium">{t(`templates.${slug}.title`)}</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {t(`templates.${slug}.description`)}
      </p>
      <ul className="mt-2 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        <li>
          · {t('onboarding.templatePreviewMaterials', { count: tmpl.materials.length })}
        </li>
        <li>· {t('onboarding.templatePreviewWeekly')}</li>
        <li>
          · {t('onboarding.templatePreviewCheckpoints', { count: tmpl.checkpoints.length })}
        </li>
      </ul>
    </div>
  )
}

export { TemplateGrid }
