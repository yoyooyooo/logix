import { Cause, Chunk, Effect } from "effect"
import * as Debug from "./DebugSink.js"

/**
 * Reducer 相关的诊断错误类型：
 * - ReducerDuplicateError：同一个 tag 注册了多个 primary reducer；
 * - ReducerLateRegistrationError：在该 tag 已经发生过 dispatch 之后才注册 reducer。
 *
 * 这些错误只在 Runtime 内部使用，用于在 catch 阶段统一转换为 Debug 诊断事件。
 */
export interface ReducerDiagnosticError extends Error {
  readonly _tag: "ReducerDuplicateError" | "ReducerLateRegistrationError"
  readonly tag: string
  readonly moduleId?: string
}

export const makeReducerError = (
  _tag: ReducerDiagnosticError["_tag"],
  tag: string,
  moduleId?: string
): ReducerDiagnosticError =>
  Object.assign(
    new Error(
      _tag === "ReducerDuplicateError"
        ? `[ModuleRuntime] Duplicate primary reducer for tag "${tag}". Each action tag must have at most one primary reducer.`
        : `[ModuleRuntime] Late primary reducer registration for tag "${tag}". Reducers must be registered before the first dispatch of this tag.`
    ),
    {
      _tag,
      tag,
      moduleId,
    }
  ) as ReducerDiagnosticError

/**
 * 从 Logic fork 的 Cause 中提取 Reducer 诊断错误，并以 Debug 事件形式发出。
 *
 * 注意：
 * - 仅在存在 ReducerDiagnosticError 时发出 diagnostic 事件；
 * - moduleId 优先取错误对象自身的 moduleId，其次使用调用方提供的上下文 moduleId。
 */
export const emitDiagnosticsFromCause = (
  cause: Cause.Cause<unknown>,
  moduleIdFromContext?: string
): Effect.Effect<void, never, any> =>
  Effect.sync(() => {
    const defects = Chunk.toReadonlyArray(Cause.defects(cause))

    let duplicate: ReducerDiagnosticError | undefined
    let late: ReducerDiagnosticError | undefined

    for (const defect of defects) {
      if (!defect || typeof defect !== "object") continue
      const error = defect as any
      if (error._tag === "ReducerDuplicateError") {
        duplicate = error as ReducerDiagnosticError
      } else if (error._tag === "ReducerLateRegistrationError") {
        late = error as ReducerDiagnosticError
      }
    }

    const effects: Array<Effect.Effect<void>> = []

    if (duplicate) {
      effects.push(
        Debug.record({
          type: "diagnostic",
          moduleId: duplicate.moduleId ?? moduleIdFromContext,
          code: "reducer::duplicate",
          severity: "error",
          message: `Primary reducer for tag "${duplicate.tag}" is already registered and cannot be redefined.`,
          hint:
            "确保每个 Action Tag 仅定义一个 primary reducer。若同时在 Module.reducers 与 $.reducer 中定义，请保留 Module.reducers 版本或合并为单一定义。",
          actionTag: duplicate.tag,
        })
      )
    }

    if (late) {
      effects.push(
        Debug.record({
          type: "diagnostic",
          moduleId: late.moduleId ?? moduleIdFromContext,
          code: "reducer::late_registration",
          severity: "error",
          message: `Primary reducer for tag "${late.tag}" was registered after actions with this tag had already been dispatched.`,
          hint:
            "请将该 reducer 提前到 Module.make({ reducers })，或确保在首次 dispatch 之前执行 $.reducer(\"tag\", ...)。",
          actionTag: late.tag,
        })
      )
    }

    if (effects.length === 0) {
      return Effect.void
    }

    let combined: Effect.Effect<void> = Effect.void
    for (const eff of effects) {
      combined = combined.pipe(Effect.zipRight(eff))
    }
    return combined
  }).pipe(Effect.flatten)
