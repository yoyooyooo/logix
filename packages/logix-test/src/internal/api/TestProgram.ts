import { Chunk, Clock, Effect, Layer, Ref, Scope, Stream, TestClock, TestContext } from 'effect'
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
  const layer = Layer.mergeAll(TestContext.TestContext as Layer.Layer<any, never, never>, userLayer) as Layer.Layer<
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
  actionsRef: Ref.Ref<Chunk.Chunk<Logix.ActionOf<Sh>>>,
): TestApi<Sh> => {
  const assertStateEffect = (
    predicate: (s: Logix.StateOf<Sh>) => boolean,
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
  actionsRef: Ref.Ref<Chunk.Chunk<Logix.ActionOf<Sh>>>,
): Effect.Effect<void, never, Scope.Scope> =>
  Effect.gen(function* () {
    yield* Stream.runForEach(ctx.module.actions$, (action) =>
      Effect.gen(function* () {
        const timestamp = yield* Clock.currentTimeMillis
        const event: TraceEvent<Sh> = { _tag: 'Action', action: action as any, timestamp }
        yield* Ref.update(traceRef, Chunk.append(event))
        yield* Ref.update(actionsRef, Chunk.append(action as any))
      }),
    ).pipe(Effect.forkScoped, Scope.extend(ctx.scope))

    yield* Stream.runForEach(
      ctx.module.changes((s) => s),
      (state) =>
        Effect.gen(function* () {
          const timestamp = yield* Clock.currentTimeMillis
          const event: TraceEvent<Sh> = { _tag: 'State', state: state as any, timestamp }
          yield* Ref.update(traceRef, Chunk.append(event))
        }),
    ).pipe(Effect.forkScoped, Scope.extend(ctx.scope))

    // Give subscriptions/watchers a chance to start (in TestContext, advance the test clock + yield the scheduler).
    yield* TestClock.adjust(1)
    yield* Effect.yieldNow()
  })

export const runProgram = <Sh extends AnyModuleShape>(
  program: Logix.ModuleImpl<any, Sh, any> | Logix.AnyModule,
  body: (api: TestApi<Sh>) => Effect.Effect<void, any, any>,
  options?: TestProgramOptions,
): Effect.Effect<ExecutionResult<Sh>, unknown, Scope.Scope> =>
  Effect.gen(function* () {
    const traceRef = yield* Ref.make<Chunk.Chunk<TraceEvent<Sh>>>(Chunk.empty())
    const actionsRef = yield* Ref.make<Chunk.Chunk<Logix.ActionOf<Sh>>>(Chunk.empty())

    const debugSink: Logix.Debug.Sink = {
      record: (event: Logix.Debug.Event) => {
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

    const ctx = yield* Effect.locally(Logix.Debug.internal.currentDebugSinks as any, [debugSink])(
      Logix.Runtime.openProgram(program, resolved),
    )

    yield* Effect.tryPromise({
      try: () => ctx.runtime.runPromise(startTraceCollectors(ctx, traceRef, actionsRef) as any),
      catch: (e) => e,
    }).pipe(Effect.orDie)

    const api = makeTestApi(ctx, actionsRef)

    yield* Effect.tryPromise({
      try: () => ctx.runtime.runPromise(body(api).pipe(Scope.extend(ctx.scope)) as any),
      catch: (e) => e,
    }).pipe(Effect.orDie)

    // flush: give pending actions/state collectors a chance to settle.
    yield* Effect.tryPromise({
      try: () =>
        ctx.runtime.runPromise(
          Effect.gen(function* () {
            yield* TestClock.adjust(1)
            yield* Effect.yieldNow()
          }) as any,
        ),
      catch: (e) => e,
    }).pipe(Effect.orDie)

    const finalState = yield* Effect.tryPromise({
      try: () => ctx.runtime.runPromise(ctx.module.getState as any),
      catch: (e) => e,
    }).pipe(Effect.orDie)

    const actionsChunk = yield* Ref.get(actionsRef)
    const traceChunk = yield* Ref.get(traceRef)

    return makeExecutionResult(
      finalState as any,
      Chunk.toReadonlyArray(actionsChunk) as any,
      Chunk.toReadonlyArray(traceChunk) as any,
    )
  })
