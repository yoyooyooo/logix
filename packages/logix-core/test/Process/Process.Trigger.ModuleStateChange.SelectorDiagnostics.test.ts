import { describe, it, expect } from '@effect/vitest'
import { Context, Effect, Ref, Schema, TestClock } from 'effect'
import * as Logix from '../../src/index.js'
import { withProcessRuntime, withProcessRuntimeScope } from './test-helpers.js'

describe('process: trigger moduleStateChange selector diagnostics', () => {
  it.scoped('should emit a warning event when moduleStateChange triggers are too frequent', () =>
    Effect.gen(function* () {
      const Host = Logix.Module.make('ProcessSelectorDiagHost', {
        state: Schema.Struct({ n: Schema.Number }),
        actions: { bump: Schema.Void },
      })

      const HostLogic = Host.logic(($) =>
        Effect.gen(function* () {
          yield* $.onAction('bump').run({ effect: () => $.state.update((s) => ({ n: s.n + 1 })) })
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

      const layer = withProcessRuntime(HostImpl.impl.layer)
      const events = yield* withProcessRuntimeScope({
        layer,
        run: ({ env, runtime }) =>
          Effect.gen(function* () {
            const host = Context.get(env, Host.tag)

            for (let i = 0; i < 30; i++) {
              yield* host.dispatch({ _tag: 'bump', payload: undefined } as any)
              yield* Effect.yieldNow()
            }

            yield* TestClock.adjust('20 millis')
            yield* Effect.yieldNow()

            let snapshot: ReadonlyArray<Logix.Process.ProcessEvent> = []
            for (let i = 0; i < 200; i++) {
              snapshot = yield* runtime.getEventsSnapshot()
              const hasWarning = snapshot.some(
                (e) =>
                  e.identity.identity.processId === 'ProcessSelectorDiagnostics' &&
                  e.type === 'process:trigger' &&
                  e.severity === 'warning' &&
                  e.error?.code === 'process::selector_high_frequency',
              )
              if (hasWarning) break
              yield* Effect.yieldNow()
            }

            return yield* runtime.getEventsSnapshot()
          }),
      })

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

  it.scoped('should not trigger for unrelated path updates in diagnostics mode', () =>
    Effect.gen(function* () {
      const invoked = yield* Ref.make(0)

      const Host = Logix.Module.make('ProcessSelectorDiagUnrelatedHost', {
        state: Schema.Struct({ n: Schema.Number, other: Schema.Number }),
        actions: { bumpOther: Schema.Void },
      })

      const HostLogic = Host.logic(($) =>
        Effect.gen(function* () {
          yield* $.onAction('bumpOther').run({ effect: () => $.state.update((s) => ({ ...s, other: s.other + 1 })) })
        }),
      )

      const Proc = Logix.Process.make(
        {
          processId: 'ProcessSelectorDiagnosticsUnrelated',
          triggers: [{ kind: 'moduleStateChange', moduleId: Host.id, path: 'n' }],
          concurrency: { mode: 'serial', maxQueue: 256 },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'light',
        },
        Ref.update(invoked, (n) => n + 1).pipe(Effect.asVoid),
      )

      const HostImpl = Host.implement({
        initial: { n: 0, other: 0 },
        logics: [HostLogic],
        processes: [Proc],
      })

      const layer = withProcessRuntime(HostImpl.impl.layer)
      const events = yield* withProcessRuntimeScope({
        layer,
        run: ({ env, runtime }) =>
          Effect.gen(function* () {
            const host = Context.get(env, Host.tag)
            expect(typeof (host as any).changesReadQueryWithMeta).toBe('function')

            for (let i = 0; i < 20; i++) {
              yield* host.dispatch({ _tag: 'bumpOther', payload: undefined } as any)
              yield* Effect.yieldNow()
            }

            yield* TestClock.adjust('20 millis')
            yield* Effect.yieldNow()

            return yield* runtime.getEventsSnapshot()
          }),
      })

      const warning = events.find(
        (e) =>
          e.identity.identity.processId === 'ProcessSelectorDiagnosticsUnrelated' &&
          e.type === 'process:trigger' &&
          e.severity === 'warning' &&
          e.error?.code === 'process::selector_high_frequency',
      )

      expect(yield* Ref.get(invoked)).toBe(0)
      expect(warning).toBeUndefined()
    }),
  )
})
