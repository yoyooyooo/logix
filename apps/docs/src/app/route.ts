import { pickLocale } from '@/lib/pickLocale'

export function GET(request: Request) {
  const locale = pickLocale(request)
  return Response.redirect(new URL(`/${locale}`, request.url))
}
