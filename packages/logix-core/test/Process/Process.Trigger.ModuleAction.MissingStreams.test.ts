import { describe, expect, it } from '@effect/vitest'
import { Context, Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { collectProcessErrorEvent, withProcessRuntime } from './test-helpers.js'

type DiagnosticsLevel = 'off' | 'light'

const makeProcessLayer = (options: {
  readonly processId: string
  readonly triggerModuleId: string
  readonly diagnosticsLevel: DiagnosticsLevel
}) => {
  const Host = Logix.Module.make(`${options.processId}Host`, {
    state: Schema.Void,
    actions: {},
  })

  const Proc = Logix.Process.make(
    {
      processId: options.processId,
      triggers: [
        {
          kind: 'moduleAction',
          moduleId: options.triggerModuleId,
          actionId: 'ping',
        },
      ],
      concurrency: { mode: 'latest' },
      errorPolicy: { mode: 'failStop' },
      diagnosticsLevel: options.diagnosticsLevel,
    },
    Effect.void,
  )

  const missingStreamsRuntime = {
    instanceId: `${options.triggerModuleId}#fake`,
  }

  const triggerModuleTag = Context.Tag(`@logixjs/Module/${options.triggerModuleId}`)() as Context.Tag<any, any>
  const fakeTriggerModuleLayer = Layer.succeed(triggerModuleTag, missingStreamsRuntime as any)

  const hostImpl = Host.implement({
    initial: undefined,
    processes: [Proc],
  }).impl.withLayer(fakeTriggerModuleLayer)
  return withProcessRuntime(hostImpl.layer)
}

describe('process: trigger moduleAction missing streams', () => {
  it.scoped('should fail with process::missing_action_stream when diagnostics is off', () =>
    Effect.gen(function* () {
      const processId = 'ProcessTriggerMissingActionStream'
      const triggerModuleId = 'ProcessTriggerMissingActionStreamTarget'
      const layer = makeProcessLayer({
        processId,
        triggerModuleId,
        diagnosticsLevel: 'off',
      })

      const { errorEvent, events } = yield* collectProcessErrorEvent({ layer, processId })
      expect(errorEvent).toBeTruthy()
      expect(errorEvent?.error?.code).toBe('process::missing_action_stream')
      expect(errorEvent?.error?.hint).toContain(`moduleId=${triggerModuleId}`)
      expect(errorEvent?.error?.message).toContain('actions$')
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

  it.scoped('should fail with process::missing_action_meta_stream when diagnostics is on', () =>
    Effect.gen(function* () {
      const processId = 'ProcessTriggerMissingActionMetaStream'
      const triggerModuleId = 'ProcessTriggerMissingActionMetaStreamTarget'
      const layer = makeProcessLayer({
        processId,
        triggerModuleId,
        diagnosticsLevel: 'light',
      })

      const { errorEvent, events } = yield* collectProcessErrorEvent({ layer, processId })
      expect(errorEvent).toBeTruthy()
      expect(errorEvent?.error?.code).toBe('process::missing_action_meta_stream')
      expect(errorEvent?.error?.hint).toContain(`moduleId=${triggerModuleId}`)
      expect(errorEvent?.error?.message).toContain('actionsWithMeta$')
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
