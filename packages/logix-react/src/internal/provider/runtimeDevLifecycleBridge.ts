import { Effect, Layer, ManagedRuntime } from 'effect'
import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import type { LogixDevLifecycleCarrier, LogixDevLifecycleRuntimeBinding } from '../../dev/lifecycle.js'

const GLOBAL_CARRIER_KEY = Symbol.for('@logixjs/react/dev-lifecycle-carrier')
const RUNTIME_OWNER_IDS = new WeakMap<object, string>()
let runtimeOwnerSeq = 0

const getInstalledCarrier = (): LogixDevLifecycleCarrier | undefined => {
  const value = (globalThis as unknown as Record<PropertyKey, unknown>)[GLOBAL_CARRIER_KEY]
  return value && typeof value === 'object' ? (value as LogixDevLifecycleCarrier) : undefined
}

const readRuntimeLabel = (runtime: ManagedRuntime.ManagedRuntime<any, any>): string | undefined => {
  try {
    const label = runtime.runSync(Effect.service(CoreDebug.internal.currentRuntimeLabel).pipe(Effect.orDie)) as unknown
    return typeof label === 'string' && label.length > 0 ? label : undefined
  } catch {
    return undefined
  }
}

const getRuntimeOwnerId = (runtime: ManagedRuntime.ManagedRuntime<any, any>): string => {
  const key = runtime as unknown as object
  const cached = RUNTIME_OWNER_IDS.get(key)
  if (cached) return cached

  const label = readRuntimeLabel(runtime)
  if (label) {
    RUNTIME_OWNER_IDS.set(key, label)
    return label
  }

  runtimeOwnerSeq += 1
  const ownerId = `react-runtime:${runtimeOwnerSeq}`
  RUNTIME_OWNER_IDS.set(key, ownerId)
  return ownerId
}

export const bindInstalledDevLifecycleCarrier = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
): LogixDevLifecycleRuntimeBinding | undefined => {
  const carrier = getInstalledCarrier()
  if (!carrier) return undefined

  return carrier.bindRuntime({
    runtime,
    ownerId: getRuntimeOwnerId(runtime),
  })
}

export const getInstalledDevLifecycleLayer = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
): Layer.Layer<any, never, never> | undefined => bindInstalledDevLifecycleCarrier(runtime)?.layer
