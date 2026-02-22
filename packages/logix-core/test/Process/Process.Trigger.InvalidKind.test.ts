import { describe, expect, it } from '@effect/vitest'
import { Context, Effect, Exit, Layer, Ref, Scope, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

describe('process: trigger invalid kind', () => {
  it.scoped('should fail with process::invalid_trigger_kind for malformed trigger kind', () =>
    Effect.gen(function* () {
      const invoked = yield* Ref.make(0)

      const Host = Logix.Module.make('ProcessTriggerInvalidKindHost', {
        state: Schema.Void,
        actions: {},
      })

      const processId = 'ProcessTriggerInvalidKind'
      const Proc = Logix.Process.make(
        {
          processId,
          triggers: [
            {
              kind: 'malformed-kind',
              name: 'MalformedKindTrigger',
            } as any,
          ],
          concurrency: { mode: 'latest' },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'off',
        },
        Ref.update(invoked, (n) => n + 1).pipe(Effect.asVoid),
      )

      const HostImpl = Host.implement({
        initial: undefined,
        processes: [Proc],
      })

      const layer = Layer.provideMerge(ProcessRuntime.layer())(HostImpl.impl.layer)

      let events: ReadonlyArray<Logix.Process.ProcessEvent> = []
      let invokedCount = -1
      const scope = yield* Scope.make()
      try {
        const env = yield* Layer.buildWithScope(layer, scope)
        const rt = Context.get(
          env as Context.Context<any>,
          ProcessRuntime.ProcessRuntimeTag as any,
        ) as ProcessRuntime.ProcessRuntime

        for (let i = 0; i < 200; i++) {
          events = (yield* rt.getEventsSnapshot()) as ReadonlyArray<Logix.Process.ProcessEvent>
          const matched = events.find(
            (event) => event.type === 'process:error' && event.identity.identity.processId === processId,
          )
          if (matched) break
          yield* Effect.yieldNow()
        }

        invokedCount = yield* Ref.get(invoked)
      } finally {
        yield* Scope.close(scope, Exit.succeed(undefined))
      }

      const errorEvent = events.find((event) => event.type === 'process:error' && event.identity.identity.processId === processId)
      expect(errorEvent).toBeTruthy()
      expect(errorEvent?.error?.code).toBe('process::invalid_trigger_kind')
      expect(errorEvent?.error?.message).toContain('malformed-kind')
      expect(
        events.some(
          (event) =>
            event.type === 'process:error' &&
            event.identity.identity.processId === processId &&
            event.error?.code === 'process::missing_dependency',
        ),
      ).toBe(false)
      expect(invokedCount).toBe(0)
    }),
  )
})
