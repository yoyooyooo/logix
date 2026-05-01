import { Layer, ServiceMap } from 'effect'
import { FieldSourceRegistryTag, type FieldSourceRegistry } from './field-source-registry.js'
import { isDevEnv } from './runtime/core/env.js'

export interface ResourceSpec<Key, Out, Err, Env> {
  readonly id: string
  readonly keySchema: import('effect').Schema.Schema<Key>
  readonly load: (key: Key) => import('effect').Effect.Effect<Out, Err, Env>
  readonly meta?: {
    readonly cacheGroup?: string
    readonly description?: string
    readonly [k: string]: unknown
  }
}

export type AnyResourceSpec = ResourceSpec<any, any, any, any>

export type ResourceStatus = 'idle' | 'loading' | 'success' | 'error'

export interface ResourceSnapshot<Data = unknown, Err = unknown> {
  readonly status: ResourceStatus
  readonly keyHash?: string
  readonly data?: Data
  readonly error?: Err
  readonly submitImpact?: 'block' | 'observe'
}

export type CanonicalResourceKeyResult =
  | {
      readonly _tag: 'accepted'
      readonly keyHash: string
    }
  | {
      readonly _tag: 'idle'
    }
  | {
      readonly _tag: 'rejected'
      readonly reason: string
      readonly path: string
    }

const rejectKey = (reason: string, path: string): CanonicalResourceKeyResult => ({
  _tag: 'rejected',
  reason,
  path,
})

const isPlainObject = (value: object): boolean => {
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

const encodeCanonicalKey = (
  value: unknown,
  path: string,
  seen: WeakSet<object>,
): { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly reason: string; readonly path: string } => {
  if (value === null) return { ok: true, value: null }

  if (typeof value === 'boolean' || typeof value === 'string') {
    return { ok: true, value }
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return { ok: false, reason: 'non-finite-number', path }
    }
    return { ok: true, value: Object.is(value, -0) ? 0 : value }
  }

  if (typeof value === 'undefined') {
    return { ok: false, reason: 'nested-undefined', path }
  }

  if (typeof value === 'bigint') return { ok: false, reason: 'bigint', path }
  if (typeof value === 'symbol') return { ok: false, reason: 'symbol', path }
  if (typeof value === 'function') return { ok: false, reason: 'function', path }

  if (!value || typeof value !== 'object') {
    return { ok: false, reason: 'unsupported-primitive', path }
  }

  const objectValue = value as object
  if (seen.has(objectValue)) {
    return { ok: false, reason: 'cycle-or-shared-reference', path }
  }

  if (Array.isArray(value)) {
    seen.add(objectValue)
    const out: Array<unknown> = []
    for (let index = 0; index < value.length; index++) {
      if (!(index in value)) {
        return { ok: false, reason: 'sparse-array', path: `${path}[${index}]` }
      }
      const encoded = encodeCanonicalKey(value[index], `${path}[${index}]`, seen)
      if (!encoded.ok) return encoded
      out.push(encoded.value)
    }
    return { ok: true, value: out }
  }

  if (
    value instanceof Date ||
    value instanceof Map ||
    value instanceof Set ||
    value instanceof RegExp ||
    value instanceof Promise ||
    ArrayBuffer.isView(value) ||
    value instanceof ArrayBuffer
  ) {
    return { ok: false, reason: 'unsupported-object', path }
  }

  if (!isPlainObject(objectValue)) {
    return { ok: false, reason: 'class-instance', path }
  }

  const symbols = Object.getOwnPropertySymbols(objectValue)
  if (symbols.length > 0) {
    return { ok: false, reason: 'symbol-key', path }
  }

  seen.add(objectValue)
  const record = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(record).sort()) {
    const childPath = path === '$' ? `$.${key}` : `${path}.${key}`
    const encoded = encodeCanonicalKey(record[key], childPath, seen)
    if (!encoded.ok) return encoded
    out[key] = encoded.value
  }
  return { ok: true, value: out }
}

const stableStringify = (value: unknown): string => {
  const encoded = encodeCanonicalKey(value, '$', new WeakSet<object>())
  if (!encoded.ok) {
    throw new Error(`[Resource.keyHash] rejected non-canonical source key at ${encoded.path}: ${encoded.reason}`)
  }
  return JSON.stringify(encoded.value)
}

export const canonicalizeKey = (key: unknown): CanonicalResourceKeyResult => {
  if (key === undefined) return { _tag: 'idle' }
  const encoded = encodeCanonicalKey(key, '$', new WeakSet<object>())
  if (!encoded.ok) {
    return rejectKey(encoded.reason, encoded.path)
  }
  return {
    _tag: 'accepted',
    keyHash: JSON.stringify(encoded.value),
  }
}

export const keyHash = (key: unknown): string => stableStringify(key)

export const Snapshot = {
  idle: <Data = never, Err = never>(): ResourceSnapshot<Data, Err> => ({
    status: 'idle',
    keyHash: undefined,
    data: undefined,
    error: undefined,
  }),
  loading: <Data = never, Err = never>(params: {
    readonly keyHash: string
    readonly submitImpact?: 'block' | 'observe'
  }): ResourceSnapshot<Data, Err> => ({
    status: 'loading',
    keyHash: params.keyHash,
    ...(params.submitImpact ? { submitImpact: params.submitImpact } : null),
    data: undefined,
    error: undefined,
  }),
  success: <Data>(params: { readonly keyHash: string; readonly data: Data }): ResourceSnapshot<Data, never> => ({
    status: 'success',
    keyHash: params.keyHash,
    data: params.data,
    error: undefined,
  }),
  error: <Err>(params: { readonly keyHash: string; readonly error: Err }): ResourceSnapshot<never, Err> => ({
    status: 'error',
    keyHash: params.keyHash,
    data: undefined,
    error: params.error,
  }),
} as const

export interface ResourceRegistry {
  readonly specs: ReadonlyMap<string, AnyResourceSpec>
}

export class ResourceRegistryTag extends ServiceMap.Service<
  ResourceRegistryTag,
  ResourceRegistry
>()('@logixjs/core/ResourceRegistry') {}

export const internal = {
  ResourceRegistryTag,
}

export type Spec<Key, Out, Err, Env> = ResourceSpec<Key, Out, Err, Env>

export const make = <Key, Out, Err, Env>(spec: ResourceSpec<Key, Out, Err, Env>): ResourceSpec<Key, Out, Err, Env> =>
  spec

export const layer = (specs: ReadonlyArray<AnyResourceSpec>): Layer.Layer<ResourceRegistryTag, never, never> =>
  (() => {
    const registry = (() => {
      const map = new Map<string, AnyResourceSpec>()
      for (const spec of specs) {
        if (isDevEnv() && map.has(spec.id) && map.get(spec.id) !== spec) {
          throw new Error(`[Resource.layer] Duplicate resource id "${spec.id}" detected in the same runtime scope`)
        }
        map.set(spec.id, spec)
      }
      return { specs: map } satisfies ResourceRegistry
    })()

    return Layer.mergeAll(
      Layer.succeed(ResourceRegistryTag, registry),
      Layer.succeed(FieldSourceRegistryTag, registry as FieldSourceRegistry),
    )
  })()
