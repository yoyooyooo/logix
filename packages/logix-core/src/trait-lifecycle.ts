// TraitLifecycle：Form/Query 同源下沉接口（Phase 2 占位版）。
//
// - 本模块对外暴露可序列化的 FieldRef 与统一请求协议；
// - 实际实现落在 internal/trait-lifecycle/*，此处提供公共 API 与类型出口。

import type { BoundApi } from "./Bound.js"
import { Effect } from "effect"
import * as Internal from "./internal/trait-lifecycle/index.js"

export type FieldRef = Internal.FieldRef
export type ValidateMode = Internal.ValidateRequest["mode"]
export type ValidateRequest = Internal.ValidateRequest
export type ExecuteRequest = Internal.ExecuteRequest
export type CleanupRequest = Internal.CleanupRequest

export const Ref = Internal.Ref

export const scopedValidate = (
  bound: BoundApi<any, any>,
  request: ValidateRequest,
): Effect.Effect<void, never, any> => Internal.scopedValidate(bound as any, request)

export const scopedExecute = (
  bound: BoundApi<any, any>,
  request: ExecuteRequest,
): Effect.Effect<void, never, any> => Internal.scopedExecute(bound as any, request)

export const cleanup = (
  bound: BoundApi<any, any>,
  request: CleanupRequest,
): Effect.Effect<void, never, any> => Internal.cleanup(bound as any, request)

export const install = (
  bound: BoundApi<any, any>,
): Effect.Effect<void, never, any> => Internal.install(bound as any)

