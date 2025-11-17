export type PortAddress =
  | { readonly kind: 'action' | 'event' | 'output'; readonly key: string }
  | { readonly kind: 'export'; readonly path: string }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeText = (value: string | undefined): string | undefined => {
  const raw = typeof value === 'string' ? value.trim() : ''
  return raw.length > 0 ? raw : undefined
}

export const normalizePortAddress = (input: unknown): PortAddress | undefined => {
  if (!isRecord(input)) return undefined
  const kind = normalizeText((input as any).kind)
  if (!kind) return undefined

  if (kind === 'export') {
    const path = normalizeText((input as any).path)
    return path ? { kind: 'export', path } : undefined
  }

  if (kind === 'action' || kind === 'event' || kind === 'output') {
    const key = normalizeText((input as any).key)
    return key ? { kind, key } : undefined
  }

  return undefined
}

export const formatPortAddress = (address: PortAddress): string =>
  address.kind === 'export' ? `export:${address.path}` : `${address.kind}:${address.key}`

export const parsePortAddress = (input: string): PortAddress | undefined => {
  const raw = typeof input === 'string' ? input.trim() : ''
  if (!raw) return undefined

  const idx = raw.indexOf(':')
  if (idx <= 0) return undefined

  const kind = raw.slice(0, idx).trim()
  const value = raw.slice(idx + 1).trim()
  if (!value) return undefined

  if (kind === 'export') return { kind: 'export', path: value }
  if (kind === 'action' || kind === 'event' || kind === 'output') {
    return { kind, key: value }
  }
  return undefined
}
