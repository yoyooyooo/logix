import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Module.logicUnitId override diagnostics', () => {
  it('should be last-write-wins and emit module_logic::override warning (dev + diagnostics on)', async () => {
    const ring = Logix.Debug.makeRingBufferSink(64)

    const layer = Layer.mergeAll(
      Logix.Debug.replace([ring.sink]),
      Logix.Debug.diagnosticsLevel('light'),
    ) as Layer.Layer<any, never, never>

    const M = Logix.Module.make('ModuleLogicOverride', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: {},
    })

    const first = M.logic(
      ($) =>
        Effect.gen(function* () {
          yield* $.state.update(() => ({ value: 1 }) as any)
          yield* Effect.sleep('50 millis')
          yield* $.state.update(() => ({ value: 3 }) as any)
        }),
      { id: 'dup', name: 'first' },
    )

    const second = M.logic(
      ($) =>
        Effect.gen(function* () {
          yield* $.state.update(() => ({ value: 2 }) as any)
        }),
      { id: 'dup', name: 'second' },
    )

    const Mod = M.implement({
      initial: { value: 0 },
      logics: [first, second],
    })

    const runtime = Logix.Runtime.make(Mod, { layer })

    try {
      await runtime.runPromise(
        Effect.gen(function* () {
          const rt = yield* M.tag
          yield* Effect.sleep('120 millis')
          expect((yield* rt.getState).value).toBe(2)
        }) as Effect.Effect<void, never, any>,
      )
    } finally {
      await runtime.dispose()
    }

    const overrideEvents = ring
      .getSnapshot()
      .filter((e) => e.type === 'diagnostic' && (e as any).code === 'module_logic::override')

    expect(overrideEvents.length).toBe(1)
    expect((overrideEvents[0] as any).severity).toBe('warning')
    expect((overrideEvents[0] as any).message).toContain('logicUnitId "dup" overridden')
  })
})
