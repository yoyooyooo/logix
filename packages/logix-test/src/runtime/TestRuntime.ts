import {
  Effect,
  Context,
  Layer,
  Scope,
  Stream,
  Ref,
  Chunk,
  Clock,
  Exit,
  TestClock,
  TestContext,
  Duration,
} from 'effect'
import * as Logix from '@logix/core'
import { TraceEvent } from '../ExecutionResult.js'

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

export class TestRuntimeTag extends Context.Tag(
  '@logix/test/TestRuntime',
)<TestRuntimeTag, TestRuntime<any>>() {}

export const make = <Sh extends Logix.AnyModuleShape, R = never, E = unknown>(
  module: Logix.ModuleInstance<any, Sh>,
  layer: Layer.Layer<Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>, E, R>,
): Effect.Effect<TestRuntime<Sh>, E, R> => {
  return Effect.gen(function* (_) {
    const traceRef = yield* Ref.make<Chunk.Chunk<TraceEvent<Sh>>>(Chunk.empty())

    // DebugSink: capture lifecycle errors into trace as Error events.
    const debugSink: Logix.Debug.Sink = {
      record: (event: Logix.Debug.Event) => {
        if (event.type === 'lifecycle:error') {
          const timestamp = Date.now()
          const traceEvent: TraceEvent<Sh> = {
            _tag: 'Error',
            cause: event.cause,
            timestamp,
          }
          return Ref.update(traceRef, Chunk.append(traceEvent)).pipe(Effect.asVoid)
        }
        return Effect.void
      },
    }

    const runtimeLayer = Layer.mergeAll(
      layer as Layer.Layer<any, any, any>,
      TestContext.TestContext as Layer.Layer<any, any, any>,
    )

    // Build the layer in the new scope，并在构建与后续运行期间挂载 DebugSink。
    const scope = yield* Scope.make()
    const context = yield* Effect.locally(
      Logix.Debug.internal.currentDebugSinks as any,
      [debugSink],
    )(
      Layer.build(runtimeLayer).pipe(Scope.extend(scope)),
    )

    const runtime = Context.get(context, module) as Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>

    // Collect actions
    yield* Stream.runForEach(runtime.actions$, (action) =>
      Effect.gen(function* () {
        const timestamp = yield* Clock.currentTimeMillis
        const event: TraceEvent<Sh> = { _tag: 'Action', action, timestamp }
        yield* Ref.update(traceRef, Chunk.append(event))
      }),
    ).pipe(Effect.forkScoped, Scope.extend(scope))

    // Collect state changes
    yield* Stream.runForEach(
      runtime.changes((s) => s),
      (state) =>
        Effect.gen(function* () {
          const timestamp = yield* Clock.currentTimeMillis
          const event: TraceEvent<Sh> = { _tag: 'State', state, timestamp }
          yield* Ref.update(traceRef, Chunk.append(event))
        }),
    ).pipe(Effect.forkScoped, Scope.extend(scope))

    return {
      runtime,
      state: runtime.getState,
      dispatch: runtime.dispatch,
      actions: Effect.map(Ref.get(traceRef), (chunk) =>
        Chunk.toReadonlyArray(chunk)
          .filter((e): e is Extract<TraceEvent<Sh>, { _tag: 'Action' }> => e._tag === 'Action')
          .map((e) => e.action),
      ),
      trace: Effect.map(Ref.get(traceRef), Chunk.toReadonlyArray),
      dispose: Scope.close(scope, Exit.void),
      advance: (duration) => TestClock.adjust(duration as any).pipe(Effect.asVoid),
      context,
    }
  })
}
