import { describe, it, expect } from '@effect/vitest'
import { Effect, Fiber, Option, PubSub } from 'effect'
import { makeFieldPathIdRegistry } from '../../../src/internal/field-path.js'
import type { TxnDirtyPlanSnapshot } from '../../../src/internal/runtime/core/StateTransaction.js'
import * as SelectorGraph from '../../../src/internal/runtime/core/SelectorGraph.js'
import * as RuntimeContracts from '../../../src/internal/runtime-contracts.js'

const makeDirtyPlan = (args: {
  readonly registry: ReturnType<typeof makeFieldPathIdRegistry>
  readonly paths: ReadonlyArray<string>
}): TxnDirtyPlanSnapshot => {
  const ids = args.paths.map((path) => args.registry.pathStringToId!.get(path)!)
  return {
    dirtyAll: false,
    rawPathIds: ids,
    rawKeyHash: 1,
    rawKeySize: ids.length,
    rootIds: Int32Array.from(ids),
    rootKeyHash: 1,
    rootCount: ids.length,
    authority: 'field-path-registry',
    fieldPathCount: args.registry.fieldPaths.length,
  }
}

describe('SelectorGraph topic retain contract', () => {
  it.effect('topic-only retain marks RuntimeStore topic dirty without publishing a stream event', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const query = RuntimeContracts.Selector.compile(
          Object.assign((state: { readonly count: number; readonly other: number }) => state.count, {
            fieldPaths: ['count'],
          }) as any,
        )
        const registry = makeFieldPathIdRegistry([['count'], ['other']])
        const graph = SelectorGraph.make<{ readonly count: number; readonly other: number }>({
          moduleId: 'TopicRetainModule',
          instanceId: 'topic-only',
          getFieldPathIdRegistry: () => registry,
        })

        const lease = yield* graph.retainEntry(query as any, 'topic')
        const subscription = yield* PubSub.subscribe(lease.hub)
        const takeOneFiber = yield* Effect.forkChild(PubSub.take(subscription))

        const changed: Array<string> = []
        yield* graph.onCommit(
          { count: 1, other: 0 },
          { txnSeq: 1, txnId: 'topic-only::t1', commitMode: 'normal', priority: 'normal' },
          makeDirtyPlan({ registry, paths: ['count'] }),
          'off',
          (selectorFingerprint) => changed.push(selectorFingerprint),
        )

        yield* Effect.yieldNow
        const streamEvent = yield* Fiber.await(takeOneFiber).pipe(Effect.timeoutOption(0))
        yield* Fiber.interrupt(takeOneFiber)

        expect(changed).toEqual([lease.selectorFingerprint])
        expect(Option.isNone(streamEvent)).toBe(true)
      }),
    ),
  )

  it.effect('stream retain publishes stream events without marking RuntimeStore topic dirty', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const query = RuntimeContracts.Selector.compile(
          Object.assign((state: { readonly count: number; readonly other: number }) => state.count, {
            fieldPaths: ['count'],
          }) as any,
        )
        const registry = makeFieldPathIdRegistry([['count'], ['other']])
        const graph = SelectorGraph.make<{ readonly count: number; readonly other: number }>({
          moduleId: 'TopicRetainModule',
          instanceId: 'stream-only',
          getFieldPathIdRegistry: () => registry,
        })

        const lease = yield* graph.retainEntry(query as any, 'stream')
        const subscription = yield* PubSub.subscribe(lease.hub)

        const changed: Array<string> = []
        yield* graph.onCommit(
          { count: 1, other: 0 },
          { txnSeq: 1, txnId: 'stream-only::t1', commitMode: 'normal', priority: 'normal' },
          makeDirtyPlan({ registry, paths: ['count'] }),
          'off',
          (selectorFingerprint) => changed.push(selectorFingerprint),
        )

        const event = yield* PubSub.take(subscription)

        expect((event as any).value).toBe(1)
        expect(changed).toEqual([])
      }),
    ),
  )

  it.effect('topic release and stream release do not remove each other', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const query = RuntimeContracts.Selector.compile(
          Object.assign((state: { readonly count: number }) => state.count, {
            fieldPaths: ['count'],
          }) as any,
        )
        const registry = makeFieldPathIdRegistry([['count']])
        const graph = SelectorGraph.make<{ readonly count: number }>({
          moduleId: 'TopicRetainModule',
          instanceId: 'mixed-retain',
          getFieldPathIdRegistry: () => registry,
        })

        const topicLease = yield* graph.retainEntry(query as any, 'topic')
        const streamLease = yield* graph.retainEntry(query as any, 'stream')
        const subscription = yield* PubSub.subscribe(streamLease.hub)

        yield* topicLease.release

        const changed: Array<string> = []
        yield* graph.onCommit(
          { count: 1 },
          { txnSeq: 1, txnId: 'mixed-retain::t1', commitMode: 'normal', priority: 'normal' },
          makeDirtyPlan({ registry, paths: ['count'] }),
          'off',
          (selectorFingerprint) => changed.push(selectorFingerprint),
        )

        const event = yield* PubSub.take(subscription)
        expect((event as any).value).toBe(1)
        expect(changed).toEqual([])

        yield* streamLease.release
        expect(graph.hasAnyEntries()).toBe(false)
      }),
    ),
  )

  it.effect('topic retain finalizer releases selector entry idempotently', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const query = RuntimeContracts.Selector.compile(
          Object.assign((state: { readonly count: number }) => state.count, {
            fieldPaths: ['count'],
          }) as any,
        )
        const registry = makeFieldPathIdRegistry([['count']])
        const graph = SelectorGraph.make<{ readonly count: number }>({
          moduleId: 'TopicRetainModule',
          instanceId: 'release-idempotent',
          getFieldPathIdRegistry: () => registry,
        })

        const lease = yield* graph.retainEntry(query as any, 'topic')
        expect(graph.hasAnyEntries()).toBe(true)

        yield* lease.release
        yield* lease.release

        expect(graph.hasAnyEntries()).toBe(false)
      }),
    ),
  )
})
