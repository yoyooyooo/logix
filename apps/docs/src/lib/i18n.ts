import { defineI18n } from 'fumadocs-core/i18n'

export const i18n = defineI18n({
  languages: ['zh', 'en'],
  defaultLanguage: 'zh',
  fallbackLanguage: 'zh',
  hideLocale: 'never',
  parser: 'dot',
})
