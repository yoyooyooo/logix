import { Context, Effect, Option, Schema, Stream, SubscriptionRef } from "effect"
import { create } from "mutative"
import type * as Logix from "../api/Logix.js"
import * as Logic from "../api/Logic.js"
import * as Lifecycle from "./Lifecycle.js"
import * as DSL from "../dsl/index.js"
import type { BoundApi } from "../api/BoundApi.js"
import * as ModuleRuntimeImpl from "./ModuleRuntime.js"

/**
 * BoundApi 实现：为某一类 Store Shape + Runtime 创建预绑定的 `$`。
 *
 * 说明：类型与入口签名在 api/BoundApi.ts 中声明，这里只承载具体实现。
 */
export function make<Sh extends Logix.AnyModuleShape, R = never>(
  shape: Sh,
  runtime: Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
): BoundApi<Sh, R> {
  const flowApi = DSL.Flow.make<Sh, R>(runtime)
  const makeIntentBuilder = DSL.LogicBuilder.makeIntentBuilderFactory<Sh, R>(
    runtime
  )
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
    invoke: (platform: Logic.Platform) => Effect.Effect<void, never, any>
  ) =>
    Effect.serviceOption(Logic.Platform).pipe(
      Effect.flatMap((maybe) =>
        Option.match(maybe, {
          onSome: invoke,
          onNone: () => Effect.void,
        })
      )
    )
  const createIntentBuilder = <T>(stream: Stream.Stream<T>) =>
    makeIntentBuilder<T>(stream)

  /**
   * 从当前 Env 或全局注册表中解析某个 Module 的 Runtime。
   *
   * 优先级：
   * 1. 当前 Effect 环境中已提供的 ModuleRuntime（例如通过应用级 Runtime / LogixRuntime.make 或 provideService 提供）；
   * 2. ModuleRuntime 全局注册表（ModuleRuntime.make 内部维护），用于跨 Layer / 进程访问。
   */
  const resolveModuleRuntime = (
    tag: Context.Tag<any, Logix.ModuleRuntime<any, any>>
  ): Effect.Effect<Logix.ModuleRuntime<any, any>, never, any> =>
    Effect.gen(function* () {
      // 1) 优先尝试从当前 Context 中读取
      const fromEnv = yield* Effect.serviceOption(tag)
      if (Option.isSome(fromEnv)) {
        return fromEnv.value
      }

      // 2) 回退到全局注册表（同一进程内的其他 Layer 已初始化）
      const fromRegistry = ModuleRuntimeImpl.getRegisteredRuntime(tag)
      if (fromRegistry) {
        return fromRegistry
      }

      // 3) 无法找到时直接 die —— 这是配置错误，提示调用方修正装配方式
      return yield* Effect.dieMessage(
        "[BoundApi] ModuleRuntime not found for given Module Tag. " +
          "Ensure the module is provided via an application Runtime (LogixRuntime.make) or Module.live() in the current process."
      )
    })

  // 为「远程 Module」构造只读 Bound 风格 API
  const makeRemoteBoundApi = <TargetSh extends Logix.AnyModuleShape>(
    handle: Logix.ModuleHandle<TargetSh>
  ) => {
    const makeRemoteOnAction = (
      source: Stream.Stream<Logix.ActionOf<TargetSh>>
    ) =>
      new Proxy(() => {}, {
        apply: (_target, _thisArg, args) => {
          const arg = args[0]
          if (typeof arg === "function") {
            return createIntentBuilder(
              source.pipe(Stream.filter(arg as (a: any) => boolean))
            )
          }
          if (typeof arg === "string") {
            return createIntentBuilder(
              source.pipe(
                Stream.filter(
                  (a: any) => a._tag === arg || a.type === arg
                )
              )
            )
          }
          if (typeof arg === "object" && arg !== null) {
            if ("_tag" in arg) {
              return createIntentBuilder(
                source.pipe(
                  Stream.filter(
                    (a: any) => a._tag === (arg as any)._tag
                  )
                )
              )
            }
            if (Schema.isSchema(arg)) {
              return createIntentBuilder(
                source.pipe(
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
          return createIntentBuilder(source)
        },
        get: (_target, prop) => {
          if (typeof prop === "string") {
            return createIntentBuilder(
              source.pipe(
                Stream.filter(
                  (a: any) => a._tag === prop || a.type === prop
                )
              )
            )
          }
          return undefined
        },
      })

    return {
      onState: (selector: (s: Logix.StateOf<TargetSh>) => any) =>
        createIntentBuilder(handle.changes(selector)),
      onAction: makeRemoteOnAction(handle.actions$) as any,
      on: (stream: Stream.Stream<any>) => createIntentBuilder(stream),
      read: handle.read,
      actions: handle.actions,
      actions$: handle.actions$,
    }
  }

  const stateApi: BoundApi<Sh, R>["state"] = {
    read: runtime.getState,
    update: (f) =>
      Logic.secure<Sh, R, void, never>(
        Effect.flatMap(runtime.getState, (prev) => runtime.setState(f(prev))),
        { name: "state.update", storeId: runtime.id }
      ),
    mutate: (f) =>
      Logic.secure<Sh, R, void, never>(
        Effect.flatMap(runtime.getState, (prev) => {
          const next = create(prev as Logix.StateOf<Sh>, (draft) => {
            f(draft as Logic.Draft<Logix.StateOf<Sh>>)
          }) as Logix.StateOf<Sh>
          return runtime.setState(next)
        }),
        { name: "state.mutate", storeId: runtime.id }
      ),
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
    DSL.MatchBuilder.makeMatch(value)

  const matchTagApi = <V extends { _tag: string }>(
    value: V
  ): Logic.FluentMatchTag<V> => DSL.MatchBuilder.makeMatchTag(value)

  return {
    state: stateApi,
    actions: actionsApi,
    flow: flowApi,
    match: matchApi,
    matchTag: matchTagApi,
    lifecycle: {
      onInit: (eff) =>
        withLifecycle(
          (manager) => manager.registerInit(eff),
          () => eff
        ) as unknown as Logic.Of<Sh, R, void, never>,
      onDestroy: (eff) =>
        withLifecycle(
          (manager) => manager.registerDestroy(eff),
          () => eff
        ) as unknown as Logic.Of<Sh, R, void, never>,
      onError: (handler) =>
        withLifecycle(
          (manager) => manager.registerOnError(handler),
          () => Effect.void
        ) as unknown as Logic.Of<Sh, R, void, never>,
      onSuspend: (eff) =>
        withPlatform((platform) =>
          platform.lifecycle.onSuspend(
            Effect.asVoid(eff as Effect.Effect<void, never, any>)
          )
        ) as unknown as Logic.Of<Sh, R, void, never>,
      onResume: (eff) =>
        withPlatform((platform) =>
          platform.lifecycle.onResume(
            Effect.asVoid(eff as Effect.Effect<void, never, any>)
          )
        ) as unknown as Logic.Of<Sh, R, void, never>,
      onReset: (eff) =>
        withPlatform((platform) =>
          platform.lifecycle.onReset
            ? platform.lifecycle.onReset(
                Effect.asVoid(eff as Effect.Effect<void, never, any>)
              )
            : Effect.void
        ) as unknown as Logic.Of<Sh, R, void, never>,
    },
    use: new Proxy(() => {}, {
      apply: (_target, _thisArg, [arg]) => {
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
    useRemote: ((module: any) => {
      if (!Context.isTag(module)) {
        return Effect.die(
          "BoundApi.useRemote: expected a ModuleInstance Tag",
        ) as unknown as Logic.Of<Sh, R, any, never>
      }

      const candidate = module as { _kind?: unknown }
      if (candidate._kind !== "Module") {
        return Effect.die(
          "BoundApi.useRemote: expected a ModuleInstance with _kind = 'Module'",
        ) as unknown as Logic.Of<Sh, R, any, never>
      }

      return resolveModuleRuntime(
        module as Context.Tag<any, Logix.ModuleRuntime<any, any>>
      ).pipe(
        Effect.map((remoteRuntime: Logix.ModuleRuntime<any, any>) => {
          const actionsProxy: Logix.ModuleHandle<any>["actions"] = new Proxy(
            {},
            {
              get: (_target, prop) =>
                (payload: unknown) =>
                  remoteRuntime.dispatch({
                    _tag: prop as string,
                    payload,
                  }),
            },
          ) as Logix.ModuleHandle<any>["actions"]

          const handle: Logix.ModuleHandle<any> = {
            read: (selector) =>
              Effect.map(remoteRuntime.getState, selector),
            changes: remoteRuntime.changes,
            dispatch: remoteRuntime.dispatch,
            actions$: remoteRuntime.actions$,
            actions: actionsProxy,
          }

          return makeRemoteBoundApi(handle)
        }),
      ) as unknown as Logic.Of<Sh, R, any, never>
    }) as unknown as BoundApi<Sh, R>["useRemote"],
    services: (tag) => tag,
    onAction: new Proxy(() => {}, {
      apply: (_target, _thisArg, args) => {
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
            )
          )
        }
        if (typeof arg === "object" && arg !== null) {
          if ("_tag" in arg) {
            return createIntentBuilder(
              runtime.actions$.pipe(
                Stream.filter((a: any) => a._tag === (arg as any)._tag)
              )
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
        if (typeof prop === "string") {
          return createIntentBuilder(
            runtime.actions$.pipe(
              Stream.filter(
                (a: any) => a._tag === prop || a.type === prop
              )
            )
          )
        }
        return undefined
      },
    }) as unknown as BoundApi<Sh, R>["onAction"],
    onState: (selector) => createIntentBuilder(runtime.changes(selector)),
    on: (stream) => createIntentBuilder(stream),
  }
}
