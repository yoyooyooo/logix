import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import * as Logix from '../../src/index.js'
import type * as Debug from '../../src/Debug.js'
import { makeConvergeAutoFixture, pickConvergeTraceEvents } from './StateTrait.ConvergeAuto.fixtures.js'

const lastConvergeData = (ring: Debug.RingBufferSink): any => {
  const events = pickConvergeTraceEvents(ring.getSnapshot())
  return events.length > 0 ? (events[events.length - 1] as any).data : undefined
}

const runTxn = (
  M: any,
  runtime: ReturnType<typeof Logix.Runtime.make>,
  name: string,
): Effect.Effect<void, never, any> =>
  Effect.promise(() =>
    runtime.runPromise(
      Effect.gen(function* () {
        const rt = yield* M.tag
        yield* Logix.InternalContracts.runWithStateTransaction(rt as any, { kind: 'test', name }, () =>
          Effect.gen(function* () {
            const prev = yield* rt.getState
            yield* rt.setState({ ...prev, a: prev.a + 1 })
            Logix.InternalContracts.recordStatePatch(rt as any, 'a', 'unknown')
          }),
        )
      }),
    ),
  )

describe('StateTrait converge auto module overrides (hot switch)', () => {
  it.scoped('runtime moduleId override can hot switch and takes effect on next transaction', () =>
    Effect.gen(function* () {
      const moduleId = 'StateTraitConvergeAuto_ModuleOverrideHotSwitch'
      const { M, ring, runtime } = makeConvergeAutoFixture({
        moduleId,
        diagnosticsLevel: 'light',
        stateTransaction: {
          traitConvergeMode: 'dirty',
        },
      })

      Logix.Runtime.setTraitConvergeOverride(runtime, moduleId, { traitConvergeMode: 'full' })
      yield* runTxn(M, runtime, 't1')
      const t1 = lastConvergeData(ring)
      expect(t1).toBeDefined()
      expect(t1.configScope).toBe('runtime_module')
      expect(t1.requestedMode).toBe('full')

      Logix.Runtime.setTraitConvergeOverride(runtime, moduleId, { traitConvergeMode: 'dirty' })
      yield* runTxn(M, runtime, 't2')
      const t2 = lastConvergeData(ring)
      expect(t2).toBeDefined()
      expect(t2.configScope).toBe('runtime_module')
      expect(t2.requestedMode).toBe('dirty')

      Logix.Runtime.setTraitConvergeOverride(runtime, moduleId, undefined)
      yield* runTxn(M, runtime, 't3')
      const t3 = lastConvergeData(ring)
      expect(t3).toBeDefined()
      expect(t3.configScope).toBe('runtime_default')
      expect(t3.requestedMode).toBe('dirty')
    }),
  )

  it.scoped('provider override beats runtime moduleId override after hot switch', () =>
    Effect.gen(function* () {
      const moduleId = 'StateTraitConvergeAuto_ModuleOverrideHotSwitch_ProviderWins'
      const providerOverride = Logix.Runtime.stateTransactionOverridesLayer({
        traitConvergeOverridesByModuleId: {
          [moduleId]: { traitConvergeMode: 'full' },
        },
      })

      const { M, ring, runtime } = makeConvergeAutoFixture({
        moduleId,
        diagnosticsLevel: 'light',
        stateTransaction: {
          traitConvergeMode: 'dirty',
        },
      })

      Logix.Runtime.setTraitConvergeOverride(runtime, moduleId, { traitConvergeMode: 'dirty' })

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt = yield* M.tag
            yield* Logix.InternalContracts.runWithStateTransaction(
              rt as any,
              { kind: 'test', name: 'provider-wins' },
              () =>
                Effect.gen(function* () {
                  const prev = yield* rt.getState
                  yield* rt.setState({ ...prev, a: prev.a + 1 })
                  Logix.InternalContracts.recordStatePatch(rt as any, 'a', 'unknown')
                }),
            )
          }).pipe(Effect.provide(providerOverride as Layer.Layer<any, never, never>)),
        ),
      )

      const data = lastConvergeData(ring)
      expect(data).toBeDefined()
      expect(data.configScope).toBe('provider')
      expect(data.requestedMode).toBe('full')
    }),
  )
})
