import { Context, Effect, FiberRef, Option, Schema, Stream, SubscriptionRef } from "effect"
import { create } from "mutative"
import type * as Logix from "./core/module.js"
import * as Logic from "./core/LogicMiddleware.js"
import * as TaskRunner from "./core/TaskRunner.js"
import * as FlowRuntime from "./FlowRuntime.js"
import * as MatchBuilder from "./core/MatchBuilder.js"
import * as Platform from "./core/Platform.js"
import * as Lifecycle from "./Lifecycle.js"
import * as LogicDiagnostics from "./core/LogicDiagnostics.js"
import { isDevEnv } from "./core/env.js"
import type {
  AnyModuleShape,
  ModuleRuntime,
  StateOf,
  ActionOf,
} from "./core/module.js"
import type { ScopedValidateRequest } from "../state-trait/validate.js"

export const globalLogicPhaseRef: { current: "setup" | "run" } = {
  current: "run",
}

// 本地构造 IntentBuilder 工厂，等价于原 internal/dsl/LogicBuilder.makeIntentBuilderFactory
const LogicBuilderFactory = <Sh extends AnyModuleShape, R = never>(
  runtime: ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>
) => {
  const flowApi = FlowRuntime.make<Sh, R>(runtime)

  return <T>(
    stream: Stream.Stream<T>,
    triggerName?: string,
  ): Logic.IntentBuilder<T, Sh, R> => {
    const runWithStateTransaction: TaskRunner.TaskRunnerRuntime["runWithStateTransaction"] = (
      origin,
      body,
    ) => {
      const anyRuntime = runtime as any
      const fn:
        | ((
          o: {
            readonly kind: string
            readonly name?: string
            readonly details?: unknown
          },
          b: () => Effect.Effect<void, never, any>,
        ) => Effect.Effect<void, never, any>)
        | undefined = anyRuntime && anyRuntime.__runWithStateTransaction
      return fn ? fn(origin, body) : body()
    }

    const taskRunnerRuntime: TaskRunner.TaskRunnerRuntime = {
      moduleId: (runtime as any)?.moduleId,
      runWithStateTransaction,
    }

    const builder = {
      debounce: (ms: number) =>
        LogicBuilderFactory<Sh, R>(runtime)(
          flowApi.debounce<T>(ms)(stream),
          triggerName,
        ),
      throttle: (ms: number) =>
        LogicBuilderFactory<Sh, R>(runtime)(
          flowApi.throttle<T>(ms)(stream),
          triggerName,
        ),
      filter: (predicate: (value: T) => boolean) =>
        LogicBuilderFactory<Sh, R>(runtime)(
          flowApi.filter(predicate)(stream),
          triggerName,
        ),
      map: <U>(f: (value: T) => U) =>
        LogicBuilderFactory<Sh, R>(runtime)(
          stream.pipe(Stream.map(f)),
          triggerName,
        ),
      run<A = void, E = never, R2 = unknown>(
        eff:
          | Logic.Of<Sh, R & R2, A, E>
          | ((p: T) => Logic.Of<Sh, R & R2, A, E>),
        options?: Logic.OperationOptions,
      ): Logic.Of<Sh, R & R2, void, E> {
        return flowApi.run<T, A, E, R2>(eff, options)(stream)
      },
      runLatest<A = void, E = never, R2 = unknown>(
        eff:
          | Logic.Of<Sh, R & R2, A, E>
          | ((p: T) => Logic.Of<Sh, R & R2, A, E>),
        options?: Logic.OperationOptions,
      ): Logic.Of<Sh, R & R2, void, E> {
        return flowApi.runLatest<T, A, E, R2>(eff, options)(stream)
      },
      runExhaust<A = void, E = never, R2 = unknown>(
        eff:
          | Logic.Of<Sh, R & R2, A, E>
          | ((p: T) => Logic.Of<Sh, R & R2, A, E>),
        options?: Logic.OperationOptions,
      ): Logic.Of<Sh, R & R2, void, E> {
        return flowApi.runExhaust<T, A, E, R2>(eff, options)(stream)
      },
      runParallel<A = void, E = never, R2 = unknown>(
        eff:
          | Logic.Of<Sh, R & R2, A, E>
          | ((p: T) => Logic.Of<Sh, R & R2, A, E>),
        options?: Logic.OperationOptions,
      ): Logic.Of<Sh, R & R2, void, E> {
        return flowApi.runParallel<T, A, E, R2>(eff, options)(stream)
      },
      runFork: <A = void, E = never, R2 = unknown>(
        eff:
          | Logic.Of<Sh, R & R2, A, E>
          | ((p: T) => Logic.Of<Sh, R & R2, A, E>)
      ): Logic.Of<Sh, R & R2, void, E> =>
        Effect.forkScoped(flowApi.run<T, A, E, R2>(eff)(stream)).pipe(
          Effect.asVoid,
        ) as Logic.Of<Sh, R & R2, void, E>,
      runParallelFork: <A = void, E = never, R2 = unknown>(
        eff:
          | Logic.Of<Sh, R & R2, A, E>
          | ((p: T) => Logic.Of<Sh, R & R2, A, E>)
      ): Logic.Of<Sh, R & R2, void, E> =>
        Effect.forkScoped(
          flowApi.runParallel<T, A, E, R2>(eff)(stream),
        ).pipe(
          Effect.asVoid,
        ) as Logic.Of<Sh, R & R2, void, E>,
      runTask: <A = void, E = never, R2 = unknown>(
        config: TaskRunner.TaskRunnerConfig<T, Sh, R & R2, A, E>,
      ): Logic.Of<Sh, R & R2, void, never> =>
        TaskRunner.makeTaskRunner<T, Sh, R & R2, A, E>(
          stream,
          "task",
          taskRunnerRuntime,
          {
            ...config,
            triggerName: config.triggerName ?? triggerName,
          },
        ) as Logic.Of<Sh, R & R2, void, never>,
      runParallelTask: <A = void, E = never, R2 = unknown>(
        config: TaskRunner.TaskRunnerConfig<T, Sh, R & R2, A, E>,
      ): Logic.Of<Sh, R & R2, void, never> =>
        TaskRunner.makeTaskRunner<T, Sh, R & R2, A, E>(
          stream,
          "parallel",
          taskRunnerRuntime,
          {
            ...config,
            triggerName: config.triggerName ?? triggerName,
          },
        ) as Logic.Of<Sh, R & R2, void, never>,
      runLatestTask: <A = void, E = never, R2 = unknown>(
        config: TaskRunner.TaskRunnerConfig<T, Sh, R & R2, A, E>,
      ): Logic.Of<Sh, R & R2, void, never> =>
        TaskRunner.makeTaskRunner<T, Sh, R & R2, A, E>(
          stream,
          "latest",
          taskRunnerRuntime,
          {
            ...config,
            triggerName: config.triggerName ?? triggerName,
          },
        ) as Logic.Of<Sh, R & R2, void, never>,
      runExhaustTask: <A = void, E = never, R2 = unknown>(
        config: TaskRunner.TaskRunnerConfig<T, Sh, R & R2, A, E>,
      ): Logic.Of<Sh, R & R2, void, never> =>
        TaskRunner.makeTaskRunner<T, Sh, R & R2, A, E>(
          stream,
          "exhaust",
          taskRunnerRuntime,
          {
            ...config,
            triggerName: config.triggerName ?? triggerName,
          },
        ) as Logic.Of<Sh, R & R2, void, never>,
      toStream: () => stream,
      update: (
        reducer: (
          prev: StateOf<Sh>,
          payload: T
        ) =>
          | StateOf<Sh>
          | Effect.Effect<StateOf<Sh>, any, any>
      ): Logic.Of<Sh, R, void, never> =>
        Stream.runForEach(stream, (payload) =>
          taskRunnerRuntime.runWithStateTransaction(
            {
              kind: "watcher:update",
              name: triggerName,
            },
            () =>
              Effect.gen(function* () {
                const prev = (yield* runtime.getState) as StateOf<Sh>
                const next = reducer(prev, payload)
                if (Effect.isEffect(next)) {
                  const exit = yield* Effect.exit(
                    next as Effect.Effect<StateOf<Sh>, any, any>,
                  )
                  if (exit._tag === "Failure") {
                    yield* Effect.logError("Flow error", exit.cause)
                    return
                  }
                  yield* runtime.setState(exit.value as StateOf<Sh>)
                  return
                }
                yield* runtime.setState(next as StateOf<Sh>)
              }),
          )
        ).pipe(
          Effect.catchAllCause((cause) =>
            Effect.logError("Flow error", cause)
          )
        ) as Logic.Of<Sh, R, void, never>,
      mutate: (
        reducer: (draft: Logic.Draft<StateOf<Sh>>, payload: T) => void
      ): Logic.Of<Sh, R, void, never> =>
        Stream.runForEach(stream, (payload) =>
          taskRunnerRuntime.runWithStateTransaction(
            {
              kind: "watcher:mutate",
              name: triggerName,
            },
            () =>
              Effect.gen(function* () {
                const prev = (yield* runtime.getState) as StateOf<Sh>
                const next = create(prev as StateOf<Sh>, (draft) => {
                  reducer(draft as Logic.Draft<StateOf<Sh>>, payload)
                }) as StateOf<Sh>
                yield* runtime.setState(next)
              }),
          )
        ).pipe(
          Effect.catchAllCause((cause) =>
            Effect.logError("Flow error", cause)
          )
        ) as Logic.Of<Sh, R, void, never>,
    } as Omit<Logic.IntentBuilder<T, Sh, R>, "pipe" | "andThen">

    const andThen: Logic.IntentBuilder<T, Sh, R>["andThen"] = (
      handlerOrEff: any,
    ): any => {
      if (typeof handlerOrEff === "function") {
        if (handlerOrEff.length >= 2) {
          return (builder as any).update(handlerOrEff)
        }
        return (builder as any).run(handlerOrEff)
      }
      return (builder as any).run(handlerOrEff)
    }

    const pipe: Logic.IntentBuilder<T, Sh, R>["pipe"] = function (this: unknown) {
      // eslint-disable-next-line prefer-rest-params
      const fns = arguments as unknown as ReadonlyArray<
        (self: Logic.IntentBuilder<T, Sh, R>) => Logic.IntentBuilder<T, Sh, R>
      >
      let acc: Logic.IntentBuilder<T, Sh, R> = builder as Logic.IntentBuilder<
        T,
        Sh,
        R
      >
      for (let i = 0; i < fns.length; i++) {
        acc = fns[i](acc)
      }
      return acc
    }

    return Object.assign(builder, { pipe, andThen }) as Logic.IntentBuilder<
      T,
      Sh,
      R
    >
  }
}
import type { BoundApi } from "./core/module.js"
import type { StateTraitProgram } from "../state-trait/model.js"
import type { RowIdStore } from "../state-trait/rowid.js"

