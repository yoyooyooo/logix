import { describe, it, expect } from '@effect/vitest'
import { Context, Effect, Exit, Layer, Ref, Scope, Schema, TestClock } from 'effect'
import * as Logix from '../../src/index.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'
import { collectProcessErrorEvent, withProcessRuntime } from './test-helpers.js'

describe('process: trigger timer', () => {
  it.scoped('should tick in a controllable interval', () =>
    Effect.gen(function* () {
      const invoked = yield* Ref.make(0)

      const Host = Logix.Module.make('ProcessTriggerTimerHost', {
        state: Schema.Void,
        actions: {},
      })

      const Proc = Logix.Process.make(
        {
          processId: 'ProcessTriggerTimer',
          triggers: [{ kind: 'timer', timerId: '10 millis' }],
          concurrency: { mode: 'drop' },
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

      const scope = yield* Scope.make()
      try {
        const env = yield* Layer.buildWithScope(layer, scope)
        Context.get(env as Context.Context<any>, ProcessRuntime.ProcessRuntimeTag as any)

        const before = yield* Ref.get(invoked)
        yield* Effect.yieldNow()
        yield* TestClock.adjust('50 millis')
        yield* Effect.yieldNow()
        const after = yield* Ref.get(invoked)

        expect(after).toBeGreaterThan(before)
      } finally {
        yield* Scope.close(scope, Exit.succeed(undefined))
      }
    }),
  )

  it.scoped('should fail with actionable error when timerId is invalid', () =>
    Effect.gen(function* () {
      const invoked = yield* Ref.make(0)
      const Host = Logix.Module.make('ProcessTriggerInvalidTimerHost', {
        state: Schema.Void,
        actions: {},
      })

      const Proc = Logix.Process.make(
        {
          processId: 'ProcessTriggerInvalidTimer',
          triggers: [{ kind: 'timer', timerId: 'invalid duration literal' }],
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
      const { errorEvent } = yield* collectProcessErrorEvent({
        layer,
        processId: 'ProcessTriggerInvalidTimer',
        onBeforeClose: Ref.get(invoked).pipe(
          Effect.flatMap((count) =>
            Effect.sync(() => {
              invokedCount = count
            }),
          ),
        ),
      })

      expect(errorEvent).toBeTruthy()
      expect(errorEvent?.error?.code).toBe('process::invalid_timer_id')
      expect(errorEvent?.error?.hint).toContain('DurationInput')
      expect(invokedCount).toBe(0)
    }),
  )
})
