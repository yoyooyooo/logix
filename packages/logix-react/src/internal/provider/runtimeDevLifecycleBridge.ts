import { ManagedRuntime } from 'effect'
import type {
  LogixDevLifecycleCarrier,
  LogixDevLifecycleRuntimeBinding,
} from '../../dev/lifecycle.js'
import type {
  RuntimeHostLifecycleBindOptions,
  RuntimeHostLifecycleBinder,
} from './runtimeHostLifecycleBridge.js'
import {
  clearRuntimeHostLifecycleBinder,
  installRuntimeHostLifecycleBinder,
} from './runtimeHostLifecycleBridge.js'

const getInstalledCarrier = (): LogixDevLifecycleCarrier | undefined => {
  const value = (globalThis as unknown as Record<PropertyKey, unknown>)[Symbol.for('@logixjs/react/dev-lifecycle-carrier')]
  return value && typeof value === 'object' ? (value as LogixDevLifecycleCarrier) : undefined
}

const bindInstalledDevLifecycleCarrier: RuntimeHostLifecycleBinder = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  options: RuntimeHostLifecycleBindOptions = {},
): LogixDevLifecycleRuntimeBinding | undefined => {
  const carrier = getInstalledCarrier()
  if (!carrier) return undefined

  return carrier.bindRuntime({
    runtime,
    ownerId: options.ownerId ?? 'react-runtime',
    runtimeOwnership: options.runtimeOwnership ?? 'borrowed',
    ...(options.runtimeInstanceId ? { runtimeInstanceId: options.runtimeInstanceId } : null),
    ...(options.reflectionManifest ? { reflectionManifest: options.reflectionManifest as any } : null),
    ...(options.moduleRuntime ? { moduleRuntime: options.moduleRuntime } : null),
    ...(options.fieldInspect ? { fieldInspect: options.fieldInspect } : null),
  })
}

export const installDevLifecycleRuntimeHostBinder = (): void => {
  installRuntimeHostLifecycleBinder(bindInstalledDevLifecycleCarrier)
}

export const clearDevLifecycleRuntimeHostBinder = (): void => {
  clearRuntimeHostLifecycleBinder()
}
