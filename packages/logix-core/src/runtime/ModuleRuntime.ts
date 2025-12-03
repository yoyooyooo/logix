import { Effect, Stream, SubscriptionRef, PubSub, Scope, Context, Ref } from "effect"
import type * as Logix from "../api/Logix.js"
import * as Lifecycle from "./Lifecycle.js"
import * as Debug from "../debug/DebugSink.js"

/**
 * 全局运行时注册表：
 * - key：Module Tag（ModuleInstance 本身）；
 * - value：对应的 ModuleRuntime 实例。
 *
 * 仅用于运行时内部（例如 $.useRemote / Link 等跨模块能力），
 * 不作为对外正式 API 暴露。
 */
const runtimeRegistry = new WeakMap<
  Context.Tag<any, Logix.ModuleRuntime<any, any>>,
  Logix.ModuleRuntime<any, any>
>()

export const registerRuntime = <S, A>(
  tag: Context.Tag<any, Logix.ModuleRuntime<S, A>>,
  runtime: Logix.ModuleRuntime<S, A>
): void => {
  runtimeRegistry.set(
    tag as Context.Tag<any, Logix.ModuleRuntime<any, any>>,
    runtime as Logix.ModuleRuntime<any, any>
  )
}

export const unregisterRuntime = (
  tag: Context.Tag<any, Logix.ModuleRuntime<any, any>>
): void => {
  runtimeRegistry.delete(tag)
}

export const getRegisteredRuntime = <S, A>(
  tag: Context.Tag<any, Logix.ModuleRuntime<S, A>>
): Logix.ModuleRuntime<S, A> | undefined =>
  runtimeRegistry.get(
    tag as Context.Tag<any, Logix.ModuleRuntime<any, any>>
  ) as Logix.ModuleRuntime<S, A> | undefined

export interface ModuleRuntimeOptions<S, A, R = never> {
  readonly tag?: Context.Tag<any, Logix.ModuleRuntime<S, A>>
  readonly logics?: ReadonlyArray<Effect.Effect<any, any, R>>
  readonly moduleId?: string
  readonly createState?: Effect.Effect<SubscriptionRef.SubscriptionRef<S>, never, Scope.Scope>
  readonly createActionHub?: Effect.Effect<PubSub.PubSub<A>, never, Scope.Scope>
}

export const make = <S, A, R = never>(
  initialState: S,
  options: ModuleRuntimeOptions<S, A, R> = {}
): Effect.Effect<Logix.ModuleRuntime<S, A>, never, Scope.Scope | R> =>
  Effect.gen(function* (_) {
    const stateRef = options.createState
      ? yield* options.createState
      : yield* SubscriptionRef.make(initialState)
    const actionHub = options.createActionHub
      ? yield* options.createActionHub
      : yield* PubSub.unbounded<A>()
    const lifecycle = yield* Lifecycle.makeLifecycleManager

    const id = Math.random().toString(36).slice(2)
    yield* Debug.record({ type: "module:init", moduleId: options.moduleId })

    const runtime: Logix.ModuleRuntime<S, A> = {
      id,
      getState: SubscriptionRef.get(stateRef),
      setState: (next) =>
        SubscriptionRef.set(stateRef, next).pipe(
          Effect.tap(() =>
            Debug.record({
              type: "state:update",
              moduleId: options.moduleId,
              state: next,
            })
          )
        ),
      dispatch: (action) =>
        Debug.record({
          type: "action:dispatch",
          moduleId: options.moduleId,
          action,
        }).pipe(Effect.zipRight(PubSub.publish(actionHub, action))),
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

    // 注册 Runtime，供跨模块访问（useRemote / Link 等）使用
    if (options.tag) {
      registerRuntime(options.tag as Context.Tag<any, Logix.ModuleRuntime<S, A>>, runtime)
    }

    yield* Effect.addFinalizer(() =>
      lifecycle.runDestroy.pipe(
        Effect.flatMap(() =>
          Debug.record({ type: "module:destroy", moduleId: options.moduleId })
        ),
        Effect.tap(() =>
          options.tag
            ? Effect.sync(() =>
                unregisterRuntime(
                  options.tag as Context.Tag<any, Logix.ModuleRuntime<any, any>>
                )
              )
            : Effect.void
        )
      )
    )

    if (options.tag && options.logics?.length) {
      for (const logic of options.logics) {
        const logicWithRuntime = Effect.provideService(
          logic,
          options.tag,
          runtime
        )
        const logicWithServices = Effect.provideService(
          logicWithRuntime,
          Lifecycle.LifecycleContext,
          lifecycle
        )

        yield* Effect.forkScoped(
          logicWithServices.pipe(
            Effect.catchAllCause((cause) =>
              lifecycle.notifyError(cause, {
                phase: "logic.fork",
                moduleId: options.moduleId,
              }).pipe(
                Effect.flatMap(() => Debug.record({
                  type: "lifecycle:error",
                  moduleId: options.moduleId,
                  cause,
                })),
                Effect.flatMap(() => Effect.failCause(cause))
              )
            )
          )
        )
      }
    }

    return runtime
  })
