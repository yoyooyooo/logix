import * as Debug from '@logixjs/core/repo-internal/debug-api'
import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'

describe('ModuleRuntime readiness failure diagnostics', () => {
  it.effect('emits module, instance, task, readiness id, and cause evidence when $.readyAfter fails', () =>
    Effect.gen(function* () {
      const events: Debug.Event[] = []
      const sink: Debug.Sink = {
        record: (event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      }

      const Module = Logix.Module.make('ModuleRuntime.ReadinessFailureDiagnostics', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: {},
      })

      const logic = Module.logic('readiness-failure', ($) => {
        $.readyAfter(Effect.die(new Error('readiness failed')), { id: 'load-config' })
        return Effect.void
      })

      const layer = Module.live({ value: 0 }, logic) as unknown as Layer.Layer<
        Logix.ModuleRuntime<any, any>,
        never,
        never
      >

      const exit = yield* Effect.exit(
        Effect.provideService(Effect.service(Module.tag).pipe(Effect.orDie, Effect.provide(layer)), Debug.internal.currentDebugSinks as any, [
          sink,
        ]),
      )

      expect(exit._tag).toBe('Failure')

      const lifecycleError = events.find((event) => event.type === 'lifecycle:error') as
        | Extract<Debug.Event, { readonly type: 'lifecycle:error' }>
        | undefined

      expect(lifecycleError).toBeDefined()
      expect(lifecycleError?.moduleId).toBe('ModuleRuntime.ReadinessFailureDiagnostics')
      expect(typeof lifecycleError?.instanceId).toBe('string')
      expect(lifecycleError?.instanceId).not.toBe('')
      expect(lifecycleError?.phase).toBe('init')
      expect(lifecycleError?.hook).toBe('initRequired')
      expect(lifecycleError?.taskId).toBe('initRequired:0')
      expect((lifecycleError as any)?.readinessId).toBe('load-config')
      expect(String(lifecycleError?.cause)).toContain('Error')
    }),
  )
})
