import { Effect, FiberRef, Option } from "effect"
import type { BoundApi } from "../runtime/core/module.js"
import * as TaskRunner from "../runtime/core/TaskRunner.js"
import * as ReplayLog from "../runtime/core/ReplayLog.js"
import type {
  CleanupRequest,
  ExecuteRequest,
  FieldRef,
  ValidateRequest,
} from "./model.js"
import type * as StateTraitValidate from "../state-trait/validate.js"
import * as RowId from "../state-trait/rowid.js"

export type { CleanupRequest, ExecuteRequest, FieldRef, ValidateRequest }

/**
 * Ref：用于构造 FieldRef（可序列化、可比较）。
 *
 * 说明：
 * - Phase 2 仅提供最小构造器；
 * - RowID/trackBy 等数组优化与更强的 ref 解释语义在后续 Phase 落地。
 */
export const Ref = {
  field: (path: string): FieldRef => ({ kind: "field", path }),
  list: (path: string, listIndexPath?: ReadonlyArray<number>): FieldRef => ({
    kind: "list",
    path,
    listIndexPath,
  }),
  item: (
    path: string,
    index: number,
    options?: { readonly listIndexPath?: ReadonlyArray<number>; readonly field?: string },
  ): FieldRef => ({
    kind: "item",
    path,
    index,
    listIndexPath: options?.listIndexPath,
    field: options?.field,
  }),
  root: (): FieldRef => ({ kind: "root" }),
} as const

/**
 * scopedValidate（占位）：后续 Phase 将基于 ReverseClosure 计算最小集合并写回错误树。
 */
export const scopedValidate = (
  bound: BoundApi<any, any>,
  request: ValidateRequest,
): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    const enqueue =
      (bound as any)
        .__enqueueStateTraitValidateRequest as
      | ((r: StateTraitValidate.ScopedValidateRequest) => void)
      | undefined

    if (!enqueue) {
      return
    }

    const toTarget = (ref: FieldRef): StateTraitValidate.ValidateTarget => {
      if (ref.kind === "root") return { kind: "root" }
      if (ref.kind === "field") return { kind: "field", path: ref.path }
      if (ref.kind === "list") return { kind: "list", path: ref.path }
      return {
        kind: "item",
        path: ref.path,
        index: ref.index,
        field: ref.field,
      }
    }

    const internal: StateTraitValidate.ScopedValidateRequest = {
      mode: request.mode as any,
      target: toTarget(request.target),
    }

    const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)
    if (inTxn) {
      enqueue(internal)
      return
    }

    const runWithTxn =
      (bound as any)
        .__runWithStateTransaction as
      | ((
          origin: { readonly kind: string; readonly name?: string; readonly details?: unknown },
          body: () => Effect.Effect<void, never, any>,
        ) => Effect.Effect<void, never, any>)
      | undefined

    if (!runWithTxn) {
      return
    }

    yield* runWithTxn(
      { kind: "trait", name: "scopedValidate", details: request },
      () =>
        Effect.sync(() => {
          enqueue(internal)
        }),
    )
  })

/**
 * scopedExecute（占位）：用于 Query/资源类动作的统一执行入口（refresh/invalidate 等）。
 */
export const scopedExecute = (
  bound: BoundApi<any, any>,
  request: ExecuteRequest,
): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    if (request.kind === "source:refresh") {
      const toFieldPath = (ref: FieldRef): string | undefined => {
        if (ref.kind === "root") return undefined
        if (ref.kind === "field" || ref.kind === "list") return ref.path
        const base = `${ref.path}[]`
        return ref.field ? `${base}.${ref.field}` : base
      }

      const fieldPath = toFieldPath(request.target)
      if (!fieldPath) {
        return
      }

      yield* (bound.traits.source.refresh(fieldPath) as Effect.Effect<void, never, any>)
      return
    }

    if (request.kind !== "query:invalidate") {
      return
    }

    const replayLogOpt = yield* Effect.serviceOption(ReplayLog.ReplayLog)
    if (Option.isNone(replayLogOpt)) {
      return
    }

    const moduleId = (bound as any).__moduleId as string | undefined
    const runtimeId = (bound as any).__runtimeId as string | undefined

    yield* replayLogOpt.value.record({
      _tag: "InvalidateRequest",
      timestamp: Date.now(),
      moduleId,
      runtimeId,
      kind: "query",
      target: "query",
      meta: request.request,
    })
  })

/**
 * cleanup（占位）：结构变更下的确定性清理（errors/ui/resources）。
 */
export const cleanup = (
  bound: BoundApi<any, any>,
  request: CleanupRequest,
): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    const apply = () =>
      bound.state.mutate((draft: any) => {
        const clearAt = (root: "errors" | "ui", path: string): void => {
          if (!path) return
          RowId.unsetAtPathMutating(draft, `${root}.${path}`)
        }

        if (request.kind === "field:unregister") {
          const target = request.target
          if (target.kind !== "field") return
          clearAt("errors", target.path)
          clearAt("ui", target.path)
          return
        }

        if (request.kind === "list:item:remove") {
          const target = request.target
          if (target.kind !== "item") return
          const base = `${target.path}.${target.index}`
          const path = target.field ? `${base}.${target.field}` : base
          clearAt("errors", path)
          clearAt("ui", path)
          return
        }

        if (request.kind === "list:reorder") {
          // reorder 本身不改变对外 index 语义；
          // errors/ui 的对齐由领域 reducer 或上层逻辑负责完成，这里保持 no-op。
          return
        }
      }) as Effect.Effect<void, never, any>

    const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)
    if (inTxn) {
      return yield* apply()
    }

    const runWithTxn =
      (bound as any)
        .__runWithStateTransaction as
      | ((
          origin: { readonly kind: string; readonly name?: string; readonly details?: unknown },
          body: () => Effect.Effect<void, never, any>,
        ) => Effect.Effect<void, never, any>)
      | undefined

    if (!runWithTxn) {
      return yield* apply()
    }

    return yield* runWithTxn(
      { kind: "trait", name: "cleanup", details: request },
      apply,
    )
  })

/**
 * install（占位）：TraitLifecycle 的默认接线点。
 *
 * 说明：
 * - Phase 2 仅提供可被领域包引用的入口；
 * - 具体“领域事件 → request → 事务内执行”的 wiring 在后续 Phase 由 Form/Query 的默认 logics 组合实现。
 */
export const install = (
  _bound: BoundApi<any, any>,
): Effect.Effect<void, never, any> => Effect.void
