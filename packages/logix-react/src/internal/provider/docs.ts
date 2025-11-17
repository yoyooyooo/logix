const LOGIX_DOCS_PREFIX_ENV = 'LOGIX_DOCS_PREFIX'

const stripTrailingSlashes = (value: string): string => value.replace(/\/+$/, '')

const ensureLeadingSlash = (value: string): string => (value.startsWith('/') ? value : `/${value}`)

const getProcessEnvString = (key: string): string | undefined => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (globalThis as any)?.process?.env as Record<string, unknown> | undefined
    const value = env?.[key]
    return typeof value === 'string' ? value : undefined
  } catch {
    return undefined
  }
}

const getLocationOrigin = (): string | undefined => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const origin = (globalThis as any)?.location?.origin
    return typeof origin === 'string' && origin.length > 0 ? origin : undefined
  } catch {
    return undefined
  }
}

const getDocsRootPrefix = (): string | undefined => {
  const raw = getProcessEnvString(LOGIX_DOCS_PREFIX_ENV)
  const fromEnv = raw ? stripTrailingSlashes(raw.trim()) : undefined
  if (fromEnv && fromEnv.length > 0) {
    if (/^https?:\/\//i.test(fromEnv)) {
      return fromEnv
    }
    const origin = getLocationOrigin()
    if (origin) {
      return stripTrailingSlashes(`${origin}${ensureLeadingSlash(fromEnv)}`)
    }
    return fromEnv
  }

  const origin = getLocationOrigin()
  return origin ? `${origin}/zh/docs` : undefined
}

export const resolveLogixDocsUrl = (docsPath: string): string => {
  const docsRoot = getDocsRootPrefix()
  const path = ensureLeadingSlash(docsPath)
  if (docsRoot) {
    return `${stripTrailingSlashes(docsRoot)}${path}`
  }
  return path
}

export const getFallbackWarningDocsUrl = (): string => resolveLogixDocsUrl('/guide/essentials/react-integration')

export const getFallbackWarningDocsPrefixEnv = (): string => LOGIX_DOCS_PREFIX_ENV
