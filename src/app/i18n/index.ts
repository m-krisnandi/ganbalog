import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { enUS, id as dateFnsId, ja as dateFnsJa, type Locale } from 'date-fns/locale'
import { en } from './en'
import { id } from './id'
import { ja } from './ja'
import { my } from './my'

const STORAGE_KEY = 'ganbalog-lang'

export type AppLanguage = 'en' | 'id' | 'my' | 'ja'

export const LANGUAGES: Array<{ code: AppLanguage; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'my', label: 'မြန်မာ' },
  { code: 'ja', label: '日本語' },
]

function storedLanguage(): AppLanguage {
  const value = localStorage.getItem(STORAGE_KEY)
  return value === 'id' || value === 'my' || value === 'ja' ? value : 'en'
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    id: { translation: id },
    my: { translation: my },
    ja: { translation: ja },
  },
  lng: storedLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lang) => {
  localStorage.setItem(STORAGE_KEY, lang)
  document.documentElement.lang = lang
})

document.documentElement.lang = i18n.language

/** Locale date-fns mengikuti bahasa UI (Burmese belum ada di date-fns → fallback en). */
export function dateLocale(lang: string): Locale {
  if (lang === 'id') return dateFnsId
  if (lang === 'ja') return dateFnsJa
  return enUS
}

export default i18n
