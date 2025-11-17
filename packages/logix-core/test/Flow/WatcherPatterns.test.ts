import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Context, Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

const Counter = Logix.Module.make('WatcherCounter', {
  state: Schema.Struct({ value: Schema.Number }),
  actions: {
    inc: Schema.Void,
    dec: Schema.Void,
  },
})

const CounterErrorLogic = Counter.logic(($) =>
  $.lifecycle.onError((cause, context) => Effect.logError('Counter logic error', cause, context)),
)

// Watcher wiring using runParallelFork (equivalent to forkScoped + runParallel).
const CounterRunForkLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').runParallelFork($.state.update((s) => ({ ...s, value: s.value + 1 })))

    yield* $.onAction('dec').runParallelFork($.state.update((s) => ({ ...s, value: s.value - 1 })))
  }),
)

// Watcher wiring using Effect.all + run.
const CounterAllLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    yield* Effect.all(
      [
        $.onAction('inc').run($.state.update((s) => ({ ...s, value: s.value + 1 }))),
        $.onAction('dec').run($.state.update((s) => ({ ...s, value: s.value - 1 }))),
      ],
      { concurrency: 'unbounded' },
    )
  }),
)

// Watcher wiring using runFork (equivalent to forkScoped + run).
const CounterManualForkLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').runFork($.state.update((s) => ({ ...s, value: s.value + 1 })))

    yield* $.onAction('dec').runFork($.state.update((s) => ({ ...s, value: s.value - 1 })))
  }),
)

describe('Watcher patterns (Bound + Flow)', () => {
  it('runParallel-based watcher should update state', async () => {
    const layer = Counter.live({ value: 0 }, CounterRunForkLogic, CounterErrorLogic)

    const program = Effect.gen(function* () {
      const context = yield* Layer.build(layer)
      const runtime = Context.get(context, Counter.tag)

      // Wait for logic subscriptions.
      yield* Effect.sleep('100 millis')

      expect(yield* runtime.getState).toEqual({ value: 0 })

      // Inc
      yield* runtime.dispatch({ _tag: 'inc', payload: undefined })
      yield* Effect.sleep('100 millis')
      expect(yield* runtime.getState).toEqual({ value: 1 })

      // Dec
      yield* runtime.dispatch({ _tag: 'dec', payload: undefined })
      yield* Effect.sleep('100 millis')
      expect(yield* runtime.getState).toEqual({ value: 0 })
    })

    await Effect.runPromise(Effect.scoped(program) as Effect.Effect<void, never, never>)
  })

  it('runParallel-based watcher should handle a burst of actions', async () => {
    const layer = Counter.live({ value: 0 }, CounterRunForkLogic, CounterErrorLogic)

    const program = Effect.gen(function* () {
      const context = yield* Layer.build(layer)
      const runtime = Context.get(context, Counter.tag)

      // Wait for logic subscriptions.
      yield* Effect.sleep('50 millis')

      const N = 100

      for (let i = 0; i < N; i++) {
        yield* runtime.dispatch({ _tag: 'inc', payload: undefined })
      }

      // Wait for all watchers to process the events.
      yield* Effect.sleep('200 millis')

      const state = yield* runtime.getState
      expect(state).toEqual({ value: N })
    })

    await Effect.runPromise(Effect.scoped(program) as Effect.Effect<void, never, never>)
  })

  it('Effect.all + run style watcher should update state', async () => {
    const layer = Counter.live({ value: 0 }, CounterAllLogic, CounterErrorLogic)

    const program = Effect.gen(function* () {
      const context = yield* Layer.build(layer)
      const runtime = Context.get(context, Counter.tag)

      // Wait for logic subscriptions.
      yield* Effect.sleep('100 millis')

      expect(yield* runtime.getState).toEqual({ value: 0 })

      // Inc
      yield* runtime.dispatch({ _tag: 'inc', payload: undefined })
      yield* Effect.sleep('100 millis')
      expect(yield* runtime.getState).toEqual({ value: 1 })

      // Dec
      yield* runtime.dispatch({ _tag: 'dec', payload: undefined })
      yield* Effect.sleep('100 millis')
      expect(yield* runtime.getState).toEqual({ value: 0 })
    })

    await Effect.runPromise(Effect.scoped(program) as Effect.Effect<void, never, never>)
  })

  it('runFork watcher should behave like runParallel pattern', async () => {
    const layer = Counter.live({ value: 0 }, CounterManualForkLogic, CounterErrorLogic)

    const program = Effect.gen(function* () {
      const context = yield* Layer.build(layer)
      const runtime = Context.get(context, Counter.tag)

      // Wait for logic subscriptions.
      yield* Effect.sleep('100 millis')

      expect(yield* runtime.getState).toEqual({ value: 0 })

      // Inc
      yield* runtime.dispatch({ _tag: 'inc', payload: undefined })
      yield* Effect.sleep('100 millis')
      expect(yield* runtime.getState).toEqual({ value: 1 })

      // Dec
      yield* runtime.dispatch({ _tag: 'dec', payload: undefined })
      yield* Effect.sleep('100 millis')
      expect(yield* runtime.getState).toEqual({ value: 0 })
    })

    await Effect.runPromise(Effect.scoped(program) as Effect.Effect<void, never, never>)
  })
})
