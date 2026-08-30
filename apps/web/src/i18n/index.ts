import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { ru } from './ru'
import { uz } from './uz'
import { en } from './en'

export const LOCALES = ['ru', 'uz', 'en'] as const
export type Locale = (typeof LOCALES)[number]

const STORAGE_KEY = 'sellerhub.locale'

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && (LOCALES as readonly string[]).includes(saved)) return saved as Locale
  } catch {
    // приватный режим или заблокированное хранилище — берём язык по умолчанию
  }
  const browser = navigator.language.slice(0, 2)
  return (LOCALES as readonly string[]).includes(browser) ? (browser as Locale) : 'ru'
}

void i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    uz: { translation: uz },
    en: { translation: en },
  },
  lng: initialLocale(),
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
})

export function setLocale(locale: Locale) {
  void i18n.changeLanguage(locale)
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // не смогли запомнить — не беда, язык переключился на эту сессию
  }
  document.documentElement.lang = locale
}

export default i18n
