import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as ModuleRuntime from '../../../src/internal/runtime/ModuleRuntime.js'
import * as Debug from '../../../src/Debug.js'

describe('TaskRunner (run*Task)', () => {
  const StateSchema = Schema.Struct({
    logs: Schema.Array(Schema.String),
    results: Schema.Array(Schema.Number),
  })

  const TaskModule = Logix.Module.make('TaskRunnerModule', {
    state: StateSchema,
    actions: {
      start: Schema.Number,
    },
  })

  it.scoped('pending should be a standalone txn before writeback', () =>
    Effect.gen(function* () {
      const events: Debug.Event[] = []
      let seenPending = false
      let seenSuccess = false

      const pendingTxnDone = yield* Deferred.make<void>()
      const successTxnDone = yield* Deferred.make<void>()

      const ioDeferred = yield* Deferred.make<number>()

      const sink: Debug.Sink = {
        record: (event) =>
          Effect.gen(function* () {
            yield* Effect.sync(() => {
              events.push(event)
            })

            if (event.type === 'state:update') {
              const e: any = event
              if (!seenPending && e.originKind === 'task:pending') {
                seenPending = true
                yield* Deferred.succeed(pendingTxnDone, undefined)
              }
              if (!seenSuccess && e.originKind === 'service-callback' && e.originName === 'task:success') {
                seenSuccess = true
                yield* Deferred.succeed(successTxnDone, undefined)
              }
            }
          }),
      }

      const logic = TaskModule.logic(($) =>
        Effect.gen(function* () {
          yield* $.onAction('start').runTask({
            pending: () =>
              $.state.update((s) => ({
                ...s,
                logs: [...s.logs, 'pending:start'],
              })),
            effect: () => Deferred.await(ioDeferred),
            success: (result) =>
              $.state.update((s) => ({
                ...s,
                logs: [...s.logs, `success:${result}`],
                results: [...s.results, result],
              })),
          })
        }),
      )

      yield* Effect.locally(Debug.internal.currentDebugSinks as any, [sink])(
        Effect.gen(function* () {
          const runtime = yield* ModuleRuntime.make(
            { logs: [], results: [] },
            {
              moduleId: 'TaskRunnerModule',
              tag: TaskModule.tag,
              logics: [logic] as any,
            },
          )

          yield* runtime.dispatch({ _tag: 'start', payload: 1 } as any)

          // pending txn should appear (origin.kind="task:pending", origin.name defaults to action tag "start")
          yield* Deferred.await(pendingTxnDone)

          // complete IO and wait for success txn
          yield* Deferred.succeed(ioDeferred, 42)
          yield* Deferred.await(successTxnDone)

          const pendingIdx = events.findIndex((e: any) => e.type === 'state:update' && e.originKind === 'task:pending')
          const successIdx = events.findIndex(
            (e: any) =>
              e.type === 'state:update' && e.originKind === 'service-callback' && e.originName === 'task:success',
          )

          expect(pendingIdx).toBeGreaterThanOrEqual(0)
          expect(successIdx).toBeGreaterThanOrEqual(0)
          expect(pendingIdx).toBeLessThan(successIdx)

          const pendingEvent: any = events[pendingIdx]
          expect(pendingEvent.originName).toBe('start')
        }),
      )
    }),
  )

  it.scoped('runLatestTask should interrupt old task and never write back old result', () =>
    Effect.gen(function* () {
      const events: Debug.Event[] = []
      let successCount = 0
      const successTxnDone = yield* Deferred.make<void>()

      const io1 = yield* Deferred.make<number>()
      const io2 = yield* Deferred.make<number>()

      const sink: Debug.Sink = {
        record: (event) =>
          Effect.gen(function* () {
            yield* Effect.sync(() => {
              events.push(event)
            })
            if (event.type === 'state:update') {
              const e: any = event
              if (e.originKind === 'service-callback' && e.originName === 'task:success') {
                successCount++
                if (successCount === 1) {
                  yield* Deferred.succeed(successTxnDone, undefined)
                }
              }
            }
          }),
      }

      // payload=1 waits io1, payload=2 waits io2
      const logic = TaskModule.logic(($) =>
        Effect.gen(function* () {
          yield* $.onAction('start').runLatestTask({
            pending: (a: any) =>
              $.state.update((s) => ({
                ...s,
                logs: [...s.logs, `pending:${a.payload}`],
              })),
            effect: (a: any) => (a.payload === 1 ? Deferred.await(io1) : Deferred.await(io2)),
            success: (result, a: any) =>
              $.state.update((s) => ({
                ...s,
                logs: [...s.logs, `success:${a.payload}:${result}`],
                results: [...s.results, result],
              })),
          })
        }),
      )

      yield* Effect.locally(Debug.internal.currentDebugSinks as any, [sink])(
        Effect.gen(function* () {
          const runtime = yield* ModuleRuntime.make(
            { logs: [], results: [] },
            {
              moduleId: 'TaskRunnerModule',
              tag: TaskModule.tag,
              logics: [logic] as any,
            },
          )

          // start(1) then start(2) quickly; latest should keep only payload=2 writeback
          yield* runtime.dispatch({ _tag: 'start', payload: 1 } as any)
          yield* runtime.dispatch({ _tag: 'start', payload: 2 } as any)

          // complete old task first; should not write back
          yield* Deferred.succeed(io1, 100)

          // complete latest task; should write back once
          yield* Deferred.succeed(io2, 200)
          yield* Deferred.await(successTxnDone)

          expect(successCount).toBe(1)

          const finalState = (yield* runtime.getState) as any
          expect(finalState.results).toEqual([200])

          // verify that success:1:* never appeared
          const success1 = events.some(
            (e: any) =>
              e.type === 'state:update' &&
              Array.isArray((e as any).state?.logs) &&
              (e as any).state.logs.some((x: string) => x.startsWith('success:1:')),
          )
          expect(success1).toBe(false)
        }),
      )
    }),
  )

  it.scoped('runExhaustTask should ignore triggers while busy (no pending for ignored)', () =>
    Effect.gen(function* () {
      const events: Debug.Event[] = []
      let pendingCount = 0
      let successCount = 0

      const io = yield* Deferred.make<number>()
      const successTxnDone = yield* Deferred.make<void>()

      const sink: Debug.Sink = {
        record: (event) =>
          Effect.gen(function* () {
            yield* Effect.sync(() => {
              events.push(event)
            })
            if (event.type === 'state:update') {
              const e: any = event
              if (e.originKind === 'task:pending') pendingCount++
              if (e.originKind === 'service-callback' && e.originName === 'task:success') {
                successCount++
                if (successCount === 1) {
                  yield* Deferred.succeed(successTxnDone, undefined)
                }
              }
            }
          }),
      }

      const logic = TaskModule.logic(($) =>
        Effect.gen(function* () {
          yield* $.onAction('start').runExhaustTask({
            pending: (a: any) =>
              $.state.update((s) => ({
                ...s,
                logs: [...s.logs, `pending:${a.payload}`],
              })),
            effect: () => Deferred.await(io),
            success: (result, a: any) =>
              $.state.update((s) => ({
                ...s,
                logs: [...s.logs, `success:${a.payload}:${result}`],
                results: [...s.results, result],
              })),
          })
        }),
      )

      yield* Effect.locally(Debug.internal.currentDebugSinks as any, [sink])(
        Effect.gen(function* () {
          const runtime = yield* ModuleRuntime.make(
            { logs: [], results: [] },
            {
              moduleId: 'TaskRunnerModule',
              tag: TaskModule.tag,
              logics: [logic] as any,
            },
          )

          // second trigger should be ignored while first is busy
          yield* runtime.dispatch({ _tag: 'start', payload: 1 } as any)
          yield* runtime.dispatch({ _tag: 'start', payload: 2 } as any)

          yield* Deferred.succeed(io, 10)
          yield* Deferred.await(successTxnDone)

          expect(pendingCount).toBe(1)
          expect(successCount).toBe(1)

          const finalState = (yield* runtime.getState) as any
          expect(finalState.results).toEqual([10])
        }),
      )
    }),
  )

  it.scoped('runParallelTask should allow concurrent IO and write back results independently', () =>
    Effect.gen(function* () {
      const events: Debug.Event[] = []
      let successCount = 0
      const success3Done = yield* Deferred.make<void>()

      const ioByPayload = new Map<number, Deferred.Deferred<number>>()
      ioByPayload.set(1, yield* Deferred.make<number>())
      ioByPayload.set(2, yield* Deferred.make<number>())
      ioByPayload.set(3, yield* Deferred.make<number>())

      const sink: Debug.Sink = {
        record: (event) =>
          Effect.gen(function* () {
            yield* Effect.sync(() => {
              events.push(event)
            })
            if (event.type === 'state:update') {
              const e: any = event
              if (e.originKind === 'service-callback' && e.originName === 'task:success') {
                successCount++
                if (successCount === 3) {
                  yield* Deferred.succeed(success3Done, undefined)
                }
              }
            }
          }),
      }

      const logic = TaskModule.logic(($) =>
        Effect.gen(function* () {
          yield* $.onAction('start').runParallelTask({
            pending: (a: any) =>
              $.state.update((s) => ({
                ...s,
                logs: [...s.logs, `pending:${a.payload}`],
              })),
            effect: (a: any) => Deferred.await(ioByPayload.get(a.payload)!),
            success: (result, a: any) =>
              $.state.update((s) => ({
                ...s,
                logs: [...s.logs, `success:${a.payload}:${result}`],
                results: [...s.results, result],
              })),
          })
        }),
      )

      yield* Effect.locally(Debug.internal.currentDebugSinks as any, [sink])(
        Effect.gen(function* () {
          const runtime = yield* ModuleRuntime.make(
            { logs: [], results: [] },
            {
              moduleId: 'TaskRunnerModule',
              tag: TaskModule.tag,
              logics: [logic] as any,
            },
          )

          // Give the background logic fiber a chance to attach its watchers before dispatching.
          yield* Effect.yieldNow()

          yield* runtime.dispatch({ _tag: 'start', payload: 1 } as any)
          yield* runtime.dispatch({ _tag: 'start', payload: 2 } as any)
          yield* runtime.dispatch({ _tag: 'start', payload: 3 } as any)

          // complete out-of-order
          yield* Deferred.succeed(ioByPayload.get(2)!, 20)
          yield* Deferred.succeed(ioByPayload.get(1)!, 10)
          yield* Deferred.succeed(ioByPayload.get(3)!, 30)

          yield* Deferred.await(success3Done)

          const finalState = (yield* runtime.getState) as any
          expect(finalState.results.sort()).toEqual([10, 20, 30])

          // each writeback should preserve payload/result pairing
          const allLogs = finalState.logs.join('|')
          expect(allLogs).toContain('success:1:10')
          expect(allLogs).toContain('success:2:20')
          expect(allLogs).toContain('success:3:30')
        }),
      )
    }),
  )
})
