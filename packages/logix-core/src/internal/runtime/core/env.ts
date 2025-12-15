import { Context, Layer } from "effect"

// 统一的运行时环境检测，避免 bundler 在构建期内联 NODE_ENV。
export const getNodeEnv = (): string | undefined => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (globalThis as any)?.process?.env
    return typeof env?.NODE_ENV === "string" ? env.NODE_ENV : undefined
  } catch {
    return undefined
  }
}

export const isDevEnv = (): boolean => getNodeEnv() !== "production"

export type StateTransactionInstrumentation = "full" | "light"

/**
 * getDefaultStateTxnInstrumentation：
 * - 当前简单按 NODE_ENV 选择默认观测强度：
 *   - dev / test：full（保留 Patch 与快照，便于调试）；
 *   - production：light（仅保留最小语义，便于减少开销）。
 * - 后续可在 Runtime.make / Module.make 上提供更细粒度的覆写入口。
 */
export const getDefaultStateTxnInstrumentation =
  (): StateTransactionInstrumentation =>
    isDevEnv() ? "full" : "light"

/**
 * Runtime 级 StateTransaction 配置 Service：
 * - 由 Logix.Runtime.make / AppRuntime.makeApp 在 App 级 Layer 中提供；
 * - ModuleRuntime.make 可以从 Env 中读取 runtime 级默认观测策略。
 *
 * 说明：
 * - instrumentation 仅作为 Runtime 级默认值；
 * - ModuleImpl / ModuleRuntimeOptions 中显式声明的 instrumentation 具有更高优先级。
 */
export interface StateTransactionRuntimeConfig {
  readonly instrumentation?: StateTransactionInstrumentation
  /**
   * StateTrait 派生收敛（converge）预算（ms）：
   * - 超过预算将触发软降级（冻结派生字段，保住 base 写入与 0/1 commit 语义）。
   * - 默认为 200ms（与 007 spec 的默认阈值保持一致）。
   */
  readonly traitConvergeBudgetMs?: number
  /**
   * StateTrait converge 调度策略：
   * - full：全量 topo 执行（当前默认，最稳妥）；
   * - dirty：基于事务窗口内 dirtyPaths + deps 做最小触发（要求 deps 准确）。
   */
  readonly traitConvergeMode?: "full" | "dirty"
}

class StateTransactionConfigTagImpl extends Context.Tag(
  "@logix/core/StateTransactionRuntimeConfig",
)<StateTransactionConfigTagImpl, StateTransactionRuntimeConfig>() {}

export const StateTransactionConfigTag = StateTransactionConfigTagImpl

export type ReplayMode = "live" | "replay"

export interface ReplayModeConfig {
  readonly mode: ReplayMode
}

class ReplayModeConfigTagImpl extends Context.Tag(
  "@logix/core/ReplayModeConfig",
)<ReplayModeConfigTagImpl, ReplayModeConfig>() {}

export const ReplayModeConfigTag = ReplayModeConfigTagImpl

export const replayModeLayer = (
  mode: ReplayMode,
): Layer.Layer<ReplayModeConfigTagImpl, never, never> =>
  Layer.succeed(ReplayModeConfigTag, { mode })
