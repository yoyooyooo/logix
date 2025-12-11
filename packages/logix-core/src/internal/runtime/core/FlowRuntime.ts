import { Effect, Stream, Ref } from "effect"
import type {
  AnyModuleShape,
  ModuleRuntime,
  StateOf,
  ActionOf,
  ModuleShape,
} from "./module.js"
import type * as Logic from "./LogicMiddleware.js"

export interface Api<Sh extends ModuleShape<any, any>, R = never> {
  readonly fromAction: <T extends ActionOf<Sh>>(
    predicate: (a: ActionOf<Sh>) => a is T
  ) => Stream.Stream<T>

  readonly fromState: <V>(
    selector: (s: StateOf<Sh>) => V
  ) => Stream.Stream<V>

  readonly debounce: <V>(
    ms: number
  ) => (stream: Stream.Stream<V>) => Stream.Stream<V>

  readonly throttle: <V>(
    ms: number
  ) => (stream: Stream.Stream<V>) => Stream.Stream<V>

  readonly filter: <V>(
    predicate: (value: V) => boolean
  ) => (stream: Stream.Stream<V>) => Stream.Stream<V>

  readonly run: <V, A = void, E = never, R2 = unknown>(
    eff:
      | Logic.Of<Sh, R & R2, A, E>
      | ((payload: V) => Logic.Of<Sh, R & R2, A, E>)
  ) => (stream: Stream.Stream<V>) => Effect.Effect<void, E, Logic.Env<Sh, R & R2>>

  readonly runParallel: <V, A = void, E = never, R2 = unknown>(
    eff:
      | Logic.Of<Sh, R & R2, A, E>
      | ((payload: V) => Logic.Of<Sh, R & R2, A, E>)
  ) => (stream: Stream.Stream<V>) => Effect.Effect<void, E, Logic.Env<Sh, R & R2>>

  readonly runLatest: <V, A = void, E = never, R2 = unknown>(
    eff:
      | Logic.Of<Sh, R & R2, A, E>
      | ((payload: V) => Logic.Of<Sh, R & R2, A, E>)
  ) => (stream: Stream.Stream<V>) => Effect.Effect<void, E, Logic.Env<Sh, R & R2>>

  readonly runExhaust: <V, A = void, E = never, R2 = unknown>(
    eff:
      | Logic.Of<Sh, R & R2, A, E>
      | ((payload: V) => Logic.Of<Sh, R & R2, A, E>)
  ) => (stream: Stream.Stream<V>) => Effect.Effect<void, E, Logic.Env<Sh, R & R2>>
}

const resolveEffect = <T, Sh extends AnyModuleShape, R, A, E>(
  eff:
    | Logic.Of<Sh, R, A, E>
    | ((payload: T) => Logic.Of<Sh, R, A, E>),
  payload: T
): Logic.Of<Sh, R, A, E> =>
  typeof eff === "function"
    ? (eff as (p: T) => Logic.Of<Sh, R, A, E>)(payload)
    : eff

export const make = <Sh extends AnyModuleShape, R = never>(
  runtime: ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>
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
    fromAction: <T extends ActionOf<Sh>>(
      predicate: (a: ActionOf<Sh>) => a is T
    ) => runtime.actions$.pipe(Stream.filter(predicate)),

    fromState: <V>(selector: (s: StateOf<Sh>) => V) =>
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

