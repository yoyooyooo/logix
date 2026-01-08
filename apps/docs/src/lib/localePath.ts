import { i18n } from '@/lib/i18n'

export function withLocalePrefix(locale: string, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const hideDefault = i18n.hideLocale === 'default-locale' && locale === i18n.defaultLanguage
  if (hideDefault) return normalized
  return `/${locale}${normalized}`
}

