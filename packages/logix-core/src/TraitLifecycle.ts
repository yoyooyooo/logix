// TraitLifecycle: shared lower-level interface for Form/Query (@logix/core/TraitLifecycle, Phase 2 placeholder).
//
// - Exposes serializable FieldRef and unified request protocols.
// - Concrete implementation lives in internal/trait-lifecycle/*; this module provides public API + type exports.

import type { BoundApi } from './Bound.js'
import { Effect } from 'effect'
import * as Internal from './internal/trait-lifecycle/index.js'

export type FieldRef = Internal.FieldRef
export type ValidateMode = Internal.ValidateRequest['mode']
export type ValidateRequest = Internal.ValidateRequest
export type ExecuteRequest = Internal.ExecuteRequest
export type CleanupRequest = Internal.CleanupRequest
export type SourceWiring = ReturnType<typeof Internal.makeSourceWiring>

export const Ref = Internal.Ref

export const scopedValidate = (bound: BoundApi<any, any>, request: ValidateRequest): Effect.Effect<void, never, any> =>
  Internal.scopedValidate(bound as any, request)

export const scopedExecute = (bound: BoundApi<any, any>, request: ExecuteRequest): Effect.Effect<void, never, any> =>
  Internal.scopedExecute(bound as any, request)

export const cleanup = (bound: BoundApi<any, any>, request: CleanupRequest): Effect.Effect<void, never, any> =>
  Internal.cleanup(bound as any, request)

export const makeSourceWiring = (bound: BoundApi<any, any>, module: unknown): SourceWiring =>
  Internal.makeSourceWiring(bound as any, module)

export const install = (bound: BoundApi<any, any>): Effect.Effect<void, never, any> => Internal.install(bound as any)
