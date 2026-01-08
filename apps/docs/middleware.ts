import { createI18nMiddleware } from 'fumadocs-core/i18n/middleware'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { i18n } from '@/lib/i18n'

const i18nMiddleware = createI18nMiddleware(i18n)

type Locale = (typeof i18n.languages)[number]

function withDefaultLocalePath(pathname: string): string {
  if (pathname === '/') return `/${i18n.defaultLanguage}`
  return `/${i18n.defaultLanguage}${pathname}`
}

function isLocale(value: string | undefined): value is Locale {
  return value != null && (i18n.languages as readonly string[]).includes(value)
}

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl

  // Keep non-i18n routes stable (e.g. static API reference redirect).
  if (pathname.startsWith('/api-reference')) {
    return NextResponse.next()
  }

  const firstSegment = pathname.split('/')[1]
  if (isLocale(firstSegment)) {
    return i18nMiddleware(request, event)
  }

  // Public URLs hide default locale prefix. Internally, route tree is `/[lang]/*`,
  // so we rewrite unprefixed paths to `/${defaultLanguage}/*` for correct matching.
  const url = request.nextUrl.clone()
  url.pathname = withDefaultLocalePath(pathname)
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/', '/((?!api|_next|og|llms-full\\.txt|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)'],
}
