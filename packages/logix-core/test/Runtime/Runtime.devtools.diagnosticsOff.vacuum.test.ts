import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'

describe('Runtime devtools mode=off vacuum path', () => {
  it.scoped('should skip DebugObserver and DevtoolsHub while preserving user sinks', () =>
    Effect.gen(function* () {
      Debug.clearDevtoolsEvents()
      const snapshotTokenBefore = Debug.getDevtoolsSnapshotToken()

      const M = Logix.Module.make('Runtime.Devtools.DiagnosticsOff.Vacuum', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: { inc: Schema.Void },
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

      const ring = Debug.makeRingBufferSink(256)
      const runtime = Logix.Runtime.make(impl, {
        layer: Debug.replace([ring.sink]),
        devtools: { mode: 'off' },
      })

      try {
        const finalState = yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt = yield* M.tag
              yield* rt.dispatch({ _tag: 'inc', payload: undefined })
              return yield* rt.getState
            }),
          ),
        )

        expect(finalState).toEqual({ value: 1 })

        const events = ring.getSnapshot()
        expect(events.some((event) => event.type === 'action:dispatch' || event.type === 'state:update')).toBe(true)
        expect(events.filter((event) => event.type === 'trace:effectop')).toHaveLength(0)

        expect(Debug.getDevtoolsSnapshot().events).toHaveLength(0)
        expect(Debug.getDevtoolsSnapshotToken()).toBe(snapshotTokenBefore)
      } finally {
        yield* Effect.promise(() => runtime.dispose())
      }
    }),
  )

  it.scoped('should keep omitted mode semantics (no ring-trim policy event)', () =>
    Effect.gen(function* () {
      Debug.clearDevtoolsEvents()
      Debug.devtoolsHubLayer({ bufferSize: 9, mode: 'full' })
      Debug.clearDevtoolsEvents()

      const M = Logix.Module.make('Runtime.Devtools.DiagnosticsDefault.Semantics', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: { inc: Schema.Void },
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

      const runtime = Logix.Runtime.make(impl, {
        devtools: { bufferSize: 10 },
      })

      try {
        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const rt = yield* M.tag
              yield* rt.dispatch({ _tag: 'inc', payload: undefined })
            }),
          ),
        )

        const snapshot = Debug.getDevtoolsSnapshot()
        expect(snapshot.events.length).toBeGreaterThan(0)
        expect(snapshot.events.filter((event) => event.label === 'trace:devtools:ring-trim-policy')).toHaveLength(0)
      } finally {
        yield* Effect.promise(() => runtime.dispose())
      }
    }),
  )

  it.scoped('devtools mode off/light/full should keep business semantics identical while only changing observation depth', () =>
    Effect.gen(function* () {
      const M = Logix.Module.make('Runtime.Devtools.Mode.Semantics', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: { inc: Schema.Void },
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

      const run = (mode: Debug.DevtoolsProjectionMode) =>
        Effect.gen(function* () {
          Debug.clearDevtoolsEvents()
          const tokenBefore = Debug.getDevtoolsSnapshotToken()
          const runtime = Logix.Runtime.make(impl, {
            devtools: { mode },
          })

          try {
            const finalState = yield* Effect.promise(() =>
              runtime.runPromise(
                Effect.gen(function* () {
                  const rt = yield* M.tag
                  yield* rt.dispatch({ _tag: 'inc', payload: undefined })
                  yield* rt.dispatch({ _tag: 'inc', payload: undefined })
                  yield* rt.dispatch({ _tag: 'inc', payload: undefined })
                  return yield* rt.getState
                }),
              ),
            )

            return {
              finalState,
              projectionTier: Debug.getDevtoolsSnapshot().projection.tier,
              tokenBefore,
              tokenAfter: Debug.getDevtoolsSnapshotToken(),
            }
          } finally {
            yield* Effect.promise(() => runtime.dispose())
          }
        })

      const off = yield* run('off')
      const light = yield* run('light')
      const full = yield* run('full')

      expect(off.finalState).toEqual(light.finalState)
      expect(light.finalState).toEqual(full.finalState)
      expect(full.finalState).toEqual({ value: 3 })

      expect(off.tokenAfter).toBe(off.tokenBefore)

      expect(light.projectionTier).toBe('light')
      expect(light.tokenAfter).toBeGreaterThan(light.tokenBefore)

      expect(full.projectionTier).toBe('full')
      expect(full.tokenAfter).toBeGreaterThan(full.tokenBefore)
    }),
  )
})
