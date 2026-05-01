import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import { Chunk, Clock, Effect, Layer, Ref, Scope, Stream } from 'effect'
import { TestClock } from 'effect/testing'
import * as Logix from '@logixjs/core'
import type { AnyModuleShape } from '@logixjs/core'
import type { OpenProgramOptions, ProgramRunContext } from '@logixjs/core/Runtime'
import type { ExecutionResult, TraceEvent } from './ExecutionResult.js'
import { make as makeExecutionResult } from './ExecutionResult.js'
import { assertSignal, assertState } from '../utils/assertions.js'
import { waitUntil, type WaitUntilOptions } from '../utils/waitUntil.js'
import type { TestApi } from './TestApi.js'

export type TestProgramOptions = Omit<OpenProgramOptions, 'handleSignals'> & {
  readonly handleSignals?: boolean
}

const defaultOptions = (options?: TestProgramOptions): OpenProgramOptions => {
  const base = options ?? {}
  const userLayer = (base.layer ?? Layer.empty) as Layer.Layer<any, never, never>
  const layer = Layer.mergeAll(TestClock.layer() as Layer.Layer<any, never, never>, userLayer) as Layer.Layer<
    any,
    never,
    never
  >

  return {
    ...base,
    layer,
    handleSignals: base.handleSignals ?? false,
  }
}

const makeTestApi = <Sh extends AnyModuleShape>(
  ctx: ProgramRunContext<Sh>,
  actionsRef: Ref.Ref<Chunk.Chunk<Logix.Module.ActionOf<Sh>>>,
): TestApi<Sh> => {
  const assertStateEffect = (
    predicate: (s: Logix.Module.StateOf<Sh>) => boolean,
    options?: WaitUntilOptions,
  ): Effect.Effect<void, Error, TestClock.TestClock> =>
    Effect.gen(function* () {
      const check = Effect.flatMap(ctx.module.getState, (s) => assertState(s as any, predicate))

      yield* waitUntil(check, options)
    })

  const assertSignalEffect = (
    expectedType: string,
    expectedPayload?: unknown,
    options?: WaitUntilOptions,
  ): Effect.Effect<void, Error, TestClock.TestClock> =>
    Effect.gen(function* () {
      const check = Effect.flatMap(Ref.get(actionsRef), (actions) =>
        Effect.sync(() => {
          for (const actual of Chunk.toReadonlyArray(actions)) {
            const exit = Effect.runSyncExit(assertSignal(actual, expectedType, expectedPayload))
            if (exit._tag === 'Success') {
              return
            }
          }

          throw new Error(
            `Signal assertion failed: expected type=${expectedType}, payload=${JSON.stringify(expectedPayload)}`,
          )
        }),
      )

      yield* waitUntil(check, options)
    })

  return {
    ctx,
    dispatch: ctx.module.dispatch as any,
    advance: (duration) => TestClock.adjust(duration as any).pipe(Effect.asVoid),
    assert: {
      state: assertStateEffect,
      signal: assertSignalEffect,
    },
  }
}

const startTraceCollectors = <Sh extends AnyModuleShape>(
  ctx: ProgramRunContext<Sh>,
  traceRef: Ref.Ref<Chunk.Chunk<TraceEvent<Sh>>>,
  actionsRef: Ref.Ref<Chunk.Chunk<Logix.Module.ActionOf<Sh>>>,
): Effect.Effect<void, never, Scope.Scope> =>
  Effect.gen(function* () {
    yield* Stream.runForEach(ctx.module.actions$, (action) =>
      Effect.gen(function* () {
        const timestamp = yield* Clock.currentTimeMillis
        const event: TraceEvent<Sh> = { _tag: 'Action', action: action as any, timestamp }
        yield* Ref.update(traceRef, Chunk.append(event))
        yield* Ref.update(actionsRef, Chunk.append(action as any))
      }),
    ).pipe((effect) => Effect.forkIn(effect, ctx.scope), Effect.asVoid)

    yield* Stream.runForEach(
      ctx.module.changes((s) => s),
      (state) =>
        Effect.gen(function* () {
          const timestamp = yield* Clock.currentTimeMillis
          const event: TraceEvent<Sh> = { _tag: 'State', state: state as any, timestamp }
          yield* Ref.update(traceRef, Chunk.append(event))
        }),
    ).pipe((effect) => Effect.forkIn(effect, ctx.scope), Effect.asVoid)

    // Give subscriptions/watchers a chance to start (in TestContext, advance the test clock + yield the scheduler).
    yield* TestClock.adjust(1)
    yield* Effect.yieldNow
  })

const runInProgramScope = <Sh extends AnyModuleShape, A, E, R>(
  ctx: ProgramRunContext<Sh>,
  effect: Effect.Effect<A, E, R | Scope.Scope>,
): Effect.Effect<A, never, never> =>
  Effect.tryPromise({
    try: () => ctx.runtime.runPromise(Effect.provideService(effect, Scope.Scope, ctx.scope)),
    catch: (e) => e,
  }).pipe(Effect.orDie)

export const runProgram = <Sh extends AnyModuleShape>(
  program: Logix.Module.AnyProgram,
  body: (api: TestApi<Sh>) => Effect.Effect<void, any, any>,
  options?: TestProgramOptions,
): Effect.Effect<ExecutionResult<Sh>, unknown, Scope.Scope> =>
  Effect.gen(function* () {
    const traceRef = yield* Ref.make<Chunk.Chunk<TraceEvent<Sh>>>(Chunk.empty())
    const actionsRef = yield* Ref.make<Chunk.Chunk<Logix.Module.ActionOf<Sh>>>(Chunk.empty())

    const debugSink: CoreDebug.Sink = {
      record: (event: CoreDebug.Event) => {
        if (event.type !== 'lifecycle:error') {
          return Effect.void
        }
        return Effect.gen(function* () {
          const timestamp = yield* Clock.currentTimeMillis
          const traceEvent: TraceEvent<Sh> = {
            _tag: 'Error',
            cause: (event as any).cause,
            timestamp,
          }
          yield* Ref.update(traceRef, Chunk.append(traceEvent))
        }).pipe(Effect.asVoid)
      },
    }

    const resolved = defaultOptions(options)

    const ctx = yield* Effect.provideService(
      Logix.Runtime.openProgram<Sh>(program, resolved),
      CoreDebug.internal.currentDebugSinks,
      [debugSink],
    )

    yield* runInProgramScope(ctx, startTraceCollectors(ctx, traceRef, actionsRef))

    const api = makeTestApi(ctx, actionsRef)

    yield* runInProgramScope(ctx, body(api))

    // flush: give pending actions/state collectors a chance to settle.
    yield* runInProgramScope(
      ctx,
      Effect.gen(function* () {
        yield* TestClock.adjust(1)
        yield* Effect.yieldNow
      }),
    )

    const finalState = yield* runInProgramScope(ctx, ctx.module.getState)

    const actionsChunk = yield* Ref.get(actionsRef)
    const traceChunk = yield* Ref.get(traceRef)

    return makeExecutionResult(
      finalState as any,
      Chunk.toReadonlyArray(actionsChunk) as any,
      Chunk.toReadonlyArray(traceChunk) as any,
    )
  })
