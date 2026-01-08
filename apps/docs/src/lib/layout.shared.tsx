import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { i18n } from '@/lib/i18n'
import { brandFont } from '@/lib/brandFont'

export function baseOptions(locale: string): BaseLayoutProps {
  const hideDefault = i18n.hideLocale === 'default-locale' && locale === i18n.defaultLanguage
  return {
    i18n,
    nav: {
      title: <span className={`${brandFont.className} font-semibold tracking-tight`}>Logix</span>,
      url: hideDefault ? '/' : `/${locale}`,
    },
  }
}
