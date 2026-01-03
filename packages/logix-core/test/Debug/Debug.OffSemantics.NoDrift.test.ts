import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'

describe('Debug semantics: diagnostics=off should not change runtime behavior (US1)', () => {
  it.scoped('off vs full: final state identical; off does not export debug:event evidence', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({ value: Schema.Number })
      const Actions = { inc: Schema.Void }

      const M = Logix.Module.make('Debug.OffSemantics.NoDrift', {
        state: State,
        actions: Actions,
        reducers: {
          inc: Logix.Module.Reducer.mutate((draft) => {
            draft.value += 1
          }),
        },
      })

      const impl = M.implement({
        initial: { value: 0 },
        logics: [],
      })

      const run = (diagnosticsLevel: Debug.DiagnosticsLevel) =>
        Effect.gen(function* () {
          Debug.clearDevtoolsEvents()

          const layer = Debug.devtoolsHubLayer({
            bufferSize: 64,
            diagnosticsLevel,
          }) as Layer.Layer<any, never, never>

          const runtime = Logix.Runtime.make(impl, { layer })

          const state = yield* Effect.promise(() =>
            runtime.runPromise(
              Effect.gen(function* () {
                const rt = yield* M.tag
                yield* rt.dispatch({ _tag: 'inc', payload: undefined })
                return yield* rt.getState
              }),
            ),
          )

          const pkg = Debug.exportEvidencePackage({
            source: { host: 'test', label: `level=${diagnosticsLevel}` },
          })

          return { state, pkg }
        })

      const off = yield* run('off')
      const full = yield* run('full')

      expect(off.state).toEqual(full.state)

      const offDebugEvents = off.pkg.events.filter((e) => e.type === 'debug:event')
      const fullDebugEvents = full.pkg.events.filter((e) => e.type === 'debug:event')

      expect(offDebugEvents.length).toBe(0)
      expect(fullDebugEvents.length).toBeGreaterThan(0)
    }),
  )
})
