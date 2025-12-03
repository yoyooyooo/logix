import { Effect, Context, Layer, Scope, Stream, Ref, Chunk, Clock, Exit, TestClock, TestContext, Duration } from "effect"
import { Logix } from "@logix/core"
import { DebugSinkTag, DebugEvent } from "@logix/core"
import { TraceEvent } from "../ExecutionResult.js"

export interface TestRuntime<Sh extends Logix.AnyModuleShape> {
  readonly runtime: Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
  readonly state: Effect.Effect<Logix.StateOf<Sh>>
  readonly dispatch: (action: Logix.ActionOf<Sh>) => Effect.Effect<void>
  readonly actions: Effect.Effect<ReadonlyArray<Logix.ActionOf<Sh>>>
  readonly trace: Effect.Effect<ReadonlyArray<TraceEvent<Sh>>>
  readonly dispose: Effect.Effect<void>
  readonly advance: (duration: Duration.DurationInput) => Effect.Effect<void>
  readonly context: Context.Context<any>
}

export const TestRuntimeTag = Context.GenericTag<TestRuntime<any>>("@logix/test/TestRuntime")

export const make = <Sh extends Logix.AnyModuleShape, R = never, E = unknown>(
  module: Logix.ModuleInstance<any, Sh>,
  layer: Layer.Layer<Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>, E, R>
): Effect.Effect<TestRuntime<Sh>, E, R> => {
  return Effect.gen(function* (_) {
    const traceRef = yield* Ref.make<Chunk.Chunk<TraceEvent<Sh>>>(Chunk.empty())

    // DebugSink: capture lifecycle errors into trace as Error events.
    const debugLayer = Layer.succeed(DebugSinkTag, {
      record: (event: DebugEvent) => {
        if (event.type === "lifecycle:error") {
          const timestamp = Date.now()
          const traceEvent: TraceEvent<Sh> = {
            _tag: "Error",
            cause: event.cause,
            timestamp,
          }
          return Ref.update(traceRef, Chunk.append(traceEvent)).pipe(
            Effect.asVoid
          )
        }
        return Effect.void
      },
    })

    const runtimeLayer = Layer.merge(
      layer as Layer.Layer<any, any, any>,
      debugLayer as Layer.Layer<any, any, any>
    )

    // Build the layer in the new scope, providing TestContext
    const scope = yield* Scope.make()
    const context = yield* Layer.build(runtimeLayer).pipe(
        Effect.provide(TestContext.TestContext),
        Scope.extend(scope)
    )

	    const runtime = Context.get(context, module) as Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>

      // Collect actions
      yield* Stream.runForEach(runtime.actions$, (action) =>
        Effect.gen(function* () {
          const timestamp = yield* Clock.currentTimeMillis
          const event: TraceEvent<Sh> = { _tag: "Action", action, timestamp }
          yield* Ref.update(traceRef, Chunk.append(event))
        })
      ).pipe(
        Effect.forkScoped,
        Scope.extend(scope)
      )

      // Collect state changes
      yield* Stream.runForEach(runtime.changes((s) => s), (state) =>
        Effect.gen(function* () {
          const timestamp = yield* Clock.currentTimeMillis
          const event: TraceEvent<Sh> = { _tag: "State", state, timestamp }
          yield* Ref.update(traceRef, Chunk.append(event))
        })
      ).pipe(
        Effect.forkScoped,
        Scope.extend(scope)
      )

    return {
      runtime,
      state: runtime.getState,
      dispatch: runtime.dispatch,
      actions: Effect.map(Ref.get(traceRef), (chunk) =>
        Chunk.toReadonlyArray(chunk)
          .filter((e): e is Extract<TraceEvent<Sh>, { _tag: "Action" }> => e._tag === "Action")
          .map(e => e.action)
      ),
      trace: Effect.map(Ref.get(traceRef), Chunk.toReadonlyArray),
      dispose: Scope.close(scope, Exit.void),
      advance: (duration) => TestClock.adjust(duration as any).pipe(Effect.asVoid),
      context
    }
  })
}
