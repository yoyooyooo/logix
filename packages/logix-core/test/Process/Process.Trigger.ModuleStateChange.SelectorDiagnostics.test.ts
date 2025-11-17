import { describe, it, expect } from '@effect/vitest'
import { Context, Effect, Exit, Layer, Scope, Schema, TestClock } from 'effect'
import * as Logix from '../../src/index.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

describe('process: trigger moduleStateChange selector diagnostics', () => {
  it.scoped('should emit a warning event when moduleStateChange triggers are too frequent', () =>
    Effect.gen(function* () {
      const Host = Logix.Module.make('ProcessSelectorDiagHost', {
        state: Schema.Struct({ n: Schema.Number }),
        actions: { bump: Schema.Void },
      })

      const HostLogic = Host.logic(($) =>
        Effect.gen(function* () {
          yield* $.onAction('bump').run(() => $.state.update((s) => ({ n: s.n + 1 })))
        }),
      )

      const Proc = Logix.Process.make(
        {
          processId: 'ProcessSelectorDiagnostics',
          triggers: [{ kind: 'moduleStateChange', moduleId: Host.id, path: 'n' }],
          concurrency: { mode: 'serial', maxQueue: 256 },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'light',
        },
        Effect.void,
      )

      const HostImpl = Host.implement({
        initial: { n: 0 },
        logics: [HostLogic],
        processes: [Proc],
      })

      const layer = Layer.provideMerge(ProcessRuntime.layer())(HostImpl.impl.layer)

      let events: ReadonlyArray<Logix.Process.ProcessEvent> = []
      const scope = yield* Scope.make()
      try {
        const env = yield* Layer.buildWithScope(layer, scope)
        const host = Context.get(env, Host.tag)
        const rt = Context.get(
          env as Context.Context<any>,
          ProcessRuntime.ProcessRuntimeTag as any,
        ) as ProcessRuntime.ProcessRuntime

        for (let i = 0; i < 30; i++) {
          yield* host.dispatch({ _tag: 'bump', payload: undefined } as any)
          yield* Effect.yieldNow()
        }

        yield* TestClock.adjust('20 millis')
        yield* Effect.yieldNow()

        for (let i = 0; i < 200; i++) {
          events = (yield* rt.getEventsSnapshot()) as any
          const hasWarning = events.some(
            (e) =>
              e.identity.identity.processId === 'ProcessSelectorDiagnostics' &&
              e.type === 'process:trigger' &&
              e.severity === 'warning' &&
              e.error?.code === 'process::selector_high_frequency',
          )
          if (hasWarning) break
          yield* Effect.yieldNow()
        }

        events = (yield* rt.getEventsSnapshot()) as any
      } finally {
        yield* Scope.close(scope, Exit.succeed(undefined))
      }

      const warning = events.find(
        (e) =>
          e.identity.identity.processId === 'ProcessSelectorDiagnostics' &&
          e.type === 'process:trigger' &&
          e.severity === 'warning' &&
          e.error?.code === 'process::selector_high_frequency',
      )

      expect(warning).toBeTruthy()
      expect(warning?.error?.hint).toContain('path=n')
    }),
  )
})
