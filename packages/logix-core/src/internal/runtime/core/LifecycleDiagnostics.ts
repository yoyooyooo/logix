import { Effect } from "effect"
import * as Debug from "./DebugSink.js"
import type { LifecycleManager } from "./Lifecycle.js"

/**
 * 当 Module 在 Logic 执行期间发生 lifecycle 错误、且未注册任何 onError 处理器时，
 * 发出一条 warning 级别的诊断事件，提醒用户在 Logic 开头补充 $.lifecycle.onError。
 */
export const emitMissingOnErrorDiagnosticIfNeeded = (
  lifecycle: LifecycleManager,
  moduleId?: string
): Effect.Effect<void, never, any> =>
  lifecycle.hasOnErrorHandlers.pipe(
    Effect.flatMap((has) =>
      has || !moduleId
        ? Effect.void
        : Debug.record({
            type: "diagnostic",
            moduleId,
            code: "lifecycle::missing_on_error",
            severity: "warning",
            message: `Module "${moduleId}" received a lifecycle error but has no $.lifecycle.onError handler registered.`,
            hint:
              "建议在该 Module 的 Logic 开头添加 $.lifecycle.onError((cause, context) => ...) 以统一兜底逻辑错误。",
          })
    )
  )
