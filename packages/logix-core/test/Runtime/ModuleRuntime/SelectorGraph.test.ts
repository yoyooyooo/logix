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

  it.effect('only recomputes selectors whose root keys overlap dirty roots in multi-selector mode', () =>
    Effect.scoped(
      Effect.gen(function* () {
        let countCalls = 0
        let otherCalls = 0

        const selectCount = Object.assign(
          (state: { readonly count: number; readonly other: number }) => {
            countCalls += 1
            return state.count
          },
          { fieldPaths: ['count'] },
        )

        const selectOther = Object.assign(
          (state: { readonly count: number; readonly other: number }) => {
            otherCalls += 1
            return state.other
          },
          { fieldPaths: ['other'] },
        )

        const countQuery = Logix.ReadQuery.compile(selectCount as any)
        const otherQuery = Logix.ReadQuery.compile(selectOther as any)
        const registry = makeFieldPathIdRegistry([['count'], ['other']])

        const graph = SelectorGraph.make<{ readonly count: number; readonly other: number }>({
          moduleId: 'TestModule',
          instanceId: 'i-test',
          getFieldPathIdRegistry: () => registry,
        })

        const countEntry = yield* graph.ensureEntry(countQuery as any)
        countEntry.subscriberCount = 1
        const otherEntry = yield* graph.ensureEntry(otherQuery as any)
        otherEntry.subscriberCount = 1

        const countSubscription = yield* PubSub.subscribe(countEntry.hub)
        const otherSubscription = yield* PubSub.subscribe(otherEntry.hub)
        const takeOtherFiber = yield* Effect.fork(Queue.take(otherSubscription))

        yield* graph.onCommit(
          { count: 1, other: 10 },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          dirtyPathsToRootIds({ dirtyPaths: [['count']], registry }),
          'off',
        )

        const countEvent = yield* Queue.take(countSubscription)
        yield* Effect.yieldNow()
        const otherPolled = yield* Fiber.poll(takeOtherFiber)
        yield* Fiber.interrupt(takeOtherFiber)

        expect((countEvent as any).value).toBe(1)
        expect(countCalls).toBe(1)
        expect(otherCalls).toBe(0)
        expect(Option.isNone(otherPolled)).toBe(true)
      }),
    ),
  )

  it.effect('skips non-overlapping selector under same root in multi-selector mode', () =>
    Effect.scoped(
      Effect.gen(function* () {
        let themeCalls = 0
        let localeCalls = 0

        const selectTheme = Object.assign(
          (state: { readonly settings: { readonly theme: string; readonly locale: string } }) => {
            themeCalls += 1
            return state.settings.theme
          },
          { fieldPaths: ['settings.theme'] },
        )

        const selectLocale = Object.assign(
          (state: { readonly settings: { readonly theme: string; readonly locale: string } }) => {
            localeCalls += 1
            return state.settings.locale
          },
          { fieldPaths: ['settings.locale'] },
        )

        const themeQuery = Logix.ReadQuery.compile(selectTheme as any)
        const localeQuery = Logix.ReadQuery.compile(selectLocale as any)
        const registry = makeFieldPathIdRegistry([['settings', 'theme'], ['settings', 'locale']])

        const graph = SelectorGraph.make<{ readonly settings: { readonly theme: string; readonly locale: string } }>({
          moduleId: 'TestModule',
          instanceId: 'i-test',
          getFieldPathIdRegistry: () => registry,
        })

        const themeEntry = yield* graph.ensureEntry(themeQuery as any)
        themeEntry.subscriberCount = 1
        const localeEntry = yield* graph.ensureEntry(localeQuery as any)
        localeEntry.subscriberCount = 1

        const themeSubscription = yield* PubSub.subscribe(themeEntry.hub)
        const localeSubscription = yield* PubSub.subscribe(localeEntry.hub)
        const takeThemeFiber = yield* Effect.fork(Queue.take(themeSubscription))

        yield* graph.onCommit(
          { settings: { theme: 'dark', locale: 'en-US' } },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          dirtyPathsToRootIds({ dirtyPaths: [['settings', 'locale']], registry }),
          'off',
        )

        const localeEvent = yield* Queue.take(localeSubscription)
        yield* Effect.yieldNow()
        const themePolled = yield* Fiber.poll(takeThemeFiber)
        yield* Fiber.interrupt(takeThemeFiber)

        expect((localeEvent as any).value).toBe('en-US')
        expect(localeCalls).toBe(1)
        expect(themeCalls).toBe(0)
        expect(Option.isNone(themePolled)).toBe(true)
      }),
    ),
  )

  it.effect('recomputes selectors under the same root when dirty path is root-level', () =>
    Effect.scoped(
      Effect.gen(function* () {
        let themeCalls = 0
        let localeCalls = 0

        const selectTheme = Object.assign(
          (state: { readonly settings: { readonly theme: string; readonly locale: string } }) => {
            themeCalls += 1
            return state.settings.theme
          },
          { fieldPaths: ['settings.theme'] },
        )

        const selectLocale = Object.assign(
          (state: { readonly settings: { readonly theme: string; readonly locale: string } }) => {
            localeCalls += 1
            return state.settings.locale
          },
          { fieldPaths: ['settings.locale'] },
        )

        const themeQuery = Logix.ReadQuery.compile(selectTheme as any)
        const localeQuery = Logix.ReadQuery.compile(selectLocale as any)
        const registry = makeFieldPathIdRegistry([['settings'], ['settings', 'theme'], ['settings', 'locale']])

        const graph = SelectorGraph.make<{ readonly settings: { readonly theme: string; readonly locale: string } }>({
          moduleId: 'TestModule',
          instanceId: 'i-test',
          getFieldPathIdRegistry: () => registry,
        })

        const themeEntry = yield* graph.ensureEntry(themeQuery as any)
        themeEntry.subscriberCount = 1
        const localeEntry = yield* graph.ensureEntry(localeQuery as any)
        localeEntry.subscriberCount = 1

        const themeSubscription = yield* PubSub.subscribe(themeEntry.hub)
        const localeSubscription = yield* PubSub.subscribe(localeEntry.hub)

        yield* graph.onCommit(
          { settings: { theme: 'dark', locale: 'en-US' } },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          dirtyPathsToRootIds({ dirtyPaths: [['settings']], registry }),
          'off',
        )

        const themeEvent = yield* Queue.take(themeSubscription)
        const localeEvent = yield* Queue.take(localeSubscription)

        expect((themeEvent as any).value).toBe('dark')
        expect((localeEvent as any).value).toBe('en-US')
        expect(themeCalls).toBe(1)
        expect(localeCalls).toBe(1)
      }),
    ),
  )

  it.effect('recomputes readless selector in multi-selector mode when registry is available', () =>
    Effect.scoped(
      Effect.gen(function* () {
        let dynamicCalls = 0
        let staticCalls = 0

        const dynamicSelect = (state: { readonly count: number; readonly other: number }) => {
          dynamicCalls += 1
          return state.count + state.other
        }

        const staticSelect = Object.assign(
          (state: { readonly count: number; readonly other: number }) => {
            staticCalls += 1
            return state.other
          },
          { fieldPaths: ['other'] },
        )

        const dynamicQuery = Logix.ReadQuery.compile(dynamicSelect as any)
        const staticQuery = Logix.ReadQuery.compile(staticSelect as any)
        const registry = makeFieldPathIdRegistry([['count'], ['other']])

        const graph = SelectorGraph.make<{ readonly count: number; readonly other: number }>({
          moduleId: 'TestModule',
          instanceId: 'i-test',
          getFieldPathIdRegistry: () => registry,
        })

        const dynamicEntry = yield* graph.ensureEntry(dynamicQuery as any)
        dynamicEntry.subscriberCount = 1
        const staticEntry = yield* graph.ensureEntry(staticQuery as any)
        staticEntry.subscriberCount = 1

        const dynamicSubscription = yield* PubSub.subscribe(dynamicEntry.hub)
        const staticSubscription = yield* PubSub.subscribe(staticEntry.hub)
        const takeStaticFiber = yield* Effect.fork(Queue.take(staticSubscription))

        yield* graph.onCommit(
          { count: 1, other: 0 },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          dirtyPathsToRootIds({ dirtyPaths: [['count']], registry }),
          'off',
        )

        const dynamicEvent = yield* Queue.take(dynamicSubscription)
        yield* Effect.yieldNow()
        const staticPolled = yield* Fiber.poll(takeStaticFiber)
        yield* Fiber.interrupt(takeStaticFiber)

        expect(dynamicQuery.reads.length).toBe(0)
        expect((dynamicEvent as any).value).toBe(1)
        expect(dynamicCalls).toBe(1)
        expect(staticCalls).toBe(0)
        expect(Option.isNone(staticPolled)).toBe(true)
      }),
    ),
  )

  it.effect('does not recompute multi-root selector when dirty path is non-overlapping under same root', () =>
    Effect.scoped(
      Effect.gen(function* () {
        let calls = 0

        const selectUserAndTheme = Object.assign(
          (state: {
            readonly user: { readonly name: string }
            readonly settings: { readonly theme: string; readonly locale: string }
          }) => {
            calls += 1
            return `${state.user.name}:${state.settings.theme}`
          },
          { fieldPaths: ['user.name', 'settings.theme'] },
        )

        const readQuery = Logix.ReadQuery.compile(selectUserAndTheme as any)
        const registry = makeFieldPathIdRegistry([['user', 'name'], ['settings', 'theme'], ['settings', 'locale']])

        const graph = SelectorGraph.make<{
          readonly user: { readonly name: string }
          readonly settings: { readonly theme: string; readonly locale: string }
        }>({
          moduleId: 'TestModule',
          instanceId: 'i-test',
          getFieldPathIdRegistry: () => registry,
        })

        const entry = yield* graph.ensureEntry(readQuery as any)
        entry.subscriberCount = 1

        const subscription = yield* PubSub.subscribe(entry.hub)
        const takeOneFiber = yield* Effect.fork(Queue.take(subscription))

        yield* graph.onCommit(
          { user: { name: 'A' }, settings: { theme: 'dark', locale: 'en-US' } },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          dirtyPathsToRootIds({ dirtyPaths: [['settings', 'locale']], registry }),
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

  it.effect('recomputes at most once when one selector overlaps multiple dirty roots in the same txn', () =>
    Effect.scoped(
      Effect.gen(function* () {
        let calls = 0

        const selectSummary = Object.assign(
          (state: {
            readonly user: { readonly name: string }
            readonly settings: { readonly theme: string }
          }) => {
            calls += 1
            return `${state.user.name}:${state.settings.theme}`
          },
          { fieldPaths: ['user.name', 'settings.theme'] },
        )

        const readQuery = Logix.ReadQuery.compile(selectSummary as any)
        const registry = makeFieldPathIdRegistry([['user', 'name'], ['settings', 'theme']])
        const graph = SelectorGraph.make<{
          readonly user: { readonly name: string }
          readonly settings: { readonly theme: string }
        }>({
          moduleId: 'TestModule',
          instanceId: 'i-test',
          getFieldPathIdRegistry: () => registry,
        })

        const entry = yield* graph.ensureEntry(readQuery as any)
        entry.subscriberCount = 1

        const subscription = yield* PubSub.subscribe(entry.hub)

        yield* graph.onCommit(
          { user: { name: 'A' }, settings: { theme: 'dark' } },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          dirtyPathsToRootIds({
            dirtyPaths: [
              ['user', 'name'],
              ['settings', 'theme'],
            ],
            registry,
          }),
          'off',
        )

        const event = yield* Queue.take(subscription)
        yield* Effect.yieldNow()
        const maybeSecond = yield* Queue.poll(subscription)

        expect((event as any).value).toBe('A:dark')
        expect(calls).toBe(1)
        expect(Option.isNone(maybeSecond)).toBe(true)
      }),
    ),
  )

  it.effect('filters mixed reads and keeps root indexing aligned for scheduling', () =>
    Effect.scoped(
      Effect.gen(function* () {
        let mixedCalls = 0
        let otherCalls = 0

        const selectMixed = Object.assign(
          (state: {
            readonly count: number
            readonly settings: { readonly theme: string; readonly locale: string }
            readonly other: number
          }) => {
            mixedCalls += 1
            return `${state.count}:${state.settings.theme}`
          },
          { fieldPaths: ['count'] },
        )

        const selectOther = Object.assign(
          (state: {
            readonly count: number
            readonly settings: { readonly theme: string; readonly locale: string }
            readonly other: number
          }) => {
            otherCalls += 1
            return state.other
          },
          { fieldPaths: ['other'] },
        )

        const baseMixedQuery = Logix.ReadQuery.compile(selectMixed as any)
        const mixedQuery = {
          ...baseMixedQuery,
          selectorId: `${baseMixedQuery.selectorId}:mixed`,
          reads: ['count', 1, '*', 'settings.theme', 'settings[]', '[]'],
        } as any
        const otherQuery = Logix.ReadQuery.compile(selectOther as any)
        const registry = makeFieldPathIdRegistry([['count'], ['settings', 'theme'], ['settings', 'locale'], ['other']])

        const graph = SelectorGraph.make<{
          readonly count: number
          readonly settings: { readonly theme: string; readonly locale: string }
          readonly other: number
        }>({
          moduleId: 'TestModule',
          instanceId: 'i-test',
          getFieldPathIdRegistry: () => registry,
        })

        const mixedEntry = yield* graph.ensureEntry(mixedQuery)
        mixedEntry.subscriberCount = 1
        const otherEntry = yield* graph.ensureEntry(otherQuery as any)
        otherEntry.subscriberCount = 1

        expect(mixedEntry.reads).toEqual([['count'], ['settings', 'theme'], ['settings']])
        expect(mixedEntry.readRootKeys).toEqual(['count', 'settings'])
        expect(mixedEntry.readsByRootKey.get('count')).toEqual([['count']])
        expect(mixedEntry.readsByRootKey.get('settings')).toEqual([['settings', 'theme'], ['settings']])
        expect(mixedEntry.readRootKeys).toEqual(Array.from(mixedEntry.readsByRootKey.keys()))

        const mixedSubscription = yield* PubSub.subscribe(mixedEntry.hub)
        const otherSubscription = yield* PubSub.subscribe(otherEntry.hub)
        const takeOtherFiber = yield* Effect.fork(Queue.take(otherSubscription))

        yield* graph.onCommit(
          { count: 1, settings: { theme: 'dark', locale: 'en-US' }, other: 7 },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          dirtyPathsToRootIds({ dirtyPaths: [['settings', 'locale']], registry }),
          'off',
        )

        const mixedEvent = yield* Queue.take(mixedSubscription)
        yield* Effect.yieldNow()
        const otherPolled = yield* Fiber.poll(takeOtherFiber)
        yield* Fiber.interrupt(takeOtherFiber)

        expect((mixedEvent as any).value).toBe('1:dark')
        expect(mixedCalls).toBe(1)
        expect(otherCalls).toBe(0)
        expect(Option.isNone(otherPolled)).toBe(true)
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

  it.effect('emits trace:selector:eval in diagnostics=sampled only when changed or slow', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const ring = Logix.Debug.makeRingBufferSink(32)

        let calls = 0
        let shouldDelayOnce = false
        const selectCount = Object.assign(
          (state: { readonly count: number; readonly other: number }) => {
            calls += 1
            if (shouldDelayOnce) {
              const now = (): number => {
                const perf = (globalThis as any).performance as { now?: () => number } | undefined
                if (perf && typeof perf.now === 'function') {
                  return perf.now()
                }
                return Date.now()
              }
              const start = now()
              while (now() - start < 8) {
                // busy-wait intentionally for deterministic slow-eval sampling in test only
              }
              shouldDelayOnce = false
            }
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
            'sampled',
          ),
        )

        let evalEvents = ring.getSnapshot().filter((e) => (e as any).type === 'trace:selector:eval') as Array<any>
        expect(evalEvents).toHaveLength(1)
        expect(evalEvents[0]?.data?.changed).toBe(true)

        yield* Effect.locally(Logix.Debug.internal.currentDebugSinks as any, [ring.sink as any])(
          graph.onCommit(
            { count: 1, other: 0 },
            { txnSeq: 2, txnId: 'i-test::t2', commitMode: 'normal', priority: 'normal' },
            dirtyPathsToRootIds({ dirtyPaths: [['count']], registry }),
            'sampled',
          ),
        )

        evalEvents = ring.getSnapshot().filter((e) => (e as any).type === 'trace:selector:eval') as Array<any>
        expect(evalEvents).toHaveLength(1)

        shouldDelayOnce = true

        yield* Effect.locally(Logix.Debug.internal.currentDebugSinks as any, [ring.sink as any])(
          graph.onCommit(
            { count: 1, other: 0 },
            { txnSeq: 3, txnId: 'i-test::t3', commitMode: 'normal', priority: 'normal' },
            dirtyPathsToRootIds({ dirtyPaths: [['count']], registry }),
            'sampled',
          ),
        )

        expect(calls).toBe(3)
        evalEvents = ring.getSnapshot().filter((e) => (e as any).type === 'trace:selector:eval') as Array<any>
        expect(evalEvents).toHaveLength(2)
        expect(evalEvents[1]?.data?.changed).toBe(false)
        expect(typeof evalEvents[1]?.data?.evalMs).toBe('number')
        expect(evalEvents[1]?.data?.evalMs).toBeGreaterThanOrEqual(4)
      }),
    ),
  )
})
