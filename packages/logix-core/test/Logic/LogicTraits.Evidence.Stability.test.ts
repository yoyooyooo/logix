import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'

describe('LogicTraits - evidence stability (US3)', () => {
  it.effect('same input twice → trace:module:traits meta is identical', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        a: Schema.Number,
        sum: Schema.Number,
      })

      const Actions = {
        noop: Schema.Void,
      }

      const sharedTraits = Logix.StateTrait.from(State)({
        sum: Logix.StateTrait.computed({
          deps: ['a'],
          get: (a) => a,
        }),
      })

      const runOnce = (runId: string) =>
        Effect.gen(function* () {
          Debug.startDevtoolsRun(runId)

          const layer = Debug.devtoolsHubLayer({
            bufferSize: 128,
            diagnosticsLevel: 'full',
          }) as Layer.Layer<any, never, never>

          const M = Logix.Module.make('LogicTraitsEvidenceStability', {
            state: State,
            actions: Actions,
          })

          const L = M.logic(
            ($) => ({
              setup: Effect.sync(() => {
                $.traits.declare(sharedTraits)
              }),
              run: Effect.void,
            }),
            { id: 'L#1' },
          )

          const Impl = M.implement({
            initial: { a: 1, sum: 0 },
            logics: [L],
          })

          const runtime = Logix.Runtime.make(Impl, { layer })

          try {
            yield* Effect.promise(() =>
              runtime.runPromise(
                Effect.gen(function* () {
                  yield* M.tag
                }) as Effect.Effect<void, never, any>,
              ),
            )
          } finally {
            yield* Effect.promise(() => runtime.dispose())
          }

          const pkg = Debug.exportEvidencePackage({
            source: { host: 'test', label: runId },
          })

          const traitsEvents = pkg.events.filter(
            (e: any) => e.type === 'debug:event' && e.payload?.label === 'trace:module:traits',
          )

          expect(traitsEvents.length).toBe(1)
          return (traitsEvents[0] as any).payload.meta
        })

      const meta1 = yield* runOnce('traits-stability-1')
      const meta2 = yield* runOnce('traits-stability-2')

      expect(meta1).toEqual(meta2)
    }),
  )
})
