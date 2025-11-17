import { getLLMText, source } from '@/lib/source'

export const revalidate = false

export async function GET() {
  const languages = source.getLanguages()
  const pages = languages.length ? languages.flatMap((entry) => entry.pages) : source.getPages()
  const scan = pages.map(getLLMText)
  const scanned = await Promise.all(scan)

  return new Response(scanned.join('\n\n'))
}
