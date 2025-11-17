import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema, Stream } from 'effect'
import * as Logix from '../../src/index.js'

const SourceState = Schema.Struct({ count: Schema.Number })
const SourceActions = { increment: Schema.Void }

const SourceModule = Logix.Module.make('LinkSource', {
  state: SourceState,
  actions: SourceActions,
})

const TargetState = Schema.Struct({ logs: Schema.Array(Schema.String) })
const TargetActions = { log: Schema.String }

const TargetModule = Logix.Module.make('LinkTarget', {
  state: TargetState,
  actions: TargetActions,
})

const SourceLogic = SourceModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('increment').run(() => $.state.update((s) => ({ ...s, count: s.count + 1 })))
  }),
)

const TargetLogic = TargetModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('log').run((action) =>
      $.state.update((s) => ({
        ...s,
        logs: [...s.logs, action.payload],
      })),
    )
  }),
)

type SourceAction = Logix.ActionOf<typeof SourceModule.shape>

const LinkLogic = Logix.Link.make(
  {
    modules: [SourceModule, TargetModule] as const,
  },
  ($) =>
    Effect.gen(function* () {
      const source = $[SourceModule.id]
      const target = $[TargetModule.id]

      yield* source.actions$.pipe(
        Stream.runForEach((action: SourceAction) => {
          if (action._tag === 'increment') {
            return target.actions.log('Source incremented')
          }
          return Effect.void
        }),
      )
    }),
)

describe('Link.make (public API)', () => {
  it.scoped('should coordinate actions between modules', () =>
    Effect.gen(function* () {
      const RootModule = Logix.Module.make('LinkRoot', {
        state: Schema.Void,
        actions: {},
      })

      const RootImpl = RootModule.implement({
        initial: undefined,
        imports: [
          SourceModule.implement({
            initial: { count: 0 },
            logics: [SourceLogic],
          }).impl,
          TargetModule.implement({
            initial: { logs: [] },
            logics: [TargetLogic],
          }).impl,
        ],
        processes: [LinkLogic],
      })

      const runtime = Logix.Runtime.make(RootImpl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const source = yield* SourceModule.tag
        const target = yield* TargetModule.tag

        // Wait for logic subscriptions to start.
        yield* Effect.sleep('50 millis')

        // Trigger Source.increment
        yield* source.dispatch({ _tag: 'increment', payload: undefined })

        // Wait for Link propagation.
        yield* Effect.sleep('100 millis')

        const s = yield* source.getState
        const t = yield* target.getState

        expect(s).toEqual({ count: 1 })
        expect(t.logs).toEqual(['Source incremented'])
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
