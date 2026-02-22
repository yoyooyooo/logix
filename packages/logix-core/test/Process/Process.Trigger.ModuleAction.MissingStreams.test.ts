import { describe, expect, it } from '@effect/vitest'
import { Context, Effect, Exit, Layer, Scope, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

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
  return Layer.provideMerge(ProcessRuntime.layer())(hostImpl.layer)
}

const collectProcessErrorEvent = (
  layer: Layer.Layer<any, any, any>,
  processId: string,
): Effect.Effect<{
  readonly errorEvent: Logix.Process.ProcessEvent | undefined
  readonly events: ReadonlyArray<Logix.Process.ProcessEvent>
}> =>
  Effect.gen(function* () {
    const scope = yield* Scope.make()
    try {
      const env = yield* Layer.buildWithScope(layer, scope)
      const rt = Context.get(
        env as Context.Context<any>,
        ProcessRuntime.ProcessRuntimeTag as any,
      ) as ProcessRuntime.ProcessRuntime

      let events: ReadonlyArray<Logix.Process.ProcessEvent> = []
      for (let i = 0; i < 200; i++) {
        events = (yield* rt.getEventsSnapshot()) as ReadonlyArray<Logix.Process.ProcessEvent>
        const errorEvent = events.find(
          (event) => event.type === 'process:error' && event.identity.identity.processId === processId,
        )
        if (errorEvent) {
          return { errorEvent, events }
        }
        yield* Effect.yieldNow()
      }

      return {
        errorEvent: undefined,
        events,
      }
    } finally {
      yield* Scope.close(scope, Exit.succeed(undefined))
    }
  })

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

      const { errorEvent, events } = yield* collectProcessErrorEvent(layer, processId)
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

      const { errorEvent, events } = yield* collectProcessErrorEvent(layer, processId)
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
