import { describe, it, expect } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Layer } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/internal/debug-api.js'
import { makeConvergeAutoFixture, pickConvergeTraceEvents } from './FieldKernel.ConvergeAuto.fixtures.js'

const lastConvergeData = (ring: Debug.RingBufferSink): any => {
  const events = pickConvergeTraceEvents(ring.getSnapshot())
  return events.length > 0 ? (events[events.length - 1] as any).data : undefined
}

describe('FieldKernel converge auto config (default & override priority)', () => {
  it.effect('defaults to requestedMode=auto (builtin)', () =>
    Effect.gen(function* () {
      const { M, ring, runtime } = makeConvergeAutoFixture({
        diagnosticsLevel: 'light',
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(M.tag).pipe(Effect.orDie)
        yield* FieldContracts.runWithStateTransaction(rt as any, { kind: 'test', name: 'default-auto' }, () =>
          Effect.gen(function* () {
            const prev = yield* rt.getState
            yield* rt.setState({ ...prev, a: prev.a + 1 })
          }),
        )
      })

      yield* Effect.promise(() => runtime.runPromise(program))

      const data = lastConvergeData(ring)
      expect(data).toBeDefined()
      expect(data.requestedMode).toBe('auto')
      expect(data.executedMode).toBe('full')
      expect(data.configScope).toBe('builtin')
    }),
  )

  it.effect('runtime moduleId override beats runtime default', () =>
    Effect.gen(function* () {
      const moduleId = 'FieldKernelConvergeAuto_ConfigOverride'
      const { M, ring, runtime } = makeConvergeAutoFixture({
        moduleId,
        diagnosticsLevel: 'light',
        stateTransaction: {
          fieldConvergeMode: 'dirty',
          fieldConvergeOverridesByModuleId: {
            [moduleId]: { fieldConvergeMode: 'full' },
          },
        },
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(M.tag).pipe(Effect.orDie)
        yield* FieldContracts.runWithStateTransaction(
          rt as any,
          { kind: 'test', name: 'module-override' },
          () =>
            Effect.gen(function* () {
              const prev = yield* rt.getState
              yield* rt.setState({ ...prev, a: prev.a + 1 })
            }),
        )
      })

      yield* Effect.promise(() => runtime.runPromise(program))

      const data = lastConvergeData(ring)
      expect(data).toBeDefined()
      expect(data.requestedMode).toBe('full')
      expect(data.executedMode).toBe('full')
      expect(data.configScope).toBe('runtime_module')
    }),
  )

  it.effect('provider override beats runtime moduleId override', () =>
    Effect.gen(function* () {
      const moduleId = 'FieldKernelConvergeAuto_ProviderOverride'
      const providerOverride = Logix.Runtime.stateTransactionOverridesLayer({
        fieldConvergeOverridesByModuleId: {
          [moduleId]: { fieldConvergeMode: 'dirty' },
        },
      })

      const { M, ring, runtime } = makeConvergeAutoFixture({
        moduleId,
        diagnosticsLevel: 'light',
        stateTransaction: {
          fieldConvergeMode: 'full',
          fieldConvergeOverridesByModuleId: {
            [moduleId]: { fieldConvergeMode: 'full' },
          },
        },
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(M.tag).pipe(Effect.orDie)
        yield* FieldContracts.runWithStateTransaction(
          rt as any,
          { kind: 'test', name: 'provider-override' },
          () =>
            Effect.gen(function* () {
              const prev = yield* rt.getState
              yield* rt.setState({ ...prev, a: prev.a + 1 })
            }),
        )
      })

      yield* Effect.promise(() =>
        runtime.runPromise(program.pipe(Effect.provide(providerOverride as Layer.Layer<any, never, never>))),
      )

      const data = lastConvergeData(ring)
      expect(data).toBeDefined()
      expect(data.requestedMode).toBe('dirty')
      expect(data.executedMode).toBe('dirty')
      expect(data.configScope).toBe('provider')
    }),
  )
})
