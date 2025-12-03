import { Effect, Stream } from "effect"
import { create } from "mutative"
import type * as Logix from "../api/Logix.js"
import * as Logic from "../api/Logic.js"
import * as Flow from "./FlowBuilder.js"

/**
 * LogicBuilder：围绕 Flow.Api + ModuleRuntime 构造 Fluent IntentBuilder。
 *
 * - 为给定的 ModuleRuntime 预绑定 Flow.Api；
 * - 提供构造 IntentBuilder 的工厂，用于 $.on* / $.flow.* 等 Fluent DSL 实现。
 */
export const makeIntentBuilderFactory = <
  Sh extends Logix.AnyModuleShape,
  R = never
>(
  runtime: Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
) => {
  const flowApi = Flow.make<Sh, R>(runtime)

  return <T>(stream: Stream.Stream<T>): Logic.IntentBuilder<T, Sh, R> => {
    const builder: Omit<
      Logic.IntentBuilder<T, Sh, R>,
      "pipe" | "andThen"
    > = {
      debounce: (ms: number) =>
        makeIntentBuilderFactory<Sh, R>(runtime)(
          flowApi.debounce<T>(ms)(stream)
        ),
      throttle: (ms: number) =>
        makeIntentBuilderFactory<Sh, R>(runtime)(
          flowApi.throttle<T>(ms)(stream)
        ),
      filter: (predicate: (value: T) => boolean) =>
        makeIntentBuilderFactory<Sh, R>(runtime)(
          flowApi.filter(predicate)(stream)
        ),
      map: <U>(f: (value: T) => U) =>
        makeIntentBuilderFactory<Sh, R>(runtime)(
          stream.pipe(Stream.map(f))
        ),
      run: <A = void, E = never, R2 = unknown>(
        eff:
          | Logic.Of<Sh, R & R2, A, E>
          | ((p: T) => Logic.Of<Sh, R & R2, A, E>)
      ): Logic.Of<Sh, R & R2, void, E> =>
        Logic.secure(
          flowApi.run<T, A, E, R2>(eff)(stream),
          { name: "flow.run" }
        ),
      runLatest: <A = void, E = never, R2 = unknown>(
        eff:
          | Logic.Of<Sh, R & R2, A, E>
          | ((p: T) => Logic.Of<Sh, R & R2, A, E>)
      ): Logic.Of<Sh, R & R2, void, E> =>
        Logic.secure(
          flowApi.runLatest<T, A, E, R2>(eff)(stream),
          { name: "flow.runLatest" }
        ),
      runExhaust: <A = void, E = never, R2 = unknown>(
        eff:
          | Logic.Of<Sh, R & R2, A, E>
          | ((p: T) => Logic.Of<Sh, R & R2, A, E>)
      ): Logic.Of<Sh, R & R2, void, E> =>
        Logic.secure(
          flowApi.runExhaust<T, A, E, R2>(eff)(stream),
          { name: "flow.runExhaust" }
        ),
      runParallel: <A = void, E = never, R2 = unknown>(
        eff:
          | Logic.Of<Sh, R & R2, A, E>
          | ((p: T) => Logic.Of<Sh, R & R2, A, E>)
      ): Logic.Of<Sh, R & R2, void, E> =>
        Logic.secure(
          flowApi.runParallel<T, A, E, R2>(eff)(stream),
          { name: "flow.runParallel" }
        ),
      runFork: <A = void, E = never, R2 = unknown>(
        eff:
          | Logic.Of<Sh, R & R2, A, E>
          | ((p: T) => Logic.Of<Sh, R & R2, A, E>)
      ): Logic.Of<Sh, R & R2, void, E> =>
        // 语义：在当前 Logic.Env + Scope 上非阻塞地启动一条 watcher Fiber，
        // 并将其生命周期绑定到当前 ModuleRuntime 的 Scope 上。
        //
        // 等价于在 Logic 内部手写：
        //   yield* Effect.forkScoped($.onAction(...).run(effect))
        //
        // 通过 Logic.secure 统一走 Middleware / Debug 管线。
        Logic.secure(
          Effect.forkScoped(flowApi.run<T, A, E, R2>(eff)(stream)),
          { name: "flow.runFork" }
        ) as Logic.Of<Sh, R & R2, void, E>,
      runParallelFork: <A = void, E = never, R2 = unknown>(
        eff:
          | Logic.Of<Sh, R & R2, A, E>
          | ((p: T) => Logic.Of<Sh, R & R2, A, E>)
      ): Logic.Of<Sh, R & R2, void, E> =>
        Logic.secure(
          Effect.forkScoped(
            flowApi.runParallel<T, A, E, R2>(eff)(stream),
          ),
          { name: "flow.runParallelFork" }
        ) as Logic.Of<Sh, R & R2, void, E>,
      toStream: () => stream,
      update: (
        reducer: (
          prev: Logix.StateOf<Sh>,
          payload: T
        ) =>
          | Logix.StateOf<Sh>
          | Effect.Effect<Logix.StateOf<Sh>, any, any>
      ): Logic.Of<Sh, R, void, never> =>
        Stream.runForEach(stream, (payload) =>
          Effect.flatMap(runtime.getState, (prev) => {
            const next = reducer(prev, payload)
            return Effect.isEffect(next)
              ? Effect.flatMap(
                next as Effect.Effect<Logix.StateOf<Sh>, any, any>,
                runtime.setState
              )
              : runtime.setState(next)
          })
        ).pipe(
          Effect.catchAllCause((cause) =>
            Effect.logError("Flow error", cause)
          )
        ) as Logic.Of<Sh, R, void, never>,
      mutate: (
        reducer: (draft: Logic.Draft<Logix.StateOf<Sh>>, payload: T) => void
      ): Logic.Of<Sh, R, void, never> =>
        Stream.runForEach(stream, (payload) =>
          Effect.flatMap(runtime.getState, (prev) => {
            const next = create(prev as Logix.StateOf<Sh>, (draft) => {
              reducer(draft as Logic.Draft<Logix.StateOf<Sh>>, payload)
            }) as Logix.StateOf<Sh>
            return runtime.setState(next)
          })
        ).pipe(
          Effect.catchAllCause((cause) =>
            Effect.logError("Flow error", cause)
          )
        ) as Logic.Of<Sh, R, void, never>,
    }

    const andThen: Logic.IntentBuilder<T, Sh, R>["andThen"] = (
      handlerOrEff: any,
    ): any => {
      if (typeof handlerOrEff === "function") {
        // 参数个数 >= 2：视为 (prev, payload) 形态的 State 更新（智能版 update）
        if (handlerOrEff.length >= 2) {
          return builder.update(handlerOrEff as any)
        }
        // 否则视为 (payload?) => Effect 的副作用 sink（智能版 run）
        return builder.run(handlerOrEff as any)
      }
      // 非函数：直接视为 Effect sink
      return builder.run(handlerOrEff as any)
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
