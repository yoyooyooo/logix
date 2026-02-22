import { describe, expect, it } from '@effect/vitest'
import { Effect, Ref, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { collectProcessErrorEvent, withProcessRuntime } from './test-helpers.js'

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

      const layer = withProcessRuntime(HostImpl.impl.layer)
      let invokedCount = -1
      const { errorEvent, events } = yield* collectProcessErrorEvent({
        layer,
        processId,
        onBeforeClose: Ref.get(invoked).pipe(
          Effect.flatMap((count) =>
            Effect.sync(() => {
              invokedCount = count
            }),
          ),
        ),
      })

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
