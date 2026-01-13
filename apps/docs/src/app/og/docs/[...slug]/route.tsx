import { getPageImage, source } from '@/lib/source'
import { notFound } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { generate as DefaultImage } from 'fumadocs-ui/og'

export const revalidate = false

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const withoutExt = slug.slice(0, -1)
  const lang = withoutExt[0]
  const slugs = withoutExt.slice(1)
  if (!lang) notFound()

  const page = source.getPage(slugs, lang)
  if (!page) notFound()

  return new ImageResponse(<DefaultImage title={page.data.title} description={page.data.description} site="Logix" />, {
    width: 1200,
    height: 630,
  })
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    slug: getPageImage(page).segments,
  }))
}
