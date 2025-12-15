import {
  Effect,
  Stream,
  SubscriptionRef,
  PubSub,
  Scope,
  Context,
  Ref,
  Fiber,
  FiberRef,
  Exit,
  Cause,
  Option,
  Queue,
  Deferred,
} from "effect"
import type { LogicPlan, ModuleRuntime as PublicModuleRuntime } from "./core/module.js"
import * as Lifecycle from "./Lifecycle.js"
import * as Debug from "./core/DebugSink.js"
import * as StateTransaction from "./core/StateTransaction.js"
import * as TaskRunner from "./core/TaskRunner.js"
import {
  getDefaultStateTxnInstrumentation,
  isDevEnv,
  StateTransactionConfigTag,
} from "./core/env.js"
import type { StateTransactionInstrumentation } from "./core/env.js"
import * as ReducerDiagnostics from "./core/ReducerDiagnostics.js"
import * as LifecycleDiagnostics from "./core/LifecycleDiagnostics.js"
import * as LogicDiagnostics from "./core/LogicDiagnostics.js"
import { globalLogicPhaseRef } from "./BoundApiRuntime.js"
import * as EffectOp from "../../effectop.js"
import * as EffectOpCore from "./EffectOpCore.js"
import type { StateTraitProgram } from "../state-trait/model.js"
import * as StateTraitConverge from "../state-trait/converge.js"
import * as StateTraitValidate from "../state-trait/validate.js"
import * as StateTraitSource from "../state-trait/source.js"
import * as RowId from "../state-trait/rowid.js"

/**
 * 进程级运行时注册表（debug-only / non-authoritative）：
 * - key：Module Tag（ModuleInstance 本身）；
 * - value：对应的 ModuleRuntime 实例。
 *
 * 约束：
 * - 这是一个“单槽表”：同一 Tag 只能映射到一个 runtime，无法表达多实例/多 root 正确语义；
 * - 禁止作为解析兜底（strict 默认下缺失提供者必须失败）；
 * - 仅允许用于 devtools/内部调试与过渡期的内部能力（并在可行时迁向显式句柄/Link）。
 */
const runtimeRegistry = new WeakMap<
  Context.Tag<any, PublicModuleRuntime<any, any>>,
  PublicModuleRuntime<any, any>
>()

/**
 * 按 moduleId + runtimeId 维度索引的运行时注册表：
 * - 主要用于 Devtools / 内部调试按实例定位 ModuleRuntime；
 * - key 形如 `${moduleId}::${runtimeId}`。
 */
const runtimeByInstanceKey = new Map<string, PublicModuleRuntime<any, any>>()

export const registerRuntime = <S, A>(
  tag: Context.Tag<any, PublicModuleRuntime<S, A>>,
  runtime: PublicModuleRuntime<S, A>
): void => {
  runtimeRegistry.set(
    tag as Context.Tag<any, PublicModuleRuntime<any, any>>,
    runtime as PublicModuleRuntime<any, any>
  )
}

export const unregisterRuntime = (
  tag: Context.Tag<any, PublicModuleRuntime<any, any>>
): void => {
  runtimeRegistry.delete(tag)
}

export const getRegisteredRuntime = <S, A>(
  tag: Context.Tag<any, PublicModuleRuntime<S, A>>
): PublicModuleRuntime<S, A> | undefined =>
  runtimeRegistry.get(
    tag as Context.Tag<any, PublicModuleRuntime<any, any>>
  ) as PublicModuleRuntime<S, A> | undefined

export const getRuntimeByModuleAndInstance = <S, A>(
  moduleId: string,
  instanceId: string,
): PublicModuleRuntime<S, A> | undefined =>
  runtimeByInstanceKey.get(
    `${moduleId}::${instanceId}`,
  ) as PublicModuleRuntime<S, A> | undefined

export interface ModuleRuntimeOptions<S, A, R = never> {
  readonly tag?: Context.Tag<any, PublicModuleRuntime<S, A>>
  /**
   * 当前实例 scope（imports-scope）下可解析的“子模块”清单：
   * - 仅用于构造最小化的 imports injector（ModuleToken -> ModuleRuntime）；
   * - 禁止把完整 Context 捕获进 ModuleRuntime（避免 root/base services 被意外引用）。
   */
  readonly imports?: ReadonlyArray<
    Context.Tag<any, PublicModuleRuntime<any, any>>
  >
  readonly logics?: ReadonlyArray<
    Effect.Effect<any, any, R> | LogicPlan<any, R, any>
  >
  readonly moduleId?: string
  readonly createState?: Effect.Effect<SubscriptionRef.SubscriptionRef<S>, never, Scope.Scope>
  readonly createActionHub?: Effect.Effect<PubSub.PubSub<A>, never, Scope.Scope>
  /**
   * Primary Reducer 映射：`_tag -> (state, action) => nextState`。
   *
   * - 若提供，则 dispatch 会在发布 Action 之前先同步应用对应 reducer；
   * - 若某个 `_tag` 未定义 reducer，则行为与当前 watcher-only 模式一致。
   */
  readonly reducers?: Readonly<Record<string, (state: S, action: A) => S>>
  /**
   * 模块级 StateTransaction 配置：
   * - 若提供 instrumentation，则优先于 Runtime 级配置与 NODE_ENV 默认；
   * - 若未提供，则退回到 Runtime 级配置（如有）或 getDefaultStateTxnInstrumentation()。
   */
  readonly stateTransaction?: {
    readonly instrumentation?: StateTransactionInstrumentation
    readonly traitConvergeBudgetMs?: number
    readonly traitConvergeMode?: "full" | "dirty"
  }
}

type PhaseRef = { current: "setup" | "run" }

const createPhaseRef = (): PhaseRef => ({ current: "run" })

