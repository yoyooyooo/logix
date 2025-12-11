import { Cause, Context, Effect } from "effect"
import * as Debug from "./DebugSink.js"
import { isDevEnv } from "./env.js"

const phaseDiagnosticsEnabled = (): boolean => isDevEnv()

/**
 * Logic 相关诊断：
 * - 当前聚焦于 Env Service 缺失导致的初始化噪音（Service not found）。
 *
 * 设计意图：
 * - 在推荐用法下，Runtime / React 层会正确提供 Env；
 * - 但在某些初始化时序下，Logic 可能在 Env 铺满前就尝试读取 Service；
 * - 这类错误通常只出现一次，不改变最终语义，却会污染日志。
 *
 * 因此这里在 Debug 侧发出一条 warning 级 diagnostic，解释可能原因与排查路径，
 * 真正的错误语义仍由 lifecycle.onError / AppRuntime.onError 处理。
 */

const SERVICE_NOT_FOUND_PREFIX = "Service not found:"

/**
 * 若 Cause 中包含 `Service not found: ...` 错误，则发出一条 warning 级 diagnostic：
 * - code: logic::env_service_not_found
 * - message: 原始错误 message；
 * - hint: 说明这是已知的初始化时序噪音，并给出排查建议。
 */
export const emitEnvServiceNotFoundDiagnosticIfNeeded = (
  cause: Cause.Cause<unknown>,
  moduleId?: string
): Effect.Effect<void> =>
  Effect.gen(function* () {
    let pretty: string
    try {
      pretty = Cause.pretty(cause, { renderErrorCause: true })
    } catch {
      return
    }

    if (!pretty.includes(SERVICE_NOT_FOUND_PREFIX)) {
      return
    }

    // 1) Env Service 缺失本身的 warning 诊断
    yield* Debug.record({
      type: "diagnostic",
      moduleId,
      code: "logic::env_service_not_found",
      severity: "warning",
      message: pretty,
      hint:
        "Logic 在初始化阶段尝试访问尚未提供的 Env Service，通常是 Runtime / React 集成中的已知初始化噪音。" +
        "若只在应用启动早期出现一次且后续状态与 Env 均正常，可暂视为无害；" +
        "若持续出现或伴随业务异常，请检查 Runtime.make / RuntimeProvider.layer 是否正确提供了对应 Service。",
    })

    // 2) 在某些场景下（例如 Logic setup 段过早访问 Env），我们也希望通过
    //    logic::invalid_phase 提醒“请将 Env 访问移动到 run 段”。
    //
    // 由于当前实现无法在此处可靠判断调用发生的 phase，这里只是提供一个补充性的
    // 诊断信号，真正的 phase 守卫仍由 LogicPhaseError + emitInvalidPhaseDiagnosticIfNeeded 承担。
    yield* Debug.record({
      type: "diagnostic",
      moduleId,
      code: "logic::invalid_phase",
      severity: "error",
      message: "$.use is not allowed before Env is fully ready.",
      hint:
        "setup 段或 Env 未完全就绪时请避免直接读取 Service；" +
        "建议将对 Env 的访问移动到 Logic 的 run 段，或通过 $.lifecycle.onInit 包装初始化流程。",
      kind: "env_service_not_ready",
    })
  })

export interface LogicPhaseError extends Error {
  readonly _tag: "LogicPhaseError"
  readonly kind: string
  readonly api?: string
  readonly phase: "setup" | "run"
  readonly moduleId?: string
}

export interface LogicPhaseService {
  readonly current: "setup" | "run"
}

export const LogicPhaseServiceTag = Context.GenericTag<LogicPhaseService>(
  "@logix/LogicPhaseService"
)

export const makeLogicPhaseError = (
  kind: string,
  api: string,
  phase: "setup" | "run",
  moduleId?: string
): LogicPhaseError =>
  Object.assign(
    new Error(
      `[LogicPhaseError] ${api} is not allowed in ${phase} phase (kind=${kind}).`
    ),
    {
      _tag: "LogicPhaseError",
      kind,
      api,
      phase,
      moduleId,
    }
  ) as LogicPhaseError

/**
 * 从 Cause 中提取 LogicPhaseError，并以 diagnostic 形式发出：
 * - code: logic::invalid_phase
 * - kind: 具体违规类型（如 use_in_setup）
 */
export const emitInvalidPhaseDiagnosticIfNeeded = (
  cause: Cause.Cause<unknown>,
  moduleId?: string
): Effect.Effect<void> =>
  Effect.gen(function* () {
    if (!phaseDiagnosticsEnabled()) {
      return
    }

    const allErrors = [
      ...Cause.failures(cause),
      ...Cause.defects(cause),
    ]

    for (const err of allErrors) {
      const logicErr = err as any
      if (logicErr && logicErr._tag === "LogicPhaseError") {
        const phaseErr = logicErr as LogicPhaseError
        const hint =
          phaseErr.kind === "use_in_setup" ||
          phaseErr.kind === "lifecycle_in_setup"
            ? "setup 段禁止读取 Env/Service 或执行长生命周期逻辑，请将相关调用移动到 run 段。"
            : "调整逻辑到 run 段，setup 仅做注册类操作。"

        yield* Debug.record({
          type: "diagnostic",
          moduleId: phaseErr.moduleId ?? moduleId,
          code: "logic::invalid_phase",
          severity: "error",
          message: `${phaseErr.api ?? phaseErr.kind} is not allowed in ${phaseErr.phase} phase.`,
          hint,
          kind: phaseErr.kind,
        })

        // 命中首个 LogicPhaseError 即可返回
        return
      }
    }
  })
