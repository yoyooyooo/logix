import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Context, Effect, Stream, SubscriptionRef } from 'effect'
import * as Logix from '../../../src/index.js'
import { getExternalStoreDescriptor } from '../../../src/internal/external-store-descriptor.js'
import { __unsafeSetGlobalHostSchedulerForTests, getGlobalHostScheduler } from '../../../src/internal/runtime/core/HostScheduler.js'
import { flushAllHostScheduler, makeTestHostScheduler } from '../testkit/hostSchedulerTestKit.js'

describe('ExternalStore sugars', () => {
  it('fromService: accepts Tag.key fallback and builds stable descriptor', () => {
    const KeyOnlyTag = { key: 'ExternalStoreSugars.KeyOnlyTag' } as any as Context.Tag<any, any>

    const s1 = Logix.ExternalStore.fromService(KeyOnlyTag, () => ({
      getSnapshot: () => 1,
      subscribe: () => () => {},
    }))
    const d1 = getExternalStoreDescriptor(s1)
    expect(d1?.kind).toBe('service')
    if (!d1 || d1.kind !== 'service') throw new Error('Expected a service descriptor')
    expect(d1.tagId).toBe('ExternalStoreSugars.KeyOnlyTag')
    expect(typeof d1.storeId).toBe('string')

    const s2 = Logix.ExternalStore.fromService(KeyOnlyTag, () => ({
      getSnapshot: () => 1,
      subscribe: () => () => {},
    }))
    const d2 = getExternalStoreDescriptor(s2)
    expect(d2?.kind).toBe('service')
    if (!d2 || d2.kind !== 'service') throw new Error('Expected a service descriptor')
    expect(d2.storeId).toBe(d1.storeId)

    let thrown: unknown
    try {
      s1.getSnapshot()
    } catch (err) {
      thrown = err
    }
    expect((thrown as any)?.code).toBe('external_store::unresolved')
  })

  it('fromService: prefers Tag.id when present', () => {
    const IdAndKeyTag = { id: 'ExternalStoreSugars.TagId', key: 'ExternalStoreSugars.TagKey' } as any as Context.Tag<any, any>

    const store = Logix.ExternalStore.fromService(IdAndKeyTag, () => ({
      getSnapshot: () => 1,
      subscribe: () => () => {},
    }))

    const desc = getExternalStoreDescriptor(store)
    expect(desc?.kind).toBe('service')
    if (!desc || desc.kind !== 'service') throw new Error('Expected a service descriptor')
    expect(desc.tagId).toBe('ExternalStoreSugars.TagId')
  })

  it.effect('fromSubscriptionRef: stable storeId + atomic init + unsubscribe stops notifications', () =>
    Effect.gen(function* () {
      const hostScheduler = makeTestHostScheduler()
      const prev = getGlobalHostScheduler()
      __unsafeSetGlobalHostSchedulerForTests(hostScheduler)
      try {
      const ref = yield* SubscriptionRef.make(0)
      const store1 = Logix.ExternalStore.fromSubscriptionRef(ref)
      const store2 = Logix.ExternalStore.fromSubscriptionRef(ref)

      const d1 = getExternalStoreDescriptor(store1)
      const d2 = getExternalStoreDescriptor(store2)
      expect(d1?.kind).toBe('subscriptionRef')
      expect(d2?.kind).toBe('subscriptionRef')
      if (!d1 || d1.kind !== 'subscriptionRef') throw new Error('Expected a subscriptionRef descriptor')
      if (!d2 || d2.kind !== 'subscriptionRef') throw new Error('Expected a subscriptionRef descriptor')
      expect(d2.storeId).toBe(d1.storeId)

      expect(store1.getSnapshot()).toBe(0)

      // Race window: update happens after getSnapshot() but before subscribe(listener) is registered.
      yield* SubscriptionRef.set(ref, 1)

      let calls = 0
      const unsub = store1.subscribe(() => {
        calls += 1
      })

      yield* flushAllHostScheduler(hostScheduler)
      expect(store1.getSnapshot()).toBe(1)
      expect(calls).toBeGreaterThanOrEqual(1)

      unsub()

      calls = 0
      yield* SubscriptionRef.set(ref, 2)
      yield* flushAllHostScheduler(hostScheduler)
      expect(calls).toBe(0)
      } finally {
        __unsafeSetGlobalHostSchedulerForTests(prev)
      }
    }),
  )

  it.effect('fromSubscriptionRef: batches notifications within the same microtask (writes latest only once)', () =>
    Effect.gen(function* () {
      const hostScheduler = makeTestHostScheduler()
      const prev = getGlobalHostScheduler()
      __unsafeSetGlobalHostSchedulerForTests(hostScheduler)
      try {
      const ref = yield* SubscriptionRef.make(0)
      const store = Logix.ExternalStore.fromSubscriptionRef(ref)

      // Prime the snapshot cache so subscribe() can run refreshSnapshotIfStale().
      expect(store.getSnapshot()).toBe(0)

      let calls = 0
      const unsub = store.subscribe(() => {
        calls += 1
      })
      yield* flushAllHostScheduler(hostScheduler)
      calls = 0

      for (let i = 1; i <= 50; i += 1) {
        yield* SubscriptionRef.set(ref, i)
      }

      yield* flushAllHostScheduler(hostScheduler)
      expect(store.getSnapshot()).toBe(50)
      expect(calls).toBe(1)

      unsub()
      } finally {
        __unsafeSetGlobalHostSchedulerForTests(prev)
      }
    }),
  )

  it.effect('fromStream: descriptor includes storeId + initialHint and storeId is stable for the same Stream instance', () =>
    Effect.gen(function* () {
      const hostScheduler = makeTestHostScheduler()
      const prev = getGlobalHostScheduler()
      __unsafeSetGlobalHostSchedulerForTests(hostScheduler)
      try {
      const stream = Stream.fromIterable([1, 2])

      const s1 = Logix.ExternalStore.fromStream(stream, { initial: 0 })
      const s2 = Logix.ExternalStore.fromStream(stream, { current: 0 })

      const d1 = getExternalStoreDescriptor(s1)
      const d2 = getExternalStoreDescriptor(s2)
      expect(d1?.kind).toBe('stream')
      expect(d2?.kind).toBe('stream')
      if (!d1 || d1.kind !== 'stream') throw new Error('Expected a stream descriptor')
      if (!d2 || d2.kind !== 'stream') throw new Error('Expected a stream descriptor')

      expect(d1.storeId).toBe(d2.storeId)
      expect(d1.initialHint).toBe('initial')
      expect(d2.initialHint).toBe('current')

      expect(s1.getSnapshot()).toBe(0)

      let calls = 0
      const unsub = s1.subscribe(() => {
        calls += 1
      })

      yield* flushAllHostScheduler(hostScheduler)
      expect(s1.getSnapshot()).toBe(2)
      expect(calls).toBe(1)

      unsub()
      } finally {
        __unsafeSetGlobalHostSchedulerForTests(prev)
      }
    }),
  )
})
