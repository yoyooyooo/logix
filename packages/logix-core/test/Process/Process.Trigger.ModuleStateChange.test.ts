import { describe, it, expect } from '@effect/vitest'
import {Effect, Ref, Schema, ServiceMap } from 'effect'
import { TestClock } from 'effect/testing'
import * as Logix from '../../src/index.js'
import { collectProcessErrorEvent, withProcessRuntime, withProcessRuntimeScope } from './test-helpers.js'

describe('process: trigger moduleStateChange', () => {
  it.effect('should fail with actionable error when dot-path is invalid', () =>
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

      const layer = withProcessRuntime(HostImpl.impl.layer)
      const { errorEvent } = yield* collectProcessErrorEvent({
        layer,
        processId: 'ProcessTriggerInvalidDotPath',
      })

      expect(errorEvent).toBeTruthy()
      expect(errorEvent?.error?.code).toBe('process::invalid_dot_path')
      expect(errorEvent?.error?.hint).toContain('dot-path')
      expect(errorEvent?.error?.hint).toContain('items.0.id')
    }),
  )

  it.effect('should trigger only when selected value changes', () =>
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

      const layer = withProcessRuntime(HostImpl.impl.layer)
      yield* withProcessRuntimeScope({
        layer,
        run: ({ env }) =>
          Effect.gen(function* () {
            const host = ServiceMap.get(env, Host.tag)

            yield* host.dispatch({ _tag: 'setName', payload: 'A' } as any)
            yield* Effect.yieldNow
            yield* TestClock.adjust('10 millis')
            yield* Effect.yieldNow

            yield* host.dispatch({ _tag: 'setName', payload: 'A' } as any)
            yield* Effect.yieldNow
            yield* TestClock.adjust('10 millis')
            yield* Effect.yieldNow

            yield* host.dispatch({ _tag: 'setName', payload: 'B' } as any)
            yield* Effect.yieldNow
            yield* TestClock.adjust('10 millis')
            yield* Effect.yieldNow
          }),
      })

      expect(yield* Ref.get(invoked)).toBe(2)
    }),
  )

  it.effect('should ignore commits when unrelated paths change', () =>
    Effect.gen(function* () {
      const invoked = yield* Ref.make(0)

      const Host = Logix.Module.make('ProcessTriggerStateChangeUnrelatedPathHost', {
        state: Schema.Struct({
          user: Schema.Struct({ name: Schema.String }),
          profile: Schema.Struct({ age: Schema.Number }),
        }),
        actions: {
          setName: Schema.String,
          setAge: Schema.Number,
        },
      })

      const HostLogic = Host.logic(($) =>
        Effect.gen(function* () {
          yield* $.onAction('setName').run((action) =>
            $.state.update((state) => ({
              user: { name: action.payload },
              profile: state.profile,
            })),
          )

          yield* $.onAction('setAge').run((action) =>
            $.state.update((state) => ({
              user: state.user,
              profile: { age: action.payload },
            })),
          )
        }),
      )

      const Proc = Logix.Process.make(
        {
          processId: 'ProcessTriggerStateChangeUnrelatedPath',
          triggers: [{ kind: 'moduleStateChange', moduleId: Host.id, path: 'user.name' }],
          concurrency: { mode: 'serial', maxQueue: 16 },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'off',
        },
        Ref.update(invoked, (n) => n + 1).pipe(Effect.asVoid),
      )

      const HostImpl = Host.implement({
        initial: { user: { name: 'a' }, profile: { age: 10 } },
        logics: [HostLogic],
        processes: [Proc],
      })

      const layer = withProcessRuntime(HostImpl.impl.layer)
      yield* withProcessRuntimeScope({
        layer,
        run: ({ env }) =>
          Effect.gen(function* () {
            const host = ServiceMap.get(env, Host.tag)

            yield* host.dispatch({ _tag: 'setAge', payload: 11 } as any)
            yield* Effect.yieldNow
            yield* TestClock.adjust('10 millis')
            yield* Effect.yieldNow

            yield* host.dispatch({ _tag: 'setName', payload: 'a' } as any)
            yield* Effect.yieldNow
            yield* TestClock.adjust('10 millis')
            yield* Effect.yieldNow

            yield* host.dispatch({ _tag: 'setName', payload: 'b' } as any)
            yield* Effect.yieldNow
            yield* TestClock.adjust('10 millis')
            yield* Effect.yieldNow

            yield* host.dispatch({ _tag: 'setAge', payload: 12 } as any)
            yield* Effect.yieldNow
            yield* TestClock.adjust('10 millis')
            yield* Effect.yieldNow
          }),
      })

      expect(yield* Ref.get(invoked)).toBe(1)
    }),
  )
})
