import {
  Effect,
  Stream,
  SubscriptionRef,
  PubSub,
  Scope,
  Context,
  Ref,
  Fiber,
  Exit,
  Cause,
  Option,
} from "effect"
import type { LogicPlan, ModuleRuntime as PublicModuleRuntime } from "./core/module.js"
import * as Lifecycle from "./Lifecycle.js"
import * as Debug from "./core/DebugSink.js"
import * as ReducerDiagnostics from "./core/ReducerDiagnostics.js"
import * as LifecycleDiagnostics from "./core/LifecycleDiagnostics.js"
import * as LogicDiagnostics from "./core/LogicDiagnostics.js"
import { globalLogicPhaseRef } from "./BoundApiRuntime.js"
import * as EffectOp from "../../effectop.js"
import * as EffectOpCore from "./EffectOpCore.js"

/**
 * 全局运行时注册表：
 * - key：Module Tag（ModuleInstance 本身）；
 * - value：对应的 ModuleRuntime 实例。
 *
 * 仅用于运行时内部（例如 $.useRemote / Link 等跨模块能力），
 * 不作为对外正式 API 暴露。
 */
const runtimeRegistry = new WeakMap<
  Context.Tag<any, PublicModuleRuntime<any, any>>,
  PublicModuleRuntime<any, any>
>()

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

export interface ModuleRuntimeOptions<S, A, R = never> {
  readonly tag?: Context.Tag<any, PublicModuleRuntime<S, A>>
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
}

type PhaseRef = { current: "setup" | "run" }

const createPhaseRef = (): PhaseRef => ({ current: "run" })

const getMiddlewareStack = (): Effect.Effect<
  EffectOp.MiddlewareStack,
  never,
  any
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

    const runWithEffectOp = <A2>(
      kind: EffectOp.EffectOp["kind"],
      name: string,
      meta: EffectOp.EffectOp["meta"],
      eff: Effect.Effect<A2, never, any>,
    ): Effect.Effect<A2, never, never> =>
      Effect.gen(function* () {
        const stack = yield* getMiddlewareStack()
        if (!stack.length) {
          return yield* eff
        }
        const op = EffectOp.make<A2, never, any>({
          kind,
          name,
          effect: eff,
          meta,
        })
        return yield* EffectOp.run(op, stack)
      }) as Effect.Effect<A2, never, never>

    yield* runWithEffectOp(
      "lifecycle",
      "module:init",
      {
        moduleId: options.moduleId,
        runtimeId: id,
      },
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
    yield* Debug.record({
      type: "state:update",
      moduleId: options.moduleId,
      state: initialSnapshot,
      runtimeId: id,
    })

    const setStateInternal = (next: S) =>
      SubscriptionRef.set(stateRef, next).pipe(
        Effect.tap(() =>
          runWithEffectOp(
            "state",
            "state:update",
            {
              moduleId: options.moduleId,
              runtimeId: id,
            },
            Debug.record({
              type: "state:update",
              moduleId: options.moduleId,
              state: next,
              runtimeId: id,
            }),
          )
        )
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

      return SubscriptionRef.get(stateRef).pipe(
        Effect.flatMap((prev) => {
          const next = reducer(prev, action)
          // 即便 next === prev，仍然复用 setStateInternal 的 Debug 行为，由上层决定是否据此做 diff。
          return setStateInternal(next)
        })
      )
    }

    const runtime: PublicModuleRuntime<S, A> = {
      id,
      getState: SubscriptionRef.get(stateRef),
      setState: setStateInternal,
      dispatch: (action) =>
        applyPrimaryReducer(action).pipe(
          // 记录 Action 派发事件（同时通过 EffectOp 总线暴露给 DebugObserver）
          Effect.zipRight(
            runWithEffectOp(
              "action",
              "action:dispatch",
              {
                moduleId: options.moduleId,
                runtimeId: id,
              },
              Debug.record({
                type: "action:dispatch",
                moduleId: options.moduleId,
                action,
                runtimeId: id,
              }),
            )
          ),
          // 将 Action 发布给所有 watcher（Logic / Flow）
          Effect.zipRight(PubSub.publish(actionHub, action))
        ),
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

    // 将内部注册函数暴露给 BoundApiRuntime，用于实现 $.reducer 语法糖。
    ;(runtime as any).__registerReducer = registerReducer

    // 注册 Runtime，供跨模块访问（useRemote / Link 等）使用
    if (options.tag) {
      registerRuntime(options.tag as Context.Tag<any, PublicModuleRuntime<S, A>>, runtime)
    }

    yield* Effect.addFinalizer(() =>
      lifecycle.runDestroy.pipe(
        Effect.flatMap(() =>
          runWithEffectOp(
            "lifecycle",
            "module:destroy",
            {
              moduleId: options.moduleId,
              runtimeId: id,
            },
            Debug.record({
              type: "module:destroy",
              moduleId: options.moduleId,
              runtimeId: id,
            }),
          )
        ),
        Effect.tap(() =>
          options.tag
            ? Effect.sync(() =>
                unregisterRuntime(
                  options.tag as Context.Tag<any, PublicModuleRuntime<any, any>>
                )
              )
            : Effect.void
        )
      )
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
            runWithEffectOp(
              "lifecycle",
              "lifecycle:error",
              {
                moduleId: options.moduleId,
                runtimeId: id,
              },
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
