import { describe, it, expect } from '@effect/vitest'
import { Effect, Fiber, Option, PubSub, Queue } from 'effect'
import * as Logix from '../../../src/index.js'
import { makeFieldPathIdRegistry } from '../../../src/internal/field-path.js'
import type { TxnDirtyEvidenceSnapshot } from '../../../src/internal/runtime/core/StateTransaction.js'
import * as SelectorGraph from '../../../src/internal/runtime/core/SelectorGraph.js'

const makeDirty = (args: {
  readonly registry: ReturnType<typeof makeFieldPathIdRegistry>
  readonly paths?: ReadonlyArray<string>
  readonly dirtyAll?: boolean
}): TxnDirtyEvidenceSnapshot => {
  if (args.dirtyAll) {
    return {
      dirtyAll: true,
      dirtyAllReason: 'unknownWrite',
      dirtyPathIds: [],
      dirtyPathsKeyHash: 0,
      dirtyPathsKeySize: 0,
    }
  }

  const ids = (args.paths ?? []).map((path) => {
    const id = args.registry.pathStringToId?.get(path)
    if (id == null) {
      throw new Error(`Missing pathStringToId for ${path}`)
    }
    return id
  })

  if (ids.length === 0) {
    return {
      dirtyAll: true,
      dirtyAllReason: 'unknownWrite',
      dirtyPathIds: [],
      dirtyPathsKeyHash: 0,
      dirtyPathsKeySize: 0,
    }
  }

  return {
    dirtyAll: false,
    dirtyPathIds: ids,
    dirtyPathsKeyHash: 0,
    dirtyPathsKeySize: ids.length,
  }
}

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
        const takeOneFiber = yield* Effect.forkChild(PubSub.take(subscription))

        yield* graph.onCommit(
          { count: 0, other: 1 },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          makeDirty({ registry, paths: ['other'] }),
          'off',
        )

        yield* Effect.yieldNow
        const polled = yield* Fiber.await(takeOneFiber).pipe(Effect.timeoutOption(0))

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
          makeDirty({ registry, paths: ['count'] }),
          'off',
        )

        const first = yield* PubSub.take(subscription)
        expect(calls).toBe(1)
        expect((first as any).value).toBe(1)
        expect((first as any).meta.txnSeq).toBe(1)
        expect((first as any).meta.txnId).toBe('i-test::t1')
      }),
    ),
  )

  it.effect('releases root candidate state with the last subscriber and allows re-registration', () =>
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

        const firstEntry = yield* graph.ensureEntry(readQuery as any)
        firstEntry.subscriberCount = 1
        graph.releaseEntry(readQuery.selectorId)

        expect(graph.hasAnyEntries()).toBe(false)

        const secondEntry = yield* graph.ensureEntry(readQuery as any)
        secondEntry.subscriberCount = 1
        expect(secondEntry).toBe(firstEntry)
        expect(secondEntry.hub).toBe(firstEntry.hub)

        const subscription = yield* PubSub.subscribe(secondEntry.hub)
        yield* graph.onCommit(
          { count: 1, other: 0 },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          makeDirty({ registry, paths: ['count'] }),
          'off',
        )

        const event = yield* PubSub.take(subscription)
        expect((event as any).value).toBe(1)
        expect(calls).toBe(1)
      }),
    ),
  )

  it.effect('evicts old cached entries once selector cache exceeds the cap', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const graph = SelectorGraph.make<{ readonly count: number }>({
          moduleId: 'TestModule',
          instanceId: 'i-test',
        })

        const selectors = Array.from({ length: 300 }, (_, i) =>
          Logix.ReadQuery.make({
            selectorId: `rq_cache_cap_${i}`,
            reads: ['count'],
            select: (state: { readonly count: number }) => state.count,
            equalsKind: 'objectIs',
          }),
        )

        const firstEntry = yield* graph.ensureEntry(selectors[0] as any)
        firstEntry.subscriberCount = 1
        graph.releaseEntry(selectors[0]!.selectorId)

        for (let i = 1; i < selectors.length; i += 1) {
          const entry = yield* graph.ensureEntry(selectors[i] as any)
          entry.subscriberCount = 1
          graph.releaseEntry(selectors[i]!.selectorId)
        }

        const recycledFirst = yield* graph.ensureEntry(selectors[0] as any)
        expect(recycledFirst).not.toBe(firstEntry)
      }),
    ),
  )

  it.effect('drops cached selector value while keeping entry identity reusable', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const graph = SelectorGraph.make<{ readonly count: number }>({
          moduleId: 'TestModule',
          instanceId: 'i-test',
        })

        const readQuery = Logix.ReadQuery.make({
          selectorId: 'rq_cache_value_reset',
          reads: ['count'],
          select: (state: { readonly count: number }) => state.count,
          equalsKind: 'objectIs',
        })

        const entry = yield* graph.ensureEntry(readQuery as any)
        entry.subscriberCount = 1
        entry.hasValue = true
        entry.cachedValue = 42
        entry.cachedAtTxnSeq = 7

        graph.releaseEntry(readQuery.selectorId)

        const reused = yield* graph.ensureEntry(readQuery as any)
        expect(reused).toBe(entry)
        expect(reused.hasValue).toBe(false)
        expect(reused.cachedValue).toBeUndefined()
        expect(reused.cachedAtTxnSeq).toBe(0)
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
        const takeOtherFiber = yield* Effect.forkChild(PubSub.take(otherSubscription))

        yield* graph.onCommit(
          { count: 1, other: 10 },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          makeDirty({ registry, paths: ['count'] }),
          'off',
        )

        const countEvent = yield* PubSub.take(countSubscription)
        yield* Effect.yieldNow
        const otherPolled = yield* Fiber.await(takeOtherFiber).pipe(Effect.timeoutOption(0))
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
        const takeThemeFiber = yield* Effect.forkChild(PubSub.take(themeSubscription))

        yield* graph.onCommit(
          { settings: { theme: 'dark', locale: 'en-US' } },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          makeDirty({ registry, paths: ['settings.locale'] }),
          'off',
        )

        const localeEvent = yield* PubSub.take(localeSubscription)
        yield* Effect.yieldNow
        const themePolled = yield* Fiber.await(takeThemeFiber).pipe(Effect.timeoutOption(0))
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
          makeDirty({ registry, paths: ['settings'] }),
          'off',
        )

        const themeEvent = yield* PubSub.take(themeSubscription)
        const localeEvent = yield* PubSub.take(localeSubscription)

        expect((themeEvent as any).value).toBe('dark')
        expect((localeEvent as any).value).toBe('en-US')
        expect(themeCalls).toBe(1)
        expect(localeCalls).toBe(1)
      }),
    ),
  )

  it.effect('prunes earlier descendant dirty roots when a broader dirty root arrives later', () =>
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

        const changedSelectors: Array<string> = []
        yield* graph.onCommit(
          { settings: { theme: 'dark', locale: 'en-US' } },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          makeDirty({ registry, paths: ['settings.locale', 'settings'] }),
          'off',
          (selectorId) => changedSelectors.push(selectorId),
        )

        expect(changedSelectors).toEqual([themeQuery.selectorId, localeQuery.selectorId])
        expect(themeCalls).toBe(1)
        expect(localeCalls).toBe(1)
      }),
    ),
  )

  it.effect('keeps existing ancestor dirty root dedup when descendant arrives later', () =>
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

        const changedSelectors: Array<string> = []
        yield* graph.onCommit(
          { settings: { theme: 'dark', locale: 'en-US' } },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          makeDirty({ registry, paths: ['settings', 'settings.locale'] }),
          'off',
          (selectorId) => changedSelectors.push(selectorId),
        )

        expect(changedSelectors).toEqual([themeQuery.selectorId, localeQuery.selectorId])
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
        const takeStaticFiber = yield* Effect.forkChild(PubSub.take(staticSubscription))

        yield* graph.onCommit(
          { count: 1, other: 0 },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          makeDirty({ registry, paths: ['count'] }),
          'off',
        )

        const dynamicEvent = yield* PubSub.take(dynamicSubscription)
        yield* Effect.yieldNow
        const staticPolled = yield* Fiber.await(takeStaticFiber).pipe(Effect.timeoutOption(0))
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
        const takeOneFiber = yield* Effect.forkChild(PubSub.take(subscription))

        yield* graph.onCommit(
          { user: { name: 'A' }, settings: { theme: 'dark', locale: 'en-US' } },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          makeDirty({ registry, paths: ['settings.locale'] }),
          'off',
        )

        yield* Effect.yieldNow
        const polled = yield* Fiber.await(takeOneFiber).pipe(Effect.timeoutOption(0))
        yield* Fiber.interrupt(takeOneFiber)

        expect(calls).toBe(0)
        expect(Option.isNone(polled)).toBe(true)
      }),
    ),
  )

  it.effect('keeps dirty-path key cache collision-free for delimiter-like segments under the same root', () =>
    Effect.scoped(
      Effect.gen(function* () {
        let leftCalls = 0
        let rightCalls = 0

        const selectLeft = Object.assign(
          (state: {
            readonly root: {
              readonly 'a|b': { readonly c: number }
              readonly a: { readonly 'b|c': number }
            }
          }) => {
            leftCalls += 1
            return state.root['a|b'].c
          },
          { fieldPaths: ['root.a|b.c'] },
        )

        const selectRight = Object.assign(
          (state: {
            readonly root: {
              readonly 'a|b': { readonly c: number }
              readonly a: { readonly 'b|c': number }
            }
          }) => {
            rightCalls += 1
            return state.root.a['b|c']
          },
          { fieldPaths: ['root.a.b|c'] },
        )

        const leftQuery = Logix.ReadQuery.compile(selectLeft as any)
        const rightQuery = Logix.ReadQuery.compile(selectRight as any)
        const registry = makeFieldPathIdRegistry([
          ['root', 'a|b', 'c'],
          ['root', 'a', 'b|c'],
        ])

        const graph = SelectorGraph.make<{
          readonly root: {
            readonly 'a|b': { readonly c: number }
            readonly a: { readonly 'b|c': number }
          }
        }>({
          moduleId: 'TestModule',
          instanceId: 'i-test',
          getFieldPathIdRegistry: () => registry,
        })

        const leftEntry = yield* graph.ensureEntry(leftQuery as any)
        leftEntry.subscriberCount = 1
        const rightEntry = yield* graph.ensureEntry(rightQuery as any)
        rightEntry.subscriberCount = 1

        const changedSelectors: Array<string> = []
        yield* graph.onCommit(
          { root: { 'a|b': { c: 1 }, a: { 'b|c': 2 } } },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          makeDirty({ registry, paths: ['root.a|b.c', 'root.a.b|c'] }),
          'off',
          (selectorId) => changedSelectors.push(selectorId),
        )

        expect(changedSelectors).toEqual([leftQuery.selectorId, rightQuery.selectorId])
        expect(leftCalls).toBe(1)
        expect(rightCalls).toBe(1)
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
          makeDirty({ registry, paths: ['user.name', 'settings.theme'] }),
          'off',
        )

        const event = yield* PubSub.take(subscription)
        yield* Effect.yieldNow
        const maybeSecond = yield* PubSub.takeUpTo(subscription, 1).pipe(Effect.timeoutOption(0))

        expect((event as any).value).toBe('A:dark')
        expect(calls).toBe(1)
        const remaining = Option.isSome(maybeSecond) ? maybeSecond.value.length : 0
        expect(remaining).toBe(0)
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
        const takeOtherFiber = yield* Effect.forkChild(PubSub.take(otherSubscription))

        yield* graph.onCommit(
          { count: 1, settings: { theme: 'dark', locale: 'en-US' }, other: 7 },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          makeDirty({ registry, paths: ['settings.locale'] }),
          'off',
        )

        const mixedEvent = yield* PubSub.take(mixedSubscription)
        yield* Effect.yieldNow
        const otherPolled = yield* Fiber.await(takeOtherFiber).pipe(Effect.timeoutOption(0))
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

        yield* Effect.provideService(graph.onCommit(
          { count: 1, other: 0 },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          makeDirty({ registry, paths: ['count'] }),
          'light',
        ), Logix.Debug.internal.currentDebugSinks as any, [ring.sink as any])

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

        yield* Effect.provideService(graph.onCommit(
          { count: 1, other: 0 },
          { txnSeq: 1, txnId: 'i-test::t1', commitMode: 'normal', priority: 'normal' },
          makeDirty({ registry, paths: ['count'] }),
          'sampled',
        ), Logix.Debug.internal.currentDebugSinks as any, [ring.sink as any])

        let evalEvents = ring.getSnapshot().filter((e) => (e as any).type === 'trace:selector:eval') as Array<any>
        expect(evalEvents).toHaveLength(1)
        expect(evalEvents[0]?.data?.changed).toBe(true)

        yield* Effect.provideService(graph.onCommit(
          { count: 1, other: 0 },
          { txnSeq: 2, txnId: 'i-test::t2', commitMode: 'normal', priority: 'normal' },
          makeDirty({ registry, paths: ['count'] }),
          'sampled',
        ), Logix.Debug.internal.currentDebugSinks as any, [ring.sink as any])

        evalEvents = ring.getSnapshot().filter((e) => (e as any).type === 'trace:selector:eval') as Array<any>
        expect(evalEvents).toHaveLength(1)

        shouldDelayOnce = true

        yield* Effect.provideService(graph.onCommit(
          { count: 1, other: 0 },
          { txnSeq: 3, txnId: 'i-test::t3', commitMode: 'normal', priority: 'normal' },
          makeDirty({ registry, paths: ['count'] }),
          'sampled',
        ), Logix.Debug.internal.currentDebugSinks as any, [ring.sink as any])

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
