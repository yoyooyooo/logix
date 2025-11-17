import type { AnyModuleShape, ModuleImpl } from '../runtime/core/module.js'
import { stableStringify, fnv1a32 } from '../digest.js'
import { isJsonValue, type JsonValue } from '../observability/jsonValue.js'
import { exportStaticIr } from './staticIr.js'

export interface ManifestBudgets {
  readonly maxBytes?: number
}

export interface ExtractManifestOptions {
  readonly includeStaticIr?: boolean
  readonly budgets?: ManifestBudgets
}

export interface ModuleManifestLogicUnit {
  readonly kind: string
  readonly id: string
  readonly derived?: boolean
  readonly name?: string
}

export interface ModuleManifest {
  readonly manifestVersion: string
  readonly moduleId: string
  readonly actionKeys: ReadonlyArray<string>
  readonly schemaKeys?: ReadonlyArray<string>
  readonly logicUnits?: ReadonlyArray<ModuleManifestLogicUnit>
  readonly source?: {
    readonly file: string
    readonly line: number
    readonly column: number
  }
  readonly meta?: Record<string, JsonValue>
  readonly staticIr?: ReturnType<typeof exportStaticIr>
  readonly digest: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isModuleImpl = (value: unknown): value is ModuleImpl<any, AnyModuleShape, any> =>
  isRecord(value) && value._tag === 'ModuleImpl' && isRecord(value.module)

const resolveModuleId = (input: unknown): string => {
  if (isModuleImpl(input)) {
    const id = (input.module as any).id
    return typeof id === 'string' && id.length > 0 ? id : 'unknown'
  }

  if (isRecord(input)) {
    const id = input.id
    if (typeof id === 'string' && id.length > 0) return id
    const tag = (input as any).tag
    if (tag && (typeof tag === 'object' || typeof tag === 'function')) {
      const tagId = (tag as any).id
      if (typeof tagId === 'string' && tagId.length > 0) return tagId
    }
  }

  return 'unknown'
}

const resolveActionKeys = (input: unknown): ReadonlyArray<string> => {
  const tag = isModuleImpl(input) ? (input.module as any) : (input as any)?.tag
  const actionMap = tag?.shape?.actionMap
  if (!isRecord(actionMap)) return []
  return Object.keys(actionMap).sort()
}

const resolveSchemaKeys = (input: unknown): ReadonlyArray<string> | undefined => {
  if (!isRecord(input)) return undefined
  const schemas = (input as any).schemas
  if (!isRecord(schemas)) return undefined
  return Object.keys(schemas).sort()
}

const resolveSource = (input: unknown): ModuleManifest['source'] | undefined => {
  if (!isRecord(input)) return undefined
  const dev = (input as any).dev
  const source = dev?.source
  if (!isRecord(source)) return undefined
  const file = source.file
  const line = source.line
  const column = source.column
  if (typeof file !== 'string' || file.length === 0) return undefined
  if (typeof line !== 'number' || !Number.isInteger(line) || line < 1) return undefined
  if (typeof column !== 'number' || !Number.isInteger(column) || column < 1) return undefined
  return { file, line, column }
}

const resolveMeta = (input: unknown): Record<string, JsonValue> | undefined => {
  if (!isRecord(input)) return undefined
  const meta = (input as any).meta
  if (!isRecord(meta)) return undefined

  const out: Record<string, JsonValue> = {}
  for (const key of Object.keys(meta).sort()) {
    const value = meta[key]
    if (isJsonValue(value)) {
      out[key] = value
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

const MODULE_INTERNAL = Symbol.for('logix.module.internal')

const resolveLogicUnits = (input: unknown): ReadonlyArray<ModuleManifestLogicUnit> | undefined => {
  if (!isRecord(input)) return undefined
  const internal = (input as any)[MODULE_INTERNAL]
  const mounted = internal?.mounted
  if (!Array.isArray(mounted)) return undefined

  const out: Array<ModuleManifestLogicUnit> = []
  for (const unit of mounted) {
    if (!isRecord(unit)) continue
    const kind = unit.kind
    const id = unit.id
    if (typeof kind !== 'string' || kind.length === 0) continue
    if (typeof id !== 'string' || id.length === 0) continue

    const derived = unit.derived === true ? true : undefined
    const name = typeof unit.name === 'string' ? unit.name : undefined
    out.push({ kind, id, derived, name })
  }

  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.kind.localeCompare(b.kind)))
  return out.length > 0 ? out : undefined
}

type DigestBase = {
  readonly manifestVersion: string
  readonly moduleId: string
  readonly actionKeys: ReadonlyArray<string>
  readonly schemaKeys?: ReadonlyArray<string>
  readonly logicUnits?: ReadonlyArray<ModuleManifestLogicUnit>
  readonly staticIrDigest?: string
}

const digestOf = (base: DigestBase): string => `manifest:025:${fnv1a32(stableStringify(base))}`

const utf8ByteLength = (value: unknown): number => {
  const json = JSON.stringify(value)
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(json).length
  }
  return json.length
}

const applyMaxBytes = (manifest: ModuleManifest, maxBytes: number): ModuleManifest => {
  const originalBytes = utf8ByteLength(manifest)
  if (originalBytes <= maxBytes) return manifest

  const dropped: Array<string> = []
  const truncatedArrays: Array<string> = []

  const baseMarker = (): JsonValue => ({
    truncated: true,
    maxBytes,
    originalBytes,
    dropped,
    truncatedArrays,
  })

  const withMarker = (next: ModuleManifest): ModuleManifest => {
    const meta: Record<string, JsonValue> = {
      __logix: baseMarker(),
    }
    return { ...next, meta }
  }

  let next: ModuleManifest = withMarker(manifest)

  const dropField = (field: keyof ModuleManifest): void => {
    if ((next as any)[field] !== undefined) {
      dropped.push(String(field))
      next = withMarker({ ...(next as any), [field]: undefined })
    }
  }

  // Deterministic trimming order (least valuable first).
  dropField('meta')
  if (utf8ByteLength(next) <= maxBytes) return next

  dropField('source')
  if (utf8ByteLength(next) <= maxBytes) return next

  dropField('staticIr')
  if (utf8ByteLength(next) <= maxBytes) return next

  dropField('logicUnits')
  if (utf8ByteLength(next) <= maxBytes) return next

  dropField('schemaKeys')
  if (utf8ByteLength(next) <= maxBytes) return next

  // Last resort: truncate actionKeys (still deterministic, but signals truncation).
  while (utf8ByteLength(next) > maxBytes && next.actionKeys.length > 1) {
    truncatedArrays.push('actionKeys')
    next = withMarker({
      ...next,
      actionKeys: next.actionKeys.slice(0, Math.ceil(next.actionKeys.length / 2)),
    })
  }

  return next
}

export const extractManifest = (module: unknown, options?: ExtractManifestOptions): ModuleManifest => {
  const manifestVersion = '025'
  const moduleId = resolveModuleId(module)
  const actionKeys = resolveActionKeys(module)

  const schemaKeys = resolveSchemaKeys(module)
  const logicUnits = resolveLogicUnits(module)
  const source = resolveSource(module)
  const meta = resolveMeta(module)

  const staticIr = options?.includeStaticIr ? exportStaticIr(module) : undefined

  const digestBase: DigestBase = {
    manifestVersion,
    moduleId,
    actionKeys,
    schemaKeys,
    logicUnits,
    staticIrDigest: staticIr?.digest,
  }

  const digest = digestOf(digestBase)

  const manifest: ModuleManifest = {
    manifestVersion,
    moduleId,
    actionKeys,
    schemaKeys,
    logicUnits,
    source,
    meta,
    staticIr,
    digest,
  }

  const maxBytes = options?.budgets?.maxBytes
  if (typeof maxBytes === 'number' && Number.isFinite(maxBytes) && maxBytes > 0) {
    return applyMaxBytes(manifest, maxBytes)
  }

  return manifest
}
