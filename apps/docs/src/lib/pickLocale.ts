import { i18n } from '@/lib/i18n'

export function pickLocale(request: Request): string {
  const acceptLanguage = request.headers.get('accept-language') ?? ''
  const candidates = acceptLanguage
    .split(',')
    .map((part) => part.trim().split(';')[0])
    .filter(Boolean)
    .map((tag) => tag.toLowerCase())

  for (const tag of candidates) {
    if (tag === 'zh' || tag.startsWith('zh-')) return 'zh'
    if (tag === 'en' || tag.startsWith('en-')) return 'en'
  }

  return i18n.defaultLanguage
}
