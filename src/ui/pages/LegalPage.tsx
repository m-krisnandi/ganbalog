import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../components/primitives'

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function LegalPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const privacyPoints = t('legal.privacyPoints', { returnObjects: true }) as string[]
  const termsPoints = t('legal.termsPoints', { returnObjects: true }) as string[]

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pt-safe pb-12">
      <div className="sticky top-0 z-10 -mx-4 bg-surface/95 px-4 py-3 backdrop-blur-md dark:bg-surface-dark/95">
        <Button variant="ghost" className="h-9 px-2" onClick={() => navigate(-1)}>
          <span className="inline-flex items-center gap-1.5 text-sm">
            <ArrowLeft size={16} />
            {t('legal.back')}
          </span>
        </Button>
      </div>

      <header className="mt-2">
        <h1 className="text-2xl font-bold tracking-tight">{t('legal.title')}</h1>
        <p className="mt-1 text-xs text-zinc-400">{t('legal.lastUpdated')}</p>
      </header>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{t('legal.privacyTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {t('legal.privacyIntro')}
        </p>
        <BulletList items={privacyPoints} />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">{t('legal.termsTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {t('legal.termsIntro')}
        </p>
        <BulletList items={termsPoints} />
      </section>

      <p className="mt-10 text-center text-xs text-zinc-400">
        <Link to="/" className="text-accent underline-offset-2 hover:underline">
          GanbaLog
        </Link>
      </p>
    </div>
  )
}
