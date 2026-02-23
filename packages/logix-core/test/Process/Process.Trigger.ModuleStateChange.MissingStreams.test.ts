import { describe, expect, it } from '@effect/vitest'
import { Context, Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { setRuntimeInternals } from '../../src/internal/runtime/core/runtimeInternalsAccessor.js'
import { collectProcessErrorEvent, withProcessRuntime } from './test-helpers.js'

describe('process: trigger moduleStateChange missing streams', () => {
  it.scoped('should fail with process::missing_changes_stream when fallback stream is missing', () =>
    Effect.gen(function* () {
      const processId = 'ProcessTriggerMissingStateChangeStream'
      const triggerModuleId = 'ProcessTriggerMissingStateChangeStreamTarget'
      const triggerModuleTag = Context.Tag(`@logixjs/Module/${triggerModuleId}`)() as Context.Tag<any, any>

      const Host = Logix.Module.make(`${processId}Host`, {
        state: Schema.Void,
        actions: {},
      })

      const Proc = Logix.Process.make(
        {
          processId,
          triggers: [{ kind: 'moduleStateChange', moduleId: triggerModuleId, path: 'n' }],
          concurrency: { mode: 'latest' },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'light',
        },
        Effect.void,
      )

      const missingStreamsRuntime = {
        moduleId: triggerModuleId,
        instanceId: `${triggerModuleId}#fake`,
      } as any

      setRuntimeInternals(
        missingStreamsRuntime,
        {
          moduleId: triggerModuleId,
          instanceId: missingStreamsRuntime.instanceId,
          stateSchema: Schema.Struct({ n: Schema.Number }),
        } as any,
      )

      const fakeTriggerModuleLayer = Layer.succeed(triggerModuleTag, missingStreamsRuntime)

      const hostImpl = Host.implement({
        initial: undefined,
        processes: [Proc],
      }).impl.withLayer(fakeTriggerModuleLayer)

      const layer = withProcessRuntime(hostImpl.layer)
      const { errorEvent, events } = yield* collectProcessErrorEvent({ layer, processId })

      expect(errorEvent).toBeTruthy()
      expect(errorEvent?.error?.code).toBe('process::missing_changes_stream')
      expect(errorEvent?.error?.hint).toContain(`moduleId=${triggerModuleId}`)
      expect(errorEvent?.error?.message).toContain('changesWithMeta')
      expect(
        events.filter((event) => event.type === 'process:error' && event.identity.identity.processId === processId).length,
      ).toBe(1)
      expect(
        events.some(
          (event) =>
            event.type === 'process:error' &&
            event.identity.identity.processId === processId &&
            event.error?.code === 'process::missing_dependency',
        ),
      ).toBe(false)
    }),
  )
})
