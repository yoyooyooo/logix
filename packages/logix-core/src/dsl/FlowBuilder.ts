import { Effect, Stream, Ref, Option } from "effect"
import type * as Logix from "../api/Logix.js"
import type * as Logic from "../api/Logic.js"
import type { Secured } from "../api/LogicMiddleware.js"
import * as Lifecycle from "../runtime/Lifecycle.js"

// ---------------------------------------------------------------------------
// Flow：围绕 Store Runtime 源构造业务流的工具集合
// ---------------------------------------------------------------------------

/**
 * Flow 相关 Effect 默认运行在 Logic.Env 上：
 * - 包含当前 Shape 对应的 Logix.ModuleRuntime；
 * - 叠加额外服务环境 R。
 *
 * 方便在命名空间级 DSL 中直接使用 Effect 的 DI 能力。
 */
export type Env<Sh extends Logix.AnyModuleShape, R = unknown> = Logic.Env<
  Sh,
  R
>

/**
 * 「监听变化然后更新 State」的强语义语法糖签名（L3 库级 Helper）。
 *
 * 约定：
 * - selector 从整棵 State 中抽取被监听的视图；
 * - reducer 可以是纯函数，也可以返回 Effect：
 *   - 纯函数：直接基于 prev 与当前变化值计算 next；
 *   - Effect：适用于需要先调用 Service 再决定 next 的场景。
 *
 * 所有实现都运行在 Logic.Env 上，内部会使用 Logix.ModuleRuntime 的 changes$ / setState。
 */
export interface Api<Sh extends Logix.ModuleShape<any, any>, R = never> {
  /**
   * 从 Action 流中筛选某一类 Action。
   * 通常使用类型守卫缩小为具体变体。
   */
  readonly fromAction: <T extends Logix.ActionOf<Sh>>(
    predicate: (a: Logix.ActionOf<Sh>) => a is T
  ) => Stream.Stream<T>

  /**
   * 从 State 的某个 selector 构造变化流。
   *
   * 命名上与 Fluent DSL 的 `$.onState` 对齐：
   * - onState(selector) → 返回 Fluent Builder；
   * - fromState(selector) → 返回原始 Stream。
   */
  readonly fromState: <V>(
    selector: (s: Logix.StateOf<Sh>) => V
  ) => Stream.Stream<V>

  /**
   * 常见算子：防抖/节流等。
   * 实现上只是对 Stream 的二次封装。
   */
  readonly debounce: <V>(
    ms: number
  ) => (stream: Stream.Stream<V>) => Stream.Stream<V>

  /**
   * 节流：限制事件触发频率。
   */
  readonly throttle: <V>(
    ms: number
  ) => (stream: Stream.Stream<V>) => Stream.Stream<V>

  /**
   * 路由 / 筛选：只放过满足条件的事件。
   */
  readonly filter: <V>(
    predicate: (value: V) => boolean
  ) => (stream: Stream.Stream<V>) => Stream.Stream<V>

  /**
   * 将一个 Effect「挂在」某个源流上执行。
   * 典型用法：source.pipe(flow.run(effect))
   * 并发语义：默认串行执行（Sequential）。
   */
  readonly run: <V, A = void, E = never, R2 = unknown>(
    eff:
      | Logic.Of<Sh, R & R2, A, E>
      | ((payload: V) => Logic.Of<Sh, R & R2, A, E>)
  ) => (stream: Stream.Stream<V>) => Effect.Effect<void, E, R & R2>

  /**
   * 显式并行运行 (Parallel / Unbounded Concurrency)
   * 典型用法：source.pipe(flow.runParallel(effect))
   * 使用场景：高吞吐、对顺序不敏感的副作用（如日志上报、统计）。
   */
  readonly runParallel: <V, A = void, E = never, R2 = unknown>(
    eff:
      | Logic.Of<Sh, R & R2, A, E>
      | ((payload: V) => Logic.Of<Sh, R & R2, A, E>)
  ) => (stream: Stream.Stream<V>) => Effect.Effect<void, E, R & R2>

  /**
   * 并发语义变体：只保留最新触发（类似 switchLatest）。
   */
  readonly runLatest: <V, A = void, E = never, R2 = unknown>(
    eff:
      | Logic.Of<Sh, R & R2, A, E>
      | ((payload: V) => Logic.Of<Sh, R & R2, A, E>)
  ) => (stream: Stream.Stream<V>) => Effect.Effect<void, E, R & R2>

