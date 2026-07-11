import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { ListPanel, SectionTitle } from '../../components/primitives'

const FAQ_KEYS = ['tasks', 'reviews', 'groups', 'offline', 'excel'] as const

export function HelpSection() {
  const { t } = useTranslation()
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <section className="space-y-2">
      <SectionTitle>{t('settings.sectionHelp')}</SectionTitle>
      <ListPanel>
        {FAQ_KEYS.map((id) => {
          const expanded = openId === id
          return (
            <div key={id}>
              <button
                type="button"
                onClick={() => setOpenId(expanded ? null : id)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <span className="min-w-0 flex-1 text-sm font-medium">{t(`help.faq.${id}.q`)}</span>
                <ChevronDown
                  size={17}
                  className={`shrink-0 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
              {expanded && (
                <p className="px-4 pb-3.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {t(`help.faq.${id}.a`)}
                </p>
              )}
            </div>
          )
        })}
      </ListPanel>
    </section>
  )
}
