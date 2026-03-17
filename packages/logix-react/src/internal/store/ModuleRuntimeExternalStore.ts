import type * as Logix from '@logixjs/core'
import type { ManagedRuntime } from 'effect'
import { getRuntimeModuleExternalStore } from './RuntimeExternalStore.js'
import type { ExternalStore, ExternalStoreOptions } from './RuntimeExternalStore.js'
export type { ExternalStore, ExternalStoreOptions } from './RuntimeExternalStore.js'

export const getModuleRuntimeExternalStore = <S>(
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  moduleRuntime: Logix.ModuleRuntime<S, any>,
  options?: ExternalStoreOptions,
): ExternalStore<S> => getRuntimeModuleExternalStore(runtime, moduleRuntime, options)
