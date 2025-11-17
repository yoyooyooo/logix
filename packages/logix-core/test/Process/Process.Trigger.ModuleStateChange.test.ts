import { describe, it, expect } from '@effect/vitest'
import { Context, Effect, Exit, Layer, Ref, Scope, Schema, TestClock } from 'effect'
import * as Logix from '../../src/index.js'
import * as ProcessRuntime from '../../src/internal/runtime/core/process/ProcessRuntime.js'

describe('process: trigger moduleStateChange', () => {
  it.scoped('should fail with actionable error when dot-path is invalid', () =>
    Effect.gen(function* () {
      const Host = Logix.Module.make('ProcessTriggerInvalidDotPathHost', {
        state: Schema.Struct({ user: Schema.Struct({ name: Schema.String }) }),
        actions: { setName: Schema.String },
      })

      const Proc = Logix.Process.make(
        {
          processId: 'ProcessTriggerInvalidDotPath',
          triggers: [{ kind: 'moduleStateChange', moduleId: Host.id, path: 'user..name' }],
          concurrency: { mode: 'latest' },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'off',
        },
        Effect.void,
      )

      const HostImpl = Host.implement({
        initial: { user: { name: 'a' } },
        processes: [Proc],
      })

      const layer = Layer.provideMerge(ProcessRuntime.layer())(HostImpl.impl.layer)

      let events: ReadonlyArray<Logix.Process.ProcessEvent> = []
      const scope = yield* Scope.make()
      try {
        const env = yield* Layer.buildWithScope(layer, scope)
        const rt = Context.get(
          env as Context.Context<any>,
          ProcessRuntime.ProcessRuntimeTag as any,
        ) as ProcessRuntime.ProcessRuntime

        yield* Effect.yieldNow()
        events = (yield* rt.getEventsSnapshot()) as any
      } finally {
        yield* Scope.close(scope, Exit.succeed(undefined))
      }

      const errorEvent = events.find(
        (e) => e.type === 'process:error' && e.identity.identity.processId === 'ProcessTriggerInvalidDotPath',
      )

      expect(errorEvent).toBeTruthy()
      expect(errorEvent?.error?.code).toBe('process::invalid_dot_path')
      expect(errorEvent?.error?.hint).toContain('dot-path')
      expect(errorEvent?.error?.hint).toContain('items.0.id')
    }),
  )

  it.scoped('should trigger only when selected value changes', () =>
    Effect.gen(function* () {
      const invoked = yield* Ref.make(0)

      const HostState = Schema.Struct({ user: Schema.Struct({ name: Schema.String }) })
      const HostActions = { setName: Schema.String }

      const Host = Logix.Module.make('ProcessTriggerStateChangeHost', {
        state: HostState,
        actions: HostActions,
      })

      const HostLogic = Host.logic(($) =>
        Effect.gen(function* () {
          yield* $.onAction('setName').run((action) => $.state.update(() => ({ user: { name: action.payload } })))
        }),
      )

      const Proc = Logix.Process.make(
        {
          processId: 'ProcessTriggerStateChange',
          triggers: [{ kind: 'moduleStateChange', moduleId: Host.id, path: 'user.name' }],
          concurrency: { mode: 'serial', maxQueue: 16 },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'off',
        },
        Ref.update(invoked, (n) => n + 1).pipe(Effect.asVoid),
      )

      const HostImpl = Host.implement({
        initial: { user: { name: 'a' } },
        logics: [HostLogic],
        processes: [Proc],
      })

      const layer = Layer.provideMerge(ProcessRuntime.layer())(HostImpl.impl.layer)

      const scope = yield* Scope.make()
      try {
        const env = yield* Layer.buildWithScope(layer, scope)
        const host = Context.get(env, Host.tag)

        yield* host.dispatch({ _tag: 'setName', payload: 'A' } as any)
        yield* Effect.yieldNow()
        yield* TestClock.adjust('10 millis')
        yield* Effect.yieldNow()

        yield* host.dispatch({ _tag: 'setName', payload: 'A' } as any)
        yield* Effect.yieldNow()
        yield* TestClock.adjust('10 millis')
        yield* Effect.yieldNow()

        yield* host.dispatch({ _tag: 'setName', payload: 'B' } as any)
        yield* Effect.yieldNow()
        yield* TestClock.adjust('10 millis')
        yield* Effect.yieldNow()
      } finally {
        yield* Scope.close(scope, Exit.succeed(undefined))
      }

      expect(yield* Ref.get(invoked)).toBe(2)
    }),
  )
})