  /**
   * 并发语义变体：首个执行完成前忽略后续触发（防重复提交）。
   */
  readonly runExhaust: <V, A = void, E = never, R2 = unknown>(
    eff:
      | Logic.Of<Sh, R & R2, A, E>
      | ((payload: V) => Logic.Of<Sh, R & R2, A, E>)
  ) => (stream: Stream.Stream<V>) => Effect.Effect<void, E, R & R2>

}

const resolveEffect = <T, Sh extends Logix.AnyModuleShape, R, A, E>(
  eff:
    | Logic.Of<Sh, R, A, E>
    | ((payload: T) => Logic.Of<Sh, R, A, E>),
  payload: T
): Logic.Of<Sh, R, A, E> =>
  typeof eff === "function"
    ? (eff as (p: T) => Logic.Of<Sh, R, A, E>)(payload)
    : eff

export const make = <Sh extends Logix.AnyModuleShape, R = never>(
  runtime: Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
): Api<Sh, R> => {
  const runEffect =
    <T, A, E, R2>(
      eff:
        | Logic.Of<Sh, R & R2, A, E>
        | ((payload: T) => Logic.Of<Sh, R & R2, A, E>)
    ) =>
      (payload: T) =>
        resolveEffect<T, Sh, R & R2, A, E>(eff, payload)

  const runStreamSequential =
    <T, A, E, R2>(
      eff:
        | Logic.Of<Sh, R & R2, A, E>
        | ((payload: T) => Logic.Of<Sh, R & R2, A, E>)
    ) =>
    (stream: Stream.Stream<T>): Effect.Effect<
      void,
      E,
      Logic.Env<Sh, R & R2>
    > => Stream.runForEach(stream, (payload) =>
      runEffect<T, A, E, R2>(eff)(payload),
    )

  const runStreamParallel =
    <T, A, E, R2>(
      eff:
        | Logic.Of<Sh, R & R2, A, E>
        | ((payload: T) => Logic.Of<Sh, R & R2, A, E>)
    ) =>
    (stream: Stream.Stream<T>): Effect.Effect<
      void,
      E,
      Logic.Env<Sh, R & R2>
    > => Stream.runDrain(
      stream.pipe(
        Stream.mapEffect(
          (payload) => runEffect<T, A, E, R2>(eff)(payload),
          { concurrency: "unbounded" },
        ),
      ),
    )

  return {
    fromAction: <T extends Logix.ActionOf<Sh>>(
      predicate: (a: Logix.ActionOf<Sh>) => a is T
    ) => runtime.actions$.pipe(Stream.filter(predicate)),

    fromState: <V>(selector: (s: Logix.StateOf<Sh>) => V) =>
      runtime.changes(selector),

    debounce: (ms: number) => (stream) => Stream.debounce(stream, ms),

    throttle: (ms: number) => (stream) =>
      Stream.throttle(stream, {
        cost: () => 1,
        units: 1,
        duration: ms,
        strategy: "enforce",
      }),

    filter: (predicate: (value: any) => boolean) => (stream) =>
      Stream.filter(stream, predicate),

    run: (eff) => (stream) =>
      runStreamSequential<any, any, any, any>(eff)(stream),

    runParallel: (eff) => (stream) =>
      runStreamParallel<any, any, any, any>(eff)(stream),

    runLatest: (eff) => (stream) =>
      Stream.runDrain(
        Stream.map(stream, (payload) =>
          runEffect<any, any, any, any>(eff)(payload)
        ).pipe(
          Stream.flatMap((effect) => Stream.fromEffect(effect), {
            switch: true,
          })
        )
      ),

    runExhaust: (eff) => (stream) =>
      Effect.gen(function* () {
        const busyRef = yield* Ref.make(false)
        const mapper = (payload: any) =>
          Effect.gen(function* () {
            const acquired = yield* Ref.modify(busyRef, (busy) =>
              busy ? ([false, busy] as const) : ([true, true] as const)
            )
            if (!acquired) {
              return
            }
            try {
              yield* runEffect<any, any, any, any>(eff)(payload)
            } finally {
              yield* Ref.set(busyRef, false)
            }
          })

        return yield* Stream.runDrain(
          stream.pipe(
            Stream.mapEffect(mapper, { concurrency: "unbounded" })
          )
        )
      }),
  }
}
