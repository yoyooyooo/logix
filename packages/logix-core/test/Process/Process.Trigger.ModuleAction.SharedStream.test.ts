import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, PubSub, Ref, Schema, Stream } from 'effect'
import * as Logix from '../../src/index.js'
import { moduleRuntimeTagFromModuleId } from '../../src/internal/serviceId.js'
import { withProcessRuntime, withProcessRuntimeScope } from './test-helpers.js'

describe('process: trigger moduleAction shared stream', () => {
  it.effect('should share one upstream action subscription for triggers on the same module and preserve duplicates', () =>
    Effect.gen(function* () {
      const processId = 'ProcessTriggerModuleActionSharedStream'
      const triggerModuleId = 'ProcessTriggerModuleActionSharedStreamTarget'
      const actionHub = yield* PubSub.unbounded<any>()

      let actionMetaSubscribers = 0

      const sharedActionsWithMeta$ = Stream.unwrap(
        Effect.gen(function* () {
          actionMetaSubscribers += 1
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => {
              actionMetaSubscribers = Math.max(0, actionMetaSubscribers - 1)
            }),
          )
          return Stream.fromPubSub(actionHub)
        }),
      )

      const Host = Logix.Module.make(`${processId}Host`, {
        state: Schema.Void,
        actions: {},
      })

      const Proc = Logix.Process.make(
        {
          processId,
          triggers: [
            { kind: 'moduleAction', name: 'ping-1', moduleId: triggerModuleId, actionId: 'ping' },
            { kind: 'moduleAction', name: 'ping-2', moduleId: triggerModuleId, actionId: 'ping' },
            { kind: 'moduleAction', name: 'pong-1', moduleId: triggerModuleId, actionId: 'pong' },
          ],
          concurrency: { mode: 'parallel', maxParallel: 8 },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'light',
        },
        Effect.void,
      )

      const fakeTriggerRuntime = {
        moduleId: triggerModuleId,
        instanceId: `${triggerModuleId}#fake`,
        actionsWithMeta$: sharedActionsWithMeta$,
      }

      const triggerModuleTag = moduleRuntimeTagFromModuleId(triggerModuleId) as any
      const fakeTriggerModuleLayer = Layer.succeed(triggerModuleTag, fakeTriggerRuntime as any)

      const hostImpl = Host.implement({
        initial: undefined,
        processes: [Proc],
      }).impl.withLayer(fakeTriggerModuleLayer)

      const layer = withProcessRuntime(hostImpl.layer)

      const { names } = yield* withProcessRuntimeScope({
        layer,
        run: ({ runtime }) =>
          Effect.gen(function* () {
            for (let i = 0; i < 10; i += 1) {
              yield* Effect.yieldNow
            }

            expect(actionMetaSubscribers).toBe(1)

            yield* PubSub.publish(actionHub, {
              value: { _tag: 'ping' },
              meta: { txnSeq: 1 },
            })
            yield* PubSub.publish(actionHub, {
              value: { _tag: 'pong' },
              meta: { txnSeq: 2 },
            })

            let names: Array<string> = []
            for (let i = 0; i < 100; i += 1) {
              const events = yield* runtime.getEventsSnapshot()
              names = events
                .filter(
                  (event) =>
                    event.type === 'process:trigger' && event.identity.identity.processId === processId,
                )
                .map((event) => event.trigger?.name)
                .filter((value): value is string => typeof value === 'string')
              if (names.length >= 3) {
                break
              }
              yield* Effect.yieldNow
            }

            return { names } as const
          }),
      })

      expect(names).toEqual(['ping-1', 'ping-2', 'pong-1'])
    }),
  )

  it.effect('should share one upstream action stream in diagnostics off mode', () =>
    Effect.gen(function* () {
      const processId = 'ProcessTriggerModuleActionSharedStreamOff'
      const triggerModuleId = 'ProcessTriggerModuleActionSharedStreamOffTarget'
      const actionHub = yield* PubSub.unbounded<any>()
      const invoked = yield* Ref.make(0)

      let actionSubscribers = 0

      const sharedActions$ = Stream.unwrap(
        Effect.gen(function* () {
          actionSubscribers += 1
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => {
              actionSubscribers = Math.max(0, actionSubscribers - 1)
            }),
          )
          return Stream.fromPubSub(actionHub)
        }),
      )

      const Host = Logix.Module.make(`${processId}Host`, {
        state: Schema.Void,
        actions: {},
      })

      const Proc = Logix.Process.make(
        {
          processId,
          triggers: [
            { kind: 'moduleAction', name: 'ping-1', moduleId: triggerModuleId, actionId: 'ping' },
            { kind: 'moduleAction', name: 'ping-2', moduleId: triggerModuleId, actionId: 'ping' },
          ],
          concurrency: { mode: 'parallel', maxParallel: 8 },
          errorPolicy: { mode: 'failStop' },
          diagnosticsLevel: 'off',
        },
        Ref.update(invoked, (n) => n + 1).pipe(Effect.asVoid),
      )

      const fakeTriggerRuntime = {
        moduleId: triggerModuleId,
        instanceId: `${triggerModuleId}#fake`,
        actions$: sharedActions$,
      }

      const triggerModuleTag = moduleRuntimeTagFromModuleId(triggerModuleId) as any
      const fakeTriggerModuleLayer = Layer.succeed(triggerModuleTag, fakeTriggerRuntime as any)

      const hostImpl = Host.implement({
        initial: undefined,
        processes: [Proc],
      }).impl.withLayer(fakeTriggerModuleLayer)

      const layer = withProcessRuntime(hostImpl.layer)

      yield* withProcessRuntimeScope({
        layer,
        run: () =>
          Effect.gen(function* () {
            for (let i = 0; i < 10; i += 1) {
              yield* Effect.yieldNow
            }

            expect(actionSubscribers).toBe(1)

            yield* PubSub.publish(actionHub, { _tag: 'ping' })

            for (let i = 0; i < 100; i += 1) {
              const count = yield* Ref.get(invoked)
              if (count >= 2) {
                break
              }
              yield* Effect.yieldNow
            }
          }),
      })

      expect(yield* Ref.get(invoked)).toBe(2)
    }),
  )
})
