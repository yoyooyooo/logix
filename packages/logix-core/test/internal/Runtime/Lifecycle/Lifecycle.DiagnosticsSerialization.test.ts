import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect } from 'effect'
import * as Logix from '../../../../src/index.js'
import * as LifecycleCore from '../../../../src/internal/runtime/core/Lifecycle.js'

const makeRuntimeRefCollector = () => {
  const refs: Logix.Debug.RuntimeDebugEventRef[] = []
  const sink: Logix.Debug.Sink = {
    record: (event) =>
      Effect.sync(() => {
        const ref = Logix.Debug.internal.toRuntimeDebugEventRef(event, {
          diagnosticsLevel: 'full',
        })
        if (ref) {
          refs.push(ref)
        }
      }),
  }
  return { refs, sink }
}

const asObject = (value: unknown): any => (value && typeof value === 'object' && !Array.isArray(value) ? value : null)

describe('Lifecycle diagnostics serialization', () => {
  it.scoped('initRequired failure should emit serializable lifecycle events', () =>
    Effect.gen(function* () {
      const manager = yield* LifecycleCore.makeLifecycleManager({
        moduleId: 'Lifecycle.DiagnosticsSerialization.Init',
        instanceId: 'i-init',
      })

      manager.registerInitRequired(Effect.die(new Error('init failed')))

      const { refs, sink } = makeRuntimeRefCollector()

      yield* Effect.exit(
        manager.runInitRequired.pipe(Effect.locally(Logix.Debug.internal.currentDebugSinks as any, [sink])),
      )

      expect(refs.some((r) => r.kind === 'lifecycle')).toBe(true)
      for (const ref of refs) {
        expect(() => JSON.stringify(ref)).not.toThrow()
      }

      const errorRef = refs.find((r) => r.kind === 'lifecycle' && r.label === 'lifecycle:error')
      expect(errorRef).toBeDefined()
      const meta = asObject(errorRef!.meta)
      expect(meta?.type).toBe('lifecycle:error')
      expect(meta?.phase).toBe('init')
      expect(meta?.name).toBe('initRequired')

      expect(refs.some((r) => r.kind === 'lifecycle' && r.label === 'initRequired:start')).toBe(true)
    }),
  )

  it.scoped('start failure should emit serializable lifecycle events', () =>
    Effect.gen(function* () {
      const manager = yield* LifecycleCore.makeLifecycleManager({
        moduleId: 'Lifecycle.DiagnosticsSerialization.Start',
        instanceId: 'i-start',
      })

      const onErrorSeen = yield* Deferred.make<void>()
      manager.registerOnError((_cause, _ctx) => Deferred.succeed(onErrorSeen, undefined).pipe(Effect.asVoid))

      manager.registerStart(Effect.die(new Error('start failed')))

      const { refs, sink } = makeRuntimeRefCollector()

      yield* manager.runStart.pipe(Effect.locally(Logix.Debug.internal.currentDebugSinks as any, [sink]))

      yield* Deferred.await(onErrorSeen)

      expect(refs.some((r) => r.kind === 'lifecycle')).toBe(true)
      for (const ref of refs) {
        expect(() => JSON.stringify(ref)).not.toThrow()
      }

      const errorRef = refs.find((r) => r.kind === 'lifecycle' && r.label === 'lifecycle:error')
      expect(errorRef).toBeDefined()
      const meta = asObject(errorRef!.meta)
      expect(meta?.type).toBe('lifecycle:error')
      expect(meta?.phase).toBe('run')
      expect(meta?.name).toBe('start')

      expect(refs.some((r) => r.kind === 'lifecycle' && r.label === 'start:schedule')).toBe(true)
    }),
  )

  it.scoped('destroy failure should emit serializable lifecycle events', () =>
    Effect.gen(function* () {
      const manager = yield* LifecycleCore.makeLifecycleManager({
        moduleId: 'Lifecycle.DiagnosticsSerialization.Destroy',
        instanceId: 'i-destroy',
      })

      manager.registerDestroy(Effect.die(new Error('destroy failed')))

      const { refs, sink } = makeRuntimeRefCollector()

      yield* manager.runDestroy.pipe(Effect.locally(Logix.Debug.internal.currentDebugSinks as any, [sink]))

      expect(refs.some((r) => r.kind === 'lifecycle')).toBe(true)
      for (const ref of refs) {
        expect(() => JSON.stringify(ref)).not.toThrow()
      }

      const errorRef = refs.find((r) => r.kind === 'lifecycle' && r.label === 'lifecycle:error')
      expect(errorRef).toBeDefined()
      const meta = asObject(errorRef!.meta)
      expect(meta?.type).toBe('lifecycle:error')
      expect(meta?.phase).toBe('destroy')
      expect(meta?.name).toBe('destroy')

      expect(refs.some((r) => r.kind === 'lifecycle' && r.label === 'destroy:start')).toBe(true)
      expect(refs.some((r) => r.kind === 'lifecycle' && r.label === 'destroy:done')).toBe(true)
    }),
  )
})
