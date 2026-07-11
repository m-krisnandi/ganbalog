import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { enUS, id as dateFnsId, ja as dateFnsJa, type Locale } from 'date-fns/locale'

const STORAGE_KEY = 'ganbalog-lang'

export type AppLanguage = 'en' | 'id' | 'my' | 'ja'

export const LANGUAGES: Array<{ code: AppLanguage; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'my', label: 'မြန်မာ' },
  { code: 'ja', label: '日本語' },
]

const translationLoaders: Record<AppLanguage, () => Promise<object>> = {
  en: () => import('./en').then((m) => m.en),
  id: () => import('./id').then((m) => m.id),
  ja: () => import('./ja').then((m) => m.ja),
  my: () => import('./my').then((m) => m.my),
}

function storedLanguage(): AppLanguage {
  const value = localStorage.getItem(STORAGE_KEY)
  return value === 'id' || value === 'my' || value === 'ja' ? value : 'en'
}

function applyLanguageSideEffects(lang: string) {
  localStorage.setItem(STORAGE_KEY, lang)
  document.documentElement.lang = lang
  document.title = i18n.t('app.documentTitle')
}

let initPromise: Promise<void> | null = null

export function initI18n(): Promise<void> {
  if (initPromise) return initPromise

  initPromise = (async () => {
    const lng = storedLanguage()
    const translation = await translationLoaders[lng]()
    const resources: Record<string, { translation: object }> = {
      [lng]: { translation },
    }
    if (lng !== 'en') {
      resources.en = { translation: await translationLoaders.en() }
    }

    await i18n.use(initReactI18next).init({
      resources,
      lng,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    })
    applyLanguageSideEffects(i18n.language)
  })()

  return initPromise
}

i18n.on('languageChanged', (lang) => {
  void (async () => {
    const code = lang as AppLanguage
    if (!i18n.hasResourceBundle(code, 'translation') && code in translationLoaders) {
      const translation = await translationLoaders[code]()
      i18n.addResourceBundle(code, 'translation', translation, true, true)
    }
    applyLanguageSideEffects(lang)
  })()
})

/** Locale date-fns mengikuti bahasa UI (Burmese belum ada di date-fns → fallback en). */
export function dateLocale(lang: string): Locale {
  if (lang === 'id') return dateFnsId
  if (lang === 'ja') return dateFnsJa
  return enUS
}

export default i18n
