import { Schema } from 'effect'
import type { AnyModuleShape, ModuleImpl } from '../runtime/core/module.js'
import * as Action from '../action.js'
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

export interface ModuleManifestAction {
  readonly actionTag: string
  readonly payload: {
    readonly kind: 'void' | 'nonVoid' | 'unknown'
  }
  readonly primaryReducer?: {
    readonly kind: 'declared' | 'registered'
  }
  readonly source?: {
    readonly file: string
    readonly line: number
    readonly column: number
  }
}

export interface ModuleManifestEffect {
  readonly actionTag: string
  readonly sourceKey: string
  readonly kind: 'declared' | 'registered'
  readonly source?: {
    readonly file: string
    readonly line: number
    readonly column: number
  }
}

export interface ModuleManifest {
  readonly manifestVersion: string
  readonly moduleId: string
  readonly actionKeys: ReadonlyArray<string>
  readonly actions: ReadonlyArray<ModuleManifestAction>
  readonly effects?: ReadonlyArray<ModuleManifestEffect>
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

type DevSource = ModuleManifest['source']

const resolveDevSource = (input: unknown): DevSource | undefined => {
  if (!isRecord(input)) return undefined
  const file = (input as any).file
  const line = (input as any).line
  const column = (input as any).column
  if (typeof file !== 'string' || file.length === 0) return undefined
  if (typeof line !== 'number' || !Number.isInteger(line) || line < 1) return undefined
  if (typeof column !== 'number' || !Number.isInteger(column) || column < 1) return undefined
  return { file, line, column }
}

const resolveTokenSource = (token: unknown): DevSource | undefined => {
  if (!token || (typeof token !== 'object' && typeof token !== 'function')) return undefined
  return resolveDevSource((token as any).source)
}

const resolveActions = (input: unknown): ReadonlyArray<ModuleManifestAction> => {
  const tag = isModuleImpl(input) ? (input.module as any) : (input as any)?.tag
  const actionMap = tag?.shape?.actionMap
  if (!isRecord(actionMap)) return []

  const moduleSource = resolveSource(input)
  const reducers = isRecord(tag?.reducers) ? (tag.reducers as Record<string, unknown>) : undefined

  const actionTags = Object.keys(actionMap).sort()

  const out: Array<ModuleManifestAction> = []
  for (const actionTag of actionTags) {
    const token = actionMap[actionTag]
    const source = resolveTokenSource(token) ?? moduleSource
    const payloadKind =
      Action.isActionToken(token) && Schema.isSchema((token as Action.AnyActionToken).schema)
        ? (token as Action.AnyActionToken).schema === Schema.Void
          ? 'void'
          : 'nonVoid'
        : 'unknown'

    const primaryReducer =
      reducers && typeof reducers[actionTag] === 'function' ? ({ kind: 'declared' } as const) : undefined

    out.push({
      actionTag,
      payload: { kind: payloadKind },
      ...(primaryReducer ? { primaryReducer } : {}),
      ...(source ? { source } : {}),
    })
  }

  return out
}

const MODULE_DECLARED_EFFECTS = Symbol.for('logix.module.effects.declared')

const resolveEffects = (input: unknown): ReadonlyArray<ModuleManifestEffect> | undefined => {
  const tag = isModuleImpl(input) ? (input.module as any) : (input as any)?.tag
  const actionMap = tag?.shape?.actionMap
  if (!isRecord(actionMap)) return undefined

  const effectsRaw = (tag as any)?.[MODULE_DECLARED_EFFECTS]
  if (!isRecord(effectsRaw)) return undefined

  const source = resolveSource(input)

  const logicUnitId = '__logix_internal:effects:declared'
  const handlerIds = new WeakMap<(...args: any[]) => any, string>()
  let nextHandlerSeq = 0

  const out: Array<ModuleManifestEffect> = []

  for (const actionTag of Object.keys(effectsRaw).sort()) {
    if (!(actionTag in actionMap)) continue

    const handlers = (effectsRaw as any)[actionTag]
    if (!Array.isArray(handlers)) continue

    for (const handler of handlers) {
      if (typeof handler !== 'function') continue

      let handlerId = handlerIds.get(handler)
      if (!handlerId) {
        nextHandlerSeq += 1
        handlerId = `h${nextHandlerSeq}`
        handlerIds.set(handler, handlerId)
      }

      const sourceKey = `${logicUnitId}::${handlerId}`

      out.push({
        actionTag,
        sourceKey,
        kind: 'declared',
        ...(source ? { source } : {}),
      })
    }
  }

  const seen = new Set<string>()
  const deduped: Array<ModuleManifestEffect> = []
  for (const item of out) {
    const key = `${item.actionTag}\u0000${item.sourceKey}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
  }

  deduped.sort((a, b) =>
    a.actionTag < b.actionTag
      ? -1
      : a.actionTag > b.actionTag
        ? 1
        : a.sourceKey < b.sourceKey
          ? -1
          : a.sourceKey > b.sourceKey
            ? 1
            : 0,
  )
  return deduped.length > 0 ? deduped : undefined
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
  return resolveDevSource(dev?.source)
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

  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0))
  return out.length > 0 ? out : undefined
}

type DigestBase = {
  readonly manifestVersion: string
  readonly moduleId: string
  readonly actionKeys: ReadonlyArray<string>
  readonly actions: ReadonlyArray<ModuleManifestAction>
  readonly effects?: ReadonlyArray<ModuleManifestEffect>
  readonly schemaKeys?: ReadonlyArray<string>
  readonly logicUnits?: ReadonlyArray<ModuleManifestLogicUnit>
  readonly staticIrDigest?: string
}

const digestOf = (base: DigestBase): string => `manifest:067:${fnv1a32(stableStringify(base))}`

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

  const markTruncatedArray = (name: string): void => {
    if (!truncatedArrays.includes(name)) {
      truncatedArrays.push(name)
    }
  }

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

  dropField('effects')
  if (utf8ByteLength(next) <= maxBytes) return next

  // Last resort: deterministically truncate tail items (stable order: actions[] sorted by actionTag).
  const truncateActionsToFit = (): void => {
    const total = next.actions.length
    if (total <= 1) return

    // Find the largest prefix that fits.
    let lo = 1
    let hi = total
    let best = 1

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2)
      const candidate = withMarker({
        ...next,
        actions: next.actions.slice(0, mid),
        actionKeys: next.actionKeys.slice(0, mid),
      })
      if (utf8ByteLength(candidate) <= maxBytes) {
        best = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }

    if (best < total) {
      markTruncatedArray('actions')
      markTruncatedArray('actionKeys')
      next = withMarker({
        ...next,
        actions: next.actions.slice(0, best),
        actionKeys: next.actionKeys.slice(0, best),
      })
    }
  }

  while (utf8ByteLength(next) > maxBytes) {
    const beforeLen = next.actions.length
    truncateActionsToFit()
    if (next.actions.length === beforeLen) {
      break
    }
  }

  return next
}

export const extractManifest = (module: unknown, options?: ExtractManifestOptions): ModuleManifest => {
  const manifestVersion = '067'
  const moduleId = resolveModuleId(module)
  const actionKeys = resolveActionKeys(module)
  const actions = resolveActions(module)
  const effects = resolveEffects(module)

  const schemaKeys = resolveSchemaKeys(module)
  const logicUnits = resolveLogicUnits(module)
  const source = resolveSource(module)
  const meta = resolveMeta(module)

  const staticIr = options?.includeStaticIr ? exportStaticIr(module) : undefined

  const digestBase: DigestBase = {
    manifestVersion,
    moduleId,
    actionKeys,
    actions,
    effects,
    schemaKeys,
    logicUnits,
    staticIrDigest: staticIr?.digest,
  }

  const digest = digestOf(digestBase)

  const manifest: ModuleManifest = {
    manifestVersion,
    moduleId,
    actionKeys,
    actions,
    effects,
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
