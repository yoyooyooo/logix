import { Effect, SubscriptionRef } from "effect"

/**
 * PatchReason：
 * - 暂时以字符串联合形式表达原因分类；
 * - 后续可根据 spec/data-model.md 中的 PatchReason 枚举进一步收紧。
 */
export type PatchReason =
  | "reducer"
  | "trait-computed"
  | "trait-link"
  | "source-refresh"
  | "devtools"
  | (string & {})

export interface StatePatch {
  readonly path: string
  readonly from?: unknown
  readonly to?: unknown
  readonly reason: PatchReason
  readonly traitNodeId?: string
  readonly stepId?: string
}

export interface StateTxnOrigin {
  readonly kind: string
  readonly name?: string
  readonly details?: unknown
}

export type StateTxnInstrumentationLevel = "full" | "light"

export interface StateTxnConfig {
  readonly moduleId?: string
  readonly instanceId?: string
  readonly runtimeId?: string
  readonly instrumentation?: StateTxnInstrumentationLevel
  /**
   * 是否记录 initial/final 状态快照：
   * - full 模式下默认开启；
   * - light 模式下默认关闭。
   */
  readonly captureSnapshots?: boolean
  /**
   * 时间获取函数，便于在测试中注入假时钟。
   */
  readonly now?: () => number
}

export interface StateTransaction<S> {
  readonly txnId: string
  readonly origin: StateTxnOrigin
  readonly startedAt: number
  readonly endedAt: number
  readonly durationMs: number
  readonly initialStateSnapshot?: S
  readonly finalStateSnapshot?: S
  readonly patches: ReadonlyArray<StatePatch>
  readonly moduleId?: string
  readonly instanceId?: string
  readonly runtimeId?: string
}

/**
 * StateTxnContext：
 * - 承载单个 ModuleRuntime 内的事务状态；
 * - current 为当前活跃事务（若无则为 undefined）。
 *
 * 说明：
 * - 当前实现只维护「单活跃事务」语义，队列/排队策略在后续 US1 任务中补充；
 * - 为避免过早耦合，Context 只提供最小 begin/update/record/commit 能力，
 *   具体入口（dispatch/source-refresh/devtools 操作）由上层控制。
 */
export interface StateTxnRuntimeConfig {
  readonly moduleId?: string
  readonly instanceId?: string
  readonly runtimeId?: string
  readonly instrumentation: StateTxnInstrumentationLevel
  readonly captureSnapshots: boolean
  readonly now: () => number
}

export interface StateTxnContext<S> {
  readonly config: StateTxnRuntimeConfig
  current?: StateTxnState<S>
}

interface StateTxnState<S> {
  readonly txnId: string
  readonly origin: StateTxnOrigin
  readonly startedAt: number
  draft: S
  readonly initialStateSnapshot?: S
  readonly patches: Array<StatePatch>
}

const defaultNow = () => Date.now()

export const makeContext = <S>(
  config: StateTxnConfig
): StateTxnContext<S> => {
  const instrumentation: StateTxnInstrumentationLevel =
    config.instrumentation ?? "full"

  const captureSnapshots =
    config.captureSnapshots ??
    (instrumentation === "full")

  return {
    config: {
      instrumentation,
      captureSnapshots,
      now: config.now ?? defaultNow,
      moduleId: config.moduleId,
      instanceId: config.instanceId,
      runtimeId: config.runtimeId,
    },
    current: undefined
  }
}

/**
 * 开启一次新的事务：
 * - 默认行为：直接覆盖当前事务（队列/嵌套后续在 US1 中细化）；
 * - initialState 由调用方提供：通常为当前 SubscriptionRef 快照。
 */
export const beginTransaction = <S>(
  ctx: StateTxnContext<S>,
  origin: StateTxnOrigin,
  initialState: S
): void => {
  const { config } = ctx
  const now = config.now
  const startedAt = now()

  const txnId = `${startedAt.toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`

  const initialSnapshot = config.captureSnapshots
    ? initialState
    : undefined

  ctx.current = {
    txnId,
    origin,
    startedAt,
    draft: initialState,
    initialStateSnapshot: initialSnapshot,
    patches: []
  }
}

/**
 * 更新草稿状态：
 * - next 为最新草稿；
 * - 若提供 patch 且处于 full 模式，则追加到当前事务的 Patch 列表中。
 */
export const updateDraft = <S>(
  ctx: StateTxnContext<S>,
  next: S,
  patch?: StatePatch
): void => {
  const state = ctx.current
  if (!state) {
    // 当前无事务：直接忽略 Patch 信息，交由上层决定是否开启隐式事务。
    return
  }

  if (patch && ctx.config.instrumentation === "full") {
    state.patches.push(patch)
  }

  state.draft = next
}

/**
 * recordPatch：
 * - 在 full 模式下追加 Patch；
 * - light 模式下默默忽略，避免产生额外开销。
 */
export const recordPatch = <S>(
  ctx: StateTxnContext<S>,
  patch: StatePatch
): void => {
  const state = ctx.current
  if (!state) {
    return
  }
  if (ctx.config.instrumentation === "light") {
    return
  }
  state.patches.push(patch)
}

/**
 * 提交事务：
 * - 将最终草稿写入 SubscriptionRef，仅写入一次；
 * - 返回聚合后的 StateTransaction 结构，若当前无事务则返回 undefined。
 *
 * 说明：
 * - Debug / Devtools 事件的发出由调用方根据返回的 transaction 自行决定；
 * - 这里不直接依赖 DebugSink，避免 core 层产生环状依赖。
 */
export const commit = <S>(
  ctx: StateTxnContext<S>,
  stateRef: SubscriptionRef.SubscriptionRef<S>
): Effect.Effect<StateTransaction<S> | undefined> =>
  Effect.gen(function* () {
    const state = ctx.current
    if (!state) {
      return undefined
    }

    const { config } = ctx
    const now = config.now

    const finalState = state.draft

    // 单次写入底层 SubscriptionRef，确保对外只有一次状态提交与订阅通知。
    yield* SubscriptionRef.set(stateRef, finalState)

    const endedAt = now()
    const durationMs = Math.max(0, endedAt - state.startedAt)

    const transaction: StateTransaction<S> = {
      txnId: state.txnId,
      origin: state.origin,
      startedAt: state.startedAt,
      endedAt,
      durationMs,
      initialStateSnapshot: state.initialStateSnapshot,
      finalStateSnapshot: config.captureSnapshots
        ? finalState
        : undefined,
      patches: state.patches,
      moduleId: config.moduleId,
      instanceId: config.instanceId,
      runtimeId: config.runtimeId
    }

    // 清理当前事务
    ctx.current = undefined

    return transaction
  })

/**
 * abort：
 * - 终止当前事务并清理上下文；
 * - 不做任何 stateRef 写入；
 * - 由上层决定是否记录诊断/观测事件。
 */
export const abort = <S>(ctx: StateTxnContext<S>): void => {
  ctx.current = undefined
}
