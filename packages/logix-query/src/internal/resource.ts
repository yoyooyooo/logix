import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Layer, ServiceMap } from 'effect'

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
}

const stableStringify = (value: unknown): string => {
  const seen = new WeakSet<object>()
  const encode = (input: unknown): unknown => {
    if (input === null) return null
    if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
      return input
    }
    if (typeof input === 'bigint') return input.toString()
    if (typeof input === 'undefined') return '__undefined__'
    if (typeof input === 'symbol') return `__symbol__:${String(input)}`
    if (typeof input === 'function') return '__function__'

    if (Array.isArray(input)) {
      return input.map((v) => encode(v))
    }
    if (input instanceof Date) {
      return `__date__:${input.toISOString()}`
    }
    if (input instanceof Error) {
      return {
        _tag: 'Error',
        name: input.name,
        message: input.message,
      }
    }
    if (input && typeof input === 'object') {
      const obj = input as object
      if (seen.has(obj)) return '__cycle__'
      seen.add(obj)

      const record = input as Record<string, unknown>
      const keys = Object.keys(record).sort()
      const out: Record<string, unknown> = {}
      for (const key of keys) {
        out[key] = encode(record[key])
      }
      return out
    }
    return String(input)
  }

  try {
    return JSON.stringify(encode(value))
  } catch {
    return String(value)
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
  loading: <Data = never, Err = never>(params: { readonly keyHash: string }): ResourceSnapshot<Data, Err> => ({
    status: 'loading',
    keyHash: params.keyHash,
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
>()('@logixjs/query/ResourceRegistry') {}

export type Spec<Key, Out, Err, Env> = ResourceSpec<Key, Out, Err, Env>

export const make = <Key, Out, Err, Env>(spec: ResourceSpec<Key, Out, Err, Env>): ResourceSpec<Key, Out, Err, Env> => spec

export const layer = (specs: ReadonlyArray<AnyResourceSpec>): Layer.Layer<ResourceRegistryTag, never, never> =>
  (() => {
    const registry = (() => {
      const map = new Map<string, AnyResourceSpec>()
      for (const spec of specs) {
        if (map.has(spec.id) && map.get(spec.id) !== spec) {
          throw new Error(`[Query.Engine.Resource.layer] Duplicate resource id "${spec.id}" detected in the same runtime scope`)
        }
        map.set(spec.id, spec)
      }
      return { specs: map } satisfies ResourceRegistry
    })()

    return Layer.mergeAll(
      Layer.succeed(ResourceRegistryTag, registry),
      Layer.succeed(FieldContracts.FieldSourceRegistryTag, registry as FieldContracts.FieldSourceRegistry),
    )
  })()
