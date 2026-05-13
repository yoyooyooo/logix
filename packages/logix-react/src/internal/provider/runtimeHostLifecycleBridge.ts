import { Effect, Layer, ManagedRuntime } from 'effect'
import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'

export type RuntimeHostLifecycleOwnership = 'owned' | 'borrowed'

export interface RuntimeHostLifecycleModuleRuntime {
  readonly getState: Effect.Effect<unknown, unknown, any>
  readonly dispatch: (action: unknown) => Effect.Effect<void, unknown, any>
}

export interface RuntimeHostLifecycleFieldInspectSource {
  readonly getSnapshot: () => unknown | undefined
  readonly getGraph?: () => unknown | undefined
  readonly getChangedFieldCount?: () => number | undefined
  readonly getDegradedReasonCounts?: () => Readonly<Record<string, number>> | undefined
}

export interface RuntimeHostLifecycleBindOptions {
  readonly ownerId?: string
  readonly runtimeInstanceId?: string
  readonly runtimeOwnership?: RuntimeHostLifecycleOwnership
  readonly reflectionManifest?: unknown
  readonly moduleRuntime?: RuntimeHostLifecycleModuleRuntime
  readonly fieldInspect?: RuntimeHostLifecycleFieldInspectSource
}

export interface RuntimeHostLifecycleBinding {
  readonly layer?: Layer.Layer<any, never, never>
}

export type RuntimeHostLifecycleBinder = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  options?: RuntimeHostLifecycleBindOptions,
) => RuntimeHostLifecycleBinding | undefined

const RUNTIME_HOST_LIFECYCLE_BINDER_KEY = Symbol.for('@logixjs/react/runtime-host-lifecycle-binder')
const runtimeHostLifecycleOwnerIds = new WeakMap<object, string>()
let runtimeHostLifecycleOwnerSeq = 0

const getGlobalStore = (): Record<PropertyKey, unknown> => globalThis as unknown as Record<PropertyKey, unknown>

const getInstalledRuntimeHostLifecycleBinder = (): RuntimeHostLifecycleBinder | undefined => {
  const value = getGlobalStore()[RUNTIME_HOST_LIFECYCLE_BINDER_KEY]
  return typeof value === 'function' ? (value as RuntimeHostLifecycleBinder) : undefined
}

const readRuntimeLabel = (runtime: ManagedRuntime.ManagedRuntime<any, any>): string | undefined => {
  try {
    const label = runtime.runSync(Effect.service(CoreDebug.internal.currentRuntimeLabel).pipe(Effect.orDie)) as unknown
    return typeof label === 'string' && label.length > 0 ? label : undefined
  } catch {
    return undefined
  }
}

const getRuntimeHostLifecycleOwnerId = (runtime: ManagedRuntime.ManagedRuntime<any, any>): string => {
  const key = runtime as unknown as object
  const cached = runtimeHostLifecycleOwnerIds.get(key)
  if (cached) return cached

  const label = readRuntimeLabel(runtime)
  if (label) {
    runtimeHostLifecycleOwnerIds.set(key, label)
    return label
  }

  runtimeHostLifecycleOwnerSeq += 1
  const ownerId = `react-runtime:${runtimeHostLifecycleOwnerSeq}`
  runtimeHostLifecycleOwnerIds.set(key, ownerId)
  return ownerId
}

export const installRuntimeHostLifecycleBinder = (binder: RuntimeHostLifecycleBinder): void => {
  getGlobalStore()[RUNTIME_HOST_LIFECYCLE_BINDER_KEY] = binder
}

export const clearRuntimeHostLifecycleBinder = (): void => {
  delete getGlobalStore()[RUNTIME_HOST_LIFECYCLE_BINDER_KEY]
}

export const bindInstalledRuntimeHostLifecycle = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  options: RuntimeHostLifecycleBindOptions = {},
): RuntimeHostLifecycleBinding | undefined => {
  const binder = getInstalledRuntimeHostLifecycleBinder()
  if (!binder) return undefined

  return binder(runtime, {
    ...options,
    ownerId: options.ownerId ?? getRuntimeHostLifecycleOwnerId(runtime),
    runtimeOwnership: options.runtimeOwnership ?? 'borrowed',
  })
}
