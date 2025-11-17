import * as collections from 'fumadocs-mdx:collections/server'
import { type InferPageType, loader } from 'fumadocs-core/source'
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons'
import { i18n } from '@/lib/i18n'

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  // @ts-expect-error fumadocs loader i18n typing mismatch (runtime is correct)
  i18n,
  source: collections.docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
  url(slugs, locale) {
    const lang = locale ?? i18n.defaultLanguage
    return '/' + [lang, 'docs', ...(slugs ?? [])].join('/')
  },
})

export function getPageImage(page: InferPageType<typeof source>) {
  const lang = page.locale ?? i18n.defaultLanguage
  const segments = [lang, ...page.slugs, 'image.png']

  return {
    segments,
    url: `/og/docs/${segments.join('/')}`,
  }
}

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await (page.data as any).getText('processed')

  return `# ${page.data.title}

${processed}`
}