/**
 * BoundApi 实现：为某一类 Store Shape + Runtime 创建预绑定的 `$`。
 *
 * 说明：类型与入口签名在 api/BoundApi.ts 中声明，这里只承载具体实现。
 */
export function make<Sh extends Logix.AnyModuleShape, R = never>(
  shape: Sh,
  runtime: Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>,
  options?: {
    readonly getPhase?: () => "setup" | "run"
    readonly phaseService?: LogicDiagnostics.LogicPhaseService
    readonly moduleId?: string
  }
  ): BoundApi<Sh, R> {
  const getPhase = options?.getPhase ?? (() => globalLogicPhaseRef.current)
  const guardRunOnly = (kind: string, api: string) => {
    const phaseService = options?.phaseService
    const phase =
      phaseService?.current ??
      (globalLogicPhaseRef.current === "setup"
        ? "setup"
        : getPhase())
    if (phase === "setup") {
      throw LogicDiagnostics.makeLogicPhaseError(
        kind,
        api,
        "setup",
        options?.moduleId
      )
    }
  }
  const flowApi = FlowRuntime.make<Sh, R>(runtime)

  const makeIntentBuilder = (runtime_: Logix.ModuleRuntime<any, any>) =>
    LogicBuilderFactory<Sh, R>(runtime_)
  const withLifecycle = <A>(
    available: (
      manager: Lifecycle.LifecycleManager
    ) => Effect.Effect<A, never, any>,
    missing: () => Effect.Effect<A, never, any>
  ) =>
    Effect.serviceOption(Lifecycle.LifecycleContext).pipe(
      Effect.flatMap((maybe) =>
        Option.match(maybe, {
          onSome: available,
          onNone: missing,
        })
      )
    )
  const withPlatform = (
    invoke: (platform: Platform.Service) => Effect.Effect<void, never, any>
  ) =>
    Effect.serviceOption(Platform.Tag).pipe(
      Effect.flatMap((maybe) =>
        Option.match(maybe, {
          onSome: invoke,
          onNone: () => Effect.void,
        })
      )
    )
  const createIntentBuilder = <T>(
    stream: Stream.Stream<T>,
    triggerName?: string,
  ) => makeIntentBuilder(runtime)(stream, triggerName)

  /**
   * strict：只从“当前 Effect Env”解析某个 Module 的 Runtime。
   *
   * 说明：
   * - 多 root / 多实例场景下，任何进程级 registry 都无法表达正确语义；
   * - 缺失提供者属于装配错误：必须稳定失败，并给出可修复的提示（dev/test 下更详细）。
   */
  const resolveModuleRuntime = (
    tag: Context.Tag<any, Logix.ModuleRuntime<any, any>>
  ): Effect.Effect<Logix.ModuleRuntime<any, any>, never, any> =>
    Effect.gen(function* () {
      const requestedModuleId =
        typeof (tag as any)?.id === "string"
          ? ((tag as any).id as string)
          : undefined
      const fromModuleId =
        typeof options?.moduleId === "string" ? options.moduleId : undefined

      // 1) 优先尝试从当前 Context 中读取
      const fromEnv = yield* Effect.serviceOption(tag)
      if (Option.isSome(fromEnv)) {
        return fromEnv.value
      }

      // 2) 无法找到时直接 die —— 这是配置错误，提示调用方修正装配方式
      const tokenId = requestedModuleId ?? "<unknown module id>"
      const fix: string[] = isDevEnv()
        ? [
            "- Provide the child implementation in the same scope (imports).",
            `  Example: ${fromModuleId ?? "ParentModule"}.implement({ imports: [${requestedModuleId ?? "ChildModule"}.impl], ... })`,
            "- If you intentionally want a root singleton, provide it at app root (Runtime.make(...,{ layer }) / root imports),",
            "  and use Root.resolve(ModuleTag) (instead of $.use) at the callsite.",
          ]
        : []

      const err = new Error(
        isDevEnv()
          ? [
              "[MissingModuleRuntimeError] Cannot resolve ModuleRuntime for ModuleTag.",
              "",
              `tokenId: ${tokenId}`,
              "entrypoint: logic.$.use",
              "mode: strict",
              `from: ${fromModuleId ?? "<unknown module id>"}`,
              `startScope: moduleId=${fromModuleId ?? "<unknown>"}, runtimeId=${String((runtime as any)?.id ?? "<unknown>")}`,
              "",
              "fix:",
              ...fix,
            ].join("\n")
          : "[MissingModuleRuntimeError] module runtime not found",
      )

      ;(err as any).tokenId = tokenId
      ;(err as any).entrypoint = "logic.$.use"
      ;(err as any).mode = "strict"
      ;(err as any).from = fromModuleId
      ;(err as any).startScope = {
        moduleId: fromModuleId,
        runtimeId: String((runtime as any)?.id ?? "<unknown>"),
      }
      ;(err as any).fix = fix

      err.name = "MissingModuleRuntimeError"
      return yield* Effect.die(err)
    })

  const stateApi: BoundApi<Sh, R>["state"] = {
    read: runtime.getState,
    update: (f) =>
      Effect.gen(function* () {
        const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)
        if (inTxn) {
          const prev = yield* runtime.getState
          return yield* runtime.setState(f(prev))
        }

        const anyRuntime = runtime as any
        const runWithTxn:
          | ((
              origin: { readonly kind: string; readonly name?: string; readonly details?: unknown },
              body: () => Effect.Effect<void, never, any>,
            ) => Effect.Effect<void, never, any>)
          | undefined = anyRuntime && anyRuntime.__runWithStateTransaction

        const body = () =>
          Effect.flatMap(runtime.getState, (prev) => runtime.setState(f(prev)))

        return yield* (runWithTxn
          ? runWithTxn({ kind: "state", name: "update" }, body)
          : body())
      }),
    mutate: (f) =>
      Effect.gen(function* () {
        const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)
        if (inTxn) {
          const prev = yield* runtime.getState
          const next = create(prev as Logix.StateOf<Sh>, (draft) => {
            f(draft as Logic.Draft<Logix.StateOf<Sh>>)
          }) as Logix.StateOf<Sh>
          return yield* runtime.setState(next)
        }

        const anyRuntime = runtime as any
        const runWithTxn:
          | ((
              origin: { readonly kind: string; readonly name?: string; readonly details?: unknown },
              body: () => Effect.Effect<void, never, any>,
            ) => Effect.Effect<void, never, any>)
          | undefined = anyRuntime && anyRuntime.__runWithStateTransaction

        const body = () =>
          Effect.flatMap(runtime.getState, (prev) => {
            const next = create(prev as Logix.StateOf<Sh>, (draft) => {
              f(draft as Logic.Draft<Logix.StateOf<Sh>>)
            }) as Logix.StateOf<Sh>
            return runtime.setState(next)
          })

        return yield* (runWithTxn
          ? runWithTxn({ kind: "state", name: "mutate" }, body)
          : body())
      }),
    ref: runtime.ref,
  }

  const actionsApi = new Proxy({} as BoundApi<Sh, R>["actions"], {
    get: (_target, prop) => {
      if (prop === "dispatch") {
        return (a: Logix.ActionOf<Sh>) => runtime.dispatch(a)
      }
      if (prop === "actions$") {
        return runtime.actions$
      }
      return (payload: any) =>
        runtime.dispatch({ _tag: prop as string, payload } as Logix.ActionOf<Sh>)
    },
  })

  const matchApi = <V>(value: V): Logic.FluentMatch<V> =>
    MatchBuilder.makeMatch(value)

  const matchTagApi = <V extends { _tag: string }>(
    value: V
  ): Logic.FluentMatchTag<V> => MatchBuilder.makeMatchTag(value)

  // Primary Reducer 注册：通过 runtime 上的内部注册函数（若存在）写入 reducer 映射。
  const reducer: BoundApi<Sh, R>["reducer"] = (tag, fn) => {
    return Effect.sync(() => {
      const anyRuntime = runtime as any
      const register: (t: string, fn: (s: any, a: any) => any) => void =
        anyRuntime && anyRuntime.__registerReducer
      if (!register) {
        throw new Error(
          "[BoundApi.reducer] Primary reducer registration is not supported by this runtime " +
            "(missing internal __registerReducer hook)."
        )
      }
      register(String(tag), fn as any)
    }) as any
  }

  // StateTrait.source 刷新入口的注册表：
  // - 必须挂到 runtime 上共享（而不是挂到单个 BoundApi 实例上），否则：
  //   - Trait 安装逻辑与业务逻辑位于不同 Module.logic 时会拿到不同 BoundApi 实例；
  //   - 业务侧通过 `Logix.Bound.make(...)` 新建的 BoundApi 也无法看到已安装的刷新实现。
  // - key 为字段路径（如 "profileResource"）；
  // - value 为基于当前 State 执行一次刷新流程的 Effect。
  const anyRuntime = runtime as any
  const sourceRefreshRegistry: Map<
    string,
    (state: Logix.StateOf<Sh>) => Effect.Effect<void, never, any>
  > =
    anyRuntime.__sourceRefreshRegistry ??
    (anyRuntime.__sourceRefreshRegistry = new Map())

  const api: BoundApi<Sh, R> & {
    __moduleId?: string
    __runtimeId?: string
    __rowIdStore?: RowIdStore
    __registerSourceRefresh?: (
      fieldPath: string,
      handler: (
        state: Logix.StateOf<Sh>,
      ) => Effect.Effect<void, never, any>,
    ) => void
    __recordStatePatch?: (
      patch: {
        readonly path: string
        readonly from?: unknown
        readonly to?: unknown
        readonly reason: string
        readonly traitNodeId?: string
        readonly stepId?: string
      },
    ) => void
    __registerStateTraitProgram?: (program: StateTraitProgram<any>) => void
    __runWithStateTransaction?: (
      origin: {
        readonly kind: string
        readonly name?: string
        readonly details?: unknown
      },
      body: () => Effect.Effect<void, never, any>,
    ) => Effect.Effect<void, never, any>
  } = {
    state: stateApi,
    actions: actionsApi,
    flow: flowApi,
    match: matchApi,
    matchTag: matchTagApi,
    lifecycle: {
      onInit: (
        eff: Logic.Of<Sh, R, void, never>,
      ) => {
        // Phase Guard：$.lifecycle.onInit 视为 run-only 能力，禁止在 setup 段执行。
        // 典型原因：
        // - setup 段通常在 Runtime 构造路径（runSync）中执行，running 含异步工作的 onInit
        //   极易触发 AsyncFiberException；
        // - 按 v3 约定，onInit 更接近“模块运行期的初始化流程”，语义上属于 run 段。
        //
        // 因此在 setup 段调用时抛出 LogicPhaseError，并由 ModuleRuntime.make /
        // LogicDiagnostics 收敛为 logic::invalid_phase 诊断，而不是让底层 runSync 失败。
        guardRunOnly("lifecycle_in_setup", "$.lifecycle.onInit")

        return withLifecycle(
          (manager) => manager.registerInit(eff),
          () => eff
        ) as unknown as Logic.Of<Sh, R, void, never>
      },
      onDestroy: (
        eff: Logic.Of<Sh, R, void, never>,
      ) =>
        withLifecycle(
          (manager) => manager.registerDestroy(eff),
          () => eff
        ) as unknown as Logic.Of<Sh, R, void, never>,
      onError: (
        handler: (
          cause: import("effect").Cause.Cause<unknown>,
          context: Lifecycle.ErrorContext,
        ) => Effect.Effect<void, never, R>,
      ) =>
        withLifecycle(
          (manager) => manager.registerOnError(handler),
          () => Effect.void
        ) as unknown as Logic.Of<Sh, R, void, never>,
      onSuspend: (
        eff: Logic.Of<Sh, R, void, never>,
      ) =>
        withPlatform((platform) =>
          platform.lifecycle.onSuspend(
            Effect.asVoid(eff as Effect.Effect<void, never, any>)
          )
        ) as unknown as Logic.Of<Sh, R, void, never>,
      onResume: (
        eff: Logic.Of<Sh, R, void, never>,
      ) =>
        withPlatform((platform) =>
          platform.lifecycle.onResume(
            Effect.asVoid(eff as Effect.Effect<void, never, any>)
          )
        ) as unknown as Logic.Of<Sh, R, void, never>,
      onReset: (
        eff: Logic.Of<Sh, R, void, never>,
      ) =>
        withPlatform((platform) =>
          platform.lifecycle.onReset
            ? platform.lifecycle.onReset(
                Effect.asVoid(eff as Effect.Effect<void, never, any>)
              )
            : Effect.void
        ) as unknown as Logic.Of<Sh, R, void, never>,
    },
    traits: {
      source: {
        refresh: (fieldPath: string) =>
          Effect.gen(function* () {
            const handler = sourceRefreshRegistry.get(fieldPath)
            if (!handler) {
              // 若未注册刷新逻辑，则视为 no-op，避免在未挂 StateTraitProgram 时抛错。
              return yield* Effect.void
            }

            // 事务窗口内禁止再走 enqueueTransaction（会导致死锁）：
            // - 直接在当前事务内执行 handler，使其通过 bound.state.mutate 写入 draft；
            // - 由外层同一事务窗口负责 commit + debug 聚合。
            const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)
            if (inTxn) {
              const state = (yield* runtime.getState) as Logix.StateOf<Sh>
              return yield* handler(state)
            }

            const runWithStateTransaction =
              (api as any)
                .__runWithStateTransaction as
              | ((
                origin: {
                  readonly kind: string
                  readonly name?: string
                  readonly details?: unknown
                },
                body: () => Effect.Effect<void, never, any>,
              ) => Effect.Effect<void, never, any>)
              | undefined

            if (runWithStateTransaction) {
              // 在支持 StateTransaction 的 Runtime 上，将一次 source-refresh 视为单独的事务入口。
              return yield* runWithStateTransaction(
                {
                  kind: "source-refresh",
                  name: fieldPath,
                },
                () =>
                  Effect.gen(function* () {
                    const state = (yield* runtime.getState) as Logix.StateOf<Sh>
                    return yield* handler(state)
                  }),
              )
            }

            // 旧实现（无事务语义）：直接读取当前 State 并执行刷新逻辑。
            const state = (yield* runtime.getState) as Logix.StateOf<Sh>
            return yield* handler(state)
          }),
      },
    },
    reducer,
    use: new Proxy(() => {}, {
      apply: (_target, _thisArg, [arg]) => {
        guardRunOnly("use_in_setup", "$.use")
        if (Context.isTag(arg)) {
          const candidate = arg as { _kind?: unknown }

          // Module：返回只读 ModuleHandle 视图
          if (candidate._kind === "Module") {
            return resolveModuleRuntime(arg as any).pipe(
              Effect.map((runtime: Logix.ModuleRuntime<any, any>) => {
                const actionsProxy: Logix.ModuleHandle<any>["actions"] =
                  new Proxy(
                    {},
                    {
                      get: (_target, prop) =>
                        (payload: unknown) =>
                          runtime.dispatch({
                            _tag: prop as string,
                            payload,
                          }),
                    },
                  ) as Logix.ModuleHandle<any>["actions"]

                const handle: Logix.ModuleHandle<any> = {
                  read: (selector) =>
                    Effect.map(runtime.getState, selector),
                  changes: runtime.changes,
                  dispatch: runtime.dispatch,
                  actions$: runtime.actions$,
                  actions: actionsProxy,
                }

                return handle
              }),
            ) as unknown as Logic.Of<Sh, R, any, never>
          }

          // 普通 Service Tag：直接从 Env 获取 Service
          return arg as unknown as Logic.Of<Sh, R, any, never>
        }
        return Effect.die("BoundApi.use: unsupported argument") as unknown as Logic.Of<
          Sh,
          R,
          any,
          never
        >
      },
    }) as unknown as BoundApi<Sh, R>["use"],
    onAction: new Proxy(() => {}, {
      apply: (_target, _thisArg, args) => {
        guardRunOnly("use_in_setup", "$.onAction")
        const arg = args[0]
        if (typeof arg === "function") {
          return createIntentBuilder(
            runtime.actions$.pipe(Stream.filter(arg))
          )
        }
        if (typeof arg === "string") {
          return createIntentBuilder(
            runtime.actions$.pipe(
              Stream.filter((a: any) => a._tag === arg || a.type === arg)
            ),
            arg,
          )
        }
        if (typeof arg === "object" && arg !== null) {
          if ("_tag" in arg) {
            return createIntentBuilder(
              runtime.actions$.pipe(
                Stream.filter((a: any) => a._tag === (arg as any)._tag)
              ),
              String((arg as any)._tag),
            )
          }
          if (Schema.isSchema(arg)) {
            return createIntentBuilder(
              runtime.actions$.pipe(
                Stream.filter((a: any) => {
                  const result = Schema.decodeUnknownSync(
                    arg as Schema.Schema<any, any, never>
                  )(a)
                  return !!result
                })
              )
            )
          }
        }
        return createIntentBuilder(runtime.actions$)
      },
      get: (_target, prop) => {
        guardRunOnly("use_in_setup", "$.onAction")
        if (typeof prop === "string") {
          return createIntentBuilder(
            runtime.actions$.pipe(
              Stream.filter(
                (a: any) => a._tag === prop || a.type === prop
              )
            ),
            prop,
          )
        }
        return undefined
      },
    }) as unknown as BoundApi<Sh, R>["onAction"],
    onState: (
      selector: (s: Logix.StateOf<Sh>) => any,
    ) => {
      guardRunOnly("use_in_setup", "$.onState")
      return createIntentBuilder(runtime.changes(selector))
    },
    on: (
      stream: Stream.Stream<any>,
    ) => {
      guardRunOnly("use_in_setup", "$.on")
      return createIntentBuilder(stream)
    },
  } as any

  // 仅供内部使用：为 Bound API 标记所属 ModuleId，方便在 StateTrait.install
  // 等运行时代码中为 EffectOp.meta 补充 moduleId。
  ;(api as any).__moduleId = options?.moduleId
  ;(api as any).__runtimeId = (runtime as any)?.id as string | undefined
  ;(api as any).__rowIdStore = (runtime as any)?.__rowIdStore as
    | RowIdStore
    | undefined

  // 仅供 StateTrait.install 使用：注册 source 字段的刷新实现。
  ;(api as any).__registerSourceRefresh = (
    fieldPath: string,
    handler: (state: Logix.StateOf<Sh>) => Effect.Effect<void, never, any>,
  ): void => {
    sourceRefreshRegistry.set(fieldPath, handler)
  }

  // 仅供 StateTrait.install 等内部代码使用：在当前 Runtime 的 StateTransaction 上记录字段级 Patch。
  ;(api as any).__recordStatePatch = (
    patch: {
      readonly path: string
      readonly from?: unknown
      readonly to?: unknown
      readonly reason: string
      readonly traitNodeId?: string
      readonly stepId?: string
    },
  ): void => {
    const anyRuntime = runtime as any
    const record: ((p: typeof patch) => void) | undefined =
      anyRuntime && anyRuntime.__recordStatePatch
    if (record) {
      record(patch)
    }
  }

  // 仅供内部使用：将 ReplayLog 事件记录到当前事务，以便在 state:update 中关联 replayEvent。
  ;(api as any).__recordReplayEvent = (event: unknown): void => {
    const anyRuntime = runtime as any
    const record: ((e: unknown) => void) | undefined =
      anyRuntime && anyRuntime.__recordReplayEvent
    if (record) {
      record(event)
    }
  }

  // 仅供 StateTrait.install 使用：向 Runtime 注册 Program，以在事务窗口内执行收敛。
  ;(api as any).__registerStateTraitProgram = (
    program: StateTraitProgram<any>,
  ): void => {
    const anyRuntime = runtime as any
    const register: ((p: StateTraitProgram<any>) => void) | undefined =
      anyRuntime && anyRuntime.__registerStateTraitProgram
    if (register) {
      register(program)
    }
  }

  // 仅供 TraitLifecycle.scopedValidate 使用：将校验请求挂到当前事务，等待 runtime 统一 flush。
  ;(api as any).__enqueueStateTraitValidateRequest = (
    request: ScopedValidateRequest,
  ): void => {
    const anyRuntime = runtime as any
    const enqueue: ((r: ScopedValidateRequest) => void) | undefined =
      anyRuntime && anyRuntime.__enqueueStateTraitValidateRequest
    if (enqueue) {
      enqueue(request)
    }
  }

  // 仅供内部使用：为 Trait 等入口提供统一的 StateTransaction 执行助手。
  ;(api as any).__runWithStateTransaction = (
    origin: {
      readonly kind: string
      readonly name?: string
      readonly details?: unknown
    },
    body: () => Effect.Effect<void, never, any>,
  ): Effect.Effect<void, never, any> => {
    const anyRuntime = runtime as any
    const runWithTxn:
      | ((
        origin: {
          readonly kind: string
          readonly name?: string
          readonly details?: unknown
        },
        body: () => Effect.Effect<void, never, any>,
      ) => Effect.Effect<void, never, any>)
      | undefined = anyRuntime && anyRuntime.__runWithStateTransaction
    return runWithTxn ? runWithTxn(origin, body) : body()
  }

  return api
}
