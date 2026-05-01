// Public owner for external-store descriptors and runtime sources.

import * as ExternalStoreInternal from './internal/external-store.js'

export type ExternalStore<T> = ExternalStoreInternal.ExternalStore<T>
export type ExternalStoreRuntimeError = ExternalStoreInternal.ExternalStoreRuntimeError

export const fromService = ExternalStoreInternal.fromService
export const fromSubscriptionRef = ExternalStoreInternal.fromSubscriptionRef
export const fromStream = ExternalStoreInternal.fromStream
export const fromModule = ExternalStoreInternal.fromModule