type ImportsScope = {
  readonly kind: "imports-scope"
  readonly get: (
    module: Context.Tag<any, PublicModuleRuntime<any, any>>,
  ) => PublicModuleRuntime<any, any> | undefined
}

const getMiddlewareStack = (): Effect.Effect<
  EffectOp.MiddlewareStack,
  never,
  never
> =>
  Effect.serviceOption(EffectOpCore.EffectOpMiddlewareTag).pipe(
    Effect.map((maybe) =>
      Option.isSome(maybe) ? maybe.value.stack : [],
    ),
  )

export const make = <S, A, R = never>(
  initialState: S,
  options: ModuleRuntimeOptions<S, A, R> = {}
): Effect.Effect<PublicModuleRuntime<S, A>, never, Scope.Scope | R> => {
  const program = Effect.gen(function* () {
    const stateRef = options.createState
      ? yield* options.createState
      : yield* SubscriptionRef.make(initialState)
    const actionHub = options.createActionHub
      ? yield* options.createActionHub
      : yield* PubSub.unbounded<A>()
    const lifecycle = yield* Lifecycle.makeLifecycleManager

    const id = Math.random().toString(36).slice(2)

    // 解析 StateTransaction 观测级别：
    // - 优先使用 ModuleRuntimeOptions.stateTransaction.instrumentation；
    // - 其次尝试从 Runtime 级 StateTransactionConfig Service 读取默认值；
    // - 最后退回到基于 NODE_ENV 的默认策略。
    const runtimeConfigOpt = yield* Effect.serviceOption(StateTransactionConfigTag)
    const runtimeInstrumentation: StateTransactionInstrumentation | undefined =
      Option.isSome(runtimeConfigOpt)
        ? runtimeConfigOpt.value.instrumentation
        : undefined
    const runtimeTraitConvergeBudgetMs: number | undefined =
      Option.isSome(runtimeConfigOpt)
        ? runtimeConfigOpt.value.traitConvergeBudgetMs
        : undefined
    const runtimeTraitConvergeMode: "full" | "dirty" | undefined =
      Option.isSome(runtimeConfigOpt)
        ? runtimeConfigOpt.value.traitConvergeMode
        : undefined

    const instrumentation: StateTransactionInstrumentation =
      options.stateTransaction?.instrumentation ??
      runtimeInstrumentation ??
      getDefaultStateTxnInstrumentation()

    const normalizeBudgetMs = (ms: unknown): number | undefined =>
      typeof ms === "number" && Number.isFinite(ms) && ms > 0 ? ms : undefined

    const traitConvergeBudgetMs: number =
      normalizeBudgetMs(options.stateTransaction?.traitConvergeBudgetMs) ??
      normalizeBudgetMs(runtimeTraitConvergeBudgetMs) ??
      200

    const normalizeConvergeMode = (mode: unknown): "full" | "dirty" | undefined =>
      mode === "full" || mode === "dirty" ? mode : undefined

    const traitConvergeMode: "full" | "dirty" =
      normalizeConvergeMode(options.stateTransaction?.traitConvergeMode) ??
      normalizeConvergeMode(runtimeTraitConvergeMode) ??
      "full"

    // StateTransaction 上下文：
    // - 按 ModuleRuntime 维度维护单活跃事务；
    // - 聚合本实例下所有逻辑入口（dispatch / Traits / source-refresh 等）的状态写入；
    // - 后续新增的入口（如 service 回写 / devtools 操作）也必须通过同一上下文与队列接入。
    const txnContext = StateTransaction.makeContext<S>({
      moduleId: options.moduleId,
      runtimeId: id,
      instrumentation,
    })

    // StateTrait Program（由 StateTrait.install 注册）：
    // - 运行时在每次事务提交前对其执行派生收敛（0/1 commit 语义的核心）。
    let stateTraitProgram: StateTraitProgram<any> | undefined
    let stateTraitListConfigs: ReadonlyArray<RowId.ListConfig> = []
    const rowIdStore = new RowId.RowIdStore()

    /**
     * 事务历史：
     * - 按 ModuleRuntime 维度维护最近若干 StateTransaction 记录；
     * - 仅用于 dev/test 环境下的 Devtools 能力（如时间旅行、事务概要视图）；
     * - 容量控制在有限上界，避免长期运行场景下内存无限增长。
     */
    const maxTxnHistory = 500
    const txnHistory: Array<StateTransaction.StateTransaction<S>> = []
    const txnById = new Map<string, StateTransaction.StateTransaction<S>>()

    /**
     * 事务队列：
     * - 按 FIFO 顺序串行执行每个逻辑入口（dispatch / source-refresh / 后续扩展）；
     * - 单实例内保证一次只处理一个事务，不同实例之间仍可并行。
     */
    const txnQueue = yield* Queue.unbounded<Effect.Effect<void, never, any>>()

    // 后台消费 Fiber：依次执行队列中的事务 Effect。
    yield* Effect.forkScoped(
      Effect.forever(
        Effect.gen(function* () {
          const eff = yield* Queue.take(txnQueue)
          yield* eff
        }),
      ),
    )

    /**
     * 将给定事务 Effect 入队，并在当前 Fiber 中等待其完成：
     * - 确保所有逻辑入口都通过同一个队列串行执行；
     * - 调用方仍以单次 Effect 的形式感知该入口（保持原有 API 形状）。
     */
    const enqueueTransaction = <A2, E2, R2>(
      eff: Effect.Effect<A2, E2, R2>,
    ): Effect.Effect<A2, E2, never> =>
      Effect.gen(function* () {
        const done = yield* Deferred.make<Exit.Exit<A2, E2>>()

        // 任务必须“永不失败”，否则会卡死队列消费 Fiber。
        const task: Effect.Effect<void, never, any> = eff.pipe(
          Effect.exit,
          Effect.flatMap((exit) => Deferred.succeed(done, exit)),
          Effect.asVoid,
        )

        yield* Queue.offer(txnQueue, task)

        const exit = yield* Deferred.await(done)
        return yield* Exit.match(exit, {
          onFailure: (cause) => Effect.failCause(cause),
          onSuccess: (value) => Effect.succeed(value),
        })
      })

    const makeLinkId = (): string =>
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

    /**
     * runOperation：
     * - 统一的边界操作执行入口（防呆基座）；
     * - 自动补齐 meta（moduleId/runtimeId/txnId/linkId/runtimeLabel...）；
     * - 统一进入 middleware stack（空 stack 直通）。
     */
    const runOperation = <A2, E2, R2>(
      kind: EffectOp.EffectOp["kind"],
      name: string,
      params: {
        readonly payload?: unknown
        readonly meta?: EffectOp.EffectOp["meta"]
      },
      eff: Effect.Effect<A2, E2, R2>,
    ): Effect.Effect<A2, E2, R2> =>
      Effect.gen(function* () {
        const stack = yield* getMiddlewareStack()

        const currentTxnId = txnContext.current?.txnId
        const existingLinkId = yield* FiberRef.get(EffectOpCore.currentLinkId)
        const linkId = existingLinkId ?? makeLinkId()

        const runtimeLabel = yield* FiberRef.get(Debug.currentRuntimeLabel)

        const baseMeta: EffectOp.EffectOp["meta"] = {
          ...(params.meta ?? {}),
          // Runtime 自动补齐
          moduleId: (params.meta as any)?.moduleId ?? options.moduleId,
          runtimeId: (params.meta as any)?.runtimeId ?? id,
          runtimeLabel: (params.meta as any)?.runtimeLabel ?? runtimeLabel,
          txnId: (params.meta as any)?.txnId ?? currentTxnId,
          linkId,
        }

        const op = EffectOp.make<A2, E2, R2>({
          kind,
          name,
          payload: params.payload,
          effect: eff,
          meta: baseMeta,
        })

        const program = stack.length ? EffectOp.run(op, stack) : op.effect

        // linkId：边界起点创建，嵌套复用（跨模块共享同一 FiberRef）。
        return yield* Effect.locally(EffectOpCore.currentLinkId, linkId)(program)
      })

    yield* runOperation(
      "lifecycle",
      "module:init",
      { meta: { moduleId: options.moduleId, runtimeId: id } },
      Debug.record({
        type: "module:init",
        moduleId: options.moduleId,
        runtimeId: id,
      }),
    )

    // 初始状态快照：
    // - 通过 state:update 事件将 Module 的初始状态写入 Debug 流，
    // - 便于 DevTools 在没有任何业务交互时就能看到「Current State」，
    // - 同时为 timeline 提供第 0 帧状态，后续事件可以基于它做 time-travel 视图。
    const initialSnapshot = yield* SubscriptionRef.get(stateRef)
    yield* runOperation(
      "state",
      "state:init",
      { meta: { moduleId: options.moduleId, runtimeId: id } },
      Debug.record({
        type: "state:update",
        moduleId: options.moduleId,
        state: initialSnapshot,
        runtimeId: id,
      }),
    )

    /**
     * 读取当前状态：
     * - 若存在活跃事务，则返回事务草稿；
     * - 否则回退到底层 SubscriptionRef 快照。
     */
    const readState: Effect.Effect<S> = Effect.gen(function* () {
      const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)
      const current = txnContext.current
      if (inTxn && current) return current.draft
      return yield* SubscriptionRef.get(stateRef)
    })

    /**
     * setStateInternal：
     * - 在活跃事务内：仅更新草稿并记录 Patch（整棵 State 为粒度），不直接写入底层 Ref；
     * - 在无事务时：保持旧行为，直接写入 SubscriptionRef 并发出一次 state:update Debug 事件。
     *
     * 说明：
     * - Patch 的 path 暂时统一为 "*"，后续在接入 StateTrait Patch 模型时再细化为字段级路径。
     */
    const setStateInternal = (
      next: S,
      patch: StateTransaction.StatePatch,
    ): Effect.Effect<void> =>
      Effect.gen(function* () {
        const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)
        if (inTxn && txnContext.current) {
          StateTransaction.updateDraft(txnContext, next, patch)
          return
        }

        // 非事务 fiber 的写入必须入队：避免并发更新绕过 txnQueue。
        yield* enqueueTransaction(
          runOperation(
            "state",
            "state:update",
            {
              payload: next,
              meta: { moduleId: options.moduleId, runtimeId: id },
            },
            runWithStateTransaction(
              {
                kind: "state",
                name: "setState",
              },
              () =>
                Effect.sync(() => {
                  // 事务开始时的 baseState 由 runWithStateTransaction 注入，这里只需更新草稿。
                  StateTransaction.updateDraft(txnContext, next, patch)
                }),
            ),
          ),
        )
      })

    /**
     * runWithStateTransaction：
     * - 为一次逻辑入口（dispatch / source-refresh / 后续扩展）开启事务；
     * - 在 body 中聚合所有状态写入，结束时统一 commit + state:update Debug 事件；
     * - 由调用方保证 body 不跨越长 IO 边界（详见 spec 中关于事务窗口的约束）。
     */
    const runWithStateTransaction = <E2>(
      origin: StateTransaction.StateTxnOrigin,
      body: () => Effect.Effect<void, E2, any>,
    ): Effect.Effect<void, E2, any> =>
      Effect.locally(TaskRunner.inSyncTransactionFiber, true)(
        Effect.gen(function* () {
          const baseState = yield* SubscriptionRef.get(stateRef)

          StateTransaction.beginTransaction(
            txnContext,
            origin,
            baseState,
          )
          ;(txnContext.current as any).stateTraitValidateRequests = []

          const txnId = txnContext.current?.txnId

          const exit = yield* Effect.exit(
            Effect.locally(Debug.currentTxnId, txnId)(
              Effect.gen(function* () {
              // 事务窗口内的 Trait 汇总信息（用于 Devtools/诊断展示）。
              let traitSummary: unknown | undefined

              // 在事务窗口内执行具体逻辑（reducer / watcher writeback / traits 等）。
              yield* body()

              // StateTrait：在提交前执行派生收敛（computed/link 等），确保单窗口 0/1 commit。
              if (stateTraitProgram && txnContext.current) {
                const convergeExit = yield* Effect.exit(
                  StateTraitConverge.convergeInTransaction(
                    stateTraitProgram as any,
                    {
                      moduleId: options.moduleId,
                      runtimeId: id,
                      now: txnContext.config.now,
                      budgetMs: traitConvergeBudgetMs,
                      mode: traitConvergeMode,
                      dirtyPaths: (txnContext.current as any)?.dirtyPaths as
                        | ReadonlySet<string>
                        | undefined,
                      getDraft: () => txnContext.current!.draft as any,
                      setDraft: (next) => {
                        StateTransaction.updateDraft(txnContext, next as any)
                      },
                      recordPatch: (patch) => {
                        StateTransaction.recordPatch(txnContext, patch)
                      },
                    } as StateTraitConverge.ConvergeContext<any>,
                  ),
                )

                if (convergeExit._tag === "Failure") {
                  const errors = [
                    ...Cause.failures(convergeExit.cause),
                    ...Cause.defects(convergeExit.cause),
                  ]
                  const configError = errors.find(
                    (err): err is StateTraitConverge.StateTraitConfigError =>
                      err instanceof StateTraitConverge.StateTraitConfigError,
                  )

                  if (configError) {
                    const fields = configError.fields ?? []
                    yield* Debug.record({
                      type: "diagnostic",
                      moduleId: options.moduleId,
                      runtimeId: id,
                      txnId,
                      trigger: origin,
                      code: "state_trait::config_error",
                      severity: "error",
                      message: configError.message,
                      hint:
                        configError.code === "CYCLE_DETECTED"
                          ? `computed/link 图存在循环：${fields.join(", ")}`
                          : `同一字段存在多个 writer：${fields.join(", ")}`,
                      kind: `state_trait_config_error:${configError.code}`,
                    })
                  }

                  return yield* Effect.failCause(convergeExit.cause)
                }

                const outcome = convergeExit.value

                traitSummary = {
                  converge: outcome.summary
                    ? {
                        ...outcome.summary,
                        outcome: outcome._tag,
                        degradedReason:
                          outcome._tag === "Degraded"
                            ? outcome.reason
                            : undefined,
                      }
                    : {
                        outcome: outcome._tag,
                      },
                }

                if (outcome._tag === "Degraded") {
                  yield* Debug.record({
                    type: "diagnostic",
                    moduleId: options.moduleId,
                    runtimeId: id,
                    code:
                      outcome.reason === "budget_exceeded"
                        ? "trait::budget_exceeded"
                        : "trait::runtime_error",
                    severity: "warning",
                    message:
                      outcome.reason === "budget_exceeded"
                        ? "Trait converge exceeded budget; derived fields are frozen for this operation window."
                        : "Trait converge failed at runtime; derived fields are frozen for this operation window.",
                    hint:
                      outcome.reason === "budget_exceeded"
                        ? "检查 computed/check 是否包含重型计算；将其下放到 source/task 或拆分为可缓存的派生。"
                        : "检查 computed/link/check 是否有异常输入或不纯逻辑；必要时补充 equals 或 guard。",
                    kind: "trait_degraded",
                  })
                }
              }

              // TraitLifecycle scoped validate：在 converge 之后统一 flush（保证校验读取到最新派生）。
              if (stateTraitProgram && txnContext.current) {
                const pending = (txnContext.current as any)
                  .stateTraitValidateRequests as
                  | ReadonlyArray<StateTraitValidate.ScopedValidateRequest>
                  | undefined

                if (pending && pending.length > 0) {
                  yield* StateTraitValidate.validateInTransaction(
                    stateTraitProgram as any,
                    {
                      moduleId: options.moduleId,
                      runtimeId: id,
                      getDraft: () => txnContext.current!.draft as any,
                      setDraft: (next) => {
                        StateTransaction.updateDraft(txnContext, next as any)
                      },
                      recordPatch: (patch) => {
                        StateTransaction.recordPatch(txnContext, patch)
                      },
                    } as StateTraitValidate.ValidateContext<any>,
                    pending,
                  )
                }
              }

              // Source key 变空同步回收为 idle（避免 tearing / 幽灵数据）。
              if (stateTraitProgram && txnContext.current) {
                yield* StateTraitSource.syncIdleInTransaction(
                  stateTraitProgram as any,
                  {
                    moduleId: options.moduleId,
                    runtimeId: id,
                    getDraft: () => txnContext.current!.draft as any,
                    setDraft: (next) => {
                      StateTransaction.updateDraft(txnContext, next as any)
                    },
                    recordPatch: (patch) => {
                      StateTransaction.recordPatch(txnContext, patch)
                    },
                  } as StateTraitSource.SourceSyncContext<any>,
                )
              }

              // 提交事务：单次写入底层状态，并发出一次聚合后的 state:update 事件。
              yield* runOperation(
                "state",
                "state:update",
                { meta: { moduleId: options.moduleId, runtimeId: id } },
                Effect.gen(function* () {
                  const replayEvent = (txnContext.current as any)
                    ?.lastReplayEvent as unknown
                  const txn = yield* StateTransaction.commit(txnContext, stateRef)

                  if (txn) {
                    // 记录事务历史：仅在 dev/test 场景用于调试与 Devtools，不参与业务逻辑。
                    txnHistory.push(txn)
                    txnById.set(txn.txnId, txn)
                    if (txnHistory.length > maxTxnHistory) {
                      const oldest = txnHistory.shift()
                      if (oldest) {
                        txnById.delete(oldest.txnId)
                      }
                    }

                    const nextState =
                      txn.finalStateSnapshot !== undefined
                        ? txn.finalStateSnapshot
                        : yield* SubscriptionRef.get(stateRef)

                    // RowID 虚拟身份层：在每次可观察提交后对齐映射，
                    // 确保数组 insert/remove/reorder 下的 in-flight 门控与缓存复用稳定可用。
                    if (stateTraitListConfigs.length > 0) {
                      rowIdStore.updateAll(nextState as any, stateTraitListConfigs)
                    }

                    yield* Debug.record({
                      type: "state:update",
                      moduleId: options.moduleId,
                      state: nextState,
                      runtimeId: id,
                      txnId: txn.txnId,
                      patchCount: txn.patches.length,
                      originKind: txn.origin.kind,
                      originName: txn.origin.name,
                      traitSummary,
                      replayEvent: replayEvent as any,
                    })
                  }
                }),
              )
              }),
            ),
          )

          if (exit._tag === "Failure") {
            // 失败时必须清理事务上下文，避免泄漏到后续入口。
            StateTransaction.abort(txnContext)
            return yield* Effect.failCause(exit.cause)
          }
        }),
      )

    // Primary Reducer 映射：初始值来自 options.reducers，并允许在运行时通过内部钩子追加（用于 $.reducer 语法糖）。
    const reducerMap = new Map<string, (state: S, action: A) => S>()
    if (options.reducers) {
      for (const [key, fn] of Object.entries(options.reducers)) {
        reducerMap.set(key, fn as (state: S, action: A) => S)
      }
    }

    // 记录每个 Action Tag 是否已经被派发过，用于诊断“迟到的 reducer 注册”等配置错误。
    const dispatchedTags = new Set<string>()

    const registerReducer = (tag: string, fn: (state: S, action: A) => S): void => {
      if (reducerMap.has(tag)) {
        // 重复注册：抛出带有额外上下文的配置错误，后续在 catchAllCause 中统一解析并发出诊断事件。
        throw ReducerDiagnostics.makeReducerError(
          "ReducerDuplicateError",
          tag,
          options.moduleId
        )
      }
      if (dispatchedTags.has(tag)) {
        // 在该 Tag 已经发生过 dispatch 之后才注册 reducer：视为危险配置，同样通过自定义错误类型暴露给诊断逻辑。
        throw ReducerDiagnostics.makeReducerError(
          "ReducerLateRegistrationError",
          tag,
          options.moduleId
        )
      }
      reducerMap.set(tag, fn)
    }

    const applyPrimaryReducer = (action: A) => {
      const tag = (action as any)?._tag ?? (action as any)?.type
      if (tag == null || reducerMap.size === 0) {
        return Effect.void
      }
      const tagKey = String(tag)
      dispatchedTags.add(tagKey)
      const reducer = reducerMap.get(tagKey)
      if (!reducer) {
        return Effect.void
      }

      return readState.pipe(
        Effect.flatMap((prev) => {
          const next = reducer(prev, action)
          // reducer 级写入在事务内聚合为一次提交；Patch path 暂时以 "*" 表示。
          return setStateInternal(next, {
            path: "*",
            to: next,
            reason: "reducer",
          })
        })
      )
    }

    /**
     * runDispatch：
     * - 以 { kind: "action" } 入口开启事务；
     * - 在事务内执行 Primary Reducer + Debug action 事件 + Action 发布；
     * - 提交逻辑与 state:update Debug 事件由 runWithStateTransaction 统一处理。
     */
    const runDispatch = (action: A): Effect.Effect<void, never, any> =>
      runOperation(
        "action",
        "action:dispatch",
        {
          payload: action,
          meta: { moduleId: options.moduleId, runtimeId: id },
        },
        runWithStateTransaction(
          {
            kind: "action",
            name: "dispatch",
            details: {
              _tag: (action as any)?._tag ?? (action as any)?.type,
            },
          },
          () =>
            Effect.gen(function* () {
              // 先应用 Primary Reducer（可能是 no-op）。
              yield* applyPrimaryReducer(action)

              // 记录 Action 派发事件（用于 Devtools/诊断）。
              yield* Debug.record({
                type: "action:dispatch",
                moduleId: options.moduleId,
                action,
                runtimeId: id,
                txnId: txnContext.current?.txnId,
              })

              // 将 Action 发布给所有 watcher（Logic / Flow）。
              yield* PubSub.publish(actionHub, action)
            }),
        ),
      )

    const runtime: PublicModuleRuntime<S, A> = {
      id,
      // 将 moduleId 暴露到 Runtime 上，便于 React / Devtools 在视图层关联 Module 信息。
      moduleId: options.moduleId,
      getState: readState,
      setState: (next) =>
        setStateInternal(next, {
          path: "*",
          to: next,
          reason: "state:set",
        }),
      dispatch: (action) =>
        // 将事务请求排入队列，保证单实例内按 FIFO 串行执行。
        enqueueTransaction(runDispatch(action)),
      actions$: Stream.fromPubSub(actionHub),
      changes: <V>(selector: (s: S) => V) =>
        Stream.map(stateRef.changes, selector).pipe(Stream.changes),
      ref: <V = S>(selector?: (s: S) => V): SubscriptionRef.SubscriptionRef<V> => {
        if (!selector) {
          return stateRef as unknown as SubscriptionRef.SubscriptionRef<V>
        }

        // 只读派生视图：通过 selector 从主状态派生值，并禁止写入
        const readonlyRef = {
          get: Effect.map(SubscriptionRef.get(stateRef), selector),
          modify: () => Effect.dieMessage("Cannot write to a derived ref"),
        } as unknown as Ref.Ref<V>

        const derived = {
          // SubscriptionRef 内部实现会访问 self.ref / self.pubsub / self.semaphore
          ref: readonlyRef,
          pubsub: {
            publish: () => Effect.succeed(true),
          },
          semaphore: {
            withPermits:
              () =>
              <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
                self,
          },
          get: readonlyRef.get,
          modify: readonlyRef.modify,
          // 派生流：对原始 stateRef.changes 做 selector 映射 + 去重
          changes: Stream.map(stateRef.changes, selector).pipe(
            Stream.changes
          ) as Stream.Stream<V>,
        } as unknown as SubscriptionRef.SubscriptionRef<V>

        return derived
      }
    }

    // 构造最小化的 imports-scope injector：
    // - 只保存 ModuleToken -> ModuleRuntime 映射；
    // - 严禁把完整 Context 捕获进 runtime（避免 root/base services 被意外引用导致泄漏）。
    const importsMap = new Map<
      Context.Tag<any, PublicModuleRuntime<any, any>>,
      PublicModuleRuntime<any, any>
    >()

    for (const imported of options.imports ?? []) {
      const maybe = yield* Effect.serviceOption(imported)
      if (Option.isSome(maybe)) {
        importsMap.set(imported, maybe.value)
      }
    }

    const importsScope: ImportsScope = {
      kind: "imports-scope",
      get: (module) => importsMap.get(module),
    }

    ;(runtime as any).__importsScope = importsScope
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        importsMap.clear()
        ;(runtime as any).__importsScope = undefined
      }),
    )

    const instanceKey =
      options.moduleId != null ? `${options.moduleId}::${id}` : undefined


    if (instanceKey) {
      runtimeByInstanceKey.set(
        instanceKey,
        runtime as PublicModuleRuntime<any, any>,
      )
    }

    // 暴露内部 StateTransaction 配置，便于测试与诊断在不同配置源下的观测级别决策。
    ;(runtime as any).__stateTransactionInstrumentation = instrumentation

    // 将内部注册函数暴露给 BoundApiRuntime，用于实现 $.reducer 语法糖。
    ;(runtime as any).__registerReducer = registerReducer

    // StateTrait Program 注册入口：由 StateTrait.install 调用，将 Program 下发到 Runtime 内核。
    ;(runtime as any).__registerStateTraitProgram = (
      program: StateTraitProgram<any>,
    ): void => {
      stateTraitProgram = program
      stateTraitListConfigs = RowId.collectListConfigs(program.spec as any)
    }

    // RowID Store：仅供 StateTrait/source 与 TraitLifecycle/Devtools 等内部能力使用。
    ;(runtime as any).__rowIdStore = rowIdStore

    // TraitLifecycle scoped validate：将请求挂到当前事务，等待在 converge 之后统一 flush。
    ;(runtime as any).__enqueueStateTraitValidateRequest = (
      request: StateTraitValidate.ScopedValidateRequest,
    ): void => {
      if (!txnContext.current) return
      const current: any = txnContext.current
      const list: Array<StateTraitValidate.ScopedValidateRequest> =
        current.stateTraitValidateRequests ?? []
      list.push(request)
      current.stateTraitValidateRequests = list
    }

    // 仅供内部使用：在当前 Runtime 的 StateTransaction 上记录字段级 Patch。
    ;(runtime as any).__recordStatePatch = (
      patch: {
        readonly path: string
        readonly from?: unknown
        readonly to?: unknown
        readonly reason: StateTransaction.PatchReason
        readonly traitNodeId?: string
        readonly stepId?: string
      },
    ): void => {
      StateTransaction.recordPatch(txnContext, patch)
    }

    // 仅供内部使用：将 ReplayLog 事件记录到当前事务，以便在 state:update 中关联 replayEvent。
    ;(runtime as any).__recordReplayEvent = (event: unknown): void => {
      if (!txnContext.current) return
      const current: any = txnContext.current
      current.lastReplayEvent = {
        ...(event as any),
        txnId: current.txnId,
        trigger: current.origin,
      }
    }

    // 仅供内部使用：为 BoundApi / Traits 等入口提供统一的事务执行助手，
    // 确保 source-refresh 等逻辑入口与 dispatch 共享同一队列与 StateTransaction 语义。
    ;(runtime as any).__runWithStateTransaction = (
      origin: StateTransaction.StateTxnOrigin,
      body: () => Effect.Effect<void, never, any>,
    ): Effect.Effect<void> =>
      enqueueTransaction(
        runOperation(
          (origin.kind as any) as EffectOp.EffectOp["kind"],
          origin.name ? `txn:${origin.name}` : "txn",
          { meta: { moduleId: options.moduleId, runtimeId: id } },
          runWithStateTransaction(origin, body),
        ),
      )

    // 仅供 Devtools / 测试使用：基于已有 StateTransaction 快照回放指定事务前/后的状态。
    ;(runtime as any).__applyTransactionSnapshot = (
      txnId: string,
      mode: "before" | "after",
    ): Effect.Effect<void> =>
      enqueueTransaction(
        Effect.gen(function* () {
          // 生产环境默认不启用时间旅行，避免误用；
          // Devtools 应在 dev/test 环境下结合 instrumentation = "full" 使用该能力。
          if (!isDevEnv()) {
            return
          }

          const txn = txnById.get(txnId)
          if (!txn) {
            return
          }

          const targetState =
            mode === "before"
              ? txn.initialStateSnapshot
              : txn.finalStateSnapshot

          if (targetState === undefined) {
            // 在未采集快照的配置下无法进行时间旅行。
            return
          }

          // 使用 StateTransaction 记录一次 origin.kind = "devtools" 的回放操作，
          // 以在 Devtools 事务视图中留下完整的 time-travel 轨迹。
          yield* runWithStateTransaction(
            {
              kind: "devtools",
              name: "time-travel",
              details: {
                baseTxnId: txnId,
                mode,
              },
            },
            () =>
              Effect.sync(() => {
                StateTransaction.updateDraft(
                  txnContext,
                  targetState as S,
                  {
                    path: "*",
                    reason: "devtools",
                  },
                )
              }),
          )
        }),
      )

    // 注册 Runtime，供跨模块访问（Link 等）使用
    if (options.tag) {
      registerRuntime(options.tag as Context.Tag<any, PublicModuleRuntime<S, A>>, runtime)
    }

    yield* Effect.addFinalizer(() =>
      lifecycle.runDestroy.pipe(
        Effect.flatMap(() =>
          runOperation(
            "lifecycle",
            "module:destroy",
            { meta: { moduleId: options.moduleId, runtimeId: id } },
            Debug.record({
              type: "module:destroy",
              moduleId: options.moduleId,
              runtimeId: id,
            }),
          ),
        ),
        Effect.tap(() =>
          Effect.sync(() => {
            if (options.tag) {
              unregisterRuntime(
                options.tag as Context.Tag<
                  any,
                  PublicModuleRuntime<any, any>
                >,
              )
            }
            if (instanceKey) {
              runtimeByInstanceKey.delete(instanceKey)
            }
          }),
        ),
      ),
    )

    if (options.tag && options.logics?.length) {
      const moduleIdForLogs = options.moduleId ?? "unknown"

      const withRuntimeAndLifecycle = <R2, E2, A2>(
        eff: Effect.Effect<A2, E2, R2>,
        phaseRef?: PhaseRef
      ) => {
        const withServices = Effect.provideService(
          Effect.provideService(
            eff,
            Lifecycle.LifecycleContext,
            lifecycle
          ),
          options.tag as Context.Tag<any, PublicModuleRuntime<S, A>>,
          runtime
        )

        // 为 Logic 内部的所有 Effect 日志打上 moduleId 等注解，便于在 Logger 层自动关联到具体 Module。
        const annotated = Effect.annotateLogs({
          "logix.moduleId": moduleIdForLogs,
        })(withServices as Effect.Effect<A2, E2, any>) as Effect.Effect<A2, E2, R2>

        if (!phaseRef) {
          return annotated
        }

        const phaseService: LogicDiagnostics.LogicPhaseService = {
          get current() {
            return phaseRef.current
          },
        }

        return Effect.provideService(
          annotated,
          LogicDiagnostics.LogicPhaseServiceTag,
          phaseService
        )
      }

      const handleLogicFailure = (cause: any) => {
        const phaseErrorMarker = [
          ...Cause.failures(cause),
          ...Cause.defects(cause),
        ].some((err) => (err as any)?._tag === "LogicPhaseError")

        const base = lifecycle.notifyError(cause, {
          phase: "logic.fork",
          moduleId: options.moduleId,
        }).pipe(
          Effect.flatMap(() =>
            runOperation(
              "lifecycle",
              "lifecycle:error",
              { payload: cause, meta: { moduleId: options.moduleId, runtimeId: id } },
              Debug.record({
                type: "lifecycle:error",
                moduleId: options.moduleId,
                cause,
                runtimeId: id,
              }),
            )
          ),
          Effect.tap(() =>
            LifecycleDiagnostics.emitMissingOnErrorDiagnosticIfNeeded(
              lifecycle,
              options.moduleId
            )
          ),
          Effect.tap(() =>
            ReducerDiagnostics.emitDiagnosticsFromCause(
              cause,
              options.moduleId
            )
          ),
          Effect.tap(() =>
            LogicDiagnostics.emitEnvServiceNotFoundDiagnosticIfNeeded(
              cause,
              options.moduleId
            )
          ),
          Effect.tap(() =>
            LogicDiagnostics.emitInvalidPhaseDiagnosticIfNeeded(
              cause,
              options.moduleId
            )
          )
        )

        // 对于 LogicPhaseError：只发诊断，不让整个 ModuleRuntime 构造失败，
        // 以免 runSync 路径被 AsyncFiberException 打断。
        if (phaseErrorMarker) {
          return base
        }

        return base.pipe(Effect.flatMap(() => Effect.failCause(cause)))
      }

      const isLogicPlan = (value: unknown): value is LogicPlan<any, any, any> =>
        Boolean(
          value &&
          typeof value === "object" &&
          "run" in (value as any) &&
          "setup" in (value as any)
        )

      const returnsLogicPlan = (value: unknown): boolean =>
        Boolean((value as any)?.__logicPlan === true)

      const extractPhaseRef = (value: unknown): PhaseRef | undefined =>
        (value as any)?.__phaseRef as PhaseRef | undefined

      const normalizeToPlan = (
        value: unknown
      ): LogicPlan<any, any, any> =>
        isLogicPlan(value)
          ? Object.assign(value as LogicPlan<any, any, any>, {
            __phaseRef: extractPhaseRef(value) ?? createPhaseRef(),
          })
          : Object.assign(
            {
              setup: Effect.void,
              run: value as Effect.Effect<any, any, any>,
            },
            { __phaseRef: extractPhaseRef(value) ?? createPhaseRef() }
          )

      for (const rawLogic of options.logics) {
        if (isLogicPlan(rawLogic)) {
          const phaseRef = extractPhaseRef(rawLogic) ?? createPhaseRef()
          const setupPhase = withRuntimeAndLifecycle(rawLogic.setup, phaseRef)
          const runPhase = withRuntimeAndLifecycle(rawLogic.run, phaseRef)

          phaseRef.current = "setup"
          globalLogicPhaseRef.current = "setup"
          yield* setupPhase.pipe(Effect.catchAllCause(handleLogicFailure))
          phaseRef.current = "run"
          globalLogicPhaseRef.current = "run"
          yield* Effect.forkScoped(
            runPhase.pipe(Effect.catchAllCause(handleLogicFailure))
          )
          continue
        }

        if (returnsLogicPlan(rawLogic)) {
          // logic 是返回 LogicPlan 的 Effect，需要运行一次以解析出 plan
          const phaseRef = extractPhaseRef(rawLogic) ?? createPhaseRef()
          const makeNoopPlan = (): LogicPlan<any, any, any> =>
            Object.assign(
              {
                setup: Effect.void,
                run: Effect.void,
              },
              {
                __phaseRef: phaseRef,
                // 标记为“仅用于 phase 诊断的占位 plan”，后续不再 fork run 段，
                // 以避免在 runSync 路径上产生 AsyncFiberException。
                __skipRun: true as const,
              }
            )

          phaseRef.current = "setup"
          globalLogicPhaseRef.current = "setup"
          const resolvedPlan = yield* withRuntimeAndLifecycle(
            rawLogic as Effect.Effect<any, any, any>,
            phaseRef
          ).pipe(
            Effect.matchCauseEffect({
              onSuccess: (value) =>
                Effect.succeed(normalizeToPlan(value)),
              onFailure: (cause) => {
                const isLogicPhaseError = [
                  ...Cause.failures(cause),
                  ...Cause.defects(cause),
                ].some((err) => (err as any)?._tag === "LogicPhaseError")

                if (isLogicPhaseError) {
                  // 对于 LogicPhaseError：仅记录诊断并继续构造一个 noop plan，
                  // 以避免让 ModuleRuntime.make 在 runSync 路径上失败。
                  return LogicDiagnostics.emitInvalidPhaseDiagnosticIfNeeded(
                    cause,
                    options.moduleId
                  ).pipe(
                    Effect.zipRight(handleLogicFailure(cause)),
                    Effect.as(makeNoopPlan())
                  )
                }

                // 其他错误：仍按硬错误处理 —— 先发诊断/错误，再 failCause 让上层感知。
                return LogicDiagnostics.emitEnvServiceNotFoundDiagnosticIfNeeded(
                  cause,
                  options.moduleId
                ).pipe(
                  Effect.zipRight(handleLogicFailure(cause)),
                  Effect.zipRight(Effect.failCause(cause))
                )
              },
            })
          )

          const planPhaseRef =
            extractPhaseRef(resolvedPlan) ??
            Object.assign(resolvedPlan, { __phaseRef: phaseRef }).__phaseRef
          const setupPhase = withRuntimeAndLifecycle(resolvedPlan.setup, planPhaseRef)
          const runPhase = withRuntimeAndLifecycle(resolvedPlan.run, planPhaseRef)

          // 如果是用于 phase 诊断的占位 plan，仅执行 setup 段（通常为 Effect.void），
          // 不再 fork run 段，保证整个 ModuleRuntime.make 在 runSync 下保持同步。
          const skipRun = (resolvedPlan as any).__skipRun === true

          planPhaseRef.current = "setup"
          globalLogicPhaseRef.current = "setup"
          yield* setupPhase.pipe(Effect.catchAllCause(handleLogicFailure))

          if (!skipRun) {
            planPhaseRef.current = "run"
            globalLogicPhaseRef.current = "run"
            yield* Effect.forkScoped(
              runPhase.pipe(Effect.catchAllCause(handleLogicFailure))
            )
          }
          continue
        }

        // 默认：单阶段 Logic，按旧有行为直接 fork；若逻辑完成后返回 LogicPlan，继续执行 setup/run。
        const basePhaseRef = extractPhaseRef(rawLogic)
        const runPhase = withRuntimeAndLifecycle(
          rawLogic as Effect.Effect<any, any, any>,
          basePhaseRef
        ).pipe(Effect.catchAllCause(handleLogicFailure))

        const runFiber = yield* Effect.forkScoped(runPhase)

        yield* Effect.forkScoped(
          Fiber.await(runFiber).pipe(
            Effect.flatMap((exit) =>
              Exit.match(exit, {
                onFailure: () => Effect.void,
                onSuccess: (value) => {
                  const executePlan = (
                    plan: LogicPlan<any, any, any>
                  ): Effect.Effect<void, unknown, any> => {
                    const phaseRef = extractPhaseRef(plan) ?? createPhaseRef()
                    const setupPhase = withRuntimeAndLifecycle(
                      plan.setup,
                      phaseRef
                    )
                    const runPlanPhase = withRuntimeAndLifecycle(
                      plan.run,
                      phaseRef
                    )

                    phaseRef.current = "setup"
                    globalLogicPhaseRef.current = "setup"
                    return setupPhase.pipe(
                      Effect.catchAllCause(handleLogicFailure),
                      Effect.tap(() =>
                        Effect.sync(() => {
                          phaseRef.current = "run"
                          globalLogicPhaseRef.current = "run"
                        })
                      ),
                      Effect.zipRight(
                        Effect.forkScoped(
                          runPlanPhase.pipe(
                            Effect.catchAllCause(handleLogicFailure)
                          )
                        )
                      ),
                      Effect.asVoid
                    )
                  }

                  if (isLogicPlan(value)) {
                    return executePlan(value)
                  }

                  if (returnsLogicPlan(value)) {
                    return withRuntimeAndLifecycle(
                      value as Effect.Effect<any, any, any>,
                      basePhaseRef
                    ).pipe(
                      Effect.map(normalizeToPlan),
                      Effect.matchCauseEffect({
                        onFailure: (cause) => handleLogicFailure(cause),
                        onSuccess: (plan) => executePlan(plan),
                      })
                    )
                  }

                  return Effect.void
                },
              })
            )
          )
        )
      }

      // 让已 fork 的 Logic 获得一次调度机会，确保初始 reducer 等同步注册完成，
      // 避免上层（如 Root processes）在逻辑未就绪时抢先派发 Action。
      yield* Effect.yieldNow()
    }

    return runtime
  })

  return program as Effect.Effect<PublicModuleRuntime<S, A>, never, Scope.Scope | R>
}
