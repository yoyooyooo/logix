import { describe, it, expect } from '@effect/vitest'
import { Effect, Fiber, Option, PubSub, Queue } from 'effect'
import * as Logix from '../../../src/index.js'
import { dirtyPathsToRootIds, makeFieldPathIdRegistry } from '../../../src/internal/field-path.js'
import * as SelectorGraph from '../../../src/internal/runtime/core/SelectorGraph.js'

describe('SelectorGraph', () => {
  it.effect('does not recompute/notify when dirtyRoots do not overlap selector reads', () =>
    Effect.scoped(
      Effect.gen(function* () {
        let calls = 0
        const selectCount = Object.assign(
          (state: { readonly count: number; readonly other: number }) => {
            calls += 1
            return state.count
          },
          { fieldPaths: ['count'] },
        )

        const readQuery = Logix.ReadQuery.compile(selectCount as any)
        const registry = makeFieldPathIdRegistry([['count'], ['other']])
        const graph = SelectorGraph.make<{ readonly count: number; readonly other: number }>({
          moduleId: 'TestModule',
          instanceId: 'i-test',
          getFieldPathIdRegistry: () => registry,
        })

        const entry = yield* graph.ensureEntry(readQuery as any)
        entry.subscriberCount = 1

        const subscription = yield* PubSub.subscribe(entry.hub)
        const takeOneFiber = yield* Effect.fork(Queue.take(subscription))

        yield* graph.onCommit(
          { count: 0, other: 1 },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          dirtyPathsToRootIds({ dirtyPaths: [['other']], registry }),
          'off',
        )

        yield* Effect.yieldNow()
        const polled = yield* Fiber.poll(takeOneFiber)

        yield* Fiber.interrupt(takeOneFiber)

        expect(calls).toBe(0)
        expect(Option.isNone(polled)).toBe(true)
      }),
    ),
  )

  it.effect('recomputes once per txn and publishes when the selector value changes', () =>
    Effect.scoped(
      Effect.gen(function* () {
        let calls = 0
        const selectCount = Object.assign(
          (state: { readonly count: number; readonly other: number }) => {
            calls += 1
            return state.count
          },
          { fieldPaths: ['count'] },
        )

        const readQuery = Logix.ReadQuery.compile(selectCount as any)
        const registry = makeFieldPathIdRegistry([['count'], ['other']])
        const graph = SelectorGraph.make<{ readonly count: number; readonly other: number }>({
          moduleId: 'TestModule',
          instanceId: 'i-test',
          getFieldPathIdRegistry: () => registry,
        })

        const entry = yield* graph.ensureEntry(readQuery as any)
        entry.subscriberCount = 1

        const subscription = yield* PubSub.subscribe(entry.hub)

        yield* graph.onCommit(
          { count: 1, other: 0 },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          dirtyPathsToRootIds({ dirtyPaths: [['count']], registry }),
          'off',
        )

        const first = yield* Queue.take(subscription)
        expect(calls).toBe(1)
        expect((first as any).value).toBe(1)
        expect((first as any).meta.txnSeq).toBe(1)
        expect((first as any).meta.txnId).toBe('i-test::t1')
      }),
    ),
  )

  it.effect('emits a slim trace:selector:eval cost summary in diagnostics=light', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const ring = Logix.Debug.makeRingBufferSink(16)

        let calls = 0
        const selectCount = Object.assign(
          (state: { readonly count: number; readonly other: number }) => {
            calls += 1
            return state.count
          },
          { fieldPaths: ['count'] },
        )

        const readQuery = Logix.ReadQuery.compile(selectCount as any)
        const registry = makeFieldPathIdRegistry([['count'], ['other']])
        const graph = SelectorGraph.make<{ readonly count: number; readonly other: number }>({
          moduleId: 'TestModule',
          instanceId: 'i-test',
          getFieldPathIdRegistry: () => registry,
        })

        const entry = yield* graph.ensureEntry(readQuery as any)
        entry.subscriberCount = 1

        yield* Effect.locally(Logix.Debug.internal.currentDebugSinks as any, [ring.sink as any])(
          graph.onCommit(
            { count: 1, other: 0 },
            { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
            dirtyPathsToRootIds({ dirtyPaths: [['count']], registry }),
            'light',
          ),
        )

        expect(calls).toBe(1)

        const evalEvent = ring.getSnapshot().find((e) => (e as any).type === 'trace:selector:eval') as any
        expect(evalEvent).toBeDefined()
        expect(evalEvent.txnSeq).toBe(1)
        expect(evalEvent.moduleId).toBe('TestModule')
        expect(evalEvent.instanceId).toBe('i-test')
        expect(evalEvent.data?.selectorId).toBe(readQuery.selectorId)
        expect(typeof evalEvent.data?.evalMs).toBe('number')
        expect(Number.isFinite(evalEvent.data?.evalMs)).toBe(true)
        expect(() => JSON.stringify(evalEvent.data)).not.toThrow()
      }),
    ),
  )
})
