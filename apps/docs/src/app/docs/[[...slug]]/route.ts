import { pickLocale } from '@/lib/pickLocale'

export async function GET(request: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const locale = pickLocale(request)
  const { slug = [] } = await params
  const path = slug.length ? `/${locale}/docs/${slug.join('/')}` : `/${locale}/docs`
  return Response.redirect(new URL(path, request.url))
}
